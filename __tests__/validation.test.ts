/// <reference types="jest" />
import {
  containsMaliciousPatterns,
  escapeHtml,
  sanitizeText,
  validateAmount,
  validateDescription,
  validateName,
  validateQuantity,
} from "@/services/validation";

describe("Input Validation Service", () => {
  describe("containsMaliciousPatterns", () => {
    it("detects script tags", () => {
      expect(containsMaliciousPatterns("<script>alert('xss')</script>")).toBe(true);
      expect(containsMaliciousPatterns("<SCRIPT>alert('xss')</SCRIPT>")).toBe(true);
    });

    it("detects javascript: protocol", () => {
      expect(containsMaliciousPatterns("javascript:alert('xss')")).toBe(true);
    });

    it("detects SQL injection patterns", () => {
      expect(containsMaliciousPatterns("'; DROP TABLE users; --")).toBe(true);
      expect(containsMaliciousPatterns("' OR '1'='1")).toBe(true);
      expect(containsMaliciousPatterns("SELECT * FROM users WHERE id = 1")).toBe(true);
    });

    it("detects code injection", () => {
      expect(containsMaliciousPatterns("eval(code)")).toBe(true);
      expect(containsMaliciousPatterns("new Function(code)")).toBe(true);
      expect(containsMaliciousPatterns("__proto__")).toBe(true);
    });

    it("detects path traversal", () => {
      expect(containsMaliciousPatterns("../../../etc/passwd")).toBe(true);
      expect(containsMaliciousPatterns("..\\..\\windows\\system32")).toBe(true);
    });

    it("allows safe text", () => {
      expect(containsMaliciousPatterns("Grocery shopping")).toBe(false);
      expect(containsMaliciousPatterns("Coffee at Starbucks")).toBe(false);
      expect(containsMaliciousPatterns("দুধ কিনা")).toBe(false); // Bangla: "Bought milk"
    });
  });

  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
      expect(escapeHtml("\"quoted\"")).toBe("&quot;quoted&quot;");
      expect(escapeHtml("'single'")).toBe("&#x27;single&#x27;");
      expect(escapeHtml("a & b")).toBe("a &amp; b");
    });

    it("preserves safe text", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
      expect(escapeHtml("আমার হিসাব")).toBe("আমার হিসাব"); // Bangla
    });
  });

  describe("sanitizeText", () => {
    it("trims whitespace", () => {
      expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("enforces max length", () => {
      const longText = "a".repeat(600);
      expect(sanitizeText(longText, 500).length).toBe(500);
    });

    it("removes null bytes", () => {
      expect(sanitizeText("hello\x00world")).toBe("helloworld");
    });

    it("escapes HTML entities", () => {
      expect(sanitizeText("<script>alert</script>")).toBe("&lt;script&gt;alert&lt;&#x2F;script&gt;");
    });

    it("handles empty/invalid input", () => {
      expect(sanitizeText("")).toBe("");
      expect(sanitizeText(null as any)).toBe("");
      expect(sanitizeText(undefined as any)).toBe("");
    });
  });

  describe("validateAmount", () => {
    it("accepts valid positive numbers", () => {
      expect(validateAmount(100)).toEqual({ isValid: true, sanitized: "100" });
      expect(validateAmount(99.99)).toEqual({ isValid: true, sanitized: "99.99" });
    });

    it("accepts string numbers", () => {
      expect(validateAmount("100")).toEqual({ isValid: true, sanitized: "100" });
      expect(validateAmount("$50.00")).toEqual({ isValid: true, sanitized: "50" });
    });

    it("rejects zero or negative amounts", () => {
      expect(validateAmount(0).isValid).toBe(false);
      expect(validateAmount(-10).isValid).toBe(false);
    });

    it("rejects amounts exceeding maximum", () => {
      expect(validateAmount(10000001).isValid).toBe(false);
    });

    it("rejects invalid values", () => {
      expect(validateAmount("abc").isValid).toBe(false);
      expect(validateAmount(NaN).isValid).toBe(false);
      expect(validateAmount(Infinity).isValid).toBe(false);
    });
  });

  describe("validateDescription", () => {
    it("accepts valid descriptions", () => {
      const result = validateDescription("Lunch at restaurant");
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it("rejects empty descriptions", () => {
      expect(validateDescription("").isValid).toBe(false);
      expect(validateDescription("   ").isValid).toBe(false);
    });

    it("rejects descriptions that are too long", () => {
      const longDesc = "a".repeat(201);
      expect(validateDescription(longDesc).isValid).toBe(false);
    });

    it("rejects malicious content", () => {
      expect(validateDescription("<script>alert('xss')</script>").isValid).toBe(false);
      expect(validateDescription("'; DROP TABLE expenses;--").isValid).toBe(false);
    });
  });

  describe("validateName", () => {
    it("accepts valid names", () => {
      const result = validateName("Eggs");
      expect(result.isValid).toBe(true);
    });

    it("rejects names that are too short", () => {
      expect(validateName("a").isValid).toBe(false);
    });

    it("rejects names that are too long", () => {
      const longName = "a".repeat(101);
      expect(validateName(longName).isValid).toBe(false);
    });

    it("rejects malicious names", () => {
      expect(validateName("eval(code)").isValid).toBe(false);
    });
  });

  describe("validateQuantity", () => {
    it("accepts valid quantities", () => {
      expect(validateQuantity("2kg")).toEqual({ isValid: true, sanitized: "2kg" });
      expect(validateQuantity("1 liter")).toEqual({ isValid: true, sanitized: "1 liter" });
    });

    it("allows empty quantities (optional field)", () => {
      expect(validateQuantity("")).toEqual({ isValid: true, sanitized: "" });
    });

    it("rejects quantities that are too long", () => {
      const longQty = "a".repeat(51);
      expect(validateQuantity(longQty).isValid).toBe(false);
    });
  });
});
