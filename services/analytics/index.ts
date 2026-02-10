/**
 * Analytics Module
 * Re-exports all analytics utilities from a single entry point
 */

// Core service
export {
  Analytics,
  initializeAnalytics,
  getPostHogClient,
  setPostHogClient,
  identifyUser,
  trackEvent,
  trackScreen,
  captureError,
  setGroup,
  setSuperProperties,
  flushEvents,
  resetAnalytics,
  isFeatureEnabled,
  getFeatureFlag,
} from "./posthog";

// Event constants
export { AnalyticsEvents, type AnalyticsEventName } from "./events";

// React hook
export { useAnalytics, type UseAnalyticsReturn } from "./useAnalytics";

// LLM analytics helpers
export {
  createLlmTraceId,
  extractHttpStatusCode,
  trackLlmGeneration,
  type TrackLlmGenerationParams,
} from "./llm";

// Default export
export { default } from "./posthog";
