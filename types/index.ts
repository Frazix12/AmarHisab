export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  description: string;
  currency: string;
  imageUri?: string; // Optional photo attachment
  aiDetected?: boolean; // Track if category was detected by AI
}

export interface GroceryItem {
  id: string;
  name: string;
  nameNormalized: string; // For template matching
  quantity: string;
  price: number | null; // null = "no price set"; valid values are > 0
  checked: boolean;
  category: GroceryCategory;
  templateId?: string; // Track which template was used
  createdAt: Date; // For learning analytics
  expenseId?: string; // Track linked expense when checked
  expenseCategory?: ExpenseCategory;
  aiDetected?: boolean; // Track if category was detected by AI
  checkedAt?: Date; // Track when item was completed
  imageUri?: string; // Optional product/receipt photo
  sortOrder?: number; // Persisted ordering index for stable list rendering
}

export interface UserSettings {
  currency: Currency;
  theme: "light" | "dark" | "system";
  language: string;
  /**
   * Custom Gemini API Key.
   * SECURITY: This is stored in platform SecureStore (Keychain/Keystore), NOT in AsyncStorage.
   * It is excluded from logs, analytics, and backups.
   */
  geminiApiKey?: string;
  /**
   * Custom ElevenLabs API Key.
   * SECURITY: This is stored in platform SecureStore (Keychain/Keystore), NOT in AsyncStorage.
   * It is excluded from logs, analytics, and backups.
   */
  elevenLabsApiKey?: string;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "healthcare"
  | "bills"
  | "education"
  | "other";

export type GroceryCategory =
  | "fruits"
  | "vegetables"
  | "dairy"
  | "meat"
  | "snacks"
  | "beverages"
  | "household"
  | "other";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  icon: string;
}[] = [
  { value: "food", label: "Food & Dining", icon: "restaurant" },
  { value: "transport", label: "Transport", icon: "car" },
  { value: "shopping", label: "Shopping", icon: "shopping-bag" },
  { value: "entertainment", label: "Entertainment", icon: "film" },
  { value: "healthcare", label: "Healthcare", icon: "medical" },
  { value: "bills", label: "Bills & Utilities", icon: "receipt" },
  { value: "education", label: "Education", icon: "book" },
  { value: "other", label: "Other", icon: "more" },
];

export const GROCERY_CATEGORIES: { value: GroceryCategory; label: string }[] = [
  { value: "fruits", label: "Fruits" },
  { value: "vegetables", label: "Vegetables" },
  { value: "dairy", label: "Dairy" },
  { value: "meat", label: "Meat & Fish" },
  { value: "snacks", label: "Snacks" },
  { value: "beverages", label: "Beverages" },
  { value: "household", label: "Household" },
  { value: "other", label: "Other" },
];
