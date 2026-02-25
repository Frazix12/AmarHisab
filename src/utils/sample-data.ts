import {
  useExpenseDomain,
  useGroceryDomain,
  useSettingsDomain,
} from "@/contexts/app-selectors";
import {
  EXPENSE_CATEGORIES,
  GROCERY_CATEGORIES,
  ExpenseCategory,
  GroceryCategory,
} from "@/types";

export const useSampleData = () => {
  const { addExpense } = useExpenseDomain();
  const { addGroceryItem } = useGroceryDomain();
  const { settings } = useSettingsDomain();

  const randomFrom = <T,>(items: T[]): T =>
    items[Math.floor(Math.random() * items.length)];

  const randomAmount = (min: number, max: number) =>
    Number((Math.random() * (max - min) + min).toFixed(2));

  const randomRecentDate = (maxDaysBack: number) => {
    const date = new Date();
    const backDays = Math.floor(Math.random() * (maxDaysBack + 1));
    date.setDate(date.getDate() - backDays);
    return date;
  };

  const expenseDescriptions: Record<ExpenseCategory, string[]> = {
    food: ["Lunch", "Dinner", "Snacks", "Cafe"],
    transport: ["Ride share", "Bus fare", "Fuel", "Parking"],
    shopping: ["Clothes", "Accessories", "Online order", "Essentials"],
    entertainment: ["Movie", "Streaming", "Gaming", "Concert"],
    healthcare: ["Pharmacy", "Doctor fee", "Medical test", "Supplements"],
    bills: ["Electricity bill", "Internet bill", "Water bill", "Phone bill"],
    education: ["Course fee", "Books", "Stationery", "Subscription"],
    other: ["Misc expense", "Service fee", "Gift", "One-time expense"],
  };

  const expenseRanges: Record<ExpenseCategory, { min: number; max: number }> = {
    food: { min: 8, max: 55 },
    transport: { min: 3, max: 35 },
    shopping: { min: 20, max: 180 },
    entertainment: { min: 6, max: 120 },
    healthcare: { min: 12, max: 140 },
    bills: { min: 25, max: 240 },
    education: { min: 10, max: 220 },
    other: { min: 5, max: 90 },
  };

  const grocerySamples: Record<GroceryCategory, { name: string; quantity: string }[]> = {
    fruits: [
      { name: "Bananas", quantity: "6 pcs" },
      { name: "Apples", quantity: "8 pcs" },
      { name: "Oranges", quantity: "1 kg" },
    ],
    vegetables: [
      { name: "Tomatoes", quantity: "500g" },
      { name: "Potatoes", quantity: "2 kg" },
      { name: "Spinach", quantity: "2 bunch" },
    ],
    dairy: [
      { name: "Milk", quantity: "2 L" },
      { name: "Yogurt", quantity: "500g" },
      { name: "Cheese", quantity: "200g" },
    ],
    meat: [
      { name: "Chicken breast", quantity: "1 kg" },
      { name: "Fish", quantity: "800g" },
      { name: "Beef", quantity: "1 kg" },
    ],
    snacks: [
      { name: "Biscuits", quantity: "2 packs" },
      { name: "Chips", quantity: "3 packs" },
      { name: "Nuts", quantity: "300g" },
    ],
    beverages: [
      { name: "Coffee", quantity: "250g" },
      { name: "Tea", quantity: "200g" },
      { name: "Juice", quantity: "2 L" },
    ],
    household: [
      { name: "Dish soap", quantity: "1 bottle" },
      { name: "Tissue", quantity: "6 rolls" },
      { name: "Laundry detergent", quantity: "1 pack" },
    ],
    other: [
      { name: "Bread", quantity: "2 loaves" },
      { name: "Eggs", quantity: "12 pcs" },
      { name: "Rice", quantity: "5 kg" },
    ],
  };

  const addSampleExpenses = async (): Promise<void> => {
    for (const { value: category } of EXPENSE_CATEGORIES) {
      const range = expenseRanges[category];
      addExpense({
        amount: randomAmount(range.min, range.max),
        category,
        date: randomRecentDate(10),
        description: randomFrom(expenseDescriptions[category]),
        currency: settings.currency.code,
      });
    }

    for (const { value: category } of EXPENSE_CATEGORIES) {
      const range = expenseRanges[category];
      addExpense({
        amount: randomAmount(range.min, range.max),
        category,
        date: randomRecentDate(25),
        description: randomFrom(expenseDescriptions[category]),
        currency: settings.currency.code,
      });
    }
  };

  const addSampleGroceryItems = async (): Promise<void> => {
    for (const { value: category } of GROCERY_CATEGORIES) {
      const sample = randomFrom(grocerySamples[category]);
      addGroceryItem({
        name: sample.name,
        quantity: sample.quantity,
        price: randomAmount(1.5, 16),
        category,
        checked: Math.random() < 0.3,
      });
    }
  };

  return {
    addSampleExpenses,
    addSampleGroceryItems,
  };
};
