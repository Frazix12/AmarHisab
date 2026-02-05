import { Expense } from "@/types";
import { formatNumber } from "./format";

/**
 * Format date for display
 */
export const formatDate = (date: Date, language: string = "en"): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare only dates
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  } else {
    const formatted = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
    return formatNumber(formatted, language);
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Group expenses by date period
 */
export type DateGroup =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "Older";

export const getDateGroup = (date: Date): DateGroup => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  } else if (
    dateOnly.getTime() ===
    new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    ).getTime()
  ) {
    return "Yesterday";
  } else if (date >= weekAgo) {
    return "This Week";
  } else if (date >= monthStart) {
    return "This Month";
  } else {
    return "Older";
  }
};

/**
 * Group expenses by date
 */
export const groupExpensesByDate = (
  expenses: Expense[],
): Map<DateGroup, Expense[]> => {
  const groups = new Map<DateGroup, Expense[]>();

  expenses.forEach((expense) => {
    const group = getDateGroup(expense.date);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(expense);
  });

  return groups;
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is this month
 */
export const isThisMonth = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
