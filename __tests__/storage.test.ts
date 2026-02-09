import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  clearAllData,
  loadExpenses,
  loadGroceryItems,
  loadSettings,
  saveExpenses,
  saveGroceryItems,
  saveSettings,
} from "@/services/storage";
import { Expense, GroceryItem, UserSettings } from "@/types";

describe("storage service", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("saves and loads expenses with date restoration", async () => {
    const expenses: Expense[] = [
      {
        id: "1",
        amount: 25,
        category: "food",
        date: new Date(2025, 0, 10),
        description: "Lunch",
        currency: "USD",
      },
    ];

    await saveExpenses(expenses);
    const loaded = await loadExpenses();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].date).toBeInstanceOf(Date);
    expect(loaded[0].amount).toBe(25);
  });

  it("loads grocery items with legacy fields", async () => {
    const legacyItem = {
      id: "g1",
      name: "Milk",
      quantity: "1L",
      price: 2,
      checked: false,
      category: "dairy",
    } as GroceryItem;

    await AsyncStorage.setItem(
      "@amar_hisab_grocery",
      JSON.stringify([legacyItem]),
    );

    const loaded = await loadGroceryItems();
    expect(loaded[0].createdAt).toBeInstanceOf(Date);
    expect(loaded[0].nameNormalized).toBe("milk");
  });

  it("saves and loads settings with secure api keys", async () => {
    const settings: UserSettings = {
      currency: { code: "USD", symbol: "$", name: "US Dollar" },
      theme: "system",
      language: "en",
      geminiApiKey: "secret",
      elevenLabsApiKey: "voice-secret",
    };

    await saveSettings(settings);
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("secret")
      .mockResolvedValueOnce("voice-secret");

    const loaded = await loadSettings();
    expect(loaded?.geminiApiKey).toBe("secret");
    expect(loaded?.elevenLabsApiKey).toBe("voice-secret");
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it("clears all stored data", async () => {
    const items: GroceryItem[] = [
      {
        id: "g1",
        name: "Eggs",
        nameNormalized: "eggs",
        quantity: "12",
        price: 3,
        checked: false,
        category: "dairy",
        createdAt: new Date(),
      },
    ];

    await saveGroceryItems(items);
    await clearAllData();

    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
