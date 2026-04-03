# German PII Detection Library

Offline-fähige PII-Erkennung (Personally Identifiable Information) für deutsche Texte.

## Features

- **100% Offline** - Keine API-Calls, läuft komplett im Browser
- **Deutsch-spezifisch** - Optimiert für deutsche Namen, Adressen, Datumsformate
- **False-Positive-Minimierung** - Kontext-basierte Validierung
- **React-Integration** - Hooks und Komponenten für einfache Verwendung
- **Leichtgewichtig** - Nur Regex-basiert, keine großen ML-Modelle

## Unterstützte PII-Typen

| Typ | Beispiele | Konfidenz |
|-----|-----------|-----------|
| **NAME** | Hans Müller, Anna-Marie Schmidt | Hoch |
| **ADDRESS** | Musterstraße 12, 12345 Berlin | Hoch |
| **POSTAL_CODE** | 12345, 80333 | Hoch |
| **CITY** | Berlin, München, Köln | Hoch |
| **BIRTHDATE** | 15.03.1985, 15. März 1990 | Mittel |
| **PHONE** | +49 170 1234567, 030 12345678 | Hoch |
| **EMAIL** | max@example.de | Hoch |
| **IBAN** | DE89370400440532013000 | Hoch |
| **INSURANCE_NUMBER** | A123456789 | Mittel |
| **ID_CARD** | T220001293 | Mittel |

## Installation

```typescript
// Import der Kernfunktionen
import { 
  detectGermanPII, 
  containsGermanPII,
  redactGermanPII,
  getPIISummary 
} from './pii-detection/german-pii-patterns';

// Import React Hook
import { usePIIDetection } from './pii-detection/usePIIDetection';

// Import React Komponenten
import { PIIDetectionWarning, PIIWarningBadge } from './pii-detection/PIIDetectionWarning';
```

## Verwendung

### Basis-API

```typescript
import { detectGermanPII } from './pii-detection/german-pii-patterns';

const text = "Ich bin Hans Müller, geboren am 15.03.1985 in Berlin." +
             " Meine E-Mail ist hans@example.de";

const detections = detectGermanPII(text);

// Ergebnis:
// [
//   { type: 'NAME', value: 'Hans Müller', confidence: 'high', ... },
//   { type: 'BIRTHDATE', value: '15.03.1985', confidence: 'high', ... },
//   { type: 'CITY', value: 'Berlin', confidence: 'high', ... },
//   { type: 'EMAIL', value: 'hans@example.de', confidence: 'high', ... }
// ]
```

### Mit Optionen

```typescript
const detections = detectGermanPII(text, {
  minNameLength: 3,           // Mindestlänge für Namen
  checkContext: true,          // Kontext-Validierung aktivieren
  strictMode: false            // Strikt vs. permissiv
});
```

### Quick-Check

```typescript
import { containsGermanPII } from './pii-detection/german-pii-patterns';

if (containsGermanPII(userInput)) {
  // Zeige Warnung
}
```

### Redaktion/Anonymisierung

```typescript
import { redactGermanPII } from './pii-detection/german-pii-patterns';

const redacted = redactGermanPII(
  "Hans Müller wohnt in Berlin",
  '[REDACTED]'  // Optional: Custom replacement
);
// Ergebnis: "[NAME] wohnt in [CITY]"
```

### Zusammenfassung

```typescript
import { getPIISummary } from './pii-detection/german-pii-patterns';

const summary = getPIISummary(text);
// { NAME: 1, BIRTHDATE: 1, CITY: 1, EMAIL: 1 }
```

## React Hook

### Grundlegende Verwendung

```tsx
import { usePIIDetection } from './pii-detection/usePIIDetection';

function VoiceInputComponent() {
  const { 
    detections, 
    hasPII, 
    showWarning, 
    warningMessage,
    analyzeText,
    reset 
  } = usePIIDetection({
    warnThreshold: 'medium',
    onPIIDetected: (items) => console.log('PII detected:', items),
    debounceMs: 500
  });

  const handleTranscription = (text: string) => {
    analyzeText(text);
  };

  return (
    <div>
      {showWarning && (
        <div className="warning">
          <AlertTriangle />
          {warningMessage}
        </div>
      )}
      {/* ... */}
    </div>
  );
}
```

### Mit Warnungs-Komponente

