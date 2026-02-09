/**
 * PostHog Analytics Service
 * Core analytics functionality for tracking user behavior, events, and errors
 */

import PostHog from "posthog-react-native";
import { AnalyticsEventName } from "./events";

// PostHog configuration from environment variables
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST!;

// PostHog-compatible property type
type PostHogEventProperties = {
  [key: string]: string | number | boolean | null | string[] | number[];
};

// Singleton instance - will be set by PostHogProvider integration
let posthogClient: PostHog | null = null;

// Queue for events captured before client is ready
let eventQueue: { event: string; properties?: PostHogEventProperties }[] = [];

/**
 * Set the PostHog client from PostHogProvider
 * This should be called once when the provider mounts
 */
export const setPostHogClient = (client: PostHog | null): void => {
  posthogClient = client;
  
  // Flush queued events if client is now available
  if (client && eventQueue.length > 0) {
    eventQueue.forEach(({ event, properties }) => {
      client.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        queued: true,
      });
    });
    eventQueue = [];
  }
};

/**
 * Initialize PostHog client
 * @deprecated Use PostHogProvider and setPostHogClient instead
 */
export const initializeAnalytics = async (): Promise<PostHog> => {
  if (posthogClient) {
    return posthogClient;
  }

  posthogClient = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    captureAppLifecycleEvents: true,
    flushAt: 20,
    flushInterval: 30000, // 30 seconds
    enableSessionReplay: true,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: false,
    },
  });

  // Enable debug mode in development
  if (__DEV__) {
    posthogClient.debug(true);
  }

  return posthogClient;
};

/**
 * Get the PostHog client instance
 */
export const getPostHogClient = (): PostHog | null => {
  return posthogClient;
};

/**
 * Identify a user with their properties
 * Call this after user data is loaded or updated
 */
export const identifyUser = (
  userId: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  posthogClient.identify(userId, {
    $set: properties ?? {},
    $set_once: {
      first_seen_at: new Date().toISOString(),
    },
  });
};

/**
 * Track a custom event
 */
export const trackEvent = (
  event: AnalyticsEventName | string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Queue event if client not yet available - it will be sent once connected
    eventQueue.push({ event, properties });
    return;
  }

  posthogClient.capture(event, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Track a screen view
 */
export const trackScreen = (
  screenName: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  posthogClient.screen(screenName, properties);
};

/**
 * Capture an error/exception with context
 */
export const captureError = (
  error: Error | unknown,
  context?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  const errorData: PostHogEventProperties =
    error instanceof Error
      ? {
          error_message: error.message,
          error_stack: error.stack ?? "",
        }
      : {
          error_message: String(error),
        };

  posthogClient.captureException(error as Error, {
    ...errorData,
    ...context,
    captured_at: new Date().toISOString(),
  });
};

/**
 * Associate user with a group (e.g., organization, team)
 */
export const setGroup = (
  groupType: string,
  groupId: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  posthogClient.group(groupType, groupId, properties);
};

/**
 * Set super properties that are sent with every event
 */
export const setSuperProperties = (
  properties: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  posthogClient.register(properties);
};

/**
 * Flush all pending events immediately
 * Call this before app goes to background
 */
export const flushEvents = async (): Promise<void> => {
  if (!posthogClient) {
    return;
  }

  await posthogClient.flush();
};

/**
 * Reset the user identification
 * Call this on logout
 */
export const resetAnalytics = (): void => {
  if (!posthogClient) {
    return;
  }

  posthogClient.reset();
};

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flagKey: string): boolean => {
  if (!posthogClient) {
    return false;
  }

  return posthogClient.isFeatureEnabled(flagKey) ?? false;
};

/**
 * Get a feature flag value
 */
export const getFeatureFlag = (
  flagKey: string
): boolean | string | undefined => {
  if (!posthogClient) {
    return undefined;
  }

  return posthogClient.getFeatureFlag(flagKey);
};

// Export analytics service as object for convenience
export const Analytics = {
  initialize: initializeAnalytics,
  getClient: getPostHogClient,
  identify: identifyUser,
  track: trackEvent,
  screen: trackScreen,
  captureError,
  group: setGroup,
  setSuperProperties,
  flush: flushEvents,
  reset: resetAnalytics,
  isFeatureEnabled,
  getFeatureFlag,
};

export default Analytics;
