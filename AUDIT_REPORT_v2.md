# DiggAI Anamnese — Comprehensive Audit Report (v2)

**Date:** 2026-03-01  
**Scope:** `src/` + `server/` — all `.ts` / `.tsx` files  
**Categories:** Security, Error Handling, UX, Code Quality, Performance, i18n

---

## TOP 30 ACTIONABLE ISSUES

---

### 🔴 1. SECURITY — JWT Token Exposed in URL Query Strings

| Detail | |
|---|---|
| **Files** | `src/api/client.ts` L562–567, `src/pages/ArztDashboard.tsx` L480 |
| **Impact** | HIGH — Tokens in URLs are logged in browser history, proxy logs, server access logs, and Referer headers |

```ts
// client.ts L562
window.open(`${API_BASE_URL}/export/sessions/${sessionId}/export/pdf?token=${token}`, '_blank');
// client.ts L567
window.open(`${API_BASE_URL}/export/sessions/${sessionId}/export/csv?token=${token}`, '_blank');
// ArztDashboard.tsx L480
href={`${API_BASE_URL}/upload/${...}?token=${getAuthToken()}`}
```

**Fix:** Use `fetch()` with `Authorization` header + `URL.createObjectURL()` for downloads. Remove token from query strings entirely.

---

### 🔴 2. SECURITY — Auth Tokens Stored in localStorage (XSS-Extractable)

| Detail | |
|---|---|
| **Files** | `src/api/client.ts` L39, `src/pages/ArztDashboard.tsx` L32/L162–163, `src/pages/MFADashboard.tsx` L55/L572 |
| **Impact** | HIGH — Any XSS vulnerability allows full token theft; medical app should use httpOnly cookies |

```ts
// client.ts L39
localStorage.setItem('anamnese_token', token);
// ArztDashboard.tsx L162-163
localStorage.setItem('arzt_token', result.token);
localStorage.setItem('arzt_user', JSON.stringify(result.user));
// MFADashboard.tsx L572
localStorage.setItem('mfa_token', result.token);
```

**Fix:** Switch to `httpOnly` + `Secure` + `SameSite=Strict` cookies set by the server. Remove all JWT localStorage usage.

---

### 🔴 3. SECURITY — CSP Allows `'unsafe-inline'` for Scripts

| Detail | |
|---|---|
| **File** | `server/index.ts` L32 |
| **Impact** | HIGH — Defeats CSP against XSS. Inline scripts can execute arbitrary code |

```ts
scriptSrc: ["'self'", "'unsafe-inline'"],
```

**Fix:** Remove `'unsafe-inline'` from `scriptSrc`. Use nonce-based CSP for any required inline scripts.

---

### 🔴 4. SECURITY — `dangerouslySetInnerHTML` with CSS

| Detail | |
|---|---|
| **File** | `src/components/inputs/CameraScanner.tsx` L206–213 |
| **Impact** | MEDIUM — dangerouslySetInnerHTML should be avoided in a medical app |

```tsx
<style dangerouslySetInnerHTML={{
    __html: `@keyframes scan { 0% { top: 0; opacity: 0; } ... }`
}} />
```

**Fix:** Move keyframe to `index.css` or Tailwind config.

---

### 🔴 5. SECURITY — No CSRF Protection on State-Changing Endpoints

| Detail | |
|---|---|
| **File** | `server/index.ts` (entire server) |
| **Impact** | MEDIUM — JWT in Authorization header mitigates some CSRF, but no explicit CSRF token mechanism exists. Essential if migrating to cookies. |

**Fix:** Add `csurf` or double-submit cookie CSRF protection.

---

### 🔴 6. SECURITY — Missing Input Sanitization on Server Routes

| Detail | |
|---|---|
| **Files** | All `server/routes/*.ts` |
| **Impact** | MEDIUM — Zod validates shape, but no HTML/XSS sanitization exists for free-text fields (chat messages, descriptions). Stored XSS possible when rendered. |

**Fix:** Add `xss` or `sanitize-html` library. Sanitize all user-provided string fields before persisting.

---

