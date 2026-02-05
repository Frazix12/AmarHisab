import { Expense, GroceryItem, UserSettings } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const EXPENSES_KEY = "@amar_hisab_expenses";
const GROCERY_KEY = "@amar_hisab_grocery";
const SETTINGS_KEY = "@amar_hisab_settings";
const API_KEY_STORAGE_KEY = "amar_hisab_gemini_api_key";

/**
 * Helper to handle SecureStore on web (where it's not supported)
 */
const setSecureItem = async (key: string, value: string) => {
  if (Platform.OS === "web") return; // SecureStore not supported on web
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.error("Error saving to SecureStore:", e);
  }
};

const getSecureItem = async (key: string) => {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error("Error reading from SecureStore:", e);
    return null;
  }
};

const deleteSecureItem = async (key: string) => {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.error("Error deleting from SecureStore:", e);
  }
};

// Expenses
export const saveExpenses = async (expenses: Expense[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(expenses);
    await AsyncStorage.setItem(EXPENSES_KEY, jsonValue);
  } catch (e) {
    console.error("Error saving expenses:", e);
  }
};

export const loadExpenses = async (): Promise<Expense[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(EXPENSES_KEY);
    if (jsonValue != null) {
      const expenses = JSON.parse(jsonValue);
      // Convert date strings back to Date objects
      return expenses.map((e: any) => ({ ...e, date: new Date(e.date) }));
    }
    return [];
  } catch (e) {
    console.error("Error loading expenses:", e);
    return [];
  }
};

// Grocery Items
export const saveGroceryItems = async (items: GroceryItem[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(items);
    await AsyncStorage.setItem(GROCERY_KEY, jsonValue);
  } catch (e) {
    console.error("Error saving grocery items:", e);
  }
};

export const loadGroceryItems = async (): Promise<GroceryItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(GROCERY_KEY);
    if (jsonValue != null) {
      const items = JSON.parse(jsonValue);
      // Convert date strings back to Date objects and add missing fields for legacy data
      return items.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        nameNormalized: item.nameNormalized || item.name.toLowerCase().trim(),
      }));
    }
    return [];
  } catch (e) {
    console.error("Error loading grocery items:", e);
    return [];
  }
};

// Settings
export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    // Separate sensitive data from public settings
    const { geminiApiKey, ...publicSettings } = settings;

    // Save public settings to AsyncStorage
    const jsonValue = JSON.stringify(publicSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);

    // Save sensitive data to SecureStore
    if (geminiApiKey) {
      await setSecureItem(API_KEY_STORAGE_KEY, geminiApiKey);
    } else {
      await deleteSecureItem(API_KEY_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Error saving settings:", e);
  }
};

export const loadSettings = async (): Promise<UserSettings | null> => {
  try {
    // Load public settings
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    const publicSettings = jsonValue != null ? JSON.parse(jsonValue) : null;

    if (!publicSettings) return null;

    // Load sensitive data
    const apiKey = await getSecureItem(API_KEY_STORAGE_KEY);

    // Merge and return
    return {
      ...publicSettings,
      geminiApiKey: apiKey || undefined,
    };
  } catch (e) {
    console.error("Error loading settings:", e);
    return null;
  }
};

// Clear all data (useful for reset)
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([EXPENSES_KEY, GROCERY_KEY, SETTINGS_KEY]);
    await deleteSecureItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing data:", e);
  }
};
