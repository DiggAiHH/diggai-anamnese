# Frontend Authentifizierung - Implementierungsplan

> **Projekt:** DiggAI Anamnese Platform v3.0.0  
> **Datum:** 2026-04-01  
> **Scope:** 2FA, Session Management, Security Settings  

---

## Executive Summary

Dieser Plan beschreibt die vollständige Frontend-Implementierung von erweiterten Authentifizierungsfeatures auf Basis der bestehenden DiggAI-Architektur.

### Tech Stack (bestehend)
- React 19.2 + TypeScript 5.9 (strict)
- TanStack Query 5.90.21
- Axios mit Request/Response Interceptors
- Zustand 5.0.11
- React Router v7
- React Hook Form
- Tailwind CSS 4.2.1
- i18next 25.8.13 (10 Sprachen)

---

## 1. Komponenten-Analyse

### 1.1 TOTPInput Component (6-Digit Code)

**Beschreibung:** Spezialisiertes Eingabefeld für TOTP-Codes mit Auto-Focus, Auto-Submit und visuellem Feedback.

#### Technische Spezifikation
```typescript
interface TOTPInputProps {
  length?: number;                    // default: 6
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}
```

#### Implementierungszeit
| Phase | Stunden | Beschreibung |
|-------|---------|--------------|
| Core Logic | 2h | Auto-focus, Clipboard-Paste, Backspace-Handling |
| Styling | 1h | Tailwind CSS, Animationen, Error-States |
| Testing | 2h | Unit Tests (Vitest), E2E (Playwright) |
| i18n | 0.5h | ARIA-Labels in 10 Sprachen |
| **Gesamt** | **5.5h** | |

#### API-Abhängigkeiten
```typescript
// Keine direkten API-Calls - reine UI-Komponente
// Wird verwendet von:
// - 2FA Setup Flow (Verification Step)
// - Login Flow (TOTP Challenge)
// - Security Settings (Re-authentication)
```

#### Wiederverwendbarkeit: ⭐⭐⭐⭐⭐ (Sehr hoch)
- Login mit 2FA
- 2FA Setup Verifizierung
- Backup-Code Eingabe
- Re-authentication für sensible Aktionen

#### Test-Komplexität: Mittel
```typescript
// Kritische Testfälle:
✓ Paste "123456" → alle Felder befüllt
✓ Type "1" → Focus auf Feld 2
✓ Backspace auf leerem Feld → Focus zurück
✓ Nur Zahlen akzeptieren (Regex)
✓ Auto-Submit bei 6 Ziffern
✓ Keyboard Navigation (Pfeiltasten)
✓ Screen Reader Kompatibilität
```

#### Accessibility-Anforderungen (WCAG 2.1 AA)
```typescript
// ARIA-Attribute
role="group"
aria-label="6-stelliger Bestätigungscode"
aria-invalid={error ? "true" : "false"}
aria-describedby={error ? "totp-error" : undefined}

// Einzelne Inputs
aria-label={`Ziffer ${index + 1} von ${length}`}
inputMode="numeric"
pattern="[0-9]*"

// Fokus-Management
- Erster Input bei Mount fokussiert
- Visueller Fokus-Indicator (Ring)
- Kein Fokus-Loss bei Eingabe
```

---

### 1.2 DeviceTrustDialog Component

**Beschreibung:** Modal-Dialog zur Bestätigung eines neuen/unbekannten Geräts mit "Vertrauen" Option.

#### Technische Spezifikation
```typescript
interface DeviceTrustDialogProps {
  open: boolean;
  deviceInfo: {
    name: string;           // "Chrome auf Windows"
    location?: string;      // "Berlin, Deutschland"
    ip?: string;            // "Anonymisiert"
    time: Date;
  };
  onConfirm: (trustDevice: boolean) => void;
  onCancel: () => void;
}
```

