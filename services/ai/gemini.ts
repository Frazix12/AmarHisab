import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  GROCERY_CATEGORIES,
  GroceryCategory,
} from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
let genAI: GoogleGenerativeAI | null = null;
const ENV_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

if (ENV_API_KEY) {
  genAI = new GoogleGenerativeAI(ENV_API_KEY);
}

/**
 * Updates the Gemini API key
 * @param apiKey - The new API key to use
 */
export function setGeminiApiKey(apiKey: string): void {
  if (apiKey) {
    console.log("Setting custom Gemini API key");
    genAI = new GoogleGenerativeAI(apiKey);
  } else if (ENV_API_KEY) {
    console.log("Reverting to environment Gemini API key");
    genAI = new GoogleGenerativeAI(ENV_API_KEY);
  } else {
    console.log("Removing Gemini API key");
    genAI = null;
  }
}

// Cache for recent predictions to reduce API calls
const categoryCache = new Map<
  string,
  { category: GroceryCategory; timestamp: number }
>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Detects the category of a grocery item using Gemini AI
 * @param itemName - The name of the grocery item
 * @returns The predicted GroceryCategory or null if detection fails
 */
export async function detectItemCategory(
  itemName: string,
): Promise<GroceryCategory | null> {
  try {
    // Validate input
    if (!itemName || itemName.trim().length < 2) {
      return null;
    }

    const normalizedName = itemName.trim().toLowerCase();

    // Check cache first
    const cached = categoryCache.get(normalizedName);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.category;
    }

    // Check if API key is configured
    if (!genAI) {
      console.warn("Gemini API key not configured");
      return null;
    }

    // Use Gemini 1.5 Flash for fast inference
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    // Create the prompt with available categories
    const categoryList = GROCERY_CATEGORIES.map((cat) => cat.value).join(", ");
    const prompt = `You are a grocery categorization assistant. Given a grocery item name, classify it into ONE of these categories: ${categoryList}.

Item name: "${itemName}"

Rules:
- Return ONLY the category name, nothing else
- Choose the most appropriate category
- If unsure, use "other"
- Response must be one of: ${categoryList}

Category:`;

    // Generate content with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      ),
    ]);

    // Extract the response
    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    // Validate the response is a valid category
    const category = GROCERY_CATEGORIES.find(
      (cat) => cat.value === text,
    )?.value;

    if (category) {
      // Cache the result
      categoryCache.set(normalizedName, {
        category,
        timestamp: Date.now(),
      });
      return category;
    }

    return null;
  } catch (error) {
    console.error("Error detecting category with Gemini:", error);
    return null;
  }
}

/**
 * Clears the category cache
 */
export function clearCategoryCache(): void {
  categoryCache.clear();
}

/**
 * Detects the category of an expense based on its description
 * @param description - The description of the expense
 * @returns The predicted ExpenseCategory or null if detection fails
 */
export async function detectExpenseCategory(
  description: string,
): Promise<string | null> {
  try {
    // Validate input
    if (!description || description.trim().length < 2) {
      return null;
    }

    const normalizedDesc = description.trim().toLowerCase();

    // Check cache first
    const cached = categoryCache.get(`exp_${normalizedDesc}`);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.category as string;
    }

    // Check if API key is configured
    if (!genAI) {
      console.warn("Gemini API key not configured");
      return null;
    }

    // Use Gemini 1.5 Flash for fast inference
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    // Expense categories list
    const expenseCategories = [
      "food",
      "transport",
      "shopping",
      "entertainment",
      "healthcare",
      "bills",
      "education",
      "other",
    ];
    const categoryList = expenseCategories.join(", ");

    const prompt = `You are an expense categorization assistant. Given an expense description, classify it into ONE of these categories: ${categoryList}.

Description: "${description}"

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

    // Generate content with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      ),
    ]);

    // Extract the response
    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    // Validate the response is a valid category
    if (expenseCategories.includes(text)) {
      // Cache the result
      categoryCache.set(`exp_${normalizedDesc}`, {
        category: text as any,
        timestamp: Date.now(),
      });
      return text;
    }

    return null;
  } catch (error) {
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

export async function parseVoiceInput(
  transcript: string,
  options: { currencyCode: string; language: string },
): Promise<VoiceParsedResult | null> {
  try {
    if (!transcript || transcript.trim().length < 4) return null;
    if (!genAI) {
      console.warn("Gemini API key not configured");
      return null;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const expenseCategories = EXPENSE_CATEGORIES.map((cat) => cat.value).join(
      ", ",
    );
    const groceryCategories = GROCERY_CATEGORIES.map((cat) => cat.value).join(
      ", ",
    );

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
- Use numeric values for amount/price (no currency symbols).
- Use only these expense categories: ${expenseCategories}.
- Use only these grocery categories: ${groceryCategories}.
- If category is unclear, use "other".
- If amount or name is missing, omit the item.
- Keep quantity as a short string (e.g., "10", "2kg", "1 liter").
- The user's currency is ${options.currencyCode} and language is ${options.language}.

Transcript:
"""
${transcript}
"""`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 12000),
      ),
    ]);

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
            return {
              name,
              quantity: quantity || undefined,
              price: price ?? undefined,
              category: normalizeGroceryCategory((item as any)?.category),
            } as VoiceParsedGrocery;
          })
          .filter(Boolean)
      : [];

    return {
      expenses: expenses as VoiceParsedExpense[],
      groceries: groceries as VoiceParsedGrocery[],
    };
  } catch (error) {
    console.error("Error parsing voice input with Gemini:", error);
    return null;
  }
}
