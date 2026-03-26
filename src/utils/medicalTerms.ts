/**
 * Medical Terms Accessibility Utilities
 * 
 * Phase 5: Accessibility for Stressed Users
 * Provides ARIA labels and simplified explanations for complex medical terms
 * Reading level: 6th grade (simplified medical terms)
 */

export interface MedicalTerm {
  /** The medical term */
  term: string;
  /** ARIA label for screen readers */
  ariaLabel: string;
  /** Simplified explanation for cognitive accessibility */
  simplified: string;
  /** Full medical definition */
  definition: string;
}

/**
 * Medical terms dictionary with accessibility support
 * All terms include ARIA labels and 6th-grade reading level explanations
 */
export const medicalTerms: Record<string, MedicalTerm> = {
  // Cardiovascular
  hypertension: {
    term: 'Bluthochdruck',
    ariaLabel: 'Bluthochdruck - erhöhter Druck in den Blutgefäßen',
    simplified: 'Der Druck in Ihren Blutgefäßen ist dauerhaft zu hoch.',
    definition: 'Ein chronisch erhöhter Blutdruck über 140/90 mmHg.',
  },
  hypotension: {
    term: 'Niedriger Blutdruck',
    ariaLabel: 'Niedriger Blutdruck - zu geringer Druck im Kreislauf',
    simplified: 'Der Druck in Ihren Blutgefäßen ist zu niedrig.',
    definition: 'Ein erniedrigter Blutdruck unter 100/60 mmHg.',
  },
  arrhythmia: {
    term: 'Herzrhythmusstörung',
    ariaLabel: 'Herzrhythmusstörung - unregelmäßiger Herzschlag',
    simplified: 'Ihr Herz schlägt unregelmäßig, zu schnell oder zu langsam.',
    definition: 'Abweichungen von der normalen Herzschlagfrequenz oder -folge.',
  },
  angina: {
    term: 'Herzengewür (Angina Pectoris)',
    ariaLabel: 'Angina Pectoris - Schmerzen in der Brust durch zu wenig Sauerstoff im Herzen',
    simplified: 'Schmerzen oder Druckgefühl in der Brust, weil das Herz nicht genug Sauerstoff bekommt.',
    definition: 'Druckgefühl oder Schmerz in der Brust durch vorübergehenden Sauerstoffmangel im Herzmuskel.',
  },
  
  // Diabetes
  diabetes: {
    term: 'Diabetes (Zuckerkrankheit)',
    ariaLabel: 'Diabetes - Zuckerkrankheit, erhöhter Blutzucker',
    simplified: 'Ihr Blutzucker ist dauerhaft zu hoch.',
    definition: 'Stoffwechselerkrankung mit chronisch erhöhtem Blutzucker.',
  },
  hyperglycemia: {
    term: 'Zu hoher Blutzucker',
    ariaLabel: 'Hyperglykämie - zu hoher Blutzucker',
    simplified: 'Der Zuckergehalt in Ihrem Blut ist zu hoch.',
    definition: 'Erhöhter Glukosespiegel im Blut über 180 mg/dL.',
  },
  hypoglycemia: {
    term: 'Zu niedriger Blutzucker',
    ariaLabel: 'Hypoglykämie - zu niedriger Blutzucker',
    simplified: 'Der Zuckergehalt in Ihrem Blut ist zu niedrig.',
    definition: 'Erniedrigter Glukosespiegel im Blut unter 70 mg/dL.',
  },
  insulin: {
    term: 'Insulin',
    ariaLabel: 'Insulin - Hormon zur Blutzuckersenkung',
    simplified: 'Ein Hormon, das Ihren Blutzucker senkt. Manche Menschen müssen es als Spritze nehmen.',
    definition: 'Hormon der Bauchspeicheldrüse zur Regulation des Blutzuckers.',
  },
  
  // Respiratory
  asthma: {
    term: 'Asthma',
    ariaLabel: 'Asthma - chronische Entzündung der Atemwege',
    simplified: 'Ihre Atemwege sind verengt und entzündet, was Atembeschwerden verursacht.',
    definition: 'Chronisch-entzündliche Erkrankung der Atemwege mit Hyperreagibilität.',
  },
  copd: {
    term: 'COPD (chronische Lungenerkrankung)',
    ariaLabel: 'COPD - chronisch obstruktive Lungenerkrankung, dauerhafte Atemwegsverengung',
    simplified: 'Eine dauerhafte Erkrankung der Lunge, die das Atmen erschwert.',
    definition: 'Chronisch obstruktive Lungenerkrankung mit irreversibler Atemflusslimitation.',
  },
  dyspnea: {
    term: 'Atemnot',
    ariaLabel: 'Dyspnoe - erschwertes Atmen, Luftnot',
    simplified: 'Sie haben Schwierigkeiten zu atmen oder fühlen sich luftnot.',
    definition: 'Subjektives Gefühl des erschwerten Atmens.',
  },
  
  // Neurological
  migraine: {
    term: 'Migräne',
    ariaLabel: 'Migräne - starke Kopfschmerzen, oft mit Übelkeit und Lichtempfindlichkeit',
    simplified: 'Sehr starke Kopfschmerzen, oft begleitet von Übelkeit und Lichtempfindlichkeit.',
    definition: 'Neurovaskuläre Erkrankung mit wiederkehrenden, pulsierenden Kopfschmerzen.',
  },
  neuropathy: {
    term: 'Nervenschäden (Neuropathie)',
    ariaLabel: 'Neuropathie - Schädigung der Nerven',
    simplified: 'Ihre Nerven sind geschädigt, was zu Taubheitsgefühlen oder Schmerzen führen kann.',
    definition: 'Funktionsstörung oder Schädigung peripherer Nerven.',
  },
  
  // Gastrointestinal
  reflux: {
    term: 'Sodbrennen (Reflux)',
    ariaLabel: 'Reflux - Rückfluss von Magensäure in die Speiseröhre',
    simplified: 'Magensäure steigt in die Speiseröhre auf und verursacht Brennen.',
    definition: 'Rückfluss von Mageninhalt in die Speiseröhre.',
  },
  gastritis: {
    term: 'Magenschleimhautentzündung (Gastritis)',
    ariaLabel: 'Gastritis - Entzündung der Magenschleimhaut',
    simplified: 'Die Schleimhaut in Ihrem Magen ist entzündet.',
    definition: 'Entzündung der Magenschleimhaut.',
  },
  
  // Musculoskeletal
  arthritis: {
    term: 'Arthritis (Gelenkentzündung)',
    ariaLabel: 'Arthritis - Entzündung eines oder mehrerer Gelenke',
    simplified: 'Ihr Gelenk oder Ihre Gelenke sind entzündet, was Schmerzen und Schwellungen verursacht.',
    definition: 'Entzündliche Erkrankung eines oder mehrerer Gelenke.',
  },
  osteoporosis: {
    term: 'Osteoporose (Knochenschwund)',
    ariaLabel: 'Osteoporose - Knochenschwund, verminderte Knochendichte',
    simplified: 'Ihre Knochen sind brüchiger und weniger dicht als normal.',
    definition: 'Systemische Skeletterkrankung mit verminderter Knochendichte und gestörter Mikroarchitektur.',
  },
  
  // Psychological
  depression: {
    term: 'Depression',
    ariaLabel: 'Depression - seelische Erkrankung mit dauerhafter Niedergeschlagenheit',
    simplified: 'Sie fühlen sich über längere Zeit sehr traurig, antriebslos und ohne Hoffnung.',
    definition: 'Psychische Störung mit dauerhafter Stimmungsniedergeschlagenheit und Interessenverlust.',
  },
  anxiety: {
    term: 'Angststörung',
    ariaLabel: 'Angststörung - übermäßige Ängste und Sorgen',
    simplified: 'Sie haben starke Ängste oder Sorgen, die Ihren Alltag beeinträchtigen.',
    definition: 'Psychische Störung mit übermäßiger Angst und Sorge.',
  },
  
  // Blood disorders
  anemia: {
    term: 'Blutarmut (Anämie)',
    ariaLabel: 'Anämie - zu wenig rote Blutkörperchen oder Hämoglobin',
    simplified: 'Sie haben zu wenig rote Blutkörperchen, was Müdigkeit verursacht.',
    definition: 'Verminderung der Erythrozyten oder des Hämoglobins im Blut.',
  },
  thrombosis: {
    term: 'Thrombose (Blutgerinnsel)',
    ariaLabel: 'Thrombose - Blutgerinnsel in einem Blutgefäß',
    simplified: 'Ein Blutgerinnsel blockiert ein Blutgefäß, was Schwellungen und Schmerzen verursacht.',
    definition: 'Bildung eines Blutgerinnsels in einem Blutgefäß.',
  },
  
  // Cancer
  tumor: {
    term: 'Tumor (Geschwulst)',
    ariaLabel: 'Tumor - Gewebsvermehrung, kann gutartig oder bösartig sein',
    simplified: 'Eine Gewebsvermehrung, die gutartig oder bösartig sein kann.',
    definition: 'Abnorme Gewebsvermehrung, die gutartig oder maligne sein kann.',
  },
  
  // Infections
  infection: {
    term: 'Infektion (Ansteckung)',
    ariaLabel: 'Infektion - Krankheit durch Krankheitserreger wie Bakterien oder Viren',
    simplified: 'Krankheitserreger wie Bakterien oder Viren haben sich in Ihrem Körper ausgebreitet.',
    definition: 'Eindringen und Vermehrung von Krankheitserregern im Körper.',
  },
  inflammation: {
    term: 'Entzündung',
    ariaLabel: 'Entzündung - Reaktion des Körpers auf Verletzung oder Infektion',
    simplified: 'Ihr Körper reagiert auf eine Verletzung oder Infektion mit Rötung, Schwellung und Wärme.',
    definition: 'Lokale Reaktion des Gewebes auf Schädigung durch pathogene Reize.',
  },
};

