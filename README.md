# 💰 Amar Hisab (আমার হিসাব)

<div align="center">

**Your Personal Expense Tracker**

_A beautiful, minimalistic expense tracker with integrated grocery list management_

[![Expo](https://img.shields.io/badge/Expo-52.0.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Download APK](https://expo.dev/accounts/frazix/projects/app/builds/1abcd3f9-bfbc-4208-b08e-258169a6f0d2) • [Report Bug](https://github.com/Frazix12/AmarHisab/issues) • [Request Feature](https://github.com/Frazix12/AmarHisab/issues)

</div>

---

## ✨ Features

### 💸 Expense Management

- **Track Daily Expenses** - Add and categorize your spending with ease
- **Photo Attachments** - Capture or select photos for your expenses (receipts, bills, etc.)
- **Edit / Modify** - Long-press any expense to edit or delete it
  - Edit amount, description, category, and attached images
  - Action menu with smooth animations
  - Confirmation dialogs for destructive actions
- **Smart Categorization** - 8 built-in categories (Food, Transport, Shopping, Entertainment, Healthcare, Bills, Education, Other)
- **Visual Summary** - See your total, daily, and monthly expenses at a glance
- **Time-Based Grouping** - Expenses organized by Today, Yesterday, This Week, This Month, and Older

### 🛒 Grocery List Integration

- **Shopping List** - Create and manage your grocery items
- **Edit Items** - Long-press to edit or delete grocery items
  - Modify name, quantity, price, and category
  - Optional template update (opt-in to update linked templates)
  - Action menu for quick access to edit/delete
- **Check \ Track** - Mark items as purchased while shopping
- **Auto-Expense Creation** - Checked items automatically become expense entries
- **Price Tracking** - Monitor your grocery spending in real-time
- **Category Organization** - Organize items by Fruits, Vegetables, Dairy, Meat, Snacks, Beverages, and more

### 🧠 Smart Templates & AI

- **AI Autofill** - Intelligent suggestions as you type, autofilling price and category
- **AI Voice Mode** - Speak naturally to add expenses and groceries
- **Auto-Learning** - App learns your shopping habits and suggests templates automatically
- **Smart Linking** - Checked grocery items are automatically synced with expenses
- **Template Management** - Create custom templates for frequently bought items
- **Custom API Key** - Use your own Gemini API key for AI features (configurable in Settings)

### 🎨 Beautiful Design

- **Material Design 3** - Modern, polished UI following Google's latest design system
- **Dark Mode** - Eye-friendly dark theme with smooth transitions
- **Smooth Animations** - 60fps animations powered by React Native Reanimated
  - Bouncy modal slide-ups
  - Animated tab navigation with icon scaling and label transitions
  - Haptic feedback on iOS
  - Fluid interactions throughout
- **HugeIcons** - Consistent, professional iconography

### ⚡ Performance

- **Virtualized Lists** - FlatList/SectionList for smooth scrolling on large datasets
- **Stable Rendering** - Memoized row components and list renderers to reduce re-renders
- **Optimized Stats** - Aggregate calculations consolidated to minimize recomputation

### 💬 User Feedback / Guidance

- **Toast Notifications** - Elegant feedback for user actions
  - Success confirmations for saves and updates
  - Deletion confirmations
  - Auto-dismiss after 2 seconds with smooth animations
- **Onboarding Tips** - Discoverable feature hints
  - Helpful tips for new features (e.g., "Long-press to edit or delete")
  - Auto-dismiss after 10 seconds
  - Persistent dismissal (won't show again once dismissed)
- **Haptic Feedback** - Tactile response on Android for better UX

### 🌐 Comprehensive Localization

- **English** - Full English interface
- **বাংলা (Bangla)** - Complete Bangla translation with 100+ localized strings
  - All UI labels, placeholders, and helper text translated
  - Localized number formatting (Bangla numerals: ০১২৩৪৫৬৭৮৯)
  - Bidirectional number conversion for seamless data entry
  - Optimized text length for mobile UI
- **Instant Switching** - Change language on-the-fly from settings
- **Smart Currency Display** - Cleaner number formatting (৳500 instead of ৳500.00)

### 💱 Multi-Currency

Support for 8 major currencies:

- 🇺🇸 US Dollar (USD)
- 🇪🇺 Euro (EUR)
- 🇬🇧 British Pound (GBP)
- 🇧🇩 Bangladeshi Taka (BDT)
- 🇮🇳 Indian Rupee (INR)
- 🇯🇵 Japanese Yen (JPY)
- 🇨🇳 Chinese Yuan (CNY)
- 🇦🇺 Australian Dollar (AUD)

### 💾 Local Data Storage

- All data stored locally using AsyncStorage
- No internet required
- Privacy-focused - your data never leaves your device

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Expo CLI
- Android Studio or Xcode (for native development)
- Expo Go app (for testing on physical devices)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Frazix12/AmarHisab.git
   cd AmarHisab/app
   ```

2. **Install dependencies**

   ```bash
   bun install
   # or
   npm install
   ```

3. **Start the development server**

   ```bash
   bun run start
   # or
   npm start
   ```

4. **Run on your device**
   - Scan the QR code with Expo Go (Android/iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

### Building for Production

**Android APK:**

```bash
eas build -p android --profile preview
```

**Install on Android:**

```bash
eas build:run -p android
```

---

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev) SDK 52
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **UI Library**: [React Native](https://reactnative.dev) 0.76
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) 4.1
- **Icons**: [HugeIcons](https://hugeicons.com)
- **Storage**: AsyncStorage + Expo SecureStore
- **State Management**: React Context API
- **Design System**: Material Design 3
- **Media**: Expo Camera, Expo Image Picker

---

## 📂 Project Structure

```bash
app/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab-based navigation
│   │   ├── index.tsx        # Expenses screen
│   │   ├── list.tsx         # Grocery list screen
│   │   └── settings.tsx     # Settings screen
│   └── _layout.tsx          # Root layout
├── components/              # Shared UI components
│   ├── navigation/          # Navigation components
│   ├── shared/             # General shared components
│   └── ui/                 # Atomic UI elements (Toast, etc.)
├── features/                # Feature-based modules
│   ├── expenses/           # Expenses feature (components, modals)
│   ├── grocery/            # Grocery feature (components, modals)
│   ├── templates/          # Smart Templates feature
│   └── settings/           # Settings feature
├── services/                # Backend/External services
│   ├── ai/                 # Gemini AI integration
│   ├── storage/            # Data persistence (AsyncStorage + SecureStore)
│   └── i18n/               # Internationalization
├── contexts/                # React Context providers
│   └── app-context.tsx      # Global state management
├── constants/               # App constants
│   └── theme.ts             # Material Design 3 colors
├── utils/                   # Shared utility functions
│   └── format.ts            # Formatting helpers
└── types/                   # TypeScript type definitions
    └── index.ts
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

- GitHub: [@Frazix12](https://github.com/Frazix12)
- Project Link: [https://github.com/Frazix12/AmarHisab](https://github.com/Frazix12/AmarHisab)

---

## 🙏 Acknowledgments

- Material Design 3 for the beautiful color system
- HugeIcons for the icon set
- Expo team for the amazing framework
- React Native Reanimated for smooth animations

---

<div align="center">

Made with ❤️ using Material Design 3

**[⬆ Back to Top](#-amar-hisab-আমার-হিসাব)**

</div>
