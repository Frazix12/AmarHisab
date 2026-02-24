# Amar Hisab User Guide

Welcome to **Amar Hisab** - a personal, offline-first expense and grocery tracking app for Android.

This guide explains every screen, button, form, and interaction in plain language.

---

## 1) What This App Does

Amar Hisab helps you:

- Track daily expenses
- Manage a grocery list
- Convert grocery purchases into expenses
- Review spending in statistics
- Use AI-assisted entry (voice or typed) if configured
- Save reusable item templates

### Important basics

- **No login/account is required**
- **Your data is stored locally on your device**
- **No premium/paywall flow is implemented**
- You can use the app without AI features
- AI features require internet + API setup

---

## 2) First-Time Use

When you open the app for the first time:

1. You land on the main tabs area.
2. You can immediately add expenses or grocery items.
3. You may see a one-time onboarding hint:
   - "Long-press any item to edit or delete it quickly."

If no data exists yet, you will see empty-state messages and prompts to add your first item.

---

## 3) Navigation Overview

The app uses a bottom tab bar with **4 tabs** and a center AI voice button.

### Tabs

- **Expenses**
- **Grocery**
- **Statistics**
- **Settings**

### Center button (floating in tab bar)

- Opens **AI Voice** assistant modal.

---

## 4) Expenses Tab

The Expenses tab is your daily expense hub.

### What you see

- Screen title
- Today's total summary
- Number of today's expense items
- Expense list (newest first)
- Floating **+** button to add expense

### Add a new expense (using + button)

1. Tap **+**.
2. Fill in:
   - **Amount** (required)
   - **Description** (optional)
   - **Category**
   - **Attachment photo** (optional: camera or gallery)
3. Tap **Save**.

#### While typing description

- AI may auto-detect a category and show detection state.
- You can still manually change the category anytime.

### Edit or delete an expense

1. **Long-press** an expense card.
2. Action menu appears:
   - **Edit**
   - **Delete**
3. Delete asks for confirmation.
4. Edit opens full edit form (same fields as add).

### Expense image interactions

- If an expense has a photo thumbnail:
  - Tap thumbnail to open full-screen viewer.
  - Tap close icon or outside to dismiss.

### Pull to refresh

- You can pull down to refresh list UI.

---

## 5) Grocery Tab

The Grocery tab manages shopping items and completion flow.

### What you see

- Grocery list grouped by category
- **Clear Completed** button (appears when completed items exist)
- Floating **+** button to add item
- Optional AI template suggestion card

### Add grocery item (using + button)

1. Tap **+**.
2. Fill in:
   - **Name** (required)
   - **Quantity** (optional)
   - **Price** (optional at add time)
   - **Category**
3. Tap **Save**.

#### Smart autofill while typing name

- Matching templates may appear.
- You can:
  - Quick autofill with best match
  - Choose from multiple matches in picker
- AI may also auto-suggest category if no template is applied.

### Marking an item complete

- Tap item checkbox or row action.
- If item has no valid price, completion prompts a **Complete Item** modal.
- In completion modal:
  - Price is required
  - You can attach photo (camera/gallery, optional)
  - Tap **Complete** to finish

When completed, grocery can create/link to an expense entry.

### Edit or delete a grocery item

1. Long-press item.
2. Choose **Edit** or **Delete**.

#### Edit modal special option

- If item was created from a template, you can tick:
  - **Update this template with new values**

### Clear completed items

1. Tap **Clear Completed**.
2. Confirm destructive action.
3. All completed grocery items are removed.

---

## 6) Statistics Tab

Statistics shows your spending history and filters.

### Main sections

- Total amount for selected period
- Item count
- Date range controls
- Category filter pills
- Expense history grouped by time (Today, Yesterday, This Week, This Month, Older)

### Change period

- Tap left/right arrows to move period window.
- Tap center date pill to open **custom month range** selector.
- Choose start month and end month, then tap **Apply**.

### Filter by category

- Tap category pills (including "All").
- List and totals update accordingly.

### Reset filters

- If filters/range are active and no data appears, use **Reset filters**.

### Item actions in history

- Long-press an expense in history for **Edit/Delete** menu.

---

## 7) AI Voice (Center Tab Bar Button)

AI Voice lets you add expenses/grocery from speech or typed text.

### Entry methods

- **Microphone mode** (record speech)
- **Typed transcript mode** (manual text input)

### Language options

- Auto
- English
- Bangla

### Voice flow

1. Open AI Voice modal.
2. Choose language mode.
3. Tap mic to start listening.
4. Tap again to stop and process.
5. App transcribes + parses content.
6. Review detected expenses/grocery.
7. Edit any parsed item if needed.
8. Tap **Confirm & Add** to save all.

Nothing is saved until confirm.

### Typed flow

1. Type transcript in input.
2. Tap send.
3. Review parsed items.
4. Confirm and add.

### Review screen actions

- Edit parsed expense
- Edit parsed grocery
- Try again
- Confirm add

### Possible AI errors

- No speech detected
- Parse failed
- Missing/invalid AI key
- Network/timeout issue

You can always fall back to manual entry via Expenses/Grocery forms.

---

## 8) Settings Tab

Settings includes preferences, AI configuration, and data tools.

### Main Settings sections

- Preferences
- About
- Developer Tools

#### Preferences

- **Display** (Customization screen)
- **AI** (AI settings screen)

