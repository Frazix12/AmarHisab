import { Currency } from "@/types";
import { formatNumber, parseBanglaNumber } from "./format";

/**
 * Format amount with currency symbol
 */
export const formatCurrency = (
  amount: number,
  currency: Currency,
  language: string = "en",
): string => {
  const absAmount = Math.abs(amount);
  const isWholeNumber = absAmount % 1 === 0;
  const formattedAmount = absAmount.toLocaleString(language, {
    minimumFractionDigits: amount < 0 ? 2 : isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  });

  // Handle negative amounts
  const sign = amount < 0 ? "-" : "";

  // Some currencies have symbol after the amount
  const symbolAfter = ["EUR"];

  let result = "";
  if (symbolAfter.includes(currency.code)) {
    result = `${sign}${formattedAmount} ${currency.symbol}`;
  } else {
    result = `${sign}${currency.symbol}${formattedAmount}`;
  }

  // Apply language-specific number formatting
  return formatNumber(result, language);
};

/**
 * Parse currency string to number
 */
export const parseCurrencyInput = (input: string): number => {
  const trimmed = parseBanglaNumber(input).trim();
  if (!trimmed) return NaN;

  const isNegative = trimmed.startsWith("-");
  const unsignedInput = isNegative ? trimmed.slice(1) : trimmed;
  if (unsignedInput.includes("-")) return NaN;

  const compact = unsignedInput.replace(/\s+/g, "");
  const numericPortion = compact.replace(/[^0-9.,]/g, "");
  if (!/[0-9]/.test(numericPortion)) return NaN;

  const lastComma = numericPortion.lastIndexOf(",");
  const lastDot = numericPortion.lastIndexOf(".");
  const decimalSeparatorIndex = Math.max(lastComma, lastDot);

  let normalizedValue = "";
  if (decimalSeparatorIndex === -1) {
    normalizedValue = numericPortion.replace(/[.,]/g, "");
  } else {
    const integerPart = numericPortion
      .slice(0, decimalSeparatorIndex)
      .replace(/[.,]/g, "");
    const fractionalPart = numericPortion
      .slice(decimalSeparatorIndex + 1)
      .replace(/[.,]/g, "");

    if (!fractionalPart) return NaN;
    normalizedValue = `${integerPart}.${fractionalPart}`;
  }

  const signedValue = `${isNegative ? "-" : ""}${normalizedValue}`;
  if (!/^-?\d+(\.\d+)?$/.test(signedValue)) return NaN;

  const parsed = Number.parseFloat(signedValue);
  return Number.isNaN(parsed) ? NaN : parsed;
};

/**
 * Validate currency amount
 */
export const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount > 0 && isFinite(amount);
};
