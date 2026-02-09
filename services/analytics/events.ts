/**
 * Analytics Event Constants
 * Type-safe event names for consistent tracking across the app
 */

export const AnalyticsEvents = {
  // ═══════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════
  EXPENSE_ADDED: "expense_added",
  EXPENSE_UPDATED: "expense_updated",
  EXPENSE_DELETED: "expense_deleted",
  EXPENSE_VIEWED: "expense_viewed",

  // ═══════════════════════════════════════════════════════════
  // GROCERY
  // ═══════════════════════════════════════════════════════════
  GROCERY_ITEM_ADDED: "grocery_item_added",
  GROCERY_ITEM_UPDATED: "grocery_item_updated",
  GROCERY_ITEM_DELETED: "grocery_item_deleted",
  GROCERY_ITEM_TOGGLED: "grocery_item_toggled",
  GROCERY_ITEM_COMPLETED: "grocery_item_completed",
  GROCERY_LIST_CLEARED: "grocery_list_cleared",

  // ═══════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════
  TEMPLATE_CREATED: "template_created",
  TEMPLATE_APPLIED: "template_applied",
  TEMPLATE_UPDATED: "template_updated",
  TEMPLATE_DELETED: "template_deleted",
  TEMPLATE_SUGGESTION_SHOWN: "template_suggestion_shown",
  TEMPLATE_SUGGESTION_ACCEPTED: "template_suggestion_accepted",
  TEMPLATE_SUGGESTION_DISMISSED: "template_suggestion_dismissed",

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════
  SETTING_CHANGED: "setting_changed", // Generic setting change
  CURRENCY_CHANGED: "currency_changed",
  THEME_CHANGED: "theme_changed",
  LANGUAGE_CHANGED: "language_changed",
  API_KEY_UPDATED: "api_key_updated",
  DATA_CLEARED: "data_cleared",

  // ═══════════════════════════════════════════════════════════
  // AI FEATURES
  // ═══════════════════════════════════════════════════════════
  AI_CATEGORY_DETECTED: "ai_category_detected",
  VOICE_INPUT_STARTED: "voice_input_started",
  VOICE_INPUT_COMPLETED: "voice_input_completed",
  VOICE_INPUT_FAILED: "voice_input_failed",

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════
  SCREEN_VIEWED: "screen_viewed",
  TAB_CHANGED: "tab_changed",
  MODAL_OPENED: "modal_opened",
  MODAL_CLOSED: "modal_closed",

  // ═══════════════════════════════════════════════════════════
  // ERRORS
  // ═══════════════════════════════════════════════════════════
  ERROR_OCCURRED: "$exception",
  ERROR_BOUNDARY_TRIGGERED: "error_boundary_triggered",

  // ═══════════════════════════════════════════════════════════
  // APP LIFECYCLE
  // ═══════════════════════════════════════════════════════════
  APP_OPENED: "app_opened",
  APP_BACKGROUNDED: "app_backgrounded",
  APP_DATA_LOADED: "app_data_loaded",
} as const;

/**
 * Type for event names
 */
export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