#### Implementierungszeit
| Phase | Stunden | Beschreibung |
|-------|---------|--------------|
| Core Logic | 1.5h | Modal-Integration, State-Handling |
| Styling | 1h | Warning-Visuals, Device-Icon |
| API-Integration | 1h | Trust-Device API Call |
| Testing | 1.5h | Dialog-Flow, API-Mocking |
| i18n | 0.5h | Übersetzungen |
| **Gesamt** | **5.5h** | |

#### API-Abhängigkeiten
```typescript
// POST /api/auth/device-trust
interface DeviceTrustRequest {
  deviceFingerprint: string;
  trusted: boolean;
  rememberDays?: number;  // 30, 90, oder 0 (nicht merken)
}

// Response
interface DeviceTrustResponse {
  success: boolean;
  deviceId: string;
  trustedUntil?: string;  // ISO Date
}
```

#### Wiederverwendbarkeit: ⭐⭐⭐ (Mittel)
- Login Flow (neues Gerät erkannt)
- Security Settings (Geräte-Verwaltung)
- Admin Alert (suspicious device)

#### Test-Komplexität: Mittel
```typescript
// Kritische Testfälle:
✓ "Dieses Gerät vertrauen" → Checkbox + Confirm
✓ "Nicht vertrauen" → Einmaliger Zugriff
✓ Cancel → Login abbrechen
✓ Device Info korrekt angezeigt
✓ Fokus-Trap im Modal
✓ ESC schließt Dialog (mit Cancel)
```

#### Accessibility-Anforderungen
```typescript
// Modal-Attributes
role="alertdialog"  // Wichtig: Alert-Dialog!
aria-labelledby="device-trust-title"
aria-describedby="device-trust-description"

// Fokus-Management
- Primary Action ("Vertrauen") erhält Fokus
- Fokus-Trap aktiviert
- Zurück zum Trigger bei Close

// Screen Reader
- Vorlese-Reihenfolge: Titel → Beschreibung → Device-Info → Actions
- Warn-Ton bei Öffnen (optional)
```

---

### 1.3 SecuritySettingsPage Component

**Beschreibung:** Einstellungsseite für Sicherheitsoptionen: Passwort ändern, 2FA verwalten, Sessions anzeigen.

#### Technische Spezifikation
```typescript
// Container-Komponente - orchestrates sub-components
interface SecuritySettingsPageProps {
  userId: string;
}

// Sub-Komponenten:
// - PasswordChangeSection
// - TwoFactorSection  
// - ActiveSessionsSection
// - LoginHistorySection (optional)
```

#### Implementierungszeit
| Phase | Stunden | Beschreibung |
|-------|---------|--------------|
| Page Structure | 2h | Layout, Navigation, Route-Setup |
| Password Section | 2h | Form, Validierung, API-Integration |
| 2FA Section | 2h | Status-Anzeige, Toggle, Setup-Link |
| Sessions Section | 1.5h | Integration SessionManager |
| Testing | 2h | Page-Level Tests, Integration |
| i18n | 1h | Alle Sektionen |
| **Gesamt** | **10.5h** | |

#### API-Abhängigkeiten
```typescript
// GET /api/auth/security-status
interface SecurityStatusResponse {
  passwordLastChanged: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'sms' | null;
  trustedDevicesCount: number;
  activeSessionsCount: number;
}

// POST /api/auth/change-password
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

// DELETE /api/auth/sessions/{id}
// GET /api/auth/sessions
```

#### Wiederverwendbarkeit: ⭐⭐ (Niedrig - Page-Level)
- Eigenständige Route `/settings/security`
- Admin-Dashboard (read-only für andere User)
- Onboarding-Flow (zur Erst-Einrichtung)

#### Test-Komplexität: Hoch
```typescript
// Kritische Testfälle:
✓ Passwort-Validierung (8 Zeichen, Komplexität)
✓ 2FA Toggle → Setup-Flow Navigation
✓ Session-Beenden → UI Update
✓ Fehler-Handling (falsches altes Passwort)
✓ Erfolgs-Toast bei Änderungen
✓ Unsaved Changes Warning
✓ Mobile Responsiveness
```

