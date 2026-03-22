---
name: testing-e2e
description: "Playwright E2E testing for DiggAI Anamnese. Use when writing, running, debugging, or analyzing E2E tests, test fixtures, security tests, penetration tests, or questionnaire flow tests. Covers 28 test specs across anamnese flows, security, and UI interactions."
metadata:
  author: diggai
  version: "1.0"
  domain: quality
---

# E2E Testing Skill

## Stack

- **Playwright** — E2E-Testing-Framework
- **28 Specs** in `e2e/`
- **Konfiguration**: `playwright.config.ts`

## Wichtige Test-Dateien

| Spec | Bereich |
|------|---------|
| `anamnese.spec.ts` | Haupt-Anamnese-Flow |
| `questionnaire-flow.spec.ts` | Fragebogen-Logik |
| `security.spec.ts` | Sicherheitstests |
| `penetration.spec.ts` | Penetrationstests |

## Befehle

```bash
# Full E2E Suite
npx playwright test

# Interaktiver Test-Runner
npx playwright test --ui

# Einzelner Test
npx playwright test e2e/anamnese.spec.ts

# Mit Debug
npx playwright test --debug

# Nur fehlgeschlagene Tests wiederholen
npx playwright test --last-failed

# Test-Report öffnen
npx playwright show-report
```

## Test-Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature-Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('should do expected behavior', async ({ page }) => {
    // Arrange
    await page.fill('#input', 'value');
    
    // Act
    await page.click('button[type="submit"]');
    
    // Assert
    await expect(page.locator('.result')).toContainText('expected');
  });
});
```

## Harte Regeln

- **KEINE** echten Patientendaten in Tests — nur Testdaten
- **IMMER** Selektoren mit Rollen/Labels statt fragiler CSS-Klassen verwenden
- **IMMER** auf Netzwerk-Idle warten bevor Assertions geprüft werden
- **NIEMALS** flaky `setTimeout`-Waits verwenden → `waitForSelector`/`waitForResponse`
- **Security-Tests** dürfen nicht übersprungen werden

## Qualitätschecks vor Merge

```bash
# Vollständige Prüfung
npm run check-all          # Type-Check + Lint + i18n + Prisma
npx playwright test        # E2E Suite
npm run type-check         # TypeScript strict
npm run lint               # ESLint
```
