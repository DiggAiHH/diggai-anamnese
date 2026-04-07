/**
 * Question Groups Metadata
 * 
 * Defines logical groupings of questions within sections.
 * Groups provide hierarchical organization for navigation and display.
 */

export interface QuestionGroup {
  id: string;
  section: string;
  title: string;
  description?: string;
  questionIds: string[];
  order: number;
}

export const groups: QuestionGroup[] = [
  // ─── IDENTIFICATION ──────────────────────────────────────────────────
  {
    id: 'identification',
    section: 'basis',
    title: 'Patientenidentifikation',
    description: 'Grundlegende Identifikationsdaten',
    questionIds: ['0000', '0001', '0011', '0002'],
    order: 1
  },
  {
    id: 'returning-patient-intake',
    section: 'basis',
    title: 'Rückkehrende Patienten Schnellerfassung',
    description: 'Fast-Track für bekannte Patienten',
    questionIds: ['RPT-ID', '0004'],
    order: 2
  },
  {
    id: 'demographic',
    section: 'basis',
    title: 'Demografische Daten',
    description: 'Alter und Geschlecht',
    questionIds: ['0003', '0002'],
    order: 3
  },

  // ─── INSURANCE ───────────────────────────────────────────────────────
  {
    id: 'insurance-status',
    section: 'versicherung',
    title: 'Versicherungsstatus',
    description: 'Krankenversicherung und Versichertennummer',
    questionIds: ['2000', '2001'],
    order: 1
  },

  // ─── ADDRESS ─────────────────────────────────────────────────────────
  {
    id: 'address-postal',
    section: 'adresse',
    title: 'Postanschrift',
    description: 'Postadresse für Korrespondenz',
    questionIds: ['3000', '3001', '3002', '3002a'],
    order: 1
  },

  // ─── CONTACT ─────────────────────────────────────────────────────────
  {
    id: 'contact-methods',
    section: 'kontakt',
    title: 'Erreichbarkeit',
    description: 'E-Mail und Telefonnummern',
    questionIds: ['3003', '3004', '3004b'],
    order: 1
  },
  {
    id: 'contact-routing',
    section: 'kontakt',
    title: 'Anliegen-Routing',
    description: 'Weiterleitung zum Thema',
    questionIds: ['3005'],
    order: 2
  },

  // ─── COMPLAINTS ──────────────────────────────────────────────────────
  {
    id: 'chief-complaint',
    section: 'beschwerden',
    title: 'Anamnese der Beschwerden',
    description: 'Vorhandensein, Dauer und Charakterisierung von Symptomen',
    questionIds: ['1000', '1001', '1004', '1002', '1003'],
    order: 1
  },
  {
    id: 'symptom-area-followups',
    section: 'beschwerden',
    title: 'Symptombereich-Detaillfragen',
    description: 'Detaillfragen je nach Symptombereich',
    questionIds: ['1010', '1020', '1030', '1040', '1050', '1060', '1070', '1080', '1090', '1A00', '1B00', '1C00', '1185'],
    order: 2
  },

  // ─── VITAL SIGNS ─────────────────────────────────────────────────────
  {
    id: 'vital-signs',
    section: 'koerpermasse',
    title: 'Körpermasse',
    description: 'Größe und Gewicht für BMI-Berechnung',
    questionIds: ['4000', '4001'],
    order: 1
  },

  // ─── SMOKING ─────────────────────────────────────────────────────────
  {
    id: 'smoking-history',
    section: 'rauchen',
    title: 'Rauchhistorie',
    description: 'Rauchanamnese und Packungsjahre',
    questionIds: ['4002', '4003', '4004', '4005', '4006'],
    order: 1
  },

  // ─── VACCINATIONS ────────────────────────────────────────────────────
  {
    id: 'vaccination-status',
    section: 'impfungen',
    title: 'Impfstatus',
    description: 'Dokumentierte Impfungen',
    questionIds: ['4100', '4100-FT'],
    order: 1
  },

  // ─── FAMILY HISTORY ──────────────────────────────────────────────────
  {
    id: 'family-history',
    section: 'familie',
    title: 'Familienanamnese',
    description: 'Relevant diseases in family',
    questionIds: ['4110', '4110-FT'],
    order: 1
  },

  // ─── DIABETES ─────────────────────────────────────────────────────────
  {
    id: 'diabetes-screening',
    section: 'diabetes',
    title: 'Diabetesscreening',
    description: 'Diabetes-Status und Typ',
    questionIds: ['5000', '5001'],
    order: 1
  },
  {
    id: 'diabetes-management',
    section: 'diabetes',
    title: 'Diabetes-Management',
    description: 'Therapie und Komplikationen',
    questionIds: ['5002', '5004', '5002-FT', '5003'],
    order: 2
  },

  // ─── DISABILITY & IMPLANTS ───────────────────────────────────────────
  {
    id: 'disability',
    section: 'beeintraechtigung',
    title: 'Beeinträchtigungen',
    description: 'Mobilitäts- und Funktionsbeeinträchtigungen',
    questionIds: ['6000', '6001', '6001-FT'],
    order: 1
  },
  {
    id: 'implants',
    section: 'implantate',
    title: 'Implantate',
    description: 'Prothesen und medizinische Implantate',
    questionIds: ['6002', '6003', '6003-FT'],
    order: 1
  },

  // ─── ANTICOAGULATION ─────────────────────────────────────────────────
  {
    id: 'anticoagulation',
    section: 'blutverduenner',
    title: 'Antikoagulationstherapie',
    description: 'Blutverdünner und Thrombozytenaggregationshemmer',
    questionIds: ['6004', '6005'],
    order: 1
  },

  // ─── ALLERGIES ───────────────────────────────────────────────────────
  {
    id: 'allergies',
    section: 'allergien',
    title: 'Allergien und Intoleranzen',
    description: 'Dokumentierte Allergien und Unverträglichkeiten',
    questionIds: ['6006', '6007', '6007-FT'],
    order: 1
  },

  // ─── CHRONIC CONDITIONS ───────────────────────────────────────────────
  {
    id: 'chronic-conditions',
    section: 'gesundheitsstoerungen',
    title: 'Chronische Erkrankungen',
    description: 'Bekannte Erkrankungen und deren Details',
    questionIds: ['7000', '7001', '7001-FT', '7002', '7002-FT'],
    order: 1
  },

  // ─── PAST MEDICAL EVENTS ─────────────────────────────────────────────
  {
    id: 'past-medical-events',
    section: 'vorerkrankungen',
    title: 'Medizinische Vorgeschichte',
    description: 'Frühere Ereignisse und Operationen',
    questionIds: ['8000', '8000-FT', '8950', '8951'],
    order: 1
  },

  // ─── PREGNANCY ────────────────────────────────────────────────────────
  {
    id: 'pregnancy',
    section: 'schwangerschaft',
    title: 'Schwangerschaftsstatus',
    description: 'Screening für Schwangerschaft',
    questionIds: ['8800', '8900'],
    order: 1
  },

  // ─── OCCUPATION ───────────────────────────────────────────────────────
  {
    id: 'occupation',
    section: 'beruf',
    title: 'Berufliche Situation',
    description: 'Beruf und Berufsbelastung',
    questionIds: ['4120', '4121', '4122'],
    order: 1
  },
  {
    id: 'lifestyle',
    section: 'beruf',
    title: 'Lebensstil',
    description: 'Alkanol und Substanzkonsum',
    questionIds: ['4130', '4131'],
    order: 2
  },

  // ─── SERVICES ─────────────────────────────────────────────────────────
  {
    id: 'prescription-service',
    section: 'rezepte',
    title: 'Rezeptanforderung',
    questionIds: ['RES-100', 'RES-101', 'RES-102', 'RES-103'],
    order: 1
  },
  {
    id: 'document-service',
    section: 'dateien',
    title: 'Dokumentenübermittlung',
    questionIds: ['DAT-100', 'DAT-101', 'DAT-102'],
    order: 1
  },
  {
    id: 'sick-leave-service',
    section: 'au-anfrage',
    title: 'Arbeitsunfähigkeits-bescheinigung',
    questionIds: ['AU-100', 'AU-101', 'AU-102', 'AU-103'],
    order: 1
  },
  {
    id: 'referral-service',
    section: 'ueberweisung',
    title: 'Überweising',
    questionIds: ['UEB-100', 'UEB-101'],
    order: 1
  },
  {
    id: 'appointment-cancel',
    section: 'absage',
    title: 'Terminabsage',
    questionIds: ['ABS-100', 'ABS-101'],
    order: 1
  },
  {
    id: 'phone-service',
    section: 'telefon',
    title: 'Telefonanfrage',
    questionIds: ['TEL-100', 'TEL-100b', 'TEL-101'],
    order: 1
  },
  {
    id: 'document-request',
    section: 'befund-anforderung',
    title: 'Befundanforderung',
    questionIds: ['BEF-100', 'BEF-101'],
    order: 1
  },
  {
    id: 'message-service',
    section: 'nachricht',
    title: 'Nachricht',
    questionIds: ['MS-100', 'MS-101'],
    order: 1
  },
  {
    id: 'workplace-accident',
    section: 'bg-unfall',
    title: 'Unfallmeldung',
    questionIds: ['2080', 'BG-BERUF-100', '2081', '2082', '2083', '2084', '2085', '2086', '2087', '2088', '2089', '2090', '2091'],
    order: 1
  },

  // ─── COMPLETION ───────────────────────────────────────────────────────
  {
    id: 'completion',
    section: 'abschluss',
    title: 'Abschluss',
    description: 'Bestätigung und Abschluss der Anamnese',
    questionIds: ['9000', '9010', '9011', '9100', '9999'],
    order: 1
  }
];
