# 💰 Amar Hisab (আমার হিসাব) - AI Recreation Prompt

> **Your Personal Expense Tracker with Integrated Grocery List Management**

This document provides a comprehensive blueprint for recreating the Amar Hisab mobile application using AI assistance. It covers all architectural decisions, features, UI/UX patterns, and implementation details.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Core Features](#core-features)
4. [Project Structure](#project-structure)
5. [Data Models](#data-models)
6. [State Management](#state-management)
7. [Services Architecture](#services-architecture)
8. [UI Components](#ui-components)
9. [Theme & Styling](#theme--styling)
10. [Internationalization](#internationalization)
11. [AI Integration](#ai-integration)
12. [Storage Layer](#storage-layer)
13. [Animations](#animations)
14. [Navigation](#navigation)
15. [Implementation Guide](#implementation-guide)

---

## Project Overview

**Amar Hisab** (meaning "My Account" in Bengali) is a beautiful, minimalistic personal expense tracker mobile application with the following key capabilities:

- **Expense Tracking**: Add, edit, delete expenses with categories, photos, and AI detection
- **Grocery List Management**: Create shopping lists that auto-convert to expenses when checked
- **Smart Templates**: AI-powered autofill and auto-learning from shopping patterns
- **Voice Input**: Natural language voice commands to add expenses and groceries
- **Multi-Currency Support**: 8 major world currencies
- **Bilingual**: Full English and Bengali (Bangla) support with number conversion
- **Offline-First**: All data stored locally on device
- **Material Design 3**: Modern, polished UI with dark mode support

---

## Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo** | SDK 54 | React Native framework with managed workflow |
| **React Native** | 0.81.5 | Cross-platform mobile development |
| **TypeScript** | ~5.9 | Type-safe JavaScript |
| **Expo Router** | ^6.0 | File-based navigation |
| **React Native Reanimated** | ~4.1 | 60fps UI thread animations |

### Key Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@hugeicons/react-native": "^1.0.11",
    "@hugeicons/core-free-icons": "^3.1.1",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-navigation/bottom-tabs": "^7.4.0",
    "expo-audio": "~1.1.1",
    "expo-camera": "^17.0.10",
    "expo-haptics": "~15.0.8",
    "expo-image-picker": "^17.0.10",
    "expo-secure-store": "~15.0.8",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-safe-area-context": "^5.6.2"
  }
}
```

### Build Configuration (app.json)

```json
{
  "expo": {
    "name": "Amar Hisab",
    "slug": "amarhisab",
    "version": "1.2.1",
    "orientation": "portrait",
    "scheme": "amarhisab",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "android": {
      "edgeToEdgeEnabled": true,
      "permissions": ["RECORD_AUDIO", "CAMERA"]
    },
    "plugins": [
      "expo-router",
      ["expo-audio", { "microphonePermission": "..." }],
      ["expo-image-picker", { "photosPermission": "...", "cameraPermission": "..." }],
      ["expo-camera", { "cameraPermission": "..." }],
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

---

## Core Features

### 1. Expense Management

- **Track Daily Expenses**: Add expenses with amount, category, description, date
- **8 Built-in Categories**: Food, Transport, Shopping, Entertainment, Healthcare, Bills, Education, Other
- **Photo Attachments**: Capture or select photos (receipts, bills)
- **AI Category Detection**: Automatic category suggestion based on description
- **Edit/Delete**: Long-press context menu with haptic feedback
- **Time-Based Grouping**: Today, Yesterday, This Week, This Month, Older
- **Visual Summary**: Total, daily, weekly, monthly breakdowns

### 2. Grocery List Integration

- **Shopping List**: Create and manage grocery items
- **8 Grocery Categories**: Fruits, Vegetables, Dairy, Meat, Snacks, Beverages, Household, Other
- **Check & Track**: Mark items as purchased while shopping
- **Auto-Expense Creation**: Checked items automatically become expense entries linked bidirectionally
- **Price Entry Modal**: When checking item without price, prompt for price/photo
- **Smart Syncing**: Editing grocery item syncs changes to linked expense

### 3. Smart Templates & AI

- **AI Autofill**: As-you-type suggestions from templates matching input
- **Auto-Learning**: Detects patterns (3+ purchases of same item) and suggests templates
- **Template Management**: Manual template creation with default quantity, price, category
- **Template Matching**: Fuzzy matching with confidence scoring and ranking
- **AI Category Detection**: Gemini AI for auto-categorizing items

### 4. Voice Input (AI Voice Mode)

- **Natural Language Input**: Speak naturally to add expenses and groceries
- **Multi-item Parsing**: Parse multiple items from single transcript
- **Language Detection**: Auto-detect spoken language
- **Gemini AI Processing**: Convert speech transcript to structured data

### 5. Statistics Screen

- **Category Breakdown**: Pie-chart-like display of spending by category
- **Time Filters**: All-time, This Week, This Month views
- **Spending History**: Chronological list grouped by date
- **Average Calculations**: Daily average spending

### 6. Settings

- **Currency Selection**: 8 currencies (USD, EUR, BDT, INR, GBP, JPY, AUD, CAD)
- **Theme**: Light, Dark, System (auto)
- **Language**: English, Bengali (Bangla)
- **Custom API Key**: User's own Gemini API key (stored securely)
- **Smart Suggestions Toggle**: Enable/disable auto-learning
- **Developer Tools**: Add sample data, clear all data

---

## Project Structure

```
AmarHisab/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout with AppProvider
│   ├── modal.tsx                 # Modal screen
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Expenses screen
│   │   ├── list.tsx              # Grocery list screen
│   │   ├── statistics.tsx        # Statistics screen
│   │   └── settings.tsx          # Settings screen
│   └── templates/                # Template management screens
│       ├── _layout.tsx
│       ├── index.tsx             # Template list
│       ├── add.tsx               # Add template
│       └── edit.tsx              # Edit template
│
├── components/
│   ├── navigation/               # Navigation components
│   │   ├── custom-tab-bar.tsx    # Custom bottom tab bar with voice button
│   │   ├── animated-tab-button.tsx
│   │   └── haptic-tab.tsx
│   ├── shared/                   # Shared UI components
│   │   ├── action-menu-modal.tsx # Long-press action menu
│   │   ├── bangla-number-input.tsx # Bidirectional number input
│   │   ├── onboarding-tip.tsx    # First-use tips
│   │   └── summary-card.tsx      # Stat summary cards
│   └── ui/                       # Atomic UI elements
│       ├── toast.tsx             # Toast notifications
│       ├── themed-text.tsx
│       ├── themed-view.tsx
│       └── ...
│
├── features/                     # Feature-based modules
│   ├── expenses/
│   │   └── components/
│   │       ├── add-expense-modal.tsx
│   │       ├── edit-expense-modal.tsx
│   │       └── expense-card.tsx
│   ├── grocery/
│   │   └── components/
│   │       ├── add-grocery-modal.tsx
│   │       ├── edit-grocery-modal.tsx
│   │       ├── complete-grocery-modal.tsx
│   │       └── grocery-item.tsx
│   ├── templates/
│   │   ├── components/
│   │   │   └── template-suggestion-card.tsx
│   │   └── services/
│   │       ├── template-storage.ts
│   │       ├── template-learner.ts
│   │       ├── template-utils.ts
│   │       └── learning-storage.ts
│   ├── settings/
│   │   └── components/
│   │       └── setting-selection-modal.tsx
│   └── ai/
│       └── components/
│           └── voice-assistant-modal.tsx
│
├── services/
│   ├── ai/
│   │   ├── gemini.ts            # Gemini AI integration
│   │   ├── audio-record.ts      # Audio recording wrapper
│   │   ├── elevenlabs.ts        # Optional TTS
│   │   └── elevenlabs-realtime.ts
│   ├── storage/
│   │   └── index.ts             # AsyncStorage + SecureStore operations
│   └── i18n/
│       └── index.ts             # Translations dictionary
│
├── contexts/
│   └── app-context.tsx          # Global state management
│
├── constants/
│   └── theme.ts                 # Material Design 3 colors
│
├── types/
│   ├── index.ts                 # Core type definitions
│   └── template.ts              # Template types
│
├── utils/
│   ├── animations.ts            # Reanimated animation hooks
│   ├── currency.ts              # Currency formatting
│   ├── date.ts                  # Date utilities & grouping
│   ├── format.ts                # Number formatting (Bangla)
│   ├── sample-data.ts           # Dev sample data
│   └── text-metrics.ts          # Text measurement utilities
│
└── hooks/
    ├── use-color-scheme.ts
    └── use-theme-color.ts
```

---

## Data Models

### Expense

```typescript
interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  description: string;
  currency: string;
  imageUri?: string;          // Photo attachment
  aiDetected?: boolean;       // Was category AI-detected?
}

type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "healthcare"
  | "bills"
  | "education"
  | "other";
```

### GroceryItem

```typescript
interface GroceryItem {
  id: string;
  name: string;
  nameNormalized: string;     // Lowercase for template matching
  quantity: string;
  price: number | null;       // null = no price set, 0 = free item
  checked: boolean;
  category: GroceryCategory;
  templateId?: string;        // Linked template
  createdAt: Date;
  expenseId?: string;         // Linked expense when checked
  aiDetected?: boolean;
  checkedAt?: Date;
  imageUri?: string;
}

type GroceryCategory =
  | "fruits"
  | "vegetables"
  | "dairy"
  | "meat"
  | "snacks"
  | "beverages"
  | "household"
  | "other";
```

### GroceryTemplate

```typescript
interface GroceryTemplate {
  id: string;
  userId: string;
  productNameDisplay: string;      // User-visible name
  productNameNormalized: string;   // Lowercase for matching
  defaultQuantity: string;
  defaultPrice: number;
  category: GroceryCategory;
  source: "manual" | "learned";
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
}
```

### UserSettings

```typescript
interface UserSettings {
  currency: Currency;
  theme: "light" | "dark" | "system";
  language: string;               // "en" | "bn"
  geminiApiKey?: string;          // Stored in SecureStore
}

interface Currency {
  code: string;   // "USD", "BDT", etc.
  symbol: string; // "$", "৳", etc.
  name: string;
}

const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];
```

---

## State Management

The app uses **React Context API** with a single `AppProvider` for global state.

### AppContext Interface

```typescript
interface AppContextType {
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Grocery
  groceryItems: GroceryItem[];
  addGroceryItem: (item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">) => void;
  updateGroceryItem: (id: string, item: Partial<GroceryItem>) => void;
  deleteGroceryItem: (id: string) => void;
  toggleGroceryItem: (id: string) => void;
  clearCompletedGroceryItems: () => void;
  itemPendingCompletion: GroceryItem | null;       // For completion modal
  setItemPendingCompletion: (item: GroceryItem | null) => void;
  completeGroceryItem: (id: string, price: number, imageUri?: string) => void;

  // Settings
  settings: UserSettings;
  updateCurrency: (currency: Currency) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateLanguage: (language: string) => void;
  updateApiKey: (apiKey: string) => void;

  // Computed Stats
  totalExpenses: number;
  todayExpenses: number;
  monthExpenses: number;
  weekExpenses: number;
  todaysExpensesList: Expense[];
  categoryBreakdown: { category: ExpenseCategory; amount: number; percentage: number; count: number; }[];

  // Translation & Formatting
  t: TranslationKey;
  formatNumber: (value: number | string) => string;

  // Theme
  colorScheme: "light" | "dark";

  // Templates
  templates: GroceryTemplate[];
  addTemplate: (...) => Promise<GroceryTemplate>;
  updateTemplate: (id: string, updates: Partial<GroceryTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  findMatchingTemplates: (input: string) => Promise<TemplateMatch[]>;
  applyTemplate: (templateId: string) => Promise<Partial<GroceryItem> | null>;

  // Learning
  checkForSuggestions: () => Promise<LearningCandidate | null>;
  acceptSuggestion: (candidate: LearningCandidate) => Promise<GroceryTemplate>;
  dismissSuggestion: (normalizedName: string, forever: boolean) => Promise<void>;
  smartSuggestionsEnabled: boolean;
  toggleSmartSuggestions: () => void;
  clearAllData: () => void;
}
```

### Key Business Logic

#### Grocery-to-Expense Link

When a grocery item is checked:
1. If `price === null`, show completion modal requiring price
2. Create expense with same description, amount, category="food", imageUri
3. Store `expenseId` on grocery item for bidirectional sync
4. When grocery item is edited, sync changes to linked expense
5. When grocery item is unchecked, delete the linked expense

```typescript
const toggleGroceryItem = (id: string) => {
  const item = groceryItems.find((i) => i.id === id);
  if (!item) return;
  const newCheckedState = !item.checked;

  // Intercept: If checking item without price, trigger completion modal
  if (newCheckedState && item.price === null) {
    setItemPendingCompletion(item);
    return;
  }

  // Normal toggle logic
  if (newCheckedState && item.price !== null) {
    // Create expense and link
    const expenseId = addExpense({...});
    updateItem({ checked: true, expenseId, checkedAt: new Date() });
  } else if (!newCheckedState && item.expenseId) {
    // Unchecking: Remove linked expense
    deleteExpense(item.expenseId);
    updateItem({ checked: false, expenseId: undefined });
  }
};
```

---

## Services Architecture

### Storage Service (`services/storage/index.ts`)

Uses **AsyncStorage** for general data and **SecureStore** for sensitive data (API keys).

```typescript
// Storage keys
const EXPENSES_KEY = "@amar_hisab_expenses";
const GROCERY_KEY = "@amar_hisab_grocery";
const SETTINGS_KEY = "@amar_hisab_settings";
const API_KEY_STORAGE_KEY = "amar_hisab_gemini_api_key";

// Core operations
export const saveExpenses = async (expenses: Expense[]): Promise<void>;
export const loadExpenses = async (): Promise<Expense[]>;
export const saveGroceryItems = async (items: GroceryItem[]): Promise<void>;
export const loadGroceryItems = async (): Promise<GroceryItem[]>;
export const saveSettings = async (settings: UserSettings): Promise<void>;
export const loadSettings = async (): Promise<UserSettings | null>;
export const clearAllData = async (): Promise<void>;

// Date deserialization on load
expenses.map((e) => ({ ...e, date: new Date(e.date) }));
```

### AI Service (`services/ai/gemini.ts`)

Integrates **Google Gemini AI** for:

1. **Category Detection (Grocery)**: Given item name, predict GroceryCategory
2. **Category Detection (Expense)**: Given description, predict ExpenseCategory
3. **Voice Parsing**: Convert speech transcript to structured expenses/groceries

```typescript
// Initialize with API key
let genAI: GoogleGenerativeAI | null = null;
export function setGeminiApiKey(apiKey: string): void;

// Cache to reduce API calls (10 min TTL)
const categoryCache = new Map<string, { category: GroceryCategory; timestamp: number }>();

// Grocery category detection
export async function detectItemCategory(itemName: string): Promise<GroceryCategory | null>;

// Expense category detection
export async function detectExpenseCategory(description: string): Promise<ExpenseCategory | null>;

// Voice input parsing
export interface VoiceParsedResult {
  expenses: VoiceParsedExpense[];
  groceries: VoiceParsedGrocery[];
}
export async function parseVoiceInput(
  transcript: string,
  options: { currencyCode: string; language: string }
): Promise<VoiceParsedResult | null>;
```

### Template Services

#### Template Storage (`features/templates/services/template-storage.ts`)

```typescript
export const TemplateStorage = {
  getAll(): Promise<GroceryTemplate[]>;
  getById(id: string): Promise<GroceryTemplate | null>;
  create(template: Omit<GroceryTemplate, "id" | "createdAt" | "lastUsedAt" | "usageCount">): Promise<GroceryTemplate>;
  update(id: string, updates: Partial<GroceryTemplate>): Promise<void>;
  delete(id: string): Promise<void>;
  incrementUsage(id: string): Promise<void>;
  findMatching(normalizedName: string): Promise<TemplateMatch[]>;
  rankTemplates(matches: TemplateMatch[]): TemplateMatch[];
};
```

#### Template Learner (`features/templates/services/template-learner.ts`)

Detects patterns from grocery history and suggests templates:

```typescript
export const TemplateLearner = {
  trackGroceryItem(item: GroceryItem): Promise<void>;
  detectLearningCandidates(groceryItems: GroceryItem[]): Promise<LearningCandidate | null>;
  recordSuggestion(normalizedName: string): Promise<void>;
  dismissForever(normalizedName: string): Promise<void>;
};

// Learning criteria:
// - Item seen 3+ times in 30 days
// - Not already a template
// - Not dismissed forever
// - Not suggested in last 24h
```

#### Template Matching (`features/templates/services/template-utils.ts`)

```typescript
// Normalize product name for matching
export function normalizeProductName(name: string): string;

// Calculate match confidence (0-1)
export function calculateMatchConfidence(input: string, templateName: string): number;
```

---

## UI Components

### Custom Tab Bar

Central voice button elevated above tab bar:

```tsx
export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const middleIndex = Math.floor(state.routes.length / 2);
  
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => (
        <React.Fragment key={route.key}>
          {index === middleIndex && (
            <View style={styles.voiceButtonWrapper}>
              <Pressable
                onPress={() => setVoiceModalVisible(true)}
                style={styles.voiceButton}
              >
                <HugeiconsIcon icon={AiMicIcon} size={26} color={colors.onPrimary} />
              </Pressable>
            </View>
          )}
          <AnimatedTabButton ... />
        </React.Fragment>
      ))}
    </View>
  );
};
```

### Action Menu Modal

Long-press context menu with slide-up animation:

```tsx
interface ActionMenuItem {
  label: string;
  icon: any;            // HugeIcon
  onPress: () => void;
  variant?: "default" | "destructive";
}

export const ActionMenuModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  actions: ActionMenuItem[];
  itemTitle: string;
}>;
```

### Toast Notification

Global toast system with spring animations:

```tsx
// Usage: showToast("Expense saved ✓")
export const showToast = (message: string) => void;

export const Toast: React.FC = () => {
  // Renders positioned at bottom, auto-dismisses in 2s
};
```

### Onboarding Tip

First-use tips that persist dismissal:

```tsx
<OnboardingTip screenKey="expenses" />
// Shows "💡 Tip: Long-press any item to edit or delete"
// Auto-dismisses after 10s
// Persists dismissal in AsyncStorage
```

### Bangla Number Input

Bidirectional number input supporting Bangla numerals:

```tsx
<BanglaNumberInput
  value={amount}
  onChangeValue={setAmount}
  placeholder={t.placeholders.expenseAmount}
  language={settings.language}
/>
// Displays Bangla numerals (০১২৩৪৫৬৭৮৯) when language is "bn"
// Accepts both English and Bangla numerals as input
// Internally stores standard numbers
```

---

## Theme & Styling

### Material Design 3 Color System

```typescript
export const Colors = {
  light: {
    // Primary (Teal)
    primary: "#00796B",
    onPrimary: "#FFFFFF",
    primaryContainer: "#B2DFDB",
    onPrimaryContainer: "#00352F",

    // Secondary (Amber)
    secondary: "#FF8F00",
    onSecondary: "#1F1400",
    secondaryContainer: "#FFE0B2",
    onSecondaryContainer: "#3A2500",

    // Tertiary (Indigo)
    tertiary: "#5E35B1",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#D1C4E9",
    onTertiaryContainer: "#24124F",

    // Background & Surfaces
    background: "#FAFAFA",
    onBackground: "#1A1C18",
    surface: "#FFFFFF",
    onSurface: "#1A1C18",
    surfaceVariant: "#F1F3F4",
    onSurfaceVariant: "#3F4448",

    // App-friendly aliases
    card: "#FFFFFF",
    cardMuted: "#F6F7F8",
    divider: "#E6E8EB",
    scrim: "rgba(0,0,0,0.32)",
    placeholder: "#8A9096",

    // Outlines
    outline: "#DADCE0",
    outlineVariant: "#C9CDD2",

    // Text
    text: "#1A1C18",
    textSecondary: "#5F6368",
    textTertiary: "#7A8086",

    // Semantic
    error: "#B3261E",
    onError: "#FFFFFF",
    errorContainer: "#F9DEDC",
    success: "#2E7D32",
    successContainer: "#C8E6C9",
    warning: "#B15D00",
    info: "#1565C0",

    // Navigation
    tint: "#00796B",
    tabIconDefault: "#7C8A93",
    tabIconSelected: "#00796B",
  },

  dark: {
    // Primary (Teal) - lighter for dark mode
    primary: "#4DB6AC",
    onPrimary: "#00322B",
    primaryContainer: "#005047",
    onPrimaryContainer: "#A7FFEB",

    // Background & Surfaces
    background: "#121212",
    surface: "#1A1A1A",
    surfaceVariant: "#262A2E",

    // App-friendly aliases
    card: "#1E1E1E",
    cardMuted: "#232323",
    divider: "#2F3337",

    // Text
    text: "#E6E1E5",
    textSecondary: "#C7C9CC",
    textTertiary: "#AEB3B7",

    // ... (inverted semantic colors)
  },
};
```

### Icons

Using **HugeIcons** (free tier) for consistent iconography:

```tsx
import { Wallet03Icon, ShoppingBasket01Icon, Analytics01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";

<HugeiconsIcon icon={Wallet03Icon} size={24} color={colors.primary} strokeWidth={2} />
```

---

## Internationalization

### Translation Structure

```typescript
export const translations = {
  en: {
    tabs: { expenses: "Expenses", grocery: "Grocery", statistics: "Statistics", settings: "Settings" },
    expenses: {
      title: "Amar Hisab",
      addExpense: "Add Expense",
      noExpenses: "No expenses yet",
      addFirst: "Add your first expense",
      expenseSaved: "Expense saved ✓",
      expenseUpdated: "Expense updated ✓",
      expenseDeleted: "Expense deleted",
      todayTotal: "Today's Total",
      itemCount: "expenses",
    },
    grocery: {
      title: "Grocery List",
      addItem: "Add Item",
      noItems: "No items in your list",
      clearCompleted: "Clear Completed",
      completeItem: "Complete Item",
      priceRequired: "Price is required to complete this item",
    },
    voice: {
      title: "AI Voice",
      subtitle: "Speak naturally to add expenses and groceries",
      ready: "Ready",
      listening: "Listening...",
      processing: "Processing...",
      itemsAdded: "Items added",
    },
    form: { amount: "Amount", category: "Category", description: "Description", name: "Name", quantity: "Quantity", price: "Price", save: "Save", cancel: "Cancel" },
    placeholders: { expenseAmount: "0.00", groceryName: "e.g., Milk, Bread, Eggs...", groceryQuantity: "e.g., 2L, 500g" },
    settings: { title: "Settings", currency: "Currency", theme: "Theme", language: "Language", about: "About" },
    categories: {
      expense: { food: "Food & Dining", transport: "Transport", shopping: "Shopping", entertainment: "Entertainment", healthcare: "Healthcare", bills: "Bills & Utilities", education: "Education", other: "Other" },
      grocery: { fruits: "Fruits", vegetables: "Vegetables", dairy: "Dairy", meat: "Meat & Fish", snacks: "Snacks", beverages: "Beverages", household: "Household", other: "Other" }
    },
    common: { today: "Today", yesterday: "Yesterday" },
    tips: { longPressTip: "💡 Tip: Long-press any item to edit or delete" },
    templates: { title: "Templates", newTemplate: "New Template", suggested: "Suggested Template", accept: "Save Template", dismiss: "Not Now" },
    alerts: { deleteExpenseTitle: "Delete Expense", deleteExpenseMessage: "Are you sure?", delete: "Delete", cancel: "Cancel" }
  },
  bn: {
    tabs: { expenses: "খরচ", grocery: "মুদি", statistics: "পরিসংখ্যান", settings: "সেটিংস" },
    // ... Complete Bangla translations for all strings
  }
};

export type TranslationKey = typeof translations.en;

export const getTranslation = (language: string): TranslationKey => {
  return translations[language as keyof typeof translations] || translations.en;
};
```

### Number Formatting (Bangla)

```typescript
const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export const toBanglaNumber = (value: number | string): string => {
  const str = value.toString();
  return str.split('').map(char => 
    char >= "0" && char <= "9" ? BANGLA_DIGITS[parseInt(char)] : char
  ).join('');
};

export const formatNumber = (value: number | string, language: string = "en"): string => {
  return language === "bn" ? toBanglaNumber(value) : value.toString();
};

export const parseBanglaNumber = (value: string): string => {
  const BANGLA_TO_ENGLISH: Record<string, string> = { "০": "0", "১": "1", ... };
  return value.split('').map(char => BANGLA_TO_ENGLISH[char] || char).join('');
};
```

---

## AI Integration

### Gemini AI Prompts

#### Grocery Category Detection

```
You are a grocery categorization assistant. Given a grocery item name, classify it into ONE of these categories: fruits, vegetables, dairy, meat, snacks, beverages, household, other.

Item name: "${itemName}"

Rules:
- Return ONLY the category name, nothing else
- Choose the most appropriate category
- If unsure, use "other"
```

#### Expense Category Detection

```
You are an expense categorization assistant. Given an expense description, classify it into ONE of these categories: food, transport, shopping, entertainment, healthcare, bills, education, other.

Description: "${description}"

Examples:
- "Lunch at restaurant" → food
- "Taxi to office" → transport
- "New shoes" → shopping
```

#### Voice Input Parsing

```
You are an assistant that extracts expenses and grocery items from speech transcripts.
Return ONLY valid JSON with this exact shape:
{
  "expenses": [{ "amount": number, "description": string, "category": "..." }],
  "groceries": [{ "name": string, "quantity": string, "price": number, "category": "..." }]
}

Rules:
- Use numeric values for amount/price (no currency symbols)
- If amount or name is missing, omit the item
- The user's currency is ${currencyCode} and language is ${language}

Transcript: """${transcript}"""
```

---

## Animations

### Animation Configuration

```typescript
export const ANIMATION_CONFIGS = {
  modal: {
    spring: { damping: 15, stiffness: 150, mass: 0.8, overshootClamping: false },
    timing: { duration: 300 },
  },
  fade: { duration: 200 },
  quick: { duration: 150 },
};
```

### Modal Slide-Up Animation

```typescript
export const useModalAnimation = (visible: boolean) => {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, ANIMATION_CONFIGS.modal.spring);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(1000, ANIMATION_CONFIGS.modal.timing);
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return { animatedStyle, backdropStyle };
};
```

### Tab Button Animation

Animated tab buttons with scale/opacity transitions on selection.

---

## Navigation

### File-Based Routing (Expo Router)

```
app/
├── _layout.tsx          # Stack navigator root
├── (tabs)/
│   ├── _layout.tsx      # Bottom tabs
│   ├── index.tsx        # /
│   ├── list.tsx         # /list
│   ├── statistics.tsx   # /statistics
│   └── settings.tsx     # /settings
└── templates/
    ├── _layout.tsx      # Stack for templates
    ├── index.tsx        # /templates
    ├── add.tsx          # /templates/add
    └── edit.tsx         # /templates/edit
```

### Root Layout

```tsx
export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="templates" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </AppProvider>
  );
}
```

---

## Implementation Guide

### Phase 1: Project Setup

1. Create Expo project with TypeScript template
2. Configure `app.json` with plugins and permissions
3. Install dependencies (see package.json)
4. Set up project structure

```bash
npx create-expo-app@latest AmarHisab --template expo-template-blank-typescript
cd AmarHisab
npx expo install expo-router react-native-reanimated @react-native-async-storage/async-storage expo-secure-store expo-camera expo-image-picker expo-audio expo-haptics @google/generative-ai
npm install @hugeicons/react-native @hugeicons/core-free-icons
```

### Phase 2: Core Infrastructure

1. Implement `types/index.ts` - Data models
2. Implement `constants/theme.ts` - Color system
3. Implement `services/storage/index.ts` - Persistence layer
4. Implement `contexts/app-context.tsx` - Global state

### Phase 3: Navigation Shell

1. Set up Expo Router file structure
2. Implement custom tab bar with voice button
3. Add animated tab buttons

### Phase 4: Expenses Feature

1. Build expenses list screen with FlatList
2. Implement add expense modal
3. Implement edit expense modal
4. Add category selection
5. Add photo capture/selection
6. Integrate AI category detection

### Phase 5: Grocery Feature

1. Build grocery list screen with SectionList (grouped by category)
2. Implement add grocery modal with template suggestions
3. Implement completion modal (price entry when checking)
4. Implement grocery-expense linking

### Phase 6: Templates & Learning

1. Implement template storage service
2. Build template management screens
3. Implement template matching/ranking
4. Build learning detection system
5. Add suggestion cards

### Phase 7: AI Voice Input

1. Implement audio recording wrapper
2. Build voice assistant modal
3. Integrate Gemini for transcript parsing
4. Handle multi-item results

### Phase 8: Statistics

1. Build statistics screen with category breakdown
2. Implement time-based filtering
3. Add expense history list

### Phase 9: Settings

1. Build settings screen
2. Implement currency/theme/language selection modals
3. Add API key configuration
4. Add developer tools

### Phase 10: Internationalization

1. Create full translation dictionaries
2. Implement Bangla number formatting
3. Add language switching

### Phase 11: Polish

1. Add toast notifications
2. Add onboarding tips
3. Fine-tune animations
4. Add haptic feedback
5. Test on Android/iOS

---

## Key Implementation Notes

### Performance Optimizations

- Use `useMemo` for computed statistics
- Memoize list item components with `React.memo`
- Use FlatList/SectionList with proper `keyExtractor`
- Cache AI predictions to reduce API calls

### Error Handling

- Graceful fallbacks when AI detection fails
- Permission request dialogs for camera/microphone
- Offline-first design with local storage

### Accessibility

- All interactive elements have `accessibilityLabel` and `accessibilityRole`
- Proper contrast ratios in color system
- Haptic feedback for tactile confirmation

### Security

- API keys stored in SecureStore (not AsyncStorage)
- No analytics or external data transmission
- All data stays on device

---

## Environment Variables

```bash
# .env.local (DO NOT COMMIT - for local development/testing only)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

Security note:
- `EXPO_PUBLIC_GEMINI_API_KEY` is embedded in the client bundle and can be extracted, so do not use it for production secrets.
- In production, users should provide their own API key from the Settings screen.
- Store user keys using the Storage Layer secure approach (SecureStore on native, with documented web fallback constraints).
- The `.env.local` pattern above is only for local testing.

---

## Testing

```bash
# Run tests
npm test

# Run on device
npx expo start

# Build APK
eas build -p android --profile preview
```

---

*This prompt document provides a complete blueprint for recreating the Amar Hisab app. Follow the implementation guide phases in order, referencing the detailed architecture sections as needed.*
