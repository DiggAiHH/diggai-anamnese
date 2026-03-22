---
name: i18n-localization
description: "Internationalization workflow for DiggAI's 10+languages (de, en, tr, ar, uk, es, fa, it, fr, pl). Use when adding translation keys, checking for hardcoded strings, fixing missing translations, testing RTL layout (Arabic/Farsi), or running i18n validation scripts."
metadata:
  author: diggai
  version: "1.0"
  domain: frontend
---

# i18n Localization Skill

## Unterstützte Sprachen

| Code | Sprache | Richtung | Priorität |
|------|---------|----------|-----------|
| `de` | Deutsch | LTR | Quelle (Source of Truth) |
| `en` | English | LTR | Hoch |
| `tr` | Türkisch | LTR | Hoch |
| `ar` | Arabisch | **RTL** | Hoch |
| `uk` | Ukrainisch | LTR | Mittel |
| `es` | Spanisch | LTR | Mittel |
| `fa` | Farsi | **RTL** | Mittel |
| `it` | Italienisch | LTR | Niedrig |
| `fr` | Französisch | LTR | Niedrig |
| `pl` | Polnisch | LTR | Niedrig |

## Workflow: Neuen Key hinzufügen

1. **Key definieren** — semantisch, gruppiert: `section.subsection.label`
2. **Deutsch (de)** als Source of Truth schreiben: `public/locales/de/translation.json`
3. **Alle 9 anderen Sprachen** befüllen: `public/locales/{lng}/translation.json`
4. **Komponente** mit `useTranslation()` und `t('key')` verwenden
5. **Validieren**: `node scripts/generate-i18n.ts` — fehlende Keys erkennen
6. **Vergleichen**: `node compare-translations.cjs` — alle 10 Sprachdateien abgleichen
7. **RTL testen** — Layout bei `ar` und `fa` prüfen

## Harte Regeln

- **KEIN** user-facing String ohne i18n-Key → immer `t('key')`
- **NEUE** Keys müssen in **ALLEN 10** Locale-Dateien hinzugefügt werden
- **KEINE** stillen Fallbacks auf Deutsch in produktiven UI-Flows
- **RTL-Layouts** für Arabisch/Farsi mitdenken bei jeder UI-Änderung
- **Key-Namen** semantisch und gruppiert: `video.waiting_room`, nicht `label42`
- **Accessibility-Text**, Tooltips und ARIA-Labels ebenfalls übersetzen
- **Empty/Error/Loading States** ebenfalls internationalisieren

## Key-Naming-Konventionen

```
✅ KORREKT:
  dashboard.patient_list.title
  anamnese.step.pain_location
  common.buttons.save
  errors.network.timeout
  video.consent.required

❌ FALSCH:
  title1
  btnSave
  myLabel
  text_123
```

## Code-Pattern

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.description')}</p>
      <button>{t('common.buttons.save')}</button>
      {error && <span role="alert">{t('errors.generic')}</span>}
    </div>
  );
}
```

## Validierungsbefehle

```bash
# Fehlende Keys erkennen
node scripts/generate-i18n.ts

# Alle 10 Sprachdateien vergleichen
node compare-translations.cjs

# Hardcoded Strings suchen
grep -rn ">[A-Z][a-z]" src/components/ --include="*.tsx" | grep -v "t("
```

## RTL-Checkliste (ar, fa)

- [ ] Flex-Direction invertiert?
- [ ] Margins/Paddings gespiegelt?
- [ ] Icons/Pfeile gespiegelt?
- [ ] Textausrichtung korrekt?
- [ ] Tabellen-Layout passend?
- [ ] Formulare lesbar?