#### About

- Version info

#### Developer Tools

- **Add Sample Data**
- **Clear All Data** (destructive, confirmed)

---

## 9) Display / Customization Screen

Access path: **Settings -> Display**

You can change:

- **Currency**
- **Theme** (Light / Dark / System)
- **Language** (English / Bangla)

Each opens a selection modal. Tap an option to apply immediately.

---

## 10) AI Settings Screen

Access path: **Settings -> AI**

### Available options

- Manage Templates
- Gemini API Key
- ElevenLabs API Key
- Smart Suggestions toggle

### API key management

For each key:

1. Open key modal.
2. Enter key.
3. Save (or remove existing key).

Key states in UI:

- Masked value if present
- Off if not set

#### What each key does

- **Gemini**: AI understanding/parsing/category detection
- **ElevenLabs**: Voice transcription

### Smart Suggestions

- Toggle with confirmation dialog.
- When enabled, app can suggest saving frequent grocery patterns as templates.

---

## 11) Templates (Manage / Add / Edit)

Access path: **Settings -> AI -> Manage Templates**

### Templates list screen

Features:

- Filter tabs: **All / Manual / Learned**
- Add new template (+)
- Edit existing template
- Delete template (with confirmation)

Each template card shows:

- Name
- Source badge (Manual / AI Learned)
- Usage count
- Category
- Default quantity/price
- Last used date

### Add template

Fields:

- Product name (required)
- Default quantity (optional)
- Default price (required valid number)
- Category (required selection)

Save via top-right check action.

### Edit template

Same core fields as add, plus:

- Source badge
- Usage info
- Handles "template not found" state if invalid ID

---

## 12) Permissions and Conditional Features

Certain features only work after permission is granted.

### Microphone permission

Needed for:

- AI Voice recording

If denied:

- Voice recording won't work
- Typed transcript still works

### Camera permission

Needed for:

- Taking photos in expense/grocery completion flows

If denied:

- Camera capture unavailable
- You can still continue without photo or use gallery (if allowed)

### Photo library permission

Needed for:

- Picking an image from gallery

If denied:

- Gallery attachment unavailable

### Re-enabling denied permissions

Go to Android:

**Settings -> Apps -> Amar Hisab -> Permissions**

Enable needed permission(s), then return to app.

---

## 13) Data Storage, Privacy, and Safety

### Where data is stored

- Expenses, grocery items, templates, settings: local SQLite
- API keys: secure device storage (SecureStore)

### Reset behavior

**Clear All Data** removes local app data and saved API keys.  
This action is destructive and cannot be undone.

### Offline behavior

- Core tracking works offline.
- AI-dependent features need internet and configured keys.

### AI/privacy behavior

When you use AI features, your input (text/transcript) is sent to configured AI providers to process results.

---

## 14) Validation and Error Handling

The app validates key inputs before saving.

### Common validation rules

- Amount must be a valid positive number
- Name cannot be empty
- Price must be valid when required
- Description/name/quantity sanitization is applied

### Rate limit behavior (anti-spam)

If you submit too quickly, you may see:

- "Too many requests. Please wait a moment."

### Error UI patterns

- Alert dialogs for blocking errors
- Toast notifications for success/info/warning/hints
- Global fallback error screen with **Try Again** if unexpected crash occurs

---

## 15) Notifications and In-App Messages

The app uses in-app notifications/toasts for:

- Success messages (saved/updated/deleted)
- Warnings
- Errors
- Hints (including onboarding tips)

It may also show one-time informational notices like app update messages.

---

## 16) Step-by-Step Quick Tasks

### Add an expense quickly

1. Open **Expenses** tab.
2. Tap **+**.
3. Enter amount and optional details.
4. Save.

### Add grocery and mark purchased

1. Open **Grocery** tab.
2. Tap **+** and add item.
3. Tap checkbox/item to complete.
4. Enter price if asked.
5. Confirm completion.

### Use voice to add multiple items

1. Tap center **AI Voice** button.
2. Record or type transcript.
3. Review parsed items.
4. Edit if needed.
5. Confirm add.

### Change app language/currency/theme

1. Open **Settings** tab.
2. Tap **Display**.
3. Choose Language/Currency/Theme.

### Configure AI keys

1. Open **Settings -> AI**.
2. Open Gemini or ElevenLabs key.
3. Paste key and save.

---

## 17) Troubleshooting

### "AI feature isn't working"

Check:

- Internet connection
- API keys are set in **Settings -> AI**
- Permission is granted (for microphone/camera flows)

### "Camera or gallery not opening"

Check Android app permissions in system settings.

### "I can't complete grocery item"

Completion requires a valid price (> 0). Enter price and retry.

### "Statistics are empty"

You may have no entries in selected period/category. Change range/filter or add data.

### "I deleted something by mistake"

Delete/reset actions are irreversible in current app behavior.

---

## 18) Feature Summary Checklist

- Expenses: add/edit/delete, image attachments, long-press actions
- Grocery: add/edit/delete, complete flow, price-required completion, clear completed
- Statistics: period navigation, custom month range, category filters, history actions
- Settings: display options, AI key management, sample data, clear all data
- Templates: manage/add/edit/delete, manual vs learned templates
- AI Voice: mic + typed modes, review/edit/confirm flow
- Permissions: microphone, camera, photo library
- Localization: English and Bangla
- Offline-first local storage with secure key storage
