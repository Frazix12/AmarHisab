/**
 * useAnalytics Hook
 * React hook for easy analytics tracking in components
 */

import { useCallback } from "react";
import { usePostHog } from "posthog-react-native";
import { AnalyticsEventName, AnalyticsEvents } from "./events";
import { ExpenseCategory, GroceryCategory } from "@/types";

// PostHog-compatible property type
type PostHogEventProperties = {
  [key: string]: string | number | boolean | null | string[] | number[];
};

/**
 * Hook return type
 */
export interface UseAnalyticsReturn {
  // Core methods
  track: (
    event: AnalyticsEventName | string,
    properties?: PostHogEventProperties
  ) => void;
  screen: (screenName: string, properties?: PostHogEventProperties) => void;
  identify: (userId: string, properties?: PostHogEventProperties) => void;
  captureError: (
    error: Error | unknown,
    context?: PostHogEventProperties
  ) => void;

  // Convenience methods for common events
  trackExpenseAdded: (props: {
    expense_id?: string;
    amount?: number;
    category?: ExpenseCategory;
    currency?: string;
    has_image?: boolean;
  }) => void;
  trackExpenseDeleted: (expenseId: string) => void;
  trackGroceryAdded: (props: {
    item_id?: string;
    item_name?: string;
    category?: GroceryCategory;
    price?: number | null;
  }) => void;
  trackGroceryCompleted: (props: {
    item_id?: string;
    item_name?: string;
    price?: number | null;
  }) => void;
  trackTemplateApplied: (props: {
    template_id?: string;
    template_name?: string;
  }) => void;
  trackSettingChanged: (props: {
    setting_name: string;
    old_value?: string;
    new_value?: string;
  }) => void;
}

/**
 * Analytics hook for components
 */
export const useAnalytics = (): UseAnalyticsReturn => {
  const posthog = usePostHog();

  // Core tracking
  const track = useCallback(
    (
      event: AnalyticsEventName | string,
      properties?: PostHogEventProperties
    ) => {
      posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    },
    [posthog]
  );

  const screen = useCallback(
    (screenName: string, properties?: PostHogEventProperties) => {
      posthog.screen(screenName, properties);
    },
    [posthog]
  );

  const identify = useCallback(
    (userId: string, properties?: PostHogEventProperties) => {
      posthog.identify(userId, properties);
    },
    [posthog]
  );

  const captureError = useCallback(
    (error: Error | unknown, context?: PostHogEventProperties) => {
      // Normalize unknown to Error instance for safe handling
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));

      const errorData: PostHogEventProperties = {
        error_message: normalizedError.message,
        error_stack: normalizedError.stack ?? "",
      };

      // Include original error info if it wasn't an Error instance
      if (!(error instanceof Error)) {
        errorData.original_error_type = typeof error;
      }

      posthog.captureException(normalizedError, {
        ...errorData,
        ...context,
      });
    },
    [posthog]
  );

  // ═══════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════

  const trackExpenseAdded = useCallback(
    (props: {
      expense_id?: string;
      amount?: number;
      category?: ExpenseCategory;
      currency?: string;
      has_image?: boolean;
    }) => {
      track(AnalyticsEvents.EXPENSE_ADDED, {
        expense_id: props.expense_id ?? "",
        amount: props.amount ?? 0,
        category: props.category ?? "",
        currency: props.currency ?? "",
        has_image: props.has_image ?? false,
      });
    },
    [track]
  );

  const trackExpenseDeleted = useCallback(
    (expenseId: string) => {
      track(AnalyticsEvents.EXPENSE_DELETED, { expense_id: expenseId });
    },
    [track]
  );

  const trackGroceryAdded = useCallback(
    (props: {
      item_id?: string;
      item_name?: string;
      category?: GroceryCategory;
      price?: number | null;
    }) => {
      track(AnalyticsEvents.GROCERY_ITEM_ADDED, {
        item_id: props.item_id ?? "",
        item_name: props.item_name ?? "",
        category: props.category ?? "",
        price: props.price ?? 0,
      });
    },
    [track]
  );

  const trackGroceryCompleted = useCallback(
    (props: { item_id?: string; item_name?: string; price?: number | null }) => {
      track(AnalyticsEvents.GROCERY_ITEM_COMPLETED, {
        item_id: props.item_id ?? "",
        item_name: props.item_name ?? "",
        price: props.price ?? 0,
      });
    },
    [track]
  );

  const trackTemplateApplied = useCallback(
    (props: { template_id?: string; template_name?: string }) => {
      track(AnalyticsEvents.TEMPLATE_APPLIED, {
        template_id: props.template_id ?? "",
        template_name: props.template_name ?? "",
      });
    },
    [track]
  );

  const trackSettingChanged = useCallback(
    (props: { setting_name: string; old_value?: string; new_value?: string }) => {
      // Use generic SETTING_CHANGED event for all setting changes
      track(AnalyticsEvents.SETTING_CHANGED, {
        setting_name: props.setting_name,
        old_value: props.old_value ?? "",
        new_value: props.new_value ?? "",
      });
    },
    [track]
  );

  return {
    track,
    screen,
    identify,
    captureError,
    trackExpenseAdded,
    trackExpenseDeleted,
    trackGroceryAdded,
    trackGroceryCompleted,
    trackTemplateApplied,
    trackSettingChanged,
  };
};

export default useAnalytics;
