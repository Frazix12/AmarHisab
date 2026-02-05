# AGENTS

## Purpose
This file gives agentic coding tools a quick, accurate guide to this repo.
It captures commands, structure, and conventions that are visible in the code.

## Quick Facts
- Expo Router app (Expo SDK 54) using TypeScript + React Native.
- Strict TS config with path alias `@/*` (see `tsconfig.json`).
- State via React Context (`contexts/app-context.tsx`).
- Local storage via AsyncStorage + SecureStore (`services/storage`).
- i18n via `services/i18n/index.ts` (en + bn).
- AI integrations live in `services/ai/*`.

## Commands
### Install
- Use Bun for all commands in this repo.
- `bun install`

### Dev Server
- `bun start` (Expo dev server)
- `bun run android` (device/emulator)
- `bun run ios` (device/simulator)
- `bun run web` (Expo web)

### Lint
- `bun run lint`

### Tests
- No test runner is configured in `package.json`.
- Single test: N/A (add a test script first).

### Native Builds / Dev Client
- `bunx expo prebuild` (required after adding native modules)
- `bunx expo run:android`
- `bunx expo run:ios`

### Release (from README)
- `bunx eas build -p android --profile preview`
- `bunx eas build:run -p android`

### Utilities
- `bun run reset-project` (clears sample scaffolding; use carefully)

## Environment
- Node.js 18+ and Expo CLI are expected (see `README.md`).
- New Architecture is enabled in `app.json` (`newArchEnabled: true`).
- Hermes is used; avoid `eval` and non-Hermes-safe patterns.

## Project Layout
- `app/` Expo Router screens and layouts.
- `components/` reusable UI, navigation, shared widgets.
- `features/` domain modules (expenses, grocery, templates, settings, ai).
- `services/` integrations (ai, storage, i18n).
- `contexts/` React context providers.
- `constants/` theme and app constants.
- `utils/` formatting + helper utilities.
- `types/` shared TypeScript types + enums.

## Code Style
### TypeScript + React
- Use `.ts` for logic and `.tsx` for components.
- Prefer `interface` for object shapes; use `type` for unions.
- Keep components functional; hooks for state/effects.
- Screens in `app/` typically `export default function ...` for Expo Router.
- Keep props typed; avoid `any` unless bridging native modules.

### Formatting
- 2-space indentation.
- Double quotes for strings.
- Semicolons enabled.
- Trailing commas in multiline objects/arrays.
- Prefer `const` and `as const` where possible.

### Imports
- Use the `@/` alias for app code.
- Avoid deep relative paths when an `@/` import exists.
- Keep import groups readable; match existing file order.

### Naming
- Components: `PascalCase` (e.g., `AddExpenseModal`).
- Files: `kebab-case` (e.g., `add-expense-modal.tsx`).
- Hooks: `useX`.
- Booleans: `isX` / `hasX`.
- Constants: `UPPER_SNAKE_CASE` for module constants.

## UI + UX Conventions
- Theme via `Colors[colorScheme]` from `constants/theme.ts`.
- Use `useApp()` to access `colorScheme`, `t`, and data actions.
- Use `useModalAnimation` for modal transitions.
- Use `SafeAreaView` or `useSafeAreaInsets` where needed.
- Prefer `HugeiconsIcon` for iconography.
- Provide `accessibilityLabel`/`accessibilityRole` on key buttons.

## Navigation
- File-based routing via Expo Router (`app/`).
- Tabs are defined in `app/(tabs)/_layout.tsx`.
- Custom tab UI is in `components/navigation/custom-tab-bar.tsx`.

## Data + State
- Use context functions (`addExpense`, `addGroceryItem`, etc.) to mutate data.
- Keep state updates immutable; use functional `setState` patterns.
- Do not access AsyncStorage directly; use `services/storage` helpers.
- Link related entities through IDs (see grocery ↔ expenses).

## i18n + Numbers
- All user-facing strings should use `t` from `useApp()`.
- Update both `en` and `bn` in `services/i18n/index.ts`.
- Use `formatNumber` for display; use `parseBanglaNumber` for input.
- Keep translation keys consistent across languages.

## AI + Networking
- AI helpers live in `services/ai/*` (Gemini, ElevenLabs).
- Handle timeouts with `Promise.race` where appropriate.
- Never log or hardcode API keys; use `.env.local` with `EXPO_PUBLIC_*`.
- Show user-friendly errors via `Alert` or toast.

## Error Handling
- Wrap async calls with `try/catch`.
- Log unexpected issues with `console.error` or `console.warn`.
- Set UI error state rather than silently failing.

## Assets + Media
- Image capture/selection uses Expo Image Picker.
- Store URIs only; avoid bundling large assets in code.
- Keep image handling optional and resilient to permission denial.

## Platform Notes
- Native modules require a dev client build (not Expo Go).
- Android audio needs RECORD_AUDIO permission (already in `app.json`).
- Web support is limited for native audio features.

## Repo Rules (Cursor / Copilot)
- No `.cursor/rules/` or `.cursorrules` found.
- No `.github/copilot-instructions.md` found.

## Related Docs
- `README.md` for setup, EAS build, and high-level features.
- `.opencode/AGENTS.md` is for agent skills metadata (not app behavior).

## When in Doubt
- Follow existing patterns in the nearest feature module.
- Keep changes small and localized.
- Prefer clarity over cleverness.