#### Accessibility-Anforderungen
```typescript
// Page-Structure
<main role="main" aria-labelledby="security-settings-title">
  <nav aria-label="Einstellungen Navigation">
    {/* Tabs für Untersektionen */}
  </nav>
  
  <section aria-labelledby="password-section-title">
    {/* Password Change Form */}
  </section>
  
  <section aria-labelledby="2fa-section-title">
    {/* 2FA Management */}
  </section>
</main>

// Focus-Management
- Section-Links springen zu Sektionen
- Form-Fehler fokussieren erstes invalid Field
- Erfolgsmeldungen als live-region
```

---

### 1.4 SessionManager Component

**Beschreibung:** Anzeige und Verwaltung aktiver Sessions mit Möglichkeit zum Remote-Logout.

#### Technische Spezifikation
```typescript
interface Session {
  id: string;
  deviceName: string;      // "Chrome auf Windows"
  browser: string;
  os: string;
  location?: string;
  ip?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
  isTrusted: boolean;
}

interface SessionManagerProps {
  userId: string;
  sessions: Session[];
  onTerminate: (sessionId: string) => Promise<void>;
  onTerminateAll: () => Promise<void>;
}
```

#### Implementierungszeit
| Phase | Stunden | Beschreibung |
|-------|---------|--------------|
| Core Logic | 2h | Session-Liste, Sortierung, Filtering |
| Styling | 1.5h | Session-Cards, Icons, Status-Badges |
| API-Integration | 1.5h | Terminate Calls, Refresh |
| Testing | 2h | Interaktion, API-Mocking |
| i18n | 0.5h | Relative Zeit, Status-Labels |
| **Gesamt** | **7.5h** | |

#### API-Abhängigkeiten
```typescript
// GET /api/auth/sessions
interface SessionsResponse {
  sessions: Session[];
}

// DELETE /api/auth/sessions/{id}
// Response: 204 No Content

// DELETE /api/auth/sessions/all
// Response: 204 No Content (außer current)

// WebSocket Event: session.terminated
// Wird empfangen wenn Session von anderem Gerät beendet wird
```

#### Wiederverwendbarkeit: ⭐⭐⭐⭐ (Hoch)
- Security Settings Page
- Admin Dashboard (User-Impersonation)
- Mobile App (eingeschränkt)

#### Test-Komplexität: Mittel-Hoch
```typescript
// Kritische Testfälle:
✓ Aktuelle Session markiert
✓ Terminate einzelner Session → Entfernen aus Liste
✓ "Alle beenden" → Nur aktuelle bleibt
✓ Relative Zeit korrekt ("vor 2 Minuten")
✓ Bestätigungsdialog vor Terminate
✓ Real-time Update bei WebSocket Event
✓ Empty State anzeigen
```

#### Accessibility-Anforderungen
```typescript
// Session-Liste
<ul aria-label="Aktive Sitzungen">
  <li aria-current={session.isCurrentSession ? "true" : undefined}>
    {/* Session Card */}
  </li>
</ul>

// Terminate-Button
aria-label={`Sitzung auf ${session.deviceName} beenden`}

// Bestätigungsdialog
role="alertdialog"
aria-describedby="terminate-confirm-message"

// Screen Reader
- Anzahl aktiver Sessions vorlesen
- Aktuelle Session hervorheben
- Erfolg/Misserfolg bei Terminate ansagen
```

---

### 1.5 TwoFactorSetupFlow Component

**Beschreibung:** Wizard für 2FA-Einrichtung: QR-Code anzeigen, Backup-Codes generieren, Verifizierung.

#### Technische Spezifikation
```typescript
type SetupStep = 'intro' | 'qr' | 'verify' | 'backup' | 'complete';

interface TwoFactorSetupFlowProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

// Interne State-Machine
interface SetupState {
  step: SetupStep;
  secret?: string;           // TOTP Secret
  qrCodeUrl?: string;        // otpauth:// URL
  backupCodes?: string[];    // 10 Backup-Codes
  verificationCode?: string; // User Input
}
```

