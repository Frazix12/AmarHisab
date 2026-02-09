import {
  calculateMatchConfidence,
  median,
  mode,
  normalizeProductName,
} from "@/features/templates/services/template-utils";

describe("template utils", () => {
  it("normalizes product names", () => {
    expect(normalizeProductName("  Milk  2L ")).toBe("milk 2l");
    expect(normalizeProductName("Eggs 12 pcs")).toBe("eggs 12");
  });

  it("calculates match confidence", () => {
    expect(calculateMatchConfidence("milk", "milk")).toBe(1);
    expect(calculateMatchConfidence("mil", "milk")).toBe(0.9);
    expect(calculateMatchConfidence("il", "milk")).toBe(0.7);
    expect(calculateMatchConfidence("egg", "eggs")).toBe(0.9);
    expect(calculateMatchConfidence("", "milk")).toBe(0);
  });

  it("calculates mode and median", () => {
    expect(mode(["a", "b", "a"])).toBe("a");
    expect(median([1, 5, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
