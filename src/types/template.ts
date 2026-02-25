import { GroceryCategory } from "./index";

/**
 * Template for grocery items with pre-filled defaults
 * Can be created manually by user or learned from patterns
 */
export interface GroceryTemplate {
  id: string;
  userId: string;
  productNameDisplay: string; // User-visible name (e.g., "Eggs")
  productNameNormalized: string; // Lowercase, trimmed for matching (e.g., "eggs")
  defaultQuantity: string; // Default quantity (e.g., "12 pcs")
  defaultPrice: number; // Default price
  category: GroceryCategory; // Category
  source: "manual" | "learned"; // How template was created
  usageCount: number; // How many times used
  lastUsedAt: Date; // Last time template was applied
  createdAt: Date; // When template was created
}

/**
 * Learning telemetry for pattern detection
 * Tracks historical data to suggest new templates
 */
export interface LearningTelemetry {
  userId: string;
  productNameNormalized: string;
  totalSeenCount: number; // Total times seen
  lastSeenAt: Date; // Last occurrence
  lastSuggestedAt: Date | null; // When we last suggested
  dismissedForever: boolean; // User chose "Never for this item"
  categoryFrequency: Record<GroceryCategory, number>; // Category usage counts
  priceHistory: number[]; // Last 10 prices for median
  quantityHistory: string[]; // Last 10 quantities for mode
}

/**
 * Template match result with confidence scoring
 */
export interface TemplateMatch {
  template: GroceryTemplate;
  confidence: number; // 0-1 score (1.0 = exact match)
  rank: number; // Final ranking position (1 = best)
}

/**
 * Candidate for auto-learning
 */
export interface LearningCandidate {
  productName: string;
  productNameNormalized: string;
  defaultQuantity: string;
  defaultPrice: number;
  category: GroceryCategory;
  confidence: number; // Pattern strength (0-1)
  occurrences: number; // How many times seen
}