### 🟠 7. ERROR HANDLING — Silent Empty `catch {}` in ArztDashboard Login

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` L165 |
| **Impact** | HIGH — Login errors are swallowed entirely. User gets no feedback on unexpected auth failures. |

```ts
} catch { }
```

**Fix:** `catch (err) { /* mutation's isError already shows "Fehler beim Anmelden" but this catch prevents it from triggering */ }`. Remove the try/catch or add explicit error handling.

---

### 🟠 8. ERROR HANDLING — Payment Checkout Error Swallowed

| Detail | |
|---|---|
| **File** | `src/components/IGelServices.tsx` L40–41 |
| **Impact** | MEDIUM — Payment failures are only `console.error`'d, never shown to user. |

```ts
} catch (err) {
    console.error(err);
}
```

**Fix:** Add `setError('Zahlung konnte nicht initialisiert werden.')` and render error state in UI.

---

### 🟠 9. ERROR HANDLING — Production `console.log` in Session Store

| Detail | |
|---|---|
| **File** | `src/store/sessionStore.ts` L150 |
| **Impact** | LOW-MEDIUM — Logs every navigation atom to console in production, leaking patient flow data. |

```ts
console.log('STORE: navigateToAtom ->', atomId);
```

**Fix:** Remove or wrap in `if (import.meta.env.DEV)`.

---

### 🟠 10. ERROR HANDLING — Raw OCR PII Logged to Console

| Detail | |
|---|---|
| **File** | `src/components/inputs/CameraScanner.tsx` L45 |
| **Impact** | MEDIUM — Logs raw OCR output (potentially patient names, insurance numbers from eGK cards) to browser console. |

```ts
console.log("Raw OCR text:", text);
```

**Fix:** Remove entirely or gate behind `import.meta.env.DEV`.

---

### 🟠 11. ERROR HANDLING — Encryption Key Logged in DEV

| Detail | |
|---|---|
| **File** | `src/components/Questionnaire.tsx` L355 |
| **Impact** | MEDIUM — Encryption keys should never be logged, even in DEV mode. |

```ts
if (import.meta.env.DEV) console.log('Encrypted export key (keep safe):', keyHex);
```

**Fix:** Remove. Encryption keys should never appear in console.

---

### 🟡 12. UX — No Skip-to-Content Link

| Detail | |
|---|---|
| **Files** | `index.html`, `src/App.tsx` |
| **Impact** | MEDIUM — WCAG 2.1 AA requires skip navigation for keyboard/screen reader users. |

**Fix:** Add `<a href="#main-content" class="sr-only focus:not-sr-only ...">Zum Inhalt springen</a>` at top of `<App>`.

---

### 🟡 13. UX — No Confirmation Dialog for Destructive "Fall abschließen" Action

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` L390–398 |
| **Impact** | MEDIUM — Completing a patient case is irreversible but triggers immediately without confirmation. |

```tsx
<button onClick={() => completeMutation.mutate()} ...>
    Fall abschließen & Patient informieren
</button>
```

**Fix:** Add a confirmation modal before calling `completeMutation.mutate()`.

---

### 🟡 14. UX — No Offline Indicator

| Detail | |
|---|---|
| **Files** | `src/App.tsx`, `public/sw.js` |
| **Impact** | MEDIUM — PWA registers service worker but never shows user when offline. API calls silently fail. |

**Fix:** Add `useOnlineStatus()` hook + visible banner.

---

