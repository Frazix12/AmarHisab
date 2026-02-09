import { getTranslation } from "@/services/i18n";
import { formatDate, getDateGroup, isThisMonth, isToday } from "@/utils/date";

describe("date utils", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 15, 12));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("formats today and yesterday with translations", () => {
    const t = getTranslation("en");
    expect(formatDate(new Date(2025, 0, 15, 8), "en")).toBe(t.common.today);
    expect(formatDate(new Date(2025, 0, 14, 8), "en")).toBe(t.common.yesterday);
  });

  it("groups dates into expected buckets", () => {
    expect(getDateGroup(new Date(2025, 0, 15, 8))).toBe("today");
    expect(getDateGroup(new Date(2025, 0, 14, 8))).toBe("yesterday");
    expect(getDateGroup(new Date(2025, 0, 10, 8))).toBe("thisWeek");
    expect(getDateGroup(new Date(2025, 0, 2, 8))).toBe("thisMonth");
    expect(getDateGroup(new Date(2024, 11, 15, 8))).toBe("older");
  });

  it("checks today and month correctly", () => {
    expect(isToday(new Date(2025, 0, 15, 23))).toBe(true);
    expect(isThisMonth(new Date(2025, 0, 1, 1))).toBe(true);
  });
});
