# Maestro E2E Suite

This folder contains a comprehensive Maestro test suite for the Expo app.

## Prerequisites

1. Install Java 17+
2. Install Maestro CLI

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
maestro --version
```

3. Build and install the app on an Android emulator/device (recommended for this repo):

```bash
bunx expo prebuild --platform android
bun run android
```

By default, flows target Android package `com.frazix.amarisab`.

If you run flows with Expo Go, update each flow header `appId` to `host.exp.Exponent`.

## Run

From repo root:

```bash
bun run maestro:test
```

Smoke only:

```bash
bun run maestro:smoke
```

Single flow:

```bash
maestro test .maestro/flows/01_expenses_crud.yaml
```

## Suite Layout

- `.maestro/config.yaml`: run order, animation config, output folder
- `.maestro/subflows/`: reusable navigation and setup helpers
- `.maestro/flows/`: end-to-end feature coverage

## Coverage Map

- `00_smoke_navigation.yaml`
  - Tab navigation, screen headers, voice modal open/close

- `01_expenses_crud.yaml`
  - Add expense, edit expense, delete expense

- `02_grocery_crud_complete.yaml`
  - Add grocery item, complete item, clear completed, edit/delete item

- `03_statistics_filters.yaml`
  - Seed sample data, statistics screen, month range modal, period navigation, category filter

- `04_settings_customization.yaml`
  - Currency/theme/language changes and language switch round-trip

- `05_ai_settings_and_templates.yaml`
  - Smart suggestions toggle, API key save/remove for Gemini + ElevenLabs
  - Template create/edit/delete and tab filters

- `06_voice_assistant_ui.yaml`
  - Voice modal controls and core UI states

- `07_camera_attachment_entrypoints.yaml`
  - Expense camera attachment entrypoint and permission/camera exit paths

## CI Example

```yaml
name: Maestro Core E2E

on:
  pull_request:
  push:
    branches: [main]

jobs:
  maestro:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - run: bun install
      - run: curl -fsSL "https://get.maestro.mobile.dev" | bash
      - run: maestro start-device --platform android
      - run: bun run maestro:test
```