/**
 * Get medical term with accessibility support
 */
export function getMedicalTerm(key: string): MedicalTerm | undefined {
  return medicalTerms[key.toLowerCase()];
}

/**
 * Get ARIA label for a medical term
 */
export function getMedicalAriaLabel(key: string): string {
  const term = medicalTerms[key.toLowerCase()];
  return term?.ariaLabel || term?.term || key;
}

/**
 * Get simplified explanation for cognitive accessibility
 */
export function getSimplifiedExplanation(key: string): string {
  const term = medicalTerms[key.toLowerCase()];
  return term?.simplified || term?.definition || key;
}

/**
 * Check if a term is a medical term
 */
export function isMedicalTerm(key: string): boolean {
  return key.toLowerCase() in medicalTerms;
}

/**
 * MedicalTerm component props for React
 */
export interface MedicalTermProps {
  termKey: string;
  showSimplified?: boolean;
  className?: string;
}

/**
 * Medical abbreviations dictionary
 */
export const medicalAbbreviations: Record<string, string> = {
  'BMI': 'Body-Mass-Index (Körpergröße zu Körpergewicht)',
  'BP': 'Blutdruck',
  'HR': 'Herzfrequenz (Puls)',
  'RR': 'Blutdruck',
  'RRsys': 'Oberer Blutdruckwert (systolisch)',
  'RRdia': 'Unterer Blutdruckwert (diastolisch)',
  'SpO2': 'Sauerstoffsättigung im Blut',
  'HbA1c': 'Langzeitblutzucker',
  'GFR': 'Nierenfunktionswert',
  'TSH': 'Schilddrüsenwert',
  'CRP': 'Entzündungswert',
  'LDL': 'Schlechtes Cholesterin',
  'HDL': 'Gutes Cholesterin',
  'INR': 'Gerinnungswert',
  'EF': 'Herzauswurfleistung',
  'COPD': 'Chronisch obstruktive Lungenerkrankung',
  'CAD': 'Koronare Herzkrankheit (Herzkranzgefäßerkrankung)',
  'CHF': 'Chronische Herzschwäche',
  'UTI': 'Harnwegsinfektion',
  'URI': 'Atemwegsinfektion',
  'GI': 'Magen-Darm-',
  'CNS': 'Zentrales Nervensystem',
  'PNS': 'Peripheres Nervensystem',
  'CT': 'Computertomografie (Röntgenuntersuchung)',
  'MRI': 'Magnetresonanztomografie (MRT)',
  'ECG': 'Elektrokardiogramm (Herzstromkurve)',
  'EEG': 'Elektroenzephalogramm (Gehirnstromkurve)',
  'CXR': 'Röntgen Thorax (Brustkorb)',
  'US': 'Ultraschall',
  'IV': 'Intravenös (in die Vene)',
  'IM': 'Intramuskulär (in den Muskel)',
  'SC': 'Subkutan (unter die Haut)',
  'PO': 'Peroral (durch den Mund)',
  'PRN': 'Bei Bedarf',
  'QD': 'Einmal täglich',
  'BID': 'Zweimal täglich',
  'TID': 'Dreimal täglich',
  'QID': 'Vierteljährlich täglich',
  'AC': 'Vor dem Essen',
  'PC': 'Nach dem Essen',
  'HS': 'Zur Nacht',
  'NPO': 'Nichts essen oder trinken',
  'DNR': 'Nicht reanimieren',
  'DNAR': 'Nicht reanimieren',
  'AMA': 'Gegen ärztlichen Rat',
  'AKV': 'Ärztliche Kontrolluntersuchung',
  'eGK': 'Elektronische Gesundheitskarte',
  'KV': 'Kassenärztliche Vereinigung',
  'PVS': 'Praxisverwaltungssystem',
  'TI': 'Telematikinfrastruktur',
  'ePA': 'Elektronische Patientenakte',
  'MFA': 'Medizinische Fachangestellte',
};

/**
 * Expand a medical abbreviation
 */
export function expandAbbreviation(abbr: string): string {
  return medicalAbbreviations[abbr.toUpperCase()] || abbr;
}

/**
 * Check if a string is a medical abbreviation
 */
export function isAbbreviation(abbr: string): boolean {
  return abbr.toUpperCase() in medicalAbbreviations;
}

/**
 * Get all medical terms for a specific category
 */
export function getTermsByCategory(category: string): MedicalTerm[] {
  const categories: Record<string, string[]> = {
    cardiovascular: ['hypertension', 'hypotension', 'arrhythmia', 'angina'],
    diabetes: ['diabetes', 'hyperglycemia', 'hypoglycemia', 'insulin'],
    respiratory: ['asthma', 'copd', 'dyspnea'],
    neurological: ['migraine', 'neuropathy'],
    gastrointestinal: ['reflux', 'gastritis'],
    musculoskeletal: ['arthritis', 'osteoporosis'],
    psychological: ['depression', 'anxiety'],
    blood: ['anemia', 'thrombosis'],
  };
  
  const keys = categories[category] || [];
  return keys.map(key => medicalTerms[key]).filter(Boolean);
}

export default medicalTerms;
