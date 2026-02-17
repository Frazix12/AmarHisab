import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  GROCERY_CATEGORIES,
  GroceryCategory,
} from "@/types";
import type { PostHogEventProperties } from "@posthog/core";
import { createLlmTraceId, trackLlmGeneration } from "@/services/analytics/llm";
import { getAiCacheValue, setAiCacheValue } from "@/services/ai/cache";
import { sanitizeForAIPrompt } from "@/services/validation";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryWithBackoff } from "./rate-limiter";

// Initialize the Gemini API client
let genAI: GoogleGenerativeAI | null = null;
const parseApiKeys = (rawValue?: string): string[] => {
  if (!rawValue) return [];
  return rawValue
    .split(/[\n,]+/)
    .map((apiKey) => apiKey.trim())
    .filter(Boolean);
};

const ENV_API_KEYS = [
  process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY2,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY3,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY4,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY5,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY6,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY7,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY8,
  ...parseApiKeys(process.env.EXPO_PUBLIC_GEMINI_API_KEYS),
]
  .map((apiKey) => apiKey?.trim())
  .filter((apiKey): apiKey is string => Boolean(apiKey));

const uniqueApiKeys = (apiKeys: string[]): string[] =>
  Array.from(new Set(apiKeys));

let geminiApiKeys = uniqueApiKeys([...ENV_API_KEYS]);
let geminiApiKeyIndex = 0;

const updateGeminiClient = (): void => {
  const activeApiKey = geminiApiKeys[geminiApiKeyIndex];
  genAI = activeApiKey ? new GoogleGenerativeAI(activeApiKey) : null;
};

const rotateGeminiApiKey = (): void => {
  if (geminiApiKeys.length <= 1) {
    return;
  }

  geminiApiKeyIndex = (geminiApiKeyIndex + 1) % geminiApiKeys.length;
  updateGeminiClient();
  console.warn(
    `[Gemini] Switched API key ${geminiApiKeyIndex + 1}/${geminiApiKeys.length} after rate limit`,
  );
};

if (geminiApiKeys.length > 0) {
  updateGeminiClient();
}

/**
 * Updates the Gemini API key
 * @param apiKey - The new API key to use
 */
export function setGeminiApiKey(apiKey: string): void {
  const customApiKeys = parseApiKeys(apiKey);

  if (customApiKeys.length > 0) {
    console.log(
      `Setting custom Gemini API key${customApiKeys.length > 1 ? "s" : ""}`,
    );
    geminiApiKeys = uniqueApiKeys([...customApiKeys, ...ENV_API_KEYS]);
    geminiApiKeyIndex = 0;
    updateGeminiClient();
  } else if (ENV_API_KEYS.length > 0) {
    console.log("Reverting to environment Gemini API keys");
    geminiApiKeys = uniqueApiKeys([...ENV_API_KEYS]);
    geminiApiKeyIndex = 0;
    updateGeminiClient();
  } else {
    console.log("Removing Gemini API key");
    geminiApiKeys = [];
    geminiApiKeyIndex = 0;
    genAI = null;
  }
}

// Caches for recent predictions to reduce API calls
const groceryCategoryCache = new Map<
  string,
  { category: GroceryCategory; timestamp: number }
>();
const expenseCategoryCache = new Map<
  string,
  { category: ExpenseCategory; timestamp: number }
>();
const groceryCategoryInFlight = new Map<
  string,
  Promise<GroceryCategory | null>
>();
const expenseCategoryInFlight = new Map<
  string,
  Promise<ExpenseCategory | null>
>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const VOICE_PARSE_TIMEOUT_MS = 10_000;

const GEMINI_MODEL_ID = "gemini-flash-lite-latest";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiTrackParams {
  spanName: string;
  traceId: string;
  startedAt: number;
  inputText?: string;
  outputText?: string;
  response?: unknown;
  isError?: boolean;
  error?: Error | unknown;
  properties?: PostHogEventProperties;
}

const toTokenCount = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
};

