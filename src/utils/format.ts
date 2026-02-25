/**
 * Utility functions for number formatting and localization
 */

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/**
 * Convert number to Bangla digits
 */
export const toBanglaNumber = (value: number | string): string => {
  const str = value.toString();
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char >= "0" && char <= "9") {
      result += BANGLA_DIGITS[parseInt(char)];
    } else {
      result += char;
    }
  }

  return result;
};

/**
 * Format number based on language
 */
export const formatNumber = (
  value: number | string,
  language: string = "en",
): string => {
  if (language === "bn") {
    return toBanglaNumber(value);
  }
  return value.toString();
};

const BANGLA_TO_ENGLISH: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * Convert Bangla digits in a string to English digits
 */
export const parseBanglaNumber = (value: string): string => {
  return value
    .split("")
    .map((char) => BANGLA_TO_ENGLISH[char] || char)
    .join("");
};