```tsx
import { useState } from 'react';
import { usePIIDetection } from './pii-detection/usePIIDetection';
import { PIIDetectionWarning } from './pii-detection/PIIDetectionWarning';

function FormComponent() {
  const [text, setText] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  
  const { 
    warningDetections, 
    analyzeText, 
    reset 
  } = usePIIDetection({
    onWarningChange: (hasWarning) => {
      if (hasWarning) setShowDialog(true);
    }
  });

  const handleSubmit = () => {
    analyzeText(text);
  };

  return (
    <>
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleSubmit}>Senden</button>
      
      <PIIDetectionWarning
        isOpen={showDialog}
        detections={warningDetections}
        onClose={() => setShowDialog(false)}
        onConfirm={() => {
          // Submit
          setShowDialog(false);
        }}
        onCancel={() => {
          // Back to editing
          setShowDialog(false);
        }}
      />
    </>
  );
}
```

## React Komponenten

### PIIDetectionWarning

Vollständiger Dialog zur Anzeige von PII-Warnungen:

```tsx
import { PIIDetectionWarning } from './pii-detection/PIIDetectionWarning';

<PIIDetectionWarning
  isOpen={true}
  detections={detections}
  onClose={() => {}}
  onConfirm={() => {}}  // User confirms to submit anyway
  onCancel={() => {}}    // User wants to edit
  title="Persönliche Daten erkannt"
  confirmText="Trotzdem senden"
  cancelText="Bearbeiten"
/>
```

### PIIWarningBadge

Kompakte Badge-Anzeige:

```tsx
import { PIIWarningBadge } from './pii-detection/PIIDetectionWarning';

<PIIWarningBadge 
  count={3} 
  onClick={() => setShowDetails(true)}
/>
```

## Regex-Pattern Referenz

### Namen

```typescript
// Unterstützt:
// - Hans Müller
// - Anna-Marie Schmidt
// - Peter von der Lippe
// - O'Connor, McDonald
// - José García

GERMAN_NAME_REGEX
// \b(?:[A-ZÄÖÜ][a-zäöüß]{1,20}|[A-ZÄÖÜ][a-zäöüß]{1,15}-[A-ZÄÖÜ][a-zäöüß]{1,15})
// (?:\s+(?:von|van|zu|zur|zum|der|die|den|de|di|del|dos|da|du)\s+[A-ZÄÖÜ][a-zäöüß]{1,20}|
// \s+[A-ZÄÖÜ][a-zäöüß]{0,15}){0,2}[\s-]+
// (?:[A-ZÄÖÜ][a-zäöüß]{1,20}(?:-[A-ZÄÖÜ][a-zäöüß]{1,20}){0,2}|
// O[''][A-ZÄÖÜ][a-zäöüß]{1,15}|M[ac][A-ZÄÖÜ][a-zäöüß]{1,15})\b\.?
```

### Geburtsdaten

```typescript
// Formate:
// - DD.MM.YYYY (15.03.1985)
// - DD/MM/YY (15/03/85)
// - DD. Monat YYYY (15. März 1985)
// - YYYY-MM-DD (1985-03-15)

GERMAN_DATE_DOT_REGEX
// (?:(?:0[1-9]|[12]\d|3[01])(?:\.|\s*/\s*)(?:0[1-9]|1[0-2])
// (?:\.|\s*/\s*|\s+-\s+)(?:19|20)\d{2})
```

### Telefonnummern

```typescript
// Formate:
// - +49 170 1234567
// - 0170 1234567
// - 030-12345678
// - (030) 1234 5678

GERMAN_PHONE_REGEX
// (?:\+|00)?(?:49|0049)?[\s/-]?0?(?:[1-9]\d{2,5})
// [\s/-]?(?:\d{2,4}[\s/-]?){1,3}\d{2,4}(?=\D|$)
```

### Adressen

```typescript
// Formate:
// - Musterstraße 12
// - Am Markt 5a
// - 12345 Berlin
// - Hauptstr. 12, 80333 München

GERMAN_FULL_ADDRESS_REGEX
// ([A-ZÄÖÜ][a-zäöüß]{2,20}(?:\s+[A-ZÄÖÜ]?[a-zäöüß]{2,15}){0,2}\s+\d{1,4}[a-zA-Z]?),\s*
// ([0-9]{5})?\s*([A-ZÄÖÜ][a-zäöüß]{2,20})
```

## False-Positive-Minimierung

### Namens-Validierung

Die Bibliothek verwendet mehrere Techniken zur Reduktion von False-Positives:

