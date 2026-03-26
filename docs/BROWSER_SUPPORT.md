# Browser Support Matrix

## DiggAI Anamnese Platform

Diese Dokumentation beschreibt die unterstützten Browser und deren Funktionsumfang.

## Unterstützte Browser

| Browser | Min. Version | Status | Notizen |
|---------|-------------|--------|---------|
| Chrome | 90+ | ✅ Vollständig | Empfohlen |
| Firefox | 88+ | ✅ Vollständig | |
| Safari | 14+ | ✅ Vollständig | iOS 14+ |
| Edge | 90+ | ✅ Vollständig | Chromium-basiert |
| Samsung Internet | 15+ | ✅ Vollständig | |
| Chrome Android | 90+ | ✅ Vollständig | |
| Safari iOS | 14+ | ✅ Vollständig | PWA-fähig |

## Nicht unterstützt

| Browser | Status | Grund |
|---------|--------|-------|
| Internet Explorer 11 | ❌ Nicht unterstützt | EOL, moderne Features fehlen |
| Opera Mini | ❌ Nicht unterstützt | Kein JavaScript-Support |
| IE Mobile | ❌ Nicht unterstützt | EOL |

## Feature-Unterstützung

### Core-Funktionen

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| React 19 | ✅ | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| ES2022 | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Flexbox | ✅ | ✅ | ✅ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ | ✅ |

### PWA-Funktionen

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Offline-Speicherung | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ❌ | ✅ (iOS 16.4+) | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Add to Home Screen | ✅ | ❌ | ✅ | ✅ |

### Sicherheit

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| HTTPS | ✅ | ✅ | ✅ | ✅ |
| Secure Cookies | ✅ | ✅ | ✅ | ✅ |
| Web Crypto | ✅ | ✅ | ✅ | ✅ |

## Bekannte Einschränkungen

### Safari (iOS)
- Push Notifications erst ab iOS 16.4 verfügbar
- Background Sync nicht unterstützt
- Web App im Standalone-Modus hat keine Zugriff auf Kamera ausserhalb der App

### Firefox
- Push Notifications nicht unterstützt (Desktop)
- Background Sync nicht unterstützt

## Polyfills

Für ältere Browser werden folgende Polyfills bei Bedarf geladen:

```typescript
// src/polyfills.ts (lazy-loaded)
if (!('Promise' in window)) {
  await import('core-js/features/promise');
}

if (!('fetch' in window)) {
  await import('whatwg-fetch');
}
```

## Test-Strategie

### Automatisierte Tests
- Playwright E2E-Tests auf Chrome, Firefox, Safari
- Lighthouse CI für Performance und Accessibility

### Manuelle Tests
- Cross-Browser-Testing vor jedem Major Release
- Mobile Testing auf iOS und Android Geräten
- PWA-Testing in Standalone-Modus

## Reporting

Bei Browser-spezifischen Problemen:
1. Browser-Version notieren
2. Konsole öffnen (F12) und Fehler kopieren
3. Issue mit Label `browser-compatibility` erstellen

## Aktualisierung

Diese Dokumentation wird quartalsweise überprüft und aktualisiert.

Letzte Aktualisierung: März 2026