#### Implementierungszeit
| Phase | Stunden | Beschreibung |
|-------|---------|--------------|
| State Machine | 2h | Step-Transitions, Error-Handling |
| Intro Step | 0.5h | Erklärung, App-Empfehlungen |
| QR Step | 1.5h | QR-Display, Manual-Secret, Copy-Button |
| Verify Step | 1.5h | TOTPInput Integration, API-Check |
| Backup Step | 1.5h | Code-Display, Download, Confirm |
| Complete Step | 0.5h | Success-Animation, Finish |
| Testing | 3h | Flow-Tests, Error-States |
| i18n | 1h | Alle Steps |
| **Gesamt** | **11.5h** | |

#### API-Abhängigkeiten
```typescript
// POST /api/auth/2fa/setup
// Response
interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// POST /api/auth/2fa/verify
interface TwoFactorVerifyRequest {
  code: string;
}
interface TwoFactorVerifyResponse {
  valid: boolean;
  remainingAttempts?: number;
}

// POST /api/auth/2fa/confirm
// Bestätigt Einrichtung nach erfolgreicher Verifizierung

// DELETE /api/auth/2fa/disable
// Deaktiviert 2FA (mit Re-Auth)
```

#### Wiederverwendbarkeit: ⭐⭐ (Niedrig-Mittel)
- Security Settings (Primary)
- Onboarding Flow (optional)
- Admin-Enforced Setup

#### Test-Komplexität: Hoch
```typescript
// Kritische Testfälle:
✓ Vollständiger Flow bis Complete
✓ QR-Code lässt sich scannen (mit Test-App)
✓ Backup-Codes können kopiert werden
✓ Falscher TOTP-Code zeigt Fehler
✓ "Ich habe die Codes gespeichert" Checkbox required
✓ Cancel in jedem Step möglich
✓ State-Reset bei Re-Open
✓ Rate-Limiting Anzeige
```

#### Accessibility-Anfinderungen (Kritisch!)
```typescript
// Wizard-Structure
<div role="region" aria-label="Zwei-Faktor-Authentifizierung Einrichtung">
  <StepIndicator 
    currentStep={step}
    steps={['Einführung', 'QR-Code', 'Verifizierung', 'Backup-Codes', 'Fertig']}
  />
  
  {/* QR Step */}
  <section aria-labelledby="qr-step-title">
    <img 
      src={qrCodeDataUrl} 
      alt="QR-Code für Authentifizierungs-App"
      aria-describedby="qr-instructions"
    />
    <div id="qr-instructions">
      Scannen Sie diesen Code mit Ihrer Authenticator-App.
      Alternativ können Sie den Schlüssel manuell eingeben.
    </div>
    
    {/* Manual Entry */}
    <label>
      Manueller Schlüssel:
      <code aria-label="TOTP Secret">{secret}</code>
      <CopyButton text={secret} label="Schlüssel kopieren" />
    </label>
  </section>
  
  {/* Backup Codes */}
  <section aria-labelledby="backup-codes-title">
    <ol aria-label="Backup-Codes">
      {backupCodes.map((code, i) => (
        <li key={i}>
          <code aria-label={`Backup-Code ${i + 1}`}>{code}</code>
        </li>
      ))}
    </ol>
    <Checkbox 
      required
      aria-required="true"
      label="Ich habe diese Codes an einem sicheren Ort gespeichert"
    />
  </section>
</div>

// Progressive Disclosure
- QR-Code mit alt-Text
- Manual Secret für Screen Reader
- Audio-Feedback bei Code-Generierung
```

---

## 2. Component-Hierarchie

