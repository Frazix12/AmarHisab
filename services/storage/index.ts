import { Expense, GroceryItem, UserSettings } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const EXPENSES_KEY = "@amar_hisab_expenses";
const GROCERY_KEY = "@amar_hisab_grocery";
const SETTINGS_KEY = "@amar_hisab_settings";
const GEMINI_API_KEY_STORAGE_KEY = "amar_hisab_gemini_api_key";
const ELEVENLABS_API_KEY_STORAGE_KEY = "amar_hisab_elevenlabs_api_key";
const DATA_VERSION_KEY = "@amar_hisab_data_version";

// Current data format version for migration support
const CURRENT_DATA_VERSION = 1;

// Maximum storage sizes to prevent abuse
const MAX_EXPENSES = 10000;
const MAX_GROCERY_ITEMS = 1000;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate JSON data size before saving
 */
const validateStorageSize = (data: string): boolean => {
  return data.length <= MAX_STORAGE_SIZE;
};

/**
 * Sanitize data before storage to remove potentially dangerous content
 */
const sanitizeStoredData = <T extends object>(data: T): T => {
  const jsonString = JSON.stringify(data);
  // Remove any potential XSS vectors that might have slipped through
  const sanitized = jsonString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  return JSON.parse(sanitized);
};

/**
 * Helper to handle SecureStore on web (where it's not supported)
 * With improved security options for native platforms
 */
const setSecureItem = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    console.warn(
      "SecureStore is unavailable on web; API keys should not be stored in production web apps.",
    );
    try {
      // On web, we add a simple obfuscation (not true encryption)
      // This is intentionally weak - web apps should use server-side key management
      const obfuscated = btoa(value);
      await AsyncStorage.setItem(`__secure_${key}`, obfuscated);
    } catch (e) {
      console.error("Error saving web fallback secure item:", e);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value, {
      // Use the most secure available protection
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    console.error("Error saving to SecureStore:", e);
  }
};

const getSecureItem = async (key: string) => {
  if (Platform.OS === "web") {
    try {
      const obfuscated = await AsyncStorage.getItem(`__secure_${key}`);
      if (obfuscated) {
        return atob(obfuscated);
      }
      // Fallback for older storage format
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error("Error reading web fallback secure item:", e);
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error("Error reading from SecureStore:", e);
    return null;
  }
};

const deleteSecureItem = async (key: string) => {
  if (Platform.OS === "web") {
    try {
      await AsyncStorage.removeItem(`__secure_${key}`);
      await AsyncStorage.removeItem(key); // Clean up old format
    } catch (e) {
      console.error("Error deleting web fallback secure item:", e);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.error("Error deleting from SecureStore:", e);
  }
};

// Expenses
export const saveExpenses = async (expenses: Expense[]): Promise<void> => {
  try {
    // Limit the number of expenses to prevent abuse
    const limitedExpenses = expenses.slice(-MAX_EXPENSES);
    const sanitized = sanitizeStoredData(limitedExpenses);
    const jsonValue = JSON.stringify(sanitized);
    
    if (!validateStorageSize(jsonValue)) {
      console.error("Expenses data too large to save");
      return;
    }
    
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
    // Limit the number of items to prevent abuse
    const limitedItems = items.slice(-MAX_GROCERY_ITEMS);
    const sanitized = sanitizeStoredData(limitedItems);
    const jsonValue = JSON.stringify(sanitized);
    
    if (!validateStorageSize(jsonValue)) {
      console.error("Grocery items data too large to save");
      return;
    }
    
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
        price:
          typeof item.price === "number"
            ? item.price === 0
              ? null
              : item.price
            : null,
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
    const { geminiApiKey, elevenLabsApiKey, ...publicSettings } = settings;

    // Save public settings to AsyncStorage
    const jsonValue = JSON.stringify(publicSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);

    // Save sensitive data to SecureStore
    if (geminiApiKey) {
      await setSecureItem(GEMINI_API_KEY_STORAGE_KEY, geminiApiKey);
    } else {
      await deleteSecureItem(GEMINI_API_KEY_STORAGE_KEY);
    }

    if (elevenLabsApiKey) {
      await setSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY, elevenLabsApiKey);
    } else {
      await deleteSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY);
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
    const [geminiApiKey, elevenLabsApiKey] = await Promise.all([
      getSecureItem(GEMINI_API_KEY_STORAGE_KEY),
      getSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY),
    ]);

    // Merge and return
    return {
      ...publicSettings,
      geminiApiKey: geminiApiKey || undefined,
      elevenLabsApiKey: elevenLabsApiKey || undefined,
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
    await Promise.all([
      deleteSecureItem(GEMINI_API_KEY_STORAGE_KEY),
      deleteSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY),
    ]);
  } catch (e) {
    console.error("Error clearing data:", e);
  }
};
