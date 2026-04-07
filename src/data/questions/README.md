# Questions Module - Modular Reference

This directory contains the refactored and modularized question definitions for the DiggAI Anamnese Platform.

## Overview

The original `questions.ts` (1,265 lines) has been split into focused modules for better maintainability and tree-shaking:

```
src/data/questions/
├── index.ts              # Barrel export (backward compatibility)
├── questions.ts          # Core 114 questions + newQuestions (~296 total)
├── sections.ts           # Section metadata (29 sections)
├── groups.ts             # Group definitions (38 groups)
└── README.md            # This file
```

## Module Reference

### questions.ts

Contains the complete question array (core + new questions combined).

**Exports:**
- `questions: Question[]` - Full array of all 296 questions with conditional logic
- `coreQuestions: Question[]` - Core 114 questions (without newQuestions)

**Usage:**
```ts
import { questions } from '@/data/questions/questions';

// All questions with newQuestions merged
questions.forEach(q => {
  if (q.section === 'beschwerden') {
    // Process complaint questions
  }
});
```

### sections.ts

Metadata about question sections for navigation and organization.

**Exports:**
- `QuestionSection` - TypeScript interface
- `sections: QuestionSection[]` - Array of 29 sections

**Structure:**
```ts
interface QuestionSection {
  id: string;                    // 'basis', 'versicherung', 'diabetes', etc.
  title: string;                 // Display title (German)
  description?: string;          // Optional description
  order: number;                 // Display order
  category: 'identification' | 'enrollment' | 'clinical' | 'medical_history' | 'service';
}
```

**Usage:**
```ts
import { sections } from '@/data/questions/sections';

// Find all clinical sections
const clinicalSections = sections.filter(s => s.category === 'clinical');

// Get section by ID
const basis = sections.find(s => s.id === 'basis');
```

### groups.ts

Logical groupings of questions within sections for hierarchical organization.

**Exports:**
- `QuestionGroup` - TypeScript interface
- `groups: QuestionGroup[]` - Array of 38 groups

**Structure:**
```ts
interface QuestionGroup {
  id: string;              // 'identification', 'smoking-history', etc.
  section: string;         // Parent section ID
  title: string;           // Display title
  description?: string;    // Optional description
  questionIds: string[];   // Question IDs belonging to this group
  order: number;           // Order within section
}
```

**Usage:**
```ts
import { groups, questions } from '@/data/questions';

// Get questions for a specific group
const smokerQuestions = (groupId: string) => {
  const group = groups.find(g => g.id === groupId);
  return group
    ? questions.filter(q => group.questionIds.includes(q.id))
    : [];
};

// Get all groups for a section
const basicGroups = groups.filter(g => g.section === 'basis');
```

### index.ts

Barrel export for backward compatibility.

**Exports (Backward Compatible):**
```ts
export { questions, coreQuestions } from './questions';
export { sections } from './sections';
export { groups } from './groups';
```

**Usage:**
```ts
// Old style (still works)
import { questions } from '@/data/questions';

// New style (tree-shaking optimized)
import { questions } from '@/data/questions/questions';
import { sections } from '@/data/questions/sections';
```

## Question IDs (Immutable)

All question IDs are **canonical** and immutable:
- '0000' - "Are you already a patient?" (CANNOT CHANGE)
- '0001' - "Enter your last name" (CANNOT CHANGE)
- '1001' - "How long have these complaints existed?" (CANNOT CHANGE)
- etc.

Changing question IDs breaks all:
- Conditional logic (showIf, conditional, followUpQuestions)
- Patient data history
- Database references
- Flow routing

**Any change to question IDs requires:**
1. Medical review and approval
2. Data migration plan
3. Backward compatibility strategy
4. Update to all references

## Section & Group Organization

### Sections (29 total)

**Identification & Enrollment (Order 1-4):**
- `basis` - Identification & visit status
- `versicherung` - Insurance status
- `adresse` - Address
- `kontakt` - Contact information

**Clinical & Medical History (Order 5-19):**
- `beschwerden` - Chief complaint & symptoms
- `koerpermasse` - Height & weight
- `rauchen` - Smoking history
- `impfungen` - Vaccination status
- `familie` - Family medical history
- `diabetes` - Diabetes screening & management
- `beeintraechtigung` - Physical disabilities
- `implantate` - Medical implants
- `blutverduenner` - Anticoagulation
- `allergien` - Allergies & intolerances
- `gesundheitsstoerungen` - Chronic conditions
- `vorerkrankungen` - Past medical events
- `schwangerschaft` - Pregnancy status
- `medikamente-freitext` - Current medications
- `beruf` - Occupation & lifestyle

