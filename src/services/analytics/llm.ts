import type { JsonType, PostHogEventProperties } from "@posthog/core";
import { trackEvent } from "./posthog";

const AI_GENERATION_EVENT = "$ai_generation";
const REDACTED_LABEL = "[redacted]";

type LLMRole = "system" | "user" | "assistant";

interface LLMMessage {
  role: LLMRole;
  content: {
    type: "text";
    text: string;
  }[];
}

export interface TrackLlmGenerationParams {
  spanName: string;
  model: string;
  provider: string;
  traceId?: string;
  sessionId?: string;
  baseUrl?: string;
  requestUrl?: string;
  inputText?: string;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  isError?: boolean;
  error?: Error | unknown;
  httpStatus?: number;
  properties?: PostHogEventProperties;
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
};

const toLatencySeconds = (latencyMs: number | undefined): number | undefined => {
  const ms = toFiniteNumber(latencyMs);
  if (ms === undefined) return undefined;
  return Number((ms / 1000).toFixed(3));
};

const normalizeTraceComponent = (value: string): string => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~@()!':|\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "llm";
};

const toRedactedText = (text: string): string => {
  const normalized = text.trim();
  if (!normalized) return REDACTED_LABEL;
  return `${REDACTED_LABEL}:${normalized.length}`;
};

const toMessage = (role: LLMRole, text: string): LLMMessage => ({
  role,
  content: [{ type: "text", text: toRedactedText(text) }],
});

const normalizeError = (error: Error | unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const extractHttpStatusCode = (
  error: Error | unknown,
): number | undefined => {
  if (typeof error === "object" && error !== null) {
    if (
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
    ) {
      const status = (error as { status: number }).status;
      if (status >= 100 && status <= 599) {
        return status;
      }
    }

    if (
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
    ) {
      const statusCode = (error as { statusCode: number }).statusCode;
      if (statusCode >= 100 && statusCode <= 599) {
        return statusCode;
      }
    }
  }

  const message = normalizeError(error);
  const match = message.match(
    /(?:status\s*(?:code)?\s*[:=]\s*(\d{3})|status\s+code\s*[:=]?\s*(\d{3})|HTTP\s*(\d{3}))/i,
  );
  if (!match) return undefined;

  const code = match[1] ?? match[2] ?? match[3];
  if (!code) return undefined;

  const parsed = Number.parseInt(code, 10);
  return parsed >= 100 && parsed <= 599 ? parsed : undefined;
};

export const createLlmTraceId = (spanName: string): string => {
  const span = normalizeTraceComponent(spanName);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `${span}-${timestamp}-${random}`;
};

export const trackLlmGeneration = ({
  spanName,
  model,
  provider,
  traceId,
  sessionId,
  baseUrl,
  requestUrl,
  inputText,
  outputText,
  inputTokens,
  outputTokens,
  latencyMs,
  isError,
  error,
  httpStatus,
  properties,
}: TrackLlmGenerationParams): string => {
  const resolvedTraceId = traceId ?? createLlmTraceId(spanName);
  const resolvedInputTokens = toFiniteNumber(inputTokens);
  const resolvedOutputTokens = toFiniteNumber(outputTokens);
  const resolvedLatency = toLatencySeconds(latencyMs);
  const resolvedError = error ? normalizeError(error) : undefined;
  const resolvedStatus =
    typeof httpStatus === "number" ? httpStatus : extractHttpStatusCode(error);

  const payload: PostHogEventProperties = {
    ...properties,
    $ai_trace_id: resolvedTraceId,
    $ai_span_name: spanName,
    $ai_model: model,
    $ai_provider: provider,
    $ai_is_error: isError ?? Boolean(error),
  };

  if (resolvedInputTokens !== undefined) {
    payload.$ai_input_tokens = resolvedInputTokens;
  }

  if (resolvedOutputTokens !== undefined) {
    payload.$ai_output_tokens = resolvedOutputTokens;
  }

  if (resolvedLatency !== undefined) {
    payload.$ai_latency = resolvedLatency;
  }

  if (resolvedStatus !== undefined) {
    payload.$ai_http_status = resolvedStatus;
  }

  if (baseUrl) {
    payload.$ai_base_url = baseUrl;
  }

  if (requestUrl) {
    payload.$ai_request_url = requestUrl;
  }

  if (resolvedError) {
    payload.$ai_error = resolvedError;
  }

  if (sessionId) {
    payload.$ai_session_id = sessionId;
  }

  if (inputText !== undefined) {
    payload.$ai_input = [toMessage("user", inputText)] as unknown as JsonType;
  }

  if (outputText !== undefined) {
    payload.$ai_output_choices = [
      toMessage("assistant", outputText),
    ] as unknown as JsonType;
  }

  trackEvent(AI_GENERATION_EVENT, payload);

  return resolvedTraceId;
};
