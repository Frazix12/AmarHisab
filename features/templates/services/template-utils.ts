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
    .replace(/\b(pcs?|kg|gm?|lbs?|ml|ltr?|litre?s?)\b/gi, "")
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

  const freq = arr.reduce(
    (acc, val) => {
      const key = String(val);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostFrequent = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  return mostFrequent ? (mostFrequent[0] as unknown as T) : undefined;
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
