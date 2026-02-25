/**
 * Normalize product name for template matching
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove common units
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)(pcs?|kg|gm?|lbs?|ml|ltr?|litre?s?)(?=\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate match confidence between input and template name
 * Returns 0.0 to 1.0 score
 */
export function calculateMatchConfidence(
  input: string,
  templateName: string,
): number {
  const normalizedInput = normalizeProductName(input);
  const normalizedTemplate = normalizeProductName(templateName);

  // Empty input
  if (normalizedInput.length === 0) return 0.0;

  // Exact match
  if (normalizedInput === normalizedTemplate) return 1.0;

  // Starts with (high confidence)
  if (normalizedTemplate.startsWith(normalizedInput)) return 0.9;

  // Contains as substring (medium confidence)
  if (normalizedTemplate.includes(normalizedInput)) return 0.7;

  // Simple plural handling
  const inputPlural = normalizedInput + "s";
  const templatePlural = normalizedTemplate + "s";

  if (
    normalizedTemplate === inputPlural ||
    normalizedInput === templatePlural
  ) {
    return 0.85;
  }

  // No match
  return 0.0;
}

/**
 * Calculate mode (most frequent value) from array
 */
export function mode<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;

  const freq = new Map<T, number>();
  for (const value of arr) {
    freq.set(value, (freq.get(value) || 0) + 1);
  }

  let mostFrequent: T | undefined;
  let highestCount = 0;

  for (const [value, count] of freq.entries()) {
    if (count > highestCount) {
      highestCount = count;
      mostFrequent = value;
    }
  }

  return mostFrequent;
}

/**
 * Calculate median from numeric array
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}
