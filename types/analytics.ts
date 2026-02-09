/**
 * Analytics Types
 * Type definitions for PostHog analytics tracking
 */

import { ExpenseCategory, GroceryCategory } from "./index";

/**
 * PostHog-compatible property value types
 */
type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonPrimitive[];
type JsonObject = { [key: string]: JsonPrimitive | JsonArray };
export type PostHogValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Base properties interface compatible with PostHog
 */
export interface PostHogProperties {
  [key: string]: PostHogValue | undefined;
}

/**
 * User properties for identification.
 * 
 * PRIVACY NOTICE:
 * - `email` should ONLY be set when user has given explicit consent for analytics.
 * - Prefer `analytics_id` for anonymous tracking without PII.
 * - Ensure PostHog data retention settings align with privacy policy.
 * - Code paths that marshal AnalyticsUserProperties must check consent before including email.
 * 
 * @see identifyUser in services/analytics/posthog.ts
 */
export interface AnalyticsUserProperties extends PostHogProperties {
  /** 
   * @deprecated Avoid using raw email for privacy. Only set with explicit user consent. 
   * Use analytics_id for anonymous tracking instead.
   */
  email?: string;
  /** Stable anonymous identifier - preferred over email for analytics */
  analytics_id?: string;
  name?: string;
  language?: string;
  currency?: string;
  theme?: "light" | "dark" | "system";
  app_version?: string;
  device_type?: string;
}

/**
 * Expense event properties
 */
export interface ExpenseEventProperties extends PostHogProperties {
  expense_id?: string;
  amount?: number;
  category?: ExpenseCategory;
  currency?: string;
  has_image?: boolean;
  ai_detected?: boolean;
}

/**
 * Grocery event properties
 * Note: item_name intentionally omitted to avoid PII in analytics
 */
export interface GroceryEventProperties extends PostHogProperties {
  item_id?: string;
  /** @deprecated Avoid sending user-entered text to analytics - use category instead */
  item_name?: string;
  category?: GroceryCategory;
  price?: number | null;
  has_price?: boolean;
  has_template?: boolean;
  ai_detected?: boolean;
}

/**
 * Template event properties
 */
export interface TemplateEventProperties extends PostHogProperties {
  template_id?: string;
  template_name?: string;
  source?: "manual" | "learned";
  usage_count?: number;
}

/**
 * Settings event properties
 */
export interface SettingsEventProperties extends PostHogProperties {
  setting_name?: string;
  old_value?: string;
  new_value?: string;
}

/**
 * Sanitize error stack to remove sensitive data before sending to analytics.
 * Strips absolute file paths, env-specific info, and truncates to safe length.
 * 
 * @param stack - The raw error stack trace
 * @param maxLength - Maximum length of sanitized output (default: 1000)
 * @returns Sanitized stack trace safe for analytics
 */
export function sanitizeErrorStack(
  stack: string | undefined,
  maxLength = 1000
): string {
  if (!stack) return "";

  let sanitized = stack
    // Remove absolute file paths - keep only filename (Unix paths)
    .replace(/(?:\/[\w.-]+)+\/([\w.-]+\.(ts|js|tsx|jsx))/g, "$1")
    // Remove Windows absolute paths
    .replace(/[A-Z]:\\(?:[\w.-]+\\)+/gi, "")
    // Remove quoted values longer than 50 chars that might contain secrets/PII
    .replace(/"[^"]{50,}"/g, '"[REDACTED]"')
    .replace(/'[^']{50,}'/g, "'[REDACTED]'")
    // Remove potential env vars or config values
    .replace(/=[A-Za-z0-9+/=]{20,}/g, "=[REDACTED]");

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + "... [truncated]";
  }

  return sanitized;
}

/**
 * Error event properties
 * Always use sanitizeErrorStack() before setting error_stack
 */
export interface ErrorEventProperties extends PostHogProperties {
  error_message?: string;
  /** 
   * Should be sanitized with sanitizeErrorStack() before sending.
   * Raw stacks may contain file paths and sensitive data.
   */
  error_stack?: string;
  context?: string;
  screen?: string;
  user_action?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

/**
 * Screen event properties
 */
export interface ScreenEventProperties extends PostHogProperties {
  screen_name?: string;
  previous_screen?: string;
}

/**
 * Union type for all analytics properties
 */
export type AnalyticsProperties = PostHogProperties;