### 🟡 15. UX — ArztDashboard Login Missing Validation & Loading State

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` L180–184 |
| **Impact** | LOW — No `required` attributes. No `disabled` state during pending. Empty form submittable. |

```tsx
<input type="text" value={username} ... placeholder="Benutzername" ... />
<button type="submit" ...>Anmelden</button>
```

**Fix:** Add `required`, `disabled={loginMutation.isPending}`, and loading spinner on button.

---

### 🔵 16. CODE QUALITY — 49 Remaining `any` Types

| Detail | |
|---|---|
| **Files** | `ArztDashboard.tsx` (20+), `Questionnaire.tsx` (8), `sessionStore.ts` (5), `questionLogic.ts` (8), `FileInput.tsx` (2), `LandingPage.tsx` (1), `AnswerSummary.tsx` (1), `BgAccidentForm.tsx` (1) |
| **Impact** | MEDIUM — Defeats TypeScript's safety. Medical app needs strict typing. |

**Worst offenders:**
- `ArztDashboard.tsx`: `toastAlerts: any[]` (L34), `(s: any)` filters (L198–203), `socketRef: any` (L240), `StatCard icon: any` (L589)
- `sessionStore.ts`: `triggerValues: any` (L17), `validationRules?: any` (L31), `value: any` (L39)
- `Questionnaire.tsx`: `dispatch(action: any)` (L108), `handleAnswer value: any` (L192)

**Fix:** Define proper interfaces for each.

---

### 🔵 17. CODE QUALITY — `err: any` in Server Error Handlers

| Detail | |
|---|---|
| **Files** | `server/routes/upload.ts` L61/L93, `server/routes/payments.ts` L22, `server/index.ts` L102 |
| **Impact** | LOW |

```ts
} catch (err: any) {
```

**Fix:** Use `catch (err: unknown)` and type-narrow.

---

### 🔵 18. CODE QUALITY — `role: arzt.role as any` in createToken

| Detail | |
|---|---|
| **File** | `server/routes/arzt.ts` L52 |
| **Impact** | LOW — Bypasses role type safety |

```ts
role: arzt.role as any,
```

**Fix:** Align `AuthPayload.role` with Prisma enum.

---

### 🔵 19. CODE QUALITY — Duplicated Socket Connection Logic (4 instances)

| Detail | |
|---|---|
| **Files** | `ArztDashboard.tsx` L40–80 + L264–290, `MFADashboard.tsx` L62–78 + L265–280 |
| **Impact** | MEDIUM — 4 separate socket setups with near-identical boilerplate. Each creates a new connection. |

**Fix:** Extract `useSocket(room)` custom hook that manages connect/join/disconnect lifecycle.

---

### 🔵 20. CODE QUALITY — ArztDashboard is a Single 598-Line File (6 Components)

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` — `ArztLogin`, `SessionList`, `SessionDetail`, `StatCard` all inline |
| **Impact** | LOW-MEDIUM — Hard to test and maintain. |

**Fix:** Extract each into `src/components/arzt/`.

---

### 🔵 21. CODE QUALITY — MFADashboard is a Single 636-Line File (7 Components)

| Detail | |
|---|---|
| **File** | `src/pages/MFADashboard.tsx` — `MFALogin`, `MfaQrModal`, `MFAChatModal`, `MFAStatsRow`, `SessionManagementList` all inline |
| **Impact** | LOW-MEDIUM |

**Fix:** Extract each into `src/components/mfa/`.

---

### 🟢 22. PERFORMANCE — No `React.memo` on Any List Item Component

| Detail | |
|---|---|
| **Files** | `ArztDashboard.tsx` L589 (`StatCard`), L203–225 (session items rendered inline), `MFADashboard.tsx` L448–540 (table rows) |
| **Impact** | LOW-MEDIUM — Lists re-render all items when any toast or state changes. |

**Fix:** Extract list items and wrap in `React.memo`.

---

### 🟢 23. PERFORMANCE — Missing Font Preloading

| Detail | |
|---|---|
| **File** | `index.html` L20–23 |
| **Impact** | LOW — Google Fonts loaded via `<link>` without preload. Causes FOUT. |

**Fix:** Add `<link rel="preload" as="style" href="...">` or self-host fonts for medical privacy.

---

### 🟢 24. PERFORMANCE — Large Inline IIFE in SessionDetail Render

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` L453–497 |
| **Impact** | LOW — Complex answer-grouping IIFE inside JSX runs on every render without memoization. |

**Fix:** Extract to `useMemo` or a separate memoized component.

---

### 🟣 25. i18n — ArztDashboard: Zero i18n (60+ Hardcoded German Strings)

| Detail | |
|---|---|
| **File** | `src/pages/ArztDashboard.tsx` — no `useTranslation` import anywhere |
| **Impact** | HIGH — Entire dashboard German-only. |

**Examples:** `"Anamnese Übersicht"`, `"Abmelden"`, `"NOTFALL ALERT"`, `"Arzt-Zugang"`, `"Aktive Sessions"`, `"Abgeschlossen"`, `"Patienten-Basisdaten"`, `"KI-Medizinische Analyse"`, `"Live-Kommunikation"`, `"Nachricht an Patient..."`, etc.

**Fix:** Import `useTranslation()` and wrap every visible string in `t()`.

---

### 🟣 26. i18n — MFADashboard: Zero i18n (40+ Hardcoded Strings, Mixed DE/EN)

| Detail | |
|---|---|
| **File** | `src/pages/MFADashboard.tsx` — no `useTranslation` import |
| **Impact** | HIGH — Mixed languages: German UI labels + English sub-text (`"Need assignment to physician"`, `"Critical symptoms detected"`, `"Patients currently answering"`). |

**Fix:** Import `useTranslation()`, wrap all strings, fix language consistency.

---

### 🟣 27. i18n — CameraScanner: Zero i18n (5+ Hardcoded German Strings)

| Detail | |
|---|---|
| **File** | `src/components/inputs/CameraScanner.tsx` |
| **Impact** | MEDIUM — Patient-facing component with hardcoded German. |

**Examples:** `'Kamera konnte nicht gestartet werden...'` (L31), `"eGK Karte Scannen"` (L131), `'Karte nicht erkannt...'` (L196)

**Fix:** Add `useTranslation()` and wrap strings.

---

### 🟣 28. i18n — MedicationScanner: Zero i18n (10+ Hardcoded German Strings)

| Detail | |
|---|---|
| **File** | `src/components/inputs/MedicationScanner.tsx` |
| **Impact** | MEDIUM — Patient-facing scanner. |

**Examples:** `'Kamera konnte nicht gestartet werden...'` (L153), `'Kein Medikament erkannt...'` (L231), `'Fehler bei der Texterkennung...'` (L237)

**Fix:** Add `useTranslation()` and wrap strings.

---

### 🟣 29. i18n — BgAccidentForm: Zero i18n (10+ Hardcoded German Labels)

| Detail | |
|---|---|
| **File** | `src/components/inputs/BgAccidentForm.tsx` |
| **Impact** | MEDIUM — Patient-facing form with all labels hardcoded. |

**Examples:** `"Zuständige Berufsgenossenschaft"` (L51), `"Unfallzeitpunkt"` (L65), `"Unfallort"` (L74), `"Unfallhergang (Beschreibung)"` (L83), `"Wurde der Arbeitgeber bereits informiert?"` (L93)

**Fix:** Add `useTranslation()` and wrap all labels/placeholders.

---

### 🟣 30. i18n — FileInput: Hardcoded German Error Messages

| Detail | |
|---|---|
| **File** | `src/components/inputs/FileInput.tsx` |
| **Impact** | LOW-MEDIUM |

**Examples:** `'Datei ist zu groß (max. 10MB)'` (L28), `'Upload fehlgeschlagen'` (L57), `'Verbindungsfehler beim Upload'` (L59)

**Fix:** Add `useTranslation()` and wrap error strings.

---

## Summary by Severity

| Severity | Count | Categories |
|---|---|---|
| 🔴 Critical | 6 | Security (6) |
| 🟠 High | 5 | Error Handling (5) |
| 🟡 Medium | 4 | UX (4) |
| 🔵 Code Quality | 6 | Types, Duplication, Structure |
| 🟢 Performance | 3 | Memoization, Fonts, Render |
| 🟣 i18n | 6 | Missing translations |
| **Total** | **30** | |

---

## Priority Action Plan

1. **Immediate (Security):** Remove tokens from URLs (#1), fix CSP `unsafe-inline` (#3), add input sanitization (#6)
2. **Short-term (Security + Errors):** Migrate to httpOnly cookies (#2), fix silent catches (#7–#8), remove production console.logs (#9–#11)
3. **Medium-term (UX + i18n):** Add skip-to-content (#12), confirmation dialogs (#13), offline indicator (#14), i18n for dashboards (#25–#30)
4. **Ongoing (Code Quality):** Eliminate `any` types (#16–#18), extract duplicated socket code (#19), split monolithic files (#20–#21), add React.memo (#22)
