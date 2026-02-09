import { getTranslation } from "@/services/i18n";

describe("i18n", () => {
  it("returns English by default", () => {
    expect(getTranslation().tabs.expenses).toBe("Expenses");
  });

  it("falls back to English for unsupported languages", () => {
    expect(getTranslation("xx").tabs.expenses).toBe("Expenses");
  });
});
