/**
 * PostHog Analytics Service
 * Core analytics functionality for tracking user behavior, events, and errors
 */

import PostHog from "posthog-react-native";
import { AnalyticsEventName } from "./events";

// PostHog configuration from environment variables
// Validated at startup - analytics will be disabled if missing
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;

// Log warning if env vars are missing (analytics will be disabled)
if (!POSTHOG_API_KEY || !POSTHOG_HOST) {
  console.warn(
    "[PostHog] Missing EXPO_PUBLIC_POSTHOG_API_KEY or EXPO_PUBLIC_POSTHOG_HOST - analytics disabled"
  );
}

// PostHog-compatible property type
type PostHogEventProperties = {
  [key: string]: string | number | boolean | null | string[] | number[];
};

// Queued event with original timestamp preserved
type QueuedEvent = {
  event: string;
  properties?: PostHogEventProperties;
  queuedAt: string; // Original timestamp when event was captured
};

// Queued identity operation
type QueuedIdentity = {
  userId: string;
  properties?: PostHogEventProperties;
};

// Queued screen event
type QueuedScreen = {
  screenName: string;
  properties?: PostHogEventProperties;
  queuedAt: string;
};

// Singleton instance - will be set by PostHogProvider integration
let posthogClient: PostHog | null = null;

// Queue for events captured before client is ready
let eventQueue: QueuedEvent[] = [];
const MAX_EVENT_QUEUE = 100;

// Queue for identity operations before client is ready
let identityQueue: QueuedIdentity[] = [];
const MAX_IDENTITY_QUEUE = 10;

// Queue for screen events before client is ready
let screenQueue: QueuedScreen[] = [];
const MAX_SCREEN_QUEUE = 50;

/**
 * Set the PostHog client from PostHogProvider
 * This should be called once when the provider mounts
 */
export const setPostHogClient = (client: PostHog | null): void => {
  posthogClient = client;

  // Flush queued operations if client is now available
  if (client) {
    // Flush identity queue first (so events are associated with user)
    if (identityQueue.length > 0) {
      identityQueue.forEach(({ userId, properties }) => {
        client.identify(userId, {
          $set: properties ?? {},
          $set_once: {
            first_seen_at: new Date().toISOString(),
          },
        });
      });
      identityQueue = [];
    }

    // Flush event queue with original timestamps
    if (eventQueue.length > 0) {
      eventQueue.forEach(({ event, properties, queuedAt }) => {
        client.capture(event, {
          ...properties,
          timestamp: queuedAt, // Use original timestamp, not current time
          queued: true,
        });
      });
      eventQueue = [];
    }

    // Flush screen queue with original timestamps
    if (screenQueue.length > 0) {
      screenQueue.forEach(({ screenName, properties, queuedAt }) => {
        client.screen(screenName, {
          ...properties,
          timestamp: queuedAt,
          queued: true,
        });
      });
      screenQueue = [];
    }
  }
};

/**
 * Initialize PostHog client
 * @deprecated Use PostHogProvider and setPostHogClient instead
 */
export const initializeAnalytics = async (): Promise<PostHog | null> => {
  if (posthogClient) {
    return posthogClient;
  }

  // Return null if env vars are not configured
  if (!POSTHOG_API_KEY || !POSTHOG_HOST) {
    console.warn("[PostHog] Cannot initialize - missing environment variables");
    return null;
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
 * Queues the identity if client is not yet connected
 */
export const identifyUser = (
  userId: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Queue identity operation - it will be sent once client connects
    if (identityQueue.length < MAX_IDENTITY_QUEUE) {
      identityQueue.push({ userId, properties });
    }
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
 * Queues the event if client is not yet connected
 */
export const trackEvent = (
  event: AnalyticsEventName | string,
  properties?: PostHogEventProperties
): void => {
  const timestamp = new Date().toISOString();

  if (!posthogClient) {
    // Queue event if client not yet available - it will be sent once connected
    if (eventQueue.length < MAX_EVENT_QUEUE) {
      eventQueue.push({ event, properties, queuedAt: timestamp });
    }
    return;
  }

  posthogClient.capture(event, {
    ...properties,
    timestamp,
  });
};

/**
 * Track a screen view
 * Queues the screen event if client is not yet connected
 */
export const trackScreen = (
  screenName: string,
  properties?: PostHogEventProperties
): void => {
  const timestamp = new Date().toISOString();

  if (!posthogClient) {
    // Queue screen event - it will be sent once client connects
    if (screenQueue.length < MAX_SCREEN_QUEUE) {
      screenQueue.push({ screenName, properties, queuedAt: timestamp });
    }
    return;
  }

  posthogClient.screen(screenName, {
    ...properties,
    timestamp,
  });
};

/**
 * Capture an error/exception with context
 * Normalizes unknown error types to Error instances
 */
export const captureError = (
  error: Error | unknown,
  context?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    // Silently skip - client not yet connected from provider
    return;
  }

  // Normalize unknown to Error instance for safe handling
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));

  const errorData: PostHogEventProperties = {
    error_message: normalizedError.message,
    error_stack: normalizedError.stack ?? "",
  };

  // If original error was not an Error, include its string representation
  if (!(error instanceof Error)) {
    errorData.original_error_type = typeof error;
    errorData.original_error_value = String(error);
  }

  posthogClient.captureException(normalizedError, {
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
 * Reset the user identification and clear all queues
 * Call this on logout
 */
export const resetAnalytics = async (): Promise<void> => {
  // Clear all queued events to prevent them being sent after reset
  eventQueue = [];
  screenQueue = [];
  identityQueue = [];

  if (!posthogClient) {
    return;
  }

  // Flush any pending events before reset
  await posthogClient.flush();
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