```
SecuritySettingsPage (Route: /settings/security)
├── PageHeader
├── SettingsNavigation
├── PasswordChangeSection
│   ├── PasswordForm (React Hook Form)
│   │   ├── CurrentPasswordInput
│   │   ├── NewPasswordInput (mit Stärke-Indikator)
│   │   └── ConfirmPasswordInput
│   └── PasswordRequirementsList
├── TwoFactorSection
│   ├── TwoFactorStatusCard
│   │   ├── StatusBadge (Aktiviert/Deaktiviert)
│   │   └── SetupButton / DisableButton
│   └── TwoFactorSetupFlow (Modal/Drawer)
│       ├── IntroStep
│       ├── QRCodeStep
│       │   ├── QRCodeDisplay
│       │   └── ManualSecretInput
│       ├── VerifyStep
│       │   └── TOTPInput
│       ├── BackupCodesStep
│       │   ├── BackupCodesList
│       │   ├── DownloadButton
│       │   └── ConfirmationCheckbox
│       └── CompleteStep
├── ActiveSessionsSection
│   └── SessionManager
│       ├── SessionList
│       │   └── SessionCard (pro Session)
│       │       ├── DeviceIcon
│       │       ├── SessionInfo
│       │       ├── CurrentSessionBadge
│       │       └── TerminateButton
│       └── TerminateAllButton
└── TrustedDevicesSection (optional)

DeviceTrustDialog (Global Modal)
├── DeviceInfoDisplay
├── TrustCheckbox
└── ActionButtons

TOTPInput (Reusable)
├── DigitInputs (6x)
└── HiddenInput (für Form-Integration)
```

---

## 3. API-Contract Definition

### 3.1 Endpoints (Frontend-seitig erwartet)

```typescript
// src/api/auth.ts

export const authApi = {
  // Security Status
  getSecurityStatus: () => 
    apiClient.get<SecurityStatusResponse>('/auth/security-status'),
  
  // Password
  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post('/auth/change-password', data),
  
  // 2FA
  setup2FA: () =>
    apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup'),
  verify2FA: (code: string) =>
    apiClient.post<TwoFactorVerifyResponse>('/auth/2fa/verify', { code }),
  confirm2FA: () =>
    apiClient.post('/auth/2fa/confirm'),
  disable2FA: (code: string) =>
    apiClient.delete('/auth/2fa', { data: { code } }),
  
  // Sessions
  getSessions: () =>
    apiClient.get<SessionsResponse>('/auth/sessions'),
  terminateSession: (sessionId: string) =>
    apiClient.delete(`/auth/sessions/${sessionId}`),
  terminateAllSessions: () =>
    apiClient.delete('/auth/sessions/all'),
  
  // Device Trust
  trustDevice: (data: DeviceTrustRequest) =>
    apiClient.post<DeviceTrustResponse>('/auth/device-trust', data),
};
```

### 3.2 React Query Hooks

```typescript
// src/hooks/useApi/useSecurityApi.ts

export function useSecurityStatus() {
  return useQuery({
    queryKey: ['security', 'status'],
    queryFn: () => authApi.getSecurityStatus(),
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success(t('password_changed_success'));
    },
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: authApi.setup2FA,
  });
}

export function useVerify2FA() {
  return useMutation({
    mutationFn: authApi.verify2FA,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['security', 'sessions'],
    queryFn: () => authApi.getSessions(),
    refetchInterval: 30 * 1000, // 30 Sekunden
  });
}

export function useTerminateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.terminateSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] });
      toast.success(t('session_terminated'));
    },
  });
}
```

---

## 4. State Management

### 4.1 Zustand Store (Erweiterung)

```typescript
// src/store/securityStore.ts

interface SecurityState {
  // 2FA Setup Flow State
  twoFactorSetup: {
    isActive: boolean;
    currentStep: SetupStep;
    secret?: string;
    qrCodeUrl?: string;
    backupCodes?: string[];
  };
  
  // Device Trust
  pendingDeviceTrust?: {
    deviceInfo: DeviceInfo;
    resolve: (trust: boolean) => void;
  };
  
  // Actions
  startTwoFactorSetup: () => void;
  setTwoFactorStep: (step: SetupStep) => void;
  setTwoFactorData: (data: Partial<TwoFactorSetupData>) => void;
  resetTwoFactorSetup: () => void;
  requestDeviceTrust: (deviceInfo: DeviceInfo) => Promise<boolean>;
}
```

---

## 5. Priorisierter Implementierungsplan