const extractGeminiUsage = (
  response: unknown,
): { inputTokens?: number; outputTokens?: number } => {
  if (typeof response !== "object" || response === null) {
    return {};
  }

  const maybeUsage =
    "usageMetadata" in response
      ? (response as { usageMetadata?: GeminiUsageMetadata }).usageMetadata
      : undefined;

  if (!maybeUsage) {
    return {};
  }

  const inputTokens = toTokenCount(maybeUsage.promptTokenCount);
  const outputTokens = toTokenCount(maybeUsage.candidatesTokenCount);

  if (inputTokens !== undefined || outputTokens !== undefined) {
    return { inputTokens, outputTokens };
  }

  const totalTokens = toTokenCount(maybeUsage.totalTokenCount);
  if (totalTokens !== undefined) {
    return { inputTokens: totalTokens };
  }

  return {};
};

const trackGeminiGeneration = ({
  spanName,
  traceId,
  startedAt,
  inputText,
  outputText,
  response,
  isError,
  error,
  properties,
}: GeminiTrackParams): void => {
  const usage = extractGeminiUsage(response);

  trackLlmGeneration({
    traceId,
    spanName,
    model: GEMINI_MODEL_ID,
    provider: "gemini",
    baseUrl: GEMINI_BASE_URL,
    inputText,
    outputText,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latencyMs: Date.now() - startedAt,
    isError,
    error,
    properties,
  });
};

/**
 * Detects the category of a grocery item using Gemini AI
 * @param itemName - The name of the grocery item
 * @returns The predicted GroceryCategory or null if detection fails
 */
export async function detectItemCategory(
  itemName: string,
): Promise<GroceryCategory | null> {
  const traceId = createLlmTraceId("detect_item_category");
  const startedAt = Date.now();
  const spanName = "detect_item_category";

  try {
    // Validate input
    if (!itemName || itemName.trim().length < 2) {
      return null;
    }

    const normalizedName = itemName.trim().toLowerCase();

    // Check cache first
    const cached = groceryCategoryCache.get(normalizedName);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.category;
    }

    const sqliteCachedCategory = await getAiCacheValue<GroceryCategory>(
      "grocery_category",
      normalizedName,
    );
    if (sqliteCachedCategory) {
      groceryCategoryCache.set(normalizedName, {
        category: sqliteCachedCategory,
        timestamp: Date.now(),
      });

      trackGeminiGeneration({
        spanName,
        traceId,
        startedAt,
        inputText: itemName,
        outputText: sqliteCachedCategory,
        properties: {
          llm_feature: "grocery_category_detection",
          llm_cache_layer: "sqlite",
          llm_cache_hit: true,
        },
      });

      return sqliteCachedCategory;
    }

    const inFlight = groceryCategoryInFlight.get(normalizedName);
    if (inFlight) {
      return inFlight;
    }

    const requestPromise = (async (): Promise<GroceryCategory | null> => {
      try {
        // Check if API key is configured
        if (!genAI) {
          console.warn("Gemini API key not configured");
          return null;
        }

        // Create the prompt with available categories
        // Sanitize user input to prevent prompt injection
        const sanitizedItemName = sanitizeForAIPrompt(itemName, 100);
        const categoryList = GROCERY_CATEGORIES.map((cat) => cat.value).join(
          ", ",
        );
        const prompt = `You are a grocery categorization assistant. Given a grocery item name, classify it into ONE of these categories: ${categoryList}.

Item name: "${sanitizedItemName}"

Rules:
- Return ONLY the category name, nothing else
- Choose the most appropriate category
- If unsure, use "other"
- Response must be one of: ${categoryList}

Category:`;

        // Generate content with timeout and retry
        const result = await retryWithBackoff(
          async () => {
            if (!genAI) {
              throw new Error("Gemini API key not configured");
            }

            const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
            return await Promise.race([
              model.generateContent(prompt),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ]);
          },
          "detectItemCategory",
          rotateGeminiApiKey,
        );

        // Extract the response
        const response = await result.response;
        const text = response.text().trim().toLowerCase();

        // Validate the response is a valid category
        const category = GROCERY_CATEGORIES.find(
          (cat) => cat.value === text,
        )?.value;

        trackGeminiGeneration({
          spanName,
          traceId,
          startedAt,
          inputText: sanitizedItemName,
          outputText: text,
          response,
          properties: {
            llm_feature: "grocery_category_detection",
            llm_detection_success: Boolean(category),
            llm_cache_hit: false,
          },
        });

        if (category) {
          // Cache the result
          groceryCategoryCache.set(normalizedName, {
            category,
            timestamp: Date.now(),
          });
          await setAiCacheValue(
            "grocery_category",
            normalizedName,
            category,
            CACHE_DURATION,
          );
          return category;
        }

        return null;
      } catch (error) {
        trackGeminiGeneration({
          spanName,
          traceId,
          startedAt,
          inputText: itemName,
          isError: true,
          error,
          properties: {
            llm_feature: "grocery_category_detection",
            llm_cache_hit: false,
          },
        });

        console.error("Error detecting category with Gemini:", error);
        return null;
      }
    })().finally(() => {
      groceryCategoryInFlight.delete(normalizedName);
    });

    groceryCategoryInFlight.set(normalizedName, requestPromise);
    return requestPromise;
  } catch (error) {
    trackGeminiGeneration({
      spanName,
      traceId,
      startedAt,
      inputText: itemName,
      isError: true,
      error,
      properties: {
        llm_feature: "grocery_category_detection",
        llm_cache_hit: false,
      },
    });

    console.error("Error detecting category with Gemini:", error);
    return null;
  }
}

