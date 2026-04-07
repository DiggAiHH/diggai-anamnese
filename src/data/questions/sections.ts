/**
 * Question Sections Metadata
 * 
 * Définies all available sections with metadata for organization and display.
 * Section IDs are immutable and must match Question.section values.
 */

export interface QuestionSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  category: 'identification' | 'enrollment' | 'clinical' | 'medical_history' | 'service';
}

export const sections: QuestionSection[] = [
  // ─── IDENTIFICATION & VISIT STATUS ───────────────────────────────────
  {
    id: 'basis',
    title: 'Identifikation & Besuchsstatus',
    description: 'Persönliche Identifikation und Patientenstatus (Erst- oder Wiederbesucher)',
    order: 1,
    category: 'identification'
  },

  // ─── ENROLLMENT (NEW PATIENTS) ───────────────────────────────────────
  {
    id: 'versicherung',
    title: 'Versicherung',
    description: 'Versicherungsstatus und Versichertennummer',
    order: 2,
    category: 'enrollment'
  },
  {
    id: 'adresse',
    title: 'Adresse',
    description: 'Postadresse und Wohnadresse',
    order: 3,
    category: 'enrollment'
  },
  {
    id: 'kontakt',
    title: 'Kontaktdaten',
    description: 'E-Mail, Telefonnummern und Erreichbarkeit',
    order: 4,
    category: 'enrollment'
  },

  // ─── CLINICAL PRESENTATION ──────────────────────────────────────────
  {
    id: 'beschwerden',
    title: 'Beschwerden (Anamnese)',
    description: 'Aktuelle Symptome, Dauer und Charakteristika',
    order: 5,
    category: 'clinical'
  },
  {
    id: 'koerpermasse',
    title: 'Körpermasse',
    description: 'Körpergröße und Körpergewicht',
    order: 6,
    category: 'clinical'
  },

  // ─── MEDICAL HISTORY ─────────────────────────────────────────────────
  {
    id: 'rauchen',
    title: 'Rauchanamnese',
    description: 'Rauchgewohnheiten und Nikotinkonsum',
    order: 7,
    category: 'medical_history'
  },
  {
    id: 'impfungen',
    title: 'Impfstatus',
    description: 'Dokumentierte Impfungen',
    order: 8,
    category: 'medical_history'
  },
  {
    id: 'familie',
    title: 'Familiengeschichte',
    description: 'Relevante Erkrankungen in der Familie',
    order: 9,
    category: 'medical_history'
  },
  {
    id: 'diabetes',
    title: 'Diabetes mellitus',
    description: 'Diabetes-Status, Typ und Therapie',
    order: 10,
    category: 'medical_history'
  },
  {
    id: 'beeintraechtigung',
    title: 'Körperliche Beeinträchtigungen',
    description: 'Mobilitäts- und Funktionsbeeinträchtigungen',
    order: 11,
    category: 'medical_history'
  },
  {
    id: 'implantate',
    title: 'Implantate',
    description: 'Künstliche Implantate und Prothesen',
    order: 12,
    category: 'medical_history'
  },
  {
    id: 'blutverduenner',
    title: 'Blutverdünnung',
    description: 'Antikoagulation und Thrombozytenaggregationshemmer',
    order: 13,
    category: 'medical_history'
  },
  {
    id: 'allergien',
    title: 'Allergien und Intoleranzen',
    description: 'Bekannte Allergien, Intoleranzen und Unverträglichkeiten',
    order: 14,
    category: 'medical_history'
  },
  {
    id: 'gesundheitsstoerungen',
    title: 'Erkrankungen',
    description: 'Chronische und akute Erkrankungen',
    order: 15,
    category: 'medical_history'
  },
  {
    id: 'vorerkrankungen',
    title: 'Vorerkrankungen & Ereignisse',
    description: 'Frühere medizinische Ereignisse und Operationen',
    order: 16,
    category: 'medical_history'
  },
  {
    id: 'schwangerschaft',
    title: 'Schwangerschaft',
    description: 'Schwangerschaftsstatus und -risiken',
    order: 17,
    category: 'medical_history'
  },
  {
    id: 'medikamente-freitext',
    title: 'Medikationen',
    description: 'Aktuelle Medikationen in Freitextform',
    order: 18,
    category: 'medical_history'
  },
  {
    id: 'beruf',
    title: 'Beruf und Lebensstil',
    description: 'Berufische Belastung, Schlaf und Substanzkonsum',
    order: 19,
    category: 'medical_history'
  },

  // ─── SERVICES & REQUESTS ─────────────────────────────────────────────
  {
    id: 'rezepte',
    title: 'Medikamente / Rezepte',
    description: 'Rezeptanforderungen',
    order: 100,
    category: 'service'
  },
  {
    id: 'dateien',
    title: 'Dateien / Befunde',
    description: 'Dokumenten- und Befundbeschaffung',
    order: 101,
    category: 'service'
  },
  {
    id: 'au-anfrage',
    title: 'AU (Krankschreibung)',
    description: 'Arbeitsunfähigkeitsbescheinigung anfordern',
    order: 102,
    category: 'service'
  },
  {
    id: 'ueberweisung',
    title: 'Überweisung',
    description: 'Facharztüberweisung anfordern',
    order: 103,
    category: 'service'
  },
  {
    id: 'absage',
    title: 'Terminabsage',
    description: 'Termin absagen oder ändern',
    order: 104,
    category: 'service'
  },
  {
    id: 'telefon',
    title: 'Telefonanfrage',
    description: 'Anforderung Rückruf oder Telefonberatung',
    order: 105,
    category: 'service'
  },
  {
    id: 'befund-anforderung',
    title: 'Befundanforderung',
    description: 'Unterlagen anfordern',
    order: 106,
    category: 'service'
  },
  {
    id: 'nachricht',
    title: 'Nachricht',
    description: 'Freie Nachricht an die Praxis schreiben',
    order: 107,
    category: 'service'
  },
  {
    id: 'bg-unfall',
    title: 'Unfallmeldung (BG)',
    description: 'Arbeits- oder Wegeunfall melden',
    order: 108,
    category: 'service'
  },

  // ─── COMPLETION ──────────────────────────────────────────────────────
  {
    id: 'abschluss',
    title: 'Abschluss',
    description: 'Bestätigung und Abschluss der Anamnese',
    order: 200,
    category: 'service'
  }
];
