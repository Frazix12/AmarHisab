# Product Requirements Document (PRD)

## Title
Comprehensive Audit-Driven Refactor and Optimization for Amar Hisab (Expo React Native)

## Status
Approved planning baseline (based on audit + user decisions)

## Context
This PRD turns the completed audit findings into an execution plan for refactoring, performance tuning, architecture cleanup, and reliability improvements.

## Decision Log (Locked)
1. Keep current AI key/security model as-is for now (no backend proxy migration in this cycle; see Risks and Mitigations for client-side key extraction risk, interim controls, and Q3 2026 backend migration target).
2. Replace full-table rewrites with incremental writes and a serialized write queue.
3. Split monolithic `AppContext` into domain-focused context slices/selectors.
4. Decompose `voice-assistant-modal.tsx` into smaller components/hooks.
5. Change AI category behavior from auto-apply to suggest-only with user confirmation.
6. Do a strict accessibility pass for interactive UI elements.
7. Remove legacy Expo starter files/components if unused.
8. Standardize analytics usage on service-based tracking and remove unused hook pattern.
9. Remove potentially unused dependencies after validating local/dev/build workflow impact.
10. Gate non-essential logs behind `__DEV__`; keep production error logging structured.

## Goals
- Improve runtime performance and perceived responsiveness.
- Reduce bug surface area from state/persistence race conditions.
- Increase maintainability with clearer boundaries and smaller modules.
- Improve accessibility and consistency across user flows.
- Keep behavior stable while removing technical debt.

## Non-Goals
- No migration to backend-managed AI proxy in this cycle.
- No visual redesign for branding/theme direction.
- No major data model rewrite beyond persistence strategy changes.

## Scope

### In Scope
- State architecture refactor.
- Storage write-path redesign.
- Voice assistant modularization.
- Accessibility hardening.
- Dependency cleanup and lint/type hygiene.
- Removal of unused legacy scaffolding.

### Out of Scope
- Server-side API key mediation.
- New product features unrelated to reliability/performance.

## Prioritized Implementation Plan

### 1) Critical Fixes (Do First)
1. Persistence race/integrity fixes
   - Replace table-wide delete+insert patterns with incremental upsert/update/delete operations.
   - Add serialized write queue to avoid concurrent write corruption.
2. Context side-effect purity
   - Remove side effects from state updater callbacks.
   - Ensure grocery-expense linking updates occur in deterministic action flows.
3. Stale closure/state consistency fixes
   - Eliminate reads from stale state prior to functional updates in toggle/edit actions.
4. Design and implement compatibility adapters
   - Create a compatibility adapter layer between the legacy `AppContext` API and the new split domain contexts.
   - Define explicit adapter interfaces/classes (for example, a legacy context facade plus per-domain selector adapters) so existing screens can migrate without behavioral changes.
   - Migrate component-by-component behind the adapter layer; keep a rollback path that can switch a migrated screen back to the legacy adapter if regressions are found.
   - Acceptance criteria: adapter-backed flows pass unit/integration tests, no new type errors, and no measurable regression in key interaction latency for expenses/grocery flows.
5. Runtime dependency integrity
   - Missing runtime imports must be added as direct dependencies immediately to avoid build/runtime failures.
   - Add `@posthog/core` as a direct runtime dependency now if imported at runtime.

### 2) High-Impact Optimizations
1. Split global context into domain providers/selectors
   - Expenses, Grocery, Settings, Templates, UI preferences.
   - Keep stable memoized provider values to minimize global rerenders.
2. Voice assistant decomposition
   - Extract form logic, parsing actions, and modal subviews into focused files/hooks.
3. List/render optimization pass
   - Stabilize callbacks and memoize expensive selectors/derived values.
   - Tune list key extractors and rendering props where applicable.

### 3) Code Quality Improvements
1. Resolve lint and type issues repo-wide.
2. Normalize error handling strategy for async operations.
3. Remove duplicate modal/form logic by extracting shared utilities/hooks.
4. Standardize analytics on service-only calls; remove unused hook-based analytics path.
5. Gate non-essential logs with `__DEV__`.

### 4) Nice-to-Have Enhancements
1. Add small developer diagnostics helpers (dev-only).
2. Add targeted comments for non-obvious algorithmic logic only.
3. Improve README version alignment and architecture notes.

## File-Level Refactor Plan

### State + Storage Core
- `contexts/app-context.tsx`
  - Split into domain modules and reduce provider payload churn.
  - Move heavy computed selectors to memoized hooks.