/**
 * Clears the category cache
 */
export function clearCategoryCache(): void {
  groceryCategoryCache.clear();
  expenseCategoryCache.clear();
}

/**
 * Detects the category of an expense based on its description
 * @param description - The description of the expense
 * @returns The predicted ExpenseCategory or null if detection fails
 */
export async function detectExpenseCategory(
  description: string,
): Promise<ExpenseCategory | null> {
  const traceId = createLlmTraceId("detect_expense_category");
  const startedAt = Date.now();
  const spanName = "detect_expense_category";

  try {
    // Validate input
    if (!description || description.trim().length < 2) {
      return null;
    }

    const normalizedDesc = description.trim().toLowerCase();

    // Check cache first
    const cached = expenseCategoryCache.get(normalizedDesc);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.category;
    }

    const sqliteCachedCategory = await getAiCacheValue<ExpenseCategory>(
      "expense_category",
      normalizedDesc,
    );
    if (sqliteCachedCategory) {
      expenseCategoryCache.set(normalizedDesc, {
        category: sqliteCachedCategory,
        timestamp: Date.now(),
      });

      trackGeminiGeneration({
        spanName,
        traceId,
        startedAt,
        inputText: description,
        outputText: sqliteCachedCategory,
        properties: {
          llm_feature: "expense_category_detection",
          llm_cache_layer: "sqlite",
          llm_cache_hit: true,
        },
      });

      return sqliteCachedCategory;
    }

    const inFlight = expenseCategoryInFlight.get(normalizedDesc);
    if (inFlight) {
      return inFlight;
    }

    const requestPromise = (async (): Promise<ExpenseCategory | null> => {
      try {
        // Check if API key is configured
        if (!genAI) {
          console.warn("Gemini API key not configured");
          return null;
        }

        const categoryList = EXPENSE_CATEGORIES.map((cat) => cat.value).join(
          ", ",
        );

        // Sanitize user input to prevent prompt injection
        const sanitizedDescription = sanitizeForAIPrompt(description, 200);

        const prompt = `You are an expense categorization assistant. Given an expense description, classify it into ONE of these categories: ${categoryList}.

Description: "${sanitizedDescription}"

Rules:
- Return ONLY the category name, nothing else
- Choose the most appropriate category based on the description
- If unsure, use "other"
- Response must be one of: ${categoryList}

Examples:
- "Lunch at restaurant" → food
- "Taxi to office" → transport
- "New shoes" → shopping
- "Movie tickets" → entertainment
- "Doctor visit" → healthcare
- "Electricity bill" → bills
- "Online course" → education

Category:`;

        // Generate content with timeout and retry
        const result = await retryWithBackoff(
          async () => {
            if (!genAI) {
              throw new Error("Gemini API key not configured");
            }

            const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
            return await Promise.race([
              model.generateContent(prompt),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ]);
          },
          "detectExpenseCategory",
          rotateGeminiApiKey,
        );

        // Extract the response
        const response = await result.response;
        const text = response.text().trim().toLowerCase();

        const matchedCategory = EXPENSE_CATEGORIES.find(
          (category) => category.value === text,
        )?.value;
        const isValidCategory = Boolean(matchedCategory);

        trackGeminiGeneration({
          spanName,
          traceId,
          startedAt,
          inputText: sanitizedDescription,
          outputText: text,
          response,
          properties: {
            llm_feature: "expense_category_detection",
            llm_detection_success: isValidCategory,
            llm_cache_hit: false,
          },
        });

        // Validate the response is a valid category
        if (matchedCategory) {
          // Cache the result
          expenseCategoryCache.set(normalizedDesc, {
            category: matchedCategory,
            timestamp: Date.now(),
          });
          await setAiCacheValue(
            "expense_category",
            normalizedDesc,
            matchedCategory,
            CACHE_DURATION,
          );
          return matchedCategory;
        }

        return null;
      } catch (error) {
        trackGeminiGeneration({
          spanName,
          traceId,
          startedAt,
          inputText: description,
          isError: true,
          error,
          properties: {
            llm_feature: "expense_category_detection",
            llm_cache_hit: false,
          },
        });

        console.error("Error detecting expense category with Gemini:", error);
        return null;
      }
    })().finally(() => {
      expenseCategoryInFlight.delete(normalizedDesc);
    });

    expenseCategoryInFlight.set(normalizedDesc, requestPromise);
    return requestPromise;
  } catch (error) {
    trackGeminiGeneration({
      spanName,
      traceId,
      startedAt,
      inputText: description,
      isError: true,
      error,
      properties: {
        llm_feature: "expense_category_detection",
        llm_cache_hit: false,
      },
    });

    console.error("Error detecting expense category with Gemini:", error);
    return null;
  }
}

