# Design Tokens System

Ein zentrales Design Tokens System für die DiggAI Anamnese Platform.

## Überblick

Das Design Tokens System ermöglicht eine konsistente Gestaltung über die gesamte Anwendung hinweg. Alle visuellen Werte (Farben, Abstände, Schriften, etc.) werden zentral in `tokens.json` definiert und automatisch in CSS, Tailwind und TypeScript generiert.

## Struktur

```
src/tokens/
├── tokens.json           # Quell-Definition aller Tokens (manuell editiert)
├── tokens.css            # Generierte CSS Variablen (auto-generiert)
├── tokens.tailwind.ts    # Generierte Tailwind Config (auto-generiert)
├── tokens.types.ts       # Generierte TypeScript Types (auto-generiert)
├── tokens.figma.json     # Figma-kompatible Tokens (auto-generiert)
├── index.ts              # Token Exports (auto-generiert)
└── README.md             # Diese Datei
```

## Token-Definition

### Neue Tokens hinzufügen

1. Öffne `tokens.json`
2. Füge neue Tokens im entsprechenden Kategorie-Bereich hinzu

**Beispiel - Neue Farbe hinzufügen:**
```json
{
  "color": {
    "brand": {
      "500": { "value": "#ff5722", "type": "color" }
    }
  }
}
```

**Beispiel - Token-Referenz verwenden:**
```json
{
  "color": {
    "semantic": {
      "primary": { "value": "{color.brand.500}", "type": "color" }
    }
  }
}
```

### Verfügbare Token-Typen

| Typ | Beschreibung | CSS Variable |
|-----|--------------|--------------|
| `color` | Farbwerte | `--token-color-{name}` |
| `spacing` | Abstände | `--token-spacing-{name}` |
| `fontSize` | Schriftgrößen | `--token-font-size-{name}` |
| `fontWeight` | Schriftstärken | `--token-font-weight-{name}` |
| `fontFamily` | Schriftarten | `--token-font-family-{name}` |
| `lineHeight` | Zeilenhöhen | `--token-font-line-height-{name}` |
| `letterSpacing` | Buchstabenabstände | `--token-font-letter-spacing-{name}` |
| `borderRadius` | Rahmenradien | `--token-radius-{name}` |
| `boxShadow` | Schatten | `--token-shadow-{name}` |
| `time` | Zeitdauern | `--token-transition-duration-{name}` |
| `easing` | Zeitfunktionen | `--token-transition-easing-{name}` |
| `zIndex` | Z-Index Werte | `--token-z-index-{name}` |
| `opacity` | Opazitätswerte | `--token-opacity-{name}` |
| `breakpoint` | Breakpoints | `--token-breakpoint-{name}` |

## Token-Generierung

### Manuelle Generierung

```bash
# Tokens generieren
npm run tokens:generate

# Oder direkt
npx ts-node scripts/generate-tokens.ts
```

### Automatische Generierung im Watch-Modus

```bash
# Bei Änderungen an tokens.json automatisch neu generieren
npm run tokens:watch
```

## Verwendung

### In Tailwind CSS Klassen

```tsx
// Verwendung mit generierten Tailwind-Konfiguration
<button className="bg-primary-500 text-white px-spacing-4 py-spacing-2 rounded-radius-md shadow-md">
  Button
</button>
```

### In TypeScript/JavaScript

```tsx
import { colorPrimary500, spacing4, radiusMd } from '@/tokens';

function Button() {
  return (
    <button 
      style={{
        backgroundColor: colorPrimary500,
        padding: spacing4,
        borderRadius: radiusMd,
      }}
    >
      Click me
    </button>
  );
}
```

### In CSS/SCSS

```css
.custom-button {
  background-color: var(--token-color-primary-500);
  padding: var(--token-spacing-4);
  border-radius: var(--token-radius-md);
  box-shadow: var(--token-shadow-md);
}
```

## Semantische Tokens

Das System unterstützt semantische Token-Referenzen für konsistente Bedeutung:

```json
{
  "color": {
    "semantic": {
      "success": { "value": "{color.green.500}", "type": "color" },
      "error": { "value": "{color.red.500}", "type": "color" },
      "warning": { "value": "{color.yellow.500}", "type": "color" },
      "info": { "value": "{color.blue.500}", "type": "color" }
    }
  }
}
```

**Verwendung:**
```tsx
<div className="bg-semantic-success text-semantic-error">
  Statusmeldung
</div>
```

## Figma Integration

Die generierte `tokens.figma.json` kann direkt in Figma importiert werden:

1. Öffne Figma
2. Gehe zu "Plugins" → "Tokens Studio for Figma" (oder ähnliches)
3. Importiere `src/tokens/tokens.figma.json`

## Best Practices

1. **Nur `tokens.json` editieren** - Alle anderen Dateien werden automatisch generiert
2. **Semantische Tokens verwenden** - Nutze `semantic.success` statt direkt `green.500`
3. **Token-Referenzen nutzen** - Verknüpfe verwandte Tokens mit `{category.name}`
4. **Konsistente Namensgebung** - Verwende camelCase für Token-Namen
5. **Dokumentation** - Füge bei komplexen Tokens Kommentare in `tokens.json` hinzu

## CI/CD Integration

GitHub Actions können Tokens automatisch bei Push regenerieren:

```yaml
name: Design Tokens
on:
  push:
    paths:
      - 'src/tokens/tokens.json'
      
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate Tokens
        run: npm run tokens:generate
      - name: Commit Changes
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add src/tokens/
          git diff --quiet && git diff --staged --quiet || git commit -m "chore: update design tokens"
          git push
```

## Troubleshooting

### Tokens werden nicht generiert

1. Prüfe, ob `tokens.json` gültiges JSON ist
2. Führe `npm run tokens:generate` manuell aus
3. Prüfe die Konsolenausgabe auf Fehler

### CSS Variablen werden nicht angewendet

1. Stelle sicher, dass `tokens.css` in `index.css` importiert ist
2. Prüfe im Browser DevTools, ob die Variablen im `:root` definiert sind

### Tailwind Klassen funktionieren nicht

1. Tailwind CSS v4 mit Vite verwendet keine traditionelle `tailwind.config.js`
2. Die generierten Token-Variablen werden als CSS Variablen verwendet
3. Verwende `var(--token-...)` oder importiere die Konstanten aus `@/tokens`

## Änderungshistorie

| Datum | Änderung |
|-------|----------|
| 2026-03-13 | Initiale Implementierung |
