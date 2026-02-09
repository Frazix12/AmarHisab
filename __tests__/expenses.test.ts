/// <reference types="jest" />
import { groupExpensesByDate } from "@/utils/date";
import { Expense } from "@/types";

const buildExpense = (id: string, date: Date): Expense => ({
  id,
  amount: 42,
  category: "food",
  date,
  description: "Test expense",
  currency: "USD",
});

describe("groupExpensesByDate", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("groups expenses into expected date buckets", () => {
    const expenses: Expense[] = [
      buildExpense("today", new Date("2025-01-15T08:00:00Z")),
      buildExpense("yesterday", new Date("2025-01-14T08:00:00Z")),
      buildExpense("thisWeek", new Date("2025-01-10T08:00:00Z")),
      buildExpense("thisMonth", new Date("2025-01-02T08:00:00Z")),
      buildExpense("older", new Date("2024-12-15T08:00:00Z")),
    ];

    const grouped = groupExpensesByDate(expenses);

    expect(grouped.get("today")?.map((item) => item.id)).toEqual(["today"]);
    expect(grouped.get("yesterday")?.map((item) => item.id)).toEqual([
      "yesterday",
    ]);
    expect(grouped.get("thisWeek")?.map((item) => item.id)).toEqual([
      "thisWeek",
    ]);
    expect(grouped.get("thisMonth")?.map((item) => item.id)).toEqual([
      "thisMonth",
    ]);
    expect(grouped.get("older")?.map((item) => item.id)).toEqual(["older"]);
  });
});