export interface VoiceParsedExpense {
  amount: number;
  description: string;
  category?: ExpenseCategory;
}

export interface VoiceParsedGrocery {
  name: string;
  quantity?: string;
  price?: number;
  category?: GroceryCategory;
}

export interface VoiceParsedResult {
  expenses: VoiceParsedExpense[];
  groceries: VoiceParsedGrocery[];
}

const extractJsonPayload = (raw: string): string | null => {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeExpenseCategory = (
  value: unknown,
): ExpenseCategory | undefined => {
  if (!value) return undefined;
  const normalized = normalizeString(value).toLowerCase();
  const match = EXPENSE_CATEGORIES.find((cat) => cat.value === normalized);
  return match?.value;
};

const normalizeGroceryCategory = (
  value: unknown,
): GroceryCategory | undefined => {
  if (!value) return undefined;
  const normalized = normalizeString(value).toLowerCase();
  const match = GROCERY_CATEGORIES.find((cat) => cat.value === normalized);
  return match?.value;
};

const ALLOWED_CURRENCY_CODES = new Set(CURRENCIES.map((currency) => currency.code));
const ALLOWED_LANGUAGE_CODES = new Set(["en", "bn"]);

const sanitizeCurrencyCode = (currencyCode: string): string => {
  const normalized = currencyCode.trim().toUpperCase();
  return ALLOWED_CURRENCY_CODES.has(normalized) ? normalized : "USD";
};

const sanitizeLanguageCode = (language: string): string => {
  const normalized = language.trim().toLowerCase();
  return ALLOWED_LANGUAGE_CODES.has(normalized) ? normalized : "en";
};

export async function parseVoiceInput(
  transcript: string,
  options: { currencyCode: string; language: string },
): Promise<VoiceParsedResult | null> {
  const traceId = createLlmTraceId("parse_voice_input");
  const startedAt = Date.now();
  const spanName = "parse_voice_input";

  try {
    if (!transcript || transcript.trim().length < 4) return null;
    if (!genAI) {
      console.warn("Gemini API key not configured");
      return null;
    }

    const expenseCategories = EXPENSE_CATEGORIES.map((cat) => cat.value).join(
      ", ",
    );
    const groceryCategories = GROCERY_CATEGORIES.map((cat) => cat.value).join(
      ", ",
    );

    // Sanitize transcript to prevent prompt injection
    const sanitizedTranscript = sanitizeForAIPrompt(transcript, 1000);
    const sanitizedCurrencyCode = sanitizeCurrencyCode(options.currencyCode);
    const sanitizedLanguage = sanitizeLanguageCode(options.language);

    const prompt = `You are an assistant that extracts expenses and grocery items from speech transcripts.
Return ONLY valid JSON with this exact shape:
{
  "expenses": [
    {
      "amount": number,
      "description": string,
      "category": "${expenseCategories}" | "other"
    }
  ],
  "groceries": [
    {
      "name": string,
      "quantity": string,
      "price": number,
      "category": "${groceryCategories}" | "other"
    }
  ]
}

Rules:
- if input is bangla give bangla if not english.
- Use numeric values for amount/price (no currency symbols).
- Use only these expense categories: ${expenseCategories}.
- Use only these grocery categories: ${groceryCategories}.
- If category is unclear, use "other".
- If amount or name is missing, omit the item.
- Keep quantity as a short string (e.g., "10", "2kg", "1 liter").
- The user's currency is ${sanitizedCurrencyCode} and language is ${sanitizedLanguage}.

Transcript:
"""
${sanitizedTranscript}
"""`;

    const result = await retryWithBackoff(
      async () => {
        if (!genAI) {
          throw new Error("Gemini API key not configured");
        }

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
        return await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), VOICE_PARSE_TIMEOUT_MS),
          ),
        ]);
      },
      "parseVoiceInput",
      rotateGeminiApiKey,
    );

    const response = await result.response;
    const rawText = response.text().trim();
    const jsonText = extractJsonPayload(rawText) ?? rawText;

    const parsed = JSON.parse(jsonText) as Partial<VoiceParsedResult>;

    const expenses = Array.isArray(parsed.expenses)
      ? parsed.expenses
        .map((item) => {
          const amount = normalizeNumber((item as any)?.amount);
          const description = normalizeString((item as any)?.description);
          if (!amount || !description) return null;
          return {
            amount,
            description,
            category: normalizeExpenseCategory((item as any)?.category),
          } as VoiceParsedExpense;
        })
        .filter(Boolean)
      : [];

    const groceries = Array.isArray(parsed.groceries)
      ? parsed.groceries
        .map((item) => {
          const name = normalizeString((item as any)?.name);
          if (!name) return null;
          const quantity = normalizeString((item as any)?.quantity);
          const price = normalizeNumber((item as any)?.price);
          const normalizedPrice =
            price !== null && price > 0 ? price : undefined;
          return {
            name,
            quantity: quantity || undefined,
            price: normalizedPrice,
            category: normalizeGroceryCategory((item as any)?.category),
          } as VoiceParsedGrocery;
        })
        .filter(Boolean)
      : [];

    trackGeminiGeneration({
      spanName,
      traceId,
      startedAt,
      inputText: sanitizedTranscript,
      outputText: rawText,
      response,
      properties: {
        llm_feature: "voice_parse",
        llm_currency: sanitizedCurrencyCode,
        llm_language: sanitizedLanguage,
        llm_expense_count: expenses.length,
        llm_grocery_count: groceries.length,
      },
    });

    return {
      expenses: expenses as VoiceParsedExpense[],
      groceries: groceries as VoiceParsedGrocery[],
    };
  } catch (error) {
    trackGeminiGeneration({
      spanName,
      traceId,
      startedAt,
      inputText: transcript,
      isError: true,
      error,
      properties: {
        llm_feature: "voice_parse",
      },
    });

    console.error("Error parsing voice input with Gemini:", error);
    return null;
  }
}