**Services (Order 100-108):**
- `rezepte` - Prescription requests
- `dateien` - Document submission
- `au-anfrage` - Sick leave request
- `ueberweisung` - Referral request
- `absage` - Appointment cancellation
- `telefon` - Phone callback request
- `befund-anforderung` - Report request
- `nachricht` - Free message
- `bg-unfall` - Workplace accident

**Completion (Order 200):**
- `abschluss` - Summary & closure

### Groups (38 total)

Each section contains 1-4 groups:

```
basis (3 groups)
├── identification
├── returning-patient-intake
└── demographic

versicherung (1 group)
└── insurance-status

...and so on
```

## Common Patterns

### Get All Questions in a Section

```ts
import { questions, sections } from '@/data/questions';

function getQuestionsInSection(sectionId: string): Question[] {
  return questions.filter(q => q.section === sectionId);
}

// Usage
const basicQuestions = getQuestionsInSection('basis');
```

### Get All Questions in a Group

```ts
import { questions, groups } from '@/data/questions';

function getQuestionsInGroup(groupId: string): Question[] {
  const group = groups.find(g => g.id === groupId);
  if (!group) return [];
  return questions.filter(q => group.questionIds.includes(q.id));
}

// Usage
const identificationQuestions = getQuestionsInGroup('identification');
```

### Navigate Sections

```ts
import { sections } from '@/data/questions/sections';

// Sorted sections for navigation
const navSections = sections.sort((a, b) => a.order - b.order);

// Group by category
const byCategory = sections.reduce((acc, s) => {
  if (!acc[s.category]) acc[s.category] = [];
  acc[s.category].push(s);
  return acc;
}, {});
```

## Migration Guide

If you're currently importing from `src/data/questions.ts`:

**Old:**
```ts
import { questions } from '@/data/questions';
```

**New (same path, now uses barrel export):**
```ts
import { questions } from '@/data/questions';
```

**Better (tree-shaking optimized):**
```ts
import { questions } from '@/data/questions/questions';
import { sections } from '@/data/questions/sections';
import { groups } from '@/data/questions/groups';
```

Both styles work! The barrel export (`index.ts`) maintains complete backward compatibility.

## Type Safety

All modules are fully TypeScript-typed:

```ts
import type { Question } from '@/types/question';
import type { QuestionSection } from '@/data/questions/sections';
import type { QuestionGroup } from '@/data/questions/groups';

const q: Question = questions[0];
const s: QuestionSection = sections[0];
const g: QuestionGroup = groups[0];
```

## Locales Integration

Questions use i18n keys for text:

```ts
{
  id: '4100',
  question: 'Verfügbare Impfungen im System',
  helpText: 'helpText.impfungen',        // Translatable key
  whyWeAsk: 'whyWeAsk.impfstatus',       // Translatable key
}
```

All sections and groups are also localizable by their title/description properties.

## Performance Notes

- **Total Questions:** ~296
- **Core Questions:** 114
- **New Questions (imported):** 182
- **Sections:** 29
- **Groups:** 38

The modular structure allows:
- Tree-shaking of unused sections/groups
- Lazy-loading of group definitions
- Selective imports for bundle optimization
- Better cacheing of individual modules

## Future Extensions

To add new question domains:

1. Add new section to `sections.ts`:
```ts
{
  id: 'neurocognitive',
  title: 'Neurologische Basistests',
  category: 'clinical',
  order: 6.5
}
```

2. Create new group in `groups.ts`:
```ts
{
  id: 'cognition-screening',
  section: 'neurocognitive',
  title: 'Kognitives Screening',
  questionIds: ['NC-001', 'NC-002'],
  order: 1
}
```

3. Add questions to `new-questions.ts` or create new module
4. Export from `index.ts`

## References

- Main codebase: `src/api/client.ts`
- Type definitions: `src/types/question.ts`
- Admin dashboard: `src/pages/admin/`
- Questionnaire flow: `src/hooks/useApi/usePatientApi.ts`