- `contexts/adapters/*` (new)
  - Design and implement compatibility adapters between legacy `AppContext` consumers and split domain providers.
  - Define adapter contracts (legacy facade interface + domain adapter interfaces), wire screen-by-screen migration order, and keep rollback wiring for each migrated screen.
  - Validate with adapter-focused tests and performance checks before removing legacy wiring.
- `services/storage/index.ts`
  - Introduce incremental persistence API and write queue serialization.
- `services/db/client.ts`
  - Ensure init and transactional helpers are aligned with queued writes.

### AI + Voice
- `features/ai/components/voice-assistant-modal.tsx`
  - Extract subcomponents and hooks for recording, parsing, edit forms, and action orchestration.
- `services/ai/gemini.ts`
  - Adjust category output handling to suggestion-only flow.
- `services/ai/audio-record.ts`
  - Lint cleanup and robust async error flow.

### Screens / Lists
- `app/(tabs)/index.tsx`
  - Stabilize render callbacks and reduce inline allocations.
- `app/(tabs)/list.tsx`
  - Optimize list rendering and item interaction handlers.
- `app/(tabs)/statistics.tsx`
  - Break into smaller visualization/summary modules and memoized selectors.

### Shared Components / Accessibility
- `features/expenses/components/*.tsx`
- `features/grocery/components/*.tsx`
- `features/settings/components/*.tsx`
  - Add/normalize `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and state.
  - Standardize pressable semantics and focus behavior where applicable.

### Cleanup Targets (If Confirmed Unused by imports/build)
- `app/modal.tsx`
- `components/ui/themed-text.tsx`
- `components/ui/themed-view.tsx`
- `components/ui/parallax-scroll-view.tsx`
- `components/ui/collapsible.tsx`
- `components/ui/hello-wave.tsx`
- `services/analytics/useAnalytics.ts`

### Dependency Validation + Cleanup
- `package.json`
  - Validate/remove potentially unused packages (`expo-dev-client`, `expo-system-ui`) after workflow checks.

## Acceptance Criteria
- No regression in existing test suite.
- Lint passes without errors.
- Type check passes (`tsc --noEmit`).
- No table-wide rewrite persistence for normal CRUD flows.
- Reduced unnecessary rerenders in key tab screens.
- Accessibility labels/roles present on all primary interactive controls.
- Legacy files removed only when confirmed unused.
- Decision #5: AI category suggestions are suggest-only and are never auto-applied.
- Decision #5: A suggested category is applied only after explicit user confirmation; cancel/dismiss keeps the current category unchanged.
- Decision #5: UI exposes clear suggestion states (suggested badge + confirm/cancel actions) before any category update occurs.

## Verification Plan
1. Static quality gates
   - `bunx eslint .`
   - `bunx tsc --noEmit`
2. Test gates
   - `bun run test -- --runInBand`
3. Runtime checks
   - Add/edit/delete expense and grocery flows
   - Grocery check/uncheck -> linked expense consistency
   - Voice assistant parse/edit/save flows
   - Settings changes persistence and app reload consistency
4. Decision #5 behavior checks
   - Trigger AI category suggestion and verify suggestion badge + confirm/cancel actions are visible.
   - Verify suggested category is not applied until user taps confirm.
   - Verify cancel/dismiss leaves category unchanged and no hidden/implicit category write occurs.
   - Verify confirming suggestion applies category once and persists after reload.
5. Performance spot checks
   - Scroll smoothness in long lists
   - Reduced jank in statistics and voice flows

## Risks and Mitigations
- Risk: AI key/security model remains client-side and keys can be extracted from decompiled apps, leading to misuse.
  - Mitigation: Plan backend-managed key mediation by Q3 2026; until migration completes, enforce key rotation, usage monitoring with alerts, and per-key rate limits/quotas.
- Risk: Context split causes integration regressions.
  - Mitigation: Execute the "Design and implement compatibility adapters" task and migrate incrementally with rollback checkpoints.
- Risk: Persistence API change impacts existing assumptions.
  - Mitigation: Add migration-safe wrappers and test critical CRUD scenarios first.
- Risk: Dependency removal breaks local dev/build.
  - Mitigation: Remove packages only after validation matrix (dev start, tests, lint, Android run).

## Rollout Strategy
1. Land critical persistence and context fixes first.
2. Land voice assistant decomposition and screen optimizations next.
3. Land accessibility + cleanup + dependency trim in final pass.
4. Re-run full verification matrix before final merge.

## Deliverables for This Cycle
1. Refactored core architecture for state and storage.
2. Performance-optimized key screens and voice feature.
3. Accessibility and code quality improvements.
4. Updated dependency manifest if cleanup changes are applied.
5. Final change log mapping each touched file to rationale.
