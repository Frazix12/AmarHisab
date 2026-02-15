# Maestro E2E Testing Workflow

This app now includes a full Maestro workflow for smoke, regression, and AI-assisted paths.

## Scope and coverage

### Smoke suite (`--include-tags smoke`)

1. App launch and tab navigation.
2. Add expense (form fill + save).
3. Add grocery, complete grocery, and verify resulting statistics entry.

### Regression suite (`--include-tags regression`)

1. Expense CRUD (add, edit, delete).
2. Grocery CRUD (add, edit, delete).
3. Settings customization (currency, language, theme).
4. Templates lifecycle (add, edit, delete).
5. Statistics filtering by category.
6. Developer tools (sample data + clear all data).

### AI optional suite (`--include-tags ai`)

1. Voice assistant typed command to parsed review and confirmation.

`ai` flows are tagged with `manual` and `network` because they depend on model/network behavior.

## Where files live

- Maestro config: `.maestro/config.yaml`
- Smoke flows: `.maestro/flows/smoke/`
- Regression flows: `.maestro/flows/regression/`
- AI flows: `.maestro/flows/ai/`

## Local run commands

Install Maestro CLI:

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

Run Android suites:

```bash
bun run test:e2e:android:smoke
bun run test:e2e:android:regression
bun run test:e2e:android:all
bun run test:e2e:android:ci
```

Run iOS suites:

```bash
bun run test:e2e:ios:smoke
bun run test:e2e:ios:regression
```

Run AI optional flow:

```bash
maestro test -e APP_ID=com.frazix.amarisab --include-tags ai .maestro/flows/ai
```

Maestro variable interpolation for `appId: ${APP_ID}` is passed via `-e APP_ID=...` in scripts.

`test:e2e:android:ci` writes JUnit reports to:

- `maestro-output/reports/maestro-smoke.xml`
- `maestro-output/reports/maestro-regression.xml`

## App IDs used by Maestro

- Android package: `com.frazix.amarisab`
- iOS bundle id: `com.frazix.amarhisab`

All scripts pass these IDs through the `APP_ID` environment variable.

## CI strategy

The repository includes `/.github/workflows/maestro-e2e.yml` with:

1. Android smoke tests on pull requests.
2. Android full regression on `main` and nightly schedule.
3. Optional iOS smoke workflow trigger via `workflow_dispatch`.

Required secrets:

- `EXPO_TOKEN`

## Reliability rules for new tests

1. Prefer `testID` selectors over text selectors.
2. Keep each flow independent with `launchApp.clearState: true`.
3. Keep smoke tests under 5 minutes total.
4. Tag network-dependent tests as `manual` and `network`.
5. Add testIDs with every new interactive UI control.