1. **Common First Names List** - Über 100 deutsche Vornamen für Validierung
2. **Kontext-Analyse** - Prüft auf persönliche Pronomen ("ich", "mein", etc.)
3. **Pattern-Validierung** - Namen müssen mit Großbuchstaben beginnen
4. **Mindestlänge** - Mindestens 2 Wörter für volle Namen

### Beispiele

```typescript
// Wird erkannt (high confidence):
"Ich heiße Hans Müller"           // Kontext + bekannter Vorname
"Mein Name ist Anna Schmidt"      // Kontext + bekannter Vorname

// Wird nicht erkannt (false positive vermieden):
"Die Hauptstraße"                 // Kein persönlicher Kontext
"Max Mustermann"                  // Platzhalter-Name
"Klaus"                           // Nur ein Wort
```

## Optional: NER-Library-Integration

Für höhere Genauigkeit bei der Namenserkennung können folgende Browser-kompatible NER-Libraries ergänzt werden:

### Option 1: Transformers.js (Empfohlen)

```bash
npm install @xenova/transformers
```

```typescript
import { pipeline } from '@xenova/transformers';

// Lädt ~65MB Modell (einmalig)
const ner = await pipeline('token-classification', 
  'Xenova/bert-base-NER', 
  { quantized: true }
);

const result = await ner("Hans Müller ist in Berlin");
// [{ entity: 'B-PER', word: 'Hans' }, { entity: 'I-PER', word: 'Müller' }]
```

**Vorteile:**
- Hochgenaue NER
- Läuft komplett im Browser (WebAssembly)
- Unterstützt Deutsch

**Nachteile:**
- ~65MB Download beim ersten Laden
- Asynchron (Promise-basiert)

### Option 2: wink-ner (Gazetteer-basiert)

```bash
npm install wink-ner wink-tokenizer
```

```typescript
import ner from 'wink-ner';
import winkTokenizer from 'wink-tokenizer';

const myNER = ner();
const tokenize = winkTokenizer().tokenize;

// Trainieren mit bekannten Namen
myNER.learn([
  { text: 'hans müller', entityType: 'PERSON' },
  { text: 'anna schmidt', entityType: 'PERSON' }
]);

const tokens = tokenize('Hans Müller wohnt hier');
const recognized = myNER.recognize(tokens);
```

**Vorteile:**
- Sehr klein (~5KB)
- Schnell
- Trainierbar

**Nachteile:**
- Benötigt Training mit Namenslisten
- Weniger flexibel als ML-basierte NER

### Option 3: Kombination Regex + NER

```typescript
// 1. Schneller Regex-Filter
const regexResults = detectGermanPII(text);

// 2. NER für komplexe Fälle (optional, wenn verfügbar)
if (nerModelLoaded) {
  const nerResults = await ner(text);
  // Merge Ergebnisse
}
```

## Browser-Kompatibilität

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Regex-Detection | ✅ | ✅ | ✅ | ✅ |
| Transformers.js | ✅ 89+ | ✅ 89+ | ✅ 15+ | ✅ 89+ |

## Performance

| Operation | Dauer | Textlänge |
|-----------|-------|-----------|
| Regex Detection | ~1-5ms | 100 Zeichen |
| Regex Detection | ~5-15ms | 1000 Zeichen |
| Mit Kontext-Check | +2-5ms | - |
| Transformers.js NER | ~50-200ms | 100 Zeichen |

## Sicherheit & Datenschutz

- **Keine Datenübertragung** - Alles läuft lokal
- **Kein Logging** - Keine PII wird geloggt
- **DSGVO-konform** - Keine Daten verlassen das Gerät
- **Open Source** - Überprüfbarer Code

## Troubleshooting

### False Positives zu hoch

```typescript
// Strikter Modus aktivieren
const detections = detectGermanPII(text, {
  strictMode: true,     // Nur hochvertrauenswürdige Treffer
  checkContext: true    // Kontext validieren
});
```

### Namen werden nicht erkannt

```typescript
// Eigenen Vornamen zur Liste hinzufügen
import { COMMON_GERMAN_FIRST_NAMES } from './pii-detection/german-pii-patterns';

COMMON_GERMAN_FIRST_NAMES.add('ihrvorname');
```

### Performance-Probleme

```typescript
// Ohne Kontext-Check (schneller)
const detections = detectGermanPII(text, {
  checkContext: false
});
```

## Lizenz

MIT License - Interne Verwendung im DiggAI Anamnese-Projekt.
