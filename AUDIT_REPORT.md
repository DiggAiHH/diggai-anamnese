# Anamnese-App — Comprehensive Audit Report

**Generated**: 2025-07-22  
**Scope**: Full React + TypeScript client-side codebase (src/, public/, e2e/, config)  
**Rule**: Report only — no code changes  

---

## Table of Contents

- [A. TypeScript & Type Safety](#a-typescript--type-safety)
- [B. i18n / Localisation Gaps](#b-i18n--localisation-gaps)
- [C. Accessibility (a11y)](#c-accessibility-a11y)
- [D. Error Handling & Resilience](#d-error-handling--resilience)
- [E. Unused / Dead Code & Imports](#e-unused--dead-code--imports)
- [F. UI / UX / CSS / Theme Gaps](#f-ui--ux--css--theme-gaps)
- [G. Configuration, Build & Dependency Issues](#g-configuration-build--dependency-issues)
- [H. Architecture & Component Quality](#h-architecture--component-quality)

---

## A. TypeScript & Type Safety

### A1. Explicit `any` usage (30 occurrences)

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| 1 | `src/components/Questionnaire.tsx` | L54 | `icon: any` in `SummaryGroup` interface |
| 2 | `src/components/Questionnaire.tsx` | L100 | `as any` cast on legacy answers convertor |
| 3 | `src/components/Questionnaire.tsx` | L108 | `dispatch = (action: any) =>` — entire reducer dispatch untyped |
| 4 | `src/components/Questionnaire.tsx` | L121 | `triggerValues: any` in criticalOverlay state |
| 5 | `src/components/Questionnaire.tsx` | L192 | `handleAnswer(questionId: string, value: any)` |
| 6 | `src/components/Questionnaire.tsx` | L213 | `as any` cast on answer object for triage |
| 7 | `src/components/Questionnaire.tsx` | L232 | `handleCameraScan = useCallback((data: any)` |
| 8 | `src/components/Questionnaire.tsx` | L654 | `value={…?.value as any}` — prop drilling with cast |
| 9 | `src/components/AnswerSummary.tsx` | L18 | `icon: any` in SummaryGroup |
| 10 | `src/components/QuestionRenderer.tsx` | L128 | `value={value as any}` |
| 11 | `src/components/inputs/FileInput.tsx` | L8 | `onChange: (value: any) => void` — prop type |
| 12 | `src/components/inputs/FileInput.tsx` | L58 | `catch (err: any)` |
| 13 | `src/components/inputs/BgAccidentForm.tsx` | L41 | `val: any` in handleChange |
| 14 | `src/pages/ArztDashboard.tsx` | L11 | `(window as any).webkitAudioContext` |
| 15 | `src/pages/ArztDashboard.tsx` | L37 | `toastAlerts: any[]` state |
| 16 | `src/pages/ArztDashboard.tsx` | L47,53,58,69,73 | 5× socket event callbacks typed `(data: any)` |
| 17 | `src/pages/ArztDashboard.tsx` | L198-200 | `sessions.filter((s: any) =>` — 3× inline casts |
| 18 | `src/pages/ArztDashboard.tsx` | L203 | `sessions.map((session: any)` |
| 19 | `src/pages/ArztDashboard.tsx` | L244 | `messages: any[]` state |
| 20 | `src/pages/ArztDashboard.tsx` | L254-277 | 2× `(m: any)` / `(msg: any)` in useEffect |
| 21 | `src/pages/ArztDashboard.tsx` | L400 | `icdCodes?.map((icd: any)` |
| 22 | `src/pages/ArztDashboard.tsx` | L423 | `triageEvents.map((t: any)` |
| 23 | `src/pages/ArztDashboard.tsx` | L471 | `answers.map((a: any)` |
| 24 | `src/pages/ArztDashboard.tsx` | L589 | `icon: any` in StatCard props |
| 25 | `src/pages/ArztDashboard.tsx` | L590 | `const colors: any =` |
| 26 | `src/store/sessionStore.ts` | multiple | `validationRules?: any`, `branchingLogic?: any`, `triggerValues: any`, `value: any` |
| 27 | `src/utils/questionLogic.ts` | L-range | `context?: any` parameter |
| 28 | `src/api/client.ts` | multiple | Several `unknown` usages that could be narrower |

### A2. Missing React imports

Files that use `React.FC` or `React.FC<>` without importing `React`:

| File | Impact |
|------|--------|
| `src/components/inputs/TextInput.tsx` | Uses `React.FC` |
| `src/components/inputs/NumberInput.tsx` | Uses `React.FC` |
| `src/components/inputs/DateInput.tsx` | Uses `React.FC` |
| `src/components/inputs/RadioInput.tsx` | Uses `React.FC` |
| `src/components/inputs/MultiSelectInput.tsx` | Uses `React.FC` |
| `src/components/inputs/TextAreaInput.tsx` | Uses `React.FC` |

> These may work with Vite's JSX runtime auto-inject, but `React.FC` specifically requires the import because it's a type reference, not JSX syntax. The TypeScript compiler may or may not raise an error depending on `tsconfig` settings.

### A3. Weak interface definitions

| File | Line | Issue |
|------|------|-------|
| `src/store/sessionStore.ts` | multiple | `TriageEvent.triggerValues: any`, `MedicalAtomQuestion.validationRules?: any`, `branchingLogic?: any` — these should have proper interfaces |
| `src/components/Questionnaire.tsx` | L54 | `SummaryGroup.icon: any` — should be `React.ReactNode` |
| `src/components/AnswerSummary.tsx` | L18 | Same — `icon: any` → `React.ReactNode` |

---

## B. i18n / Localisation Gaps

### B1. Locale file key coverage

All 5 locale files (de, en, ar, tr, uk) contain **1,431 keys** each with **0 missing keys** between languages. However:

- **Duplicate keys** exist in all locale files: keys `"keine"` and `"Keine"` (case-only difference). PowerShell's `ConvertFrom-Json` rejects these as duplicates. JSON standard allows case-sensitive keys, but this is fragile and confusing.

### B2. Components with ZERO i18n (no `useTranslation` import)

These components contain hardcoded German strings without any i18n wrapping:

| # | File | Hardcoded strings (examples) |
|---|------|------------------------------|
| 1 | `src/components/ErrorBoundary.tsx` | L37: "Ein Fehler ist aufgetreten", L39: "Die Applikation hat einen unerwarteten Fehler…", L45: "Seite neu laden" |
| 2 | `src/components/Navigation.tsx` | L-all: "Zurück", "Wird gesendet...", "Absenden", "Weiter" — ALL button labels |
| 3 | `src/components/FontSizeControl.tsx` | aria-labels: "Schriftgröße anpassen", "Schrift verkleinern", "Schrift vergrößern" |
| 4 | `src/components/KioskToggle.tsx` | title attrs: "Vollbild beenden", "Vollbild (Kiosk-Modus)" |
| 5 | `src/components/UnfallBGFlow.tsx` | **ENTIRE COMPONENT** — all step titles, labels, BG_OPTIONS, UNFALL_ART_OPTIONS, validation messages, buttons. ~50+ strings |
| 6 | `src/components/inputs/BgAccidentForm.tsx` | All labels: "Zuständige Berufsgenossenschaft", "Unfallzeitpunkt", "Unfallort", "Unfallhergang", BGs array labels, "-- Bitte wählen --", "Ja"/"Nein" |
| 7 | `src/components/inputs/CameraScanner.tsx` | "Kamera konnte nicht gestartet werden…", "eGK Karte Scannen", "Karte nicht erkannt…", "Wird übernommen!", "Kamera wird gestartet..." |
| 8 | `src/components/inputs/MedicationScanner.tsx` | "Kamera konnte nicht gestartet werden…", "Medikament scannen", "Barcode / PZN", "QR-Code", "Foto / OCR", "Medikament erkannt", "Übernehmen", "Erneut scannen", ~20+ strings |
| 9 | `src/components/inputs/VoiceInput.tsx` | aria-labels: "Spracheingabe stoppen"/"Spracheingabe starten", "🎙️ Zuhören…" |
| 10 | `src/components/inputs/SelectInput.tsx` | "Bitte wählen..."/"Auswahl" |
| 11 | `src/components/inputs/FileInput.tsx` | "Datei ist zu groß", "Upload fehlgeschlagen", "Verbindungsfehler beim Upload", "Erfolgreich hochgeladen", "Klicken, um ein Dokument hochzuladen", "Datei entfernen", "Lädt hoch..." |
| 12 | `src/pages/ArztDashboard.tsx` | **ENTIRE PAGE** (~598 lines) — all labels, headers, "Arzt-Zugang", "Anmelden", "Abmelden", "Zurück zur Übersicht", "Noch keine Nachrichten", "Patient ist verbunden", "PDF-Bericht", "CSV-Export", "Fall abschließen…" |
| 13 | `src/pages/MFADashboard.tsx` | **ENTIRE PAGE** (~636 lines) — all labels, "MFA Portal", "Portal betreten", "Authentifizierung...", "QR-Code generieren", "Arzt zuweisen", "Keine aktiven Sitzungen…" |
| 14 | `src/pages/AdminDashboard.tsx` | **ENTIRE PAGE** (~1120 lines) — all tab labels, stats, security layers. Explicitly a static documentation dashboard, but still has user-facing German text |

### B3. Components with `useTranslation` but STILL having hardcoded strings

| # | File | Lines | Hardcoded strings |
|---|------|-------|-------------------|
| 1 | `src/components/ChatBubble.tsx` | L17-83 | Entire `FAQ_DB` knowledge base — hardcoded German Q&A pairs not translatable |
| 2 | `src/components/ChatBubble.tsx` | L207 | Bot fallback: "Das konnte ich leider nicht zuordnen…" |
| 3 | `src/components/ChatBubble.tsx` | L263 | Chat header: "Assistent" |
| 4 | `src/components/ChatBubble.tsx` | L283-296 | Tab labels: "FAQ & Hilfe", "Team-Chat" |
| 5 | `src/components/DSGVOConsent.tsx` | L102-125 | Full privacy policy text (§1-§6) hardcoded German |
| 6 | `src/components/DSGVOConsent.tsx` | L130 | Security notice: "Ihre Daten werden durch AES-256-GCM…" |
| 7 | `src/components/LandingPage.tsx` | L161 | "Patienten-Service Hub" — not in `t()` |
| 8 | `src/components/LandingPage.tsx` | L76 | Badge text "NEU" |
| 9 | `src/components/IGelServices.tsx` | L18-25 | SERVICES array: all names/descriptions |
| 10 | `src/components/IGelServices.tsx` | L99 | "Hinweis: Dies sind Privatleistungen…" |
| 11 | `src/components/MedicationManager.tsx` | L24-33 | FREQUENCY_OPTIONS: all labels ("Morgens", "Mittags", "Abends"…) |
| 12 | `src/components/MedicationManager.tsx` | placeholders | "z.B. Ramipril, Metformin", "z.B. 5mg, 500mg" |
| 13 | `src/components/SurgeryManager.tsx` | L93 | "Komplikationen bekannt" |
| 14 | `src/components/AnswerSummary.tsx` | L82 | "Erstellt am:" print header |
| 15 | `src/components/QuestionRenderer.tsx` | L119 | "Unbekannter Frage-Typ:" fallback |

### B4. Non-translatable data files

| File | Issue |
|------|-------|
| `src/data/questions.ts` (1167 lines) | ALL question texts, option labels, validation messages are hardcoded German. These are key-mapped to i18n in locale files by convention, but the `customMessage` fields are NOT i18n-mapped. |
| `src/data/new-questions.ts` (3135 lines) | Same: all question/option text hardcoded German |
| `src/utils/questionLogic.ts` | Validation messages: "Dieses Feld ist ein Pflichtfeld", "Der Wert muss mindestens…", "Ungültiges Format" — hardcoded, not wrapped in `t()` |

### B5. API client hardcoded strings

| File | Lines | Strings |
|------|-------|---------|
| `src/api/client.ts` | multiple | "Session nicht gefunden", "Keine aktive Session", demo error messages |

---

## C. Accessibility (a11y)

### C1. Missing aria-labels on interactive elements

| File | Line(s) | Element | Issue |
|------|---------|---------|-------|
| `src/components/Navigation.tsx` | all buttons | Zurück/Weiter/Absenden | No `aria-label` on any navigation button |
| `src/components/inputs/NumberInput.tsx` | L- | `<input type="number">` | No `aria-label` or `aria-labelledby` |
| `src/components/inputs/DateInput.tsx` | L- | `<input type="date">` | No `aria-label`, no placeholder |
| `src/components/inputs/RadioInput.tsx` | L- | radio group container | No `role="radiogroup"` on container `<div>` |
| `src/components/inputs/MultiSelectInput.tsx` | L- | checkbox group container | No `role="group"` or `aria-label` on container |
| `src/components/ErrorBoundary.tsx` | L45 | "Seite neu laden" button | No `aria-label` |
| `src/components/CameraScanner.tsx` | close button | X button | No `aria-label` (only has `onClick`) |
| `src/components/CameraScanner.tsx` | capture button | capture circle | No `aria-label` |

### C2. Inconsistent aria-label language

| File | Issue |
|------|-------|
| `src/components/KioskToggle.tsx` | `title` is German ("Vollbild beenden") but `aria-label` is English — language mismatch |
| `src/components/FontSizeControl.tsx` | aria-labels in German, but should respect user's selected locale |

### C3. Focus management gaps

| File | Issue |
|------|-------|
| `src/components/Questionnaire.tsx` | No focus trap in the questionnaire flow; when navigating forward/back, focus does not move to the new question |
| `src/components/RedFlagOverlay.tsx` | Full-screen overlay has no focus trap — users can tab to elements behind it |
| `src/components/inputs/CameraScanner.tsx` | Full-screen modal has no focus trap |
| `src/components/inputs/MedicationScanner.tsx` | Full-screen modal has no focus trap |
| `src/pages/ArztDashboard.tsx` | Toast alerts are not announced via `aria-live` region |

### C4. Keyboard navigation

| File | Issue |
|------|-------|
| `src/components/Celebrations.tsx` | Canvas confetti animation has no alternative text or skip mechanism |
| `src/components/HistorySidebar.tsx` | Sidebar items are clickable `<li>` elements — should be buttons or have `role="button"` + `tabIndex` |

---

## D. Error Handling & Resilience

### D1. Silent error swallowing

| File | Line(s) | Issue |
|------|---------|-------|
| `src/components/IGelServices.tsx` | checkout handler | `console.error` on checkout failure — no user-facing feedback |
| `src/pages/ArztDashboard.tsx` | L165 | Login `catch {}` — empty catch, error swallowed entirely |
| `src/pages/ArztDashboard.tsx` | L267 | Socket reconnect — no user notification on connection loss |
| `src/components/inputs/MedicationScanner.tsx` | L115 | Scanner stop `catch { /* ignore */ }` |
| `src/api/client.ts` | multiple | Demo mode `demoError()` throws but callers may not handle consistently |

### D2. Missing error boundaries

| Area | Issue |
|------|-------|
| Dashboard pages | `ArztDashboard.tsx`, `MFADashboard.tsx`, `AdminDashboard.tsx` — none wrapped in `<ErrorBoundary>`. Only the main `App.tsx` has a top-level boundary. |
| Individual scanner modals | `CameraScanner.tsx`, `MedicationScanner.tsx` — no error boundary wrapping OCR/camera operations |

### D3. Missing loading / error states

| File | Issue |
|------|-------|
| `src/pages/ArztDashboard.tsx` L195 | `SessionList` — only checks `isLoading`, no `isError` state rendered |
| `src/pages/MFADashboard.tsx` | `SessionManagementList` — only checks `sessionsLoading`, no error state |
| `src/components/Questionnaire.tsx` | API submission (`handleComplete`) — no retry mechanism for network failures |

### D4. Encoding issues

| File | Lines | Issue |
|------|-------|-------|
| `src/api/client.ts` | L~495, L~560 | Corrupted characters: `fÃ¼r` (should be `für`), `entschlÃ¼sselte` (should be `entschlüsselte`), `â€"` (—), `â†'` (→). File appears to have been saved/edited with wrong encoding at some point. |

---

## E. Unused / Dead Code & Imports

### E1. Potentially dead modules

| File | Evidence |
|------|----------|
| `src/context/QuestionnaireContext.tsx` (163 lines) | Appears to be **dead code**: the app uses Zustand (`sessionStore.ts`) for state management. `QuestionnaireContext` is not imported in `App.tsx` or any routing component. Contains a full reducer/context that duplicates Zustand functionality. |

### E2. Possibly unused dependencies (package.json)

| Package | Installed | Issue |
|---------|-----------|-------|
| `qrcode.react` | Yes (`^4.2.0`) | `QRCodeDisplay.tsx` uses a custom QR encoder (`import { QRCodeSVG }` only in `MFADashboard.tsx`). Check if `qrcode.react` is actually needed or if `QRCodeDisplay` in components uses something custom. Both may be in use. |
| `concurrently` | In `dependencies` | Should be in `devDependencies` — it's a build/dev tool |

### E3. Unused imports to verify

| File | Import | Issue |
|------|--------|-------|
| `src/components/Celebrations.tsx` | colors array | Recreated on every render inside the component — not memoized (functional issue, not unused import) |

---

## F. UI / UX / CSS / Theme Gaps

### F1. Light theme color issues

Multiple components use hardcoded dark-theme colors that will be invisible or clash in light theme:

| File | Lines | Issue |
|------|-------|-------|
| `src/components/MedicationManager.tsx` | L83, L87+ | `text-white` used repeatedly — invisible on light background |
| `src/components/SurgeryManager.tsx` | similar | Same `text-white` issue |
| `src/components/inputs/BgAccidentForm.tsx` | all fields | `bg-slate-800`, `border-slate-700`, `text-white`, `text-gray-300` — entire component hardcoded for dark theme only |
| `src/components/inputs/CameraScanner.tsx` | entire component | Hardcoded `bg-black`, `text-white` — acceptable for a camera overlay, but close button has no theme awareness |
| `src/pages/ArztDashboard.tsx` | entire file | `bg-gray-950`, `text-white`, `border-white/10` — entire page is dark-mode only |
| `src/pages/MFADashboard.tsx` | entire file | Same — `bg-gray-950`, `text-white` — dark-only |
| `src/index.css` | L~265 | `.progress-bar` background uses `rgba(30, 35, 50, 0.6)` — too dark for light theme |

### F2. CSS variable inconsistencies

| Issue | Detail |
|-------|--------|
| Selective CSS variable usage | `AdminDashboard.tsx` correctly uses `var(--bg-primary)`, `var(--text-primary)` etc. But `ArztDashboard.tsx` and `MFADashboard.tsx` use hardcoded Tailwind colors. No consistency. |
| Missing `--border-hover` | Defined in some theme blocks in `index.css` but inconsistently referenced |

### F3. Component size / layout issues

| File | Issue |
|------|-------|
| `src/components/Questionnaire.tsx` | **739 lines** — monolithic component handling question rendering, navigation, triage, medications, surgeries, BG flows, camera scanning, PDF export. Should be decomposed into smaller subcomponents. |
| `src/pages/AdminDashboard.tsx` | **1,120 lines** — single file containing 6 tab views, all chart configs, all data constants, all sub-components. Should be split into separate files. |
| `src/pages/ArztDashboard.tsx` | **598 lines** — contains login, session list, session detail, chat, stat card all in one file |
| `src/pages/MFADashboard.tsx` | **636 lines** — same pattern, all sub-components in one file |

### F4. Responsive design gaps

| File | Issue |
|------|-------|
| `src/pages/MFADashboard.tsx` | Table-based session list (`<table>` with 6 columns) — no mobile-responsive alternative; truncated on small screens |
| `src/components/inputs/BgAccidentForm.tsx` | Uses `md:grid-cols-2` which is fine, but nested within Questionnaire's own layout — may overflow |

### F5. Animation performance

| File | Issue |
|------|-------|
| `src/components/inputs/CameraScanner.tsx` | Uses `dangerouslySetInnerHTML` to inject a `<style>` block with `@keyframes scan` — should use a CSS file or Tailwind animation instead |
| `src/components/Celebrations.tsx` | Creates new `colors` array on every render — not memoized. Canvas animation runs continuously without cleanup throttle. |

---

## G. Configuration, Build & Dependency Issues

### G1. Beta dependency in production

| Package | Version | Risk |
|---------|---------|------|
| `vite` | `8.0.0-beta.13` | **BETA** version used in production. May have breaking changes, incomplete features, or bugs. Should pin to latest stable (currently Vite 6.x). |

### G2. Proxy target is a localtunnel URL

| File | Line | Issue |
|------|------|-------|
| `vite.config.ts` | proxy target | Backend API proxy points to `https://anamnese-api-final.loca.lt` — this is a localtunnel URL, not a production endpoint. Will fail when the tunnel is down. |

### G3. Security configuration concerns

| File | Setting | Risk |
|------|---------|------|
| `vite.config.ts` | `allowedHosts: true` | Disables host header validation — security concern for production |
| `tsconfig.app.json` | `types: []` | Empty types array means no global type definitions — could cause issues with third-party libraries that ship ambient types |

### G4. Dependency placement

| Package | Current | Should be |
|---------|---------|-----------|
| `concurrently` | `dependencies` | `devDependencies` |
| `prisma` | `dependencies` | `devDependencies` (only `@prisma/client` needed at runtime) |

### G5. Locale file issue

| File | Issue |
|------|-------|
| All `public/locales/*/translation.json` | Keys `"keine"` and `"Keine"` coexist as case-only-different keys. While JSON spec allows this, some parsers (PowerShell, certain Java libs) reject it. Risk of silent data loss. |

---

## H. Architecture & Component Quality

### H1. State management duplication

| Issue | Detail |
|-------|--------|
| `QuestionnaireContext.tsx` vs `sessionStore.ts` | Both implement questionnaire state management. The app uses Zustand (`sessionStore.ts`) everywhere, making `QuestionnaireContext.tsx` (163 lines) apparently dead code. This creates confusion for new developers. |

### H2. Data-in-code anti-pattern

| File | Lines | Issue |
|------|-------|-------|
| `src/data/questions.ts` | 1,167 | All 270+ medical questions hardcoded as TypeScript objects. Changes require code deployment. Should ideally be loaded from API / CMS. |
| `src/data/new-questions.ts` | 3,135 | Same — 3,135 lines of medical question data inline. |
| `src/components/ChatBubble.tsx` | L17-83 | Entire FAQ knowledge base hardcoded in the component |
| `src/components/inputs/MedicationScanner.tsx` | L8-27 | PZN medication database hardcoded — only 15 entries for demo |
| `src/pages/AdminDashboard.tsx` | L55-200 | All dashboard statistics, security layers, services, and chart data are static constants — no live data |

### H3. Component responsibility violations

| Component | Lines | Issue |
|-----------|-------|-------|
| `Questionnaire.tsx` | 739 | Handles: question rendering, navigation, answer submission, triage alerts, medication manager, surgery manager, BG accident flow, camera scanning, session management, progress tracking, PDF export triggering. Should be decomposed. |
| `ArztDashboard.tsx` | 598 | Contains: login form, session list, session detail, live chat, stat cards, toast alerts — all in one file. At minimum, extract sub-components to separate files. |
| `AdminDashboard.tsx` | 1,120 | Contains: 6 entire tab views, multiple chart configurations, all data constants, GlassCard, StatCard, FlowDiagram, AdminProgressBar. Should be split per tab. |

### H4. Performance considerations

| File | Issue |
|------|-------|
| `src/components/Celebrations.tsx` | `colors` array recreated each render; no `useMemo` |
| `src/components/Questionnaire.tsx` | Large component re-renders on every answer change due to reducer pattern |
| `src/pages/AdminDashboard.tsx` | All chart data is static — good from a performance standpoint, but `useMemo` around `tabContent` correctly prevents unnecessary re-renders |

### H5. E2E test coverage observations

| File | Observation |
|------|-------------|
| `e2e/anamnese.spec.ts` (215 lines) | Tests patient questionnaire flow with hardcoded German text selectors ("Zurück", "Weiter", "Einwilligen & Fortfahren"). If i18n is applied to Navigation/DSGVO, these tests will break. |
| `e2e/` directory | 5 spec files total — no tests exist for ArztDashboard, MFADashboard, or AdminDashboard |

---

## Summary of Findings

| Category | Critical | Major | Minor |
|----------|----------|-------|-------|
| A. TypeScript | 0 | 30 any usages | 6 missing React imports |
| B. i18n | 0 | 14 fully untranslated components | 15 partial i18n gaps |
| C. Accessibility | 0 | 8 missing aria-labels | 5 focus management gaps |
| D. Error Handling | 0 | 5 silent swallows | 4 encoding issues |
| E. Dead Code | 0 | 1 dead module | 2 dep placement |
| F. UI/Theme | 0 | 6 dark-only components | 3 CSS gaps |
| G. Config/Build | 1 (beta Vite) | 2 security concerns | 2 dep issues |
| H. Architecture | 0 | 3 oversized components | 5 data-in-code |

**Total: 1 Critical, ~69 Major, ~42 Minor findings**

The single critical finding is the use of **Vite 8.0.0-beta.13** in a medical/healthcare application where stability is paramount.

The most impactful major category is **i18n**: 14 components and 3 full dashboard pages have zero internationalization, making the app effectively German-only for those features despite having 5-language locale files with 1,431 keys each.
