import { Currency } from "@/types";
import {
  formatCurrency,
  isValidAmount,
  parseCurrencyInput,
} from "@/utils/currency";

const USD: Currency = { code: "USD", symbol: "$", name: "US Dollar" };
const EUR: Currency = { code: "EUR", symbol: "€", name: "Euro" };

describe("currency utils", () => {
  it("formats currency with symbol placement", () => {
    expect(formatCurrency(12.5, USD)).toBe("$12.50");
    expect(formatCurrency(10, EUR)).toBe("10 €");
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-5, USD)).toBe("-$5");
  });

  it("parses currency input into numbers", () => {
    expect(parseCurrencyInput("$1,234.50")).toBe(1234.5);
    expect(parseCurrencyInput("invalid")).toBe(0);
  });

  it("validates positive amounts", () => {
    expect(isValidAmount(10)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
  });
});
