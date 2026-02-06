import { Currency } from "@/types";
import { formatNumber } from "./format";

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
  const formattedAmount = absAmount.toLocaleString(undefined, {
    minimumFractionDigits: isWholeNumber ? 0 : 2,
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
  // Remove all non-numeric characters except decimal point
  const cleaned = input.replace(/[^\d.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate currency amount
 */
export const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount > 0 && isFinite(amount);
};
