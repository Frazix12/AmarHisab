import { useApp } from "@/contexts/app-context";

/**
 * Development helper to add sample data
 * This is for testing purposes only
 */
export const useSampleData = () => {
  const { addExpense, addGroceryItem } = useApp();

  const addSampleExpenses = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 5);

    // Add sample expenses
    addExpense({
      amount: 450.5,
      category: "food",
      date: today,
      description: "Lunch at restaurant",
      currency: "USD",
    });

    addExpense({
      amount: 25.0,
      category: "transport",
      date: today,
      description: "Uber ride",
      currency: "USD",
    });

    addExpense({
      amount: 120.75,
      category: "shopping",
      date: yesterday,
      description: "New shoes",
      currency: "USD",
    });

    addExpense({
      amount: 15.5,
      category: "entertainment",
      date: yesterday,
      description: "Movie tickets",
      currency: "USD",
    });

    addExpense({
      amount: 85.0,
      category: "healthcare",
      date: lastWeek,
      description: "Pharmacy",
      currency: "USD",
    });

    addExpense({
      amount: 200.0,
      category: "bills",
      date: lastWeek,
      description: "Electricity bill",
      currency: "USD",
    });
  };

  const addSampleGroceryItems = () => {
    addGroceryItem({
      name: "Bananas",
      quantity: "6 pcs",
      price: 3.5,
      category: "fruits",
      checked: false,
    });

    addGroceryItem({
      name: "Milk",
      quantity: "2 L",
      price: 4.99,
      category: "dairy",
      checked: false,
    });

    addGroceryItem({
      name: "Tomatoes",
      quantity: "500g",
      price: 2.75,
      category: "vegetables",
      checked: true,
    });

    addGroceryItem({
      name: "Chicken breast",
      quantity: "1 kg",
      price: 12.99,
      category: "meat",
      checked: false,
    });

    addGroceryItem({
      name: "Coffee",
      quantity: "250g",
      price: 8.5,
      category: "beverages",
      checked: false,
    });

    addGroceryItem({
      name: "Apples",
      quantity: "8 pcs",
      price: 5.25,
      category: "fruits",
      checked: true,
    });
  };

  return {
    addSampleExpenses,
    addSampleGroceryItems,
  };
};