### Phase 1: Foundation (Woche 1)
**Gesamtdauer: ~12h**

| Priorität | Komponente | Zeit | Begründung |
|-----------|------------|------|------------|
| P0 | TOTPInput | 5.5h | Wird von allen anderen Features benötigt |
| P1 | API Hooks | 2h | Daten-Layer für alle Features |
| P1 | Security Store | 1h | State-Management |
| P2 | DeviceTrustDialog | 3.5h | Security-Kritisch, einfach isoliert |

**Deliverables:**
- ✅ TOTPInput vollständig mit Tests
- ✅ Security API Hooks
- ✅ DeviceTrustDialog integriert

---

### Phase 2: Security Settings (Woche 1-2)
**Gesamtdauer: ~18h**

| Priorität | Komponente | Zeit | Begründung |
|-----------|------------|------|------------|
| P0 | SecuritySettingsPage | 10.5h | Haupt-Entry-Point |
| P0 | PasswordChangeSection | (inkl.) | Core Security Feature |
| P1 | SessionManager | 7.5h | Wichtig für Security |

**Deliverables:**
- ✅ Security Settings Page vollständig
- ✅ Session Management funktional
- ✅ Passwort-Änderung mit Validierung

---

### Phase 3: 2FA Setup (Woche 2)
**Gesamtdauer: ~11.5h**

| Priorität | Komponente | Zeit | Begründung |
|-----------|------------|------|------------|
| P0 | TwoFactorSetupFlow | 11.5h | Komplexester Flow |

**Deliverables:**
- ✅ 2FA Setup Wizard vollständig
- ✅ QR-Code Generierung
- ✅ Backup-Codes Download
- ✅ E2E Tests für kompletten Flow

---

### Phase 4: Integration & Polish (Woche 3)
**Gesamtdauer: ~10h**

| Task | Zeit | Beschreibung |
|------|------|--------------|
| i18n Finalisierung | 2h | Alle 10 Sprachen vollständig |
| E2E Tests | 3h | Kritische Pfade abgedeckt |
| Accessibility Audit | 2h | Screen Reader Testing |
| Performance Optimierung | 1.5h | Lazy Loading, Code Splitting |
| Dokumentation | 1.5h | Storybook, JSDoc |

---

## 6. Test-Strategie

### 6.1 Unit Tests (Vitest)

```typescript
// src/components/auth/TOTPInput.test.tsx
describe('TOTPInput', () => {
  it('auto-focuses first input on mount', () => {});
  it('moves focus on digit entry', () => {});
  it('handles paste of full code', () => {});
  it('calls onComplete when all digits entered', () => {});
  it('shows error state correctly', () => {});
  it('prevents non-numeric input', () => {});
});

// src/components/auth/TwoFactorSetupFlow.test.tsx
describe('TwoFactorSetupFlow', () => {
  it('completes full setup flow', async () => {});
  it('requires verification before backup step', () => {});
  it('requires confirmation checkbox for backup codes', () => {});
  it('handles API errors gracefully', () => {});
});
```

### 6.2 E2E Tests (Playwright)

```typescript
// e2e/security-settings.spec.ts
test('user can change password', async ({ page }) => {
  await page.goto('/settings/security');
  await page.fill('[name="currentPassword"]', 'oldpass');
  await page.fill('[name="newPassword"]', 'NewPass123!');
  await page.fill('[name="confirmPassword"]', 'NewPass123!');
  await page.click('button[type="submit"]');
  await expect(page.locator('[role="alert"]')).toContainText('Erfolg');
});

test('user can setup 2FA', async ({ page }) => {
  await page.goto('/settings/security');
  await page.click('button:has-text("2FA aktivieren")');
  await expect(page.locator('img[alt*="QR-Code"]')).toBeVisible();
  // ... weitere Steps
});

test('user can terminate sessions', async ({ page }) => {
  // Setup: Mehrere Sessions mocken
  await page.goto('/settings/security');
  await page.click('[aria-label="Sitzung auf iPhone beenden"]');
  await page.click('button:has-text("Bestätigen")');
  await expect(page.locator('text=iPhone')).not.toBeVisible();
});
```

