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
 * User properties for identification
 */
export interface AnalyticsUserProperties extends PostHogProperties {
  email?: string;
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
 */
export interface GroceryEventProperties extends PostHogProperties {
  item_id?: string;
  item_name?: string;
  category?: GroceryCategory;
  price?: number | null;
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
 * Error event properties
 */
export interface ErrorEventProperties extends PostHogProperties {
  error_message?: string;
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
