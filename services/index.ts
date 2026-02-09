/**
 * Services Barrel Export
 * Import services from @/services
 */

// Storage
export {
  saveExpenses,
  loadExpenses,
  saveGroceryItems,
  loadGroceryItems,
  saveSettings,
  loadSettings,
  clearAllData,
} from "./storage";

// Validation
export {
  validateAmount,
  validateDescription,
  validateName,
  validateQuantity,
  validateApiKey,
  sanitizeText,
  sanitizeForAIPrompt,
  escapeHtml,
  containsMaliciousPatterns,
  checkRateLimit,
  clearRateLimit,
} from "./validation";

// i18n
export { getTranslation, translations } from "./i18n";
export type { TranslationKey, SupportedLanguage } from "./i18n";

// Analytics
export {
  trackEvent,
  captureError,
  flushEvents,
  setPostHogClient,
  AnalyticsEvents,
} from "./analytics";

// AI (re-exported for convenience)
export { detectItemCategory, detectExpenseCategory, parseVoiceInput, setGeminiApiKey } from "./ai/gemini";
export { setElevenLabsApiKey } from "./ai/elevenlabs";