### 6.3 Accessibility Tests

```typescript
// axe-core Integration
test('SecuritySettingsPage passes a11y audit', async ({ page }) => {
  await page.goto('/settings/security');
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## 7. i18n Key-Plan

```json
// public/locales/de/security.json
{
  "security_settings_title": "Sicherheitseinstellungen",
  "password_section_title": "Passwort ändern",
  "2fa_section_title": "Zwei-Faktor-Authentifizierung",
  "sessions_section_title": "Aktive Sitzungen",
  
  "totp_input_label": "6-stelliger Bestätigungscode",
  "totp_input_aria": "Geben Sie den 6-stelligen Code aus Ihrer Authentifizierungs-App ein",
  
  "device_trust_title": "Neues Gerät erkannt",
  "device_trust_description": "Wir haben einen Anmeldeversuch von einem neuen Gerät festgestellt.",
  "device_trust_checkbox": "Diesem Gerät vertrauen",
  
  "2fa_setup_title": "2-Faktor-Authentifizierung einrichten",
  "2fa_qr_instructions": "Scannen Sie diesen QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator, Authy)",
  "2fa_manual_secret": "Oder geben Sie diesen Schlüssel manuell ein:",
  "2fa_backup_codes_warning": "Speichern Sie diese Backup-Codes an einem sicheren Ort. Sie können sie verwenden, wenn Sie keinen Zugriff auf Ihr Telefon haben.",
  "2fa_backup_codes_confirm": "Ich habe diese Codes an einem sicheren Ort gespeichert",
  
  "session_current": "Aktuelle Sitzung",
  "session_terminate": "Beenden",
  "session_terminate_confirm": "Sind Sie sicher, dass Sie diese Sitzung beenden möchten?",
  "session_terminate_all": "Alle anderen Sitzungen beenden"
}
```

---

## 8. Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| QR-Code nicht scannbar | Mittel | Hoch | Manuelle Eingabe + Secret-Anzeige |
| Backup-Codes verloren | Hoch | Kritisch | Erzwungene Bestätigung + Download-Button |
| Session-Terminate self-lockout | Niedrig | Kritisch | Aktuelle Session nicht terminierbar |
| TOTP Zeit-Drift | Mittel | Hoch | Toleranz-Fenster im Backend (±1 Code) |
| Browser-Autofill in TOTP | Mittel | Mittel | `autocomplete="one-time-code"` |

---

## 9. Definition of Done

### Pro Komponente
- [ ] TypeScript strict mode kompatibel
- [ ] Unit Tests >80% Coverage
- [ ] E2E Tests für kritische Pfade
- [ ] i18n in allen 10 Sprachen
- [ ] WCAG 2.1 AA konform (axe-core clean)
- [ ] Mobile Responsive (Touch-Targets ≥44px)
- [ ] JSDoc dokumentiert
- [ ] Storybook Story (falls vorhanden)

### Gesamt
- [ ] Alle API-Contracts implementiert
- [ ] Security Review abgeschlossen
- [ ] Performance Budget eingehalten (<200kb JS)
- [ ] Lighthouse Accessibility Score 100

---

## 10. Zusammenfassung

| Komponente | Zeit | Abhängigkeiten |
|------------|------|----------------|
| TOTPInput | 5.5h | Keine |
| DeviceTrustDialog | 5.5h | Modal, API |
| SecuritySettingsPage | 10.5h | SessionManager, PasswordForm |
| SessionManager | 7.5h | API |
| TwoFactorSetupFlow | 11.5h | TOTPInput, API |
| **Gesamt** | **~40.5h** | |

**Empfohlene Reihenfolge:**
1. TOTPInput (Foundation)
2. DeviceTrustDialog (isoliert)
3. SessionManager + SecuritySettingsPage
4. TwoFactorSetupFlow (komplexester Flow)
5. Integration & Testing

---

*Dokument erstellt: 2026-04-01*  
*Letzte Aktualisierung: 2026-04-01*
