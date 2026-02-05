import { formatNumber, parseBanglaNumber, toBanglaNumber } from "@/utils/format";

describe("format utils", () => {
  it("converts digits to Bangla", () => {
    expect(toBanglaNumber("123.45")).toBe("১২৩.৪৫");
  });

  it("formats numbers based on language", () => {
    expect(formatNumber(123, "en")).toBe("123");
    expect(formatNumber("456", "bn")).toBe("৪৫৬");
  });

  it("parses Bangla digits into English", () => {
    expect(parseBanglaNumber("১২৩৪৫৬")).toBe("123456");
  });
});
