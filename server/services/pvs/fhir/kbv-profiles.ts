// ============================================
// KBV (Kassenärztliche Bundesvereinigung) Profile
// ============================================
// KBV Basisprofile und eRezept-relevante Strukturen
// https://fhir.kbv.de

// ─── KBV Basisprofil URLs ──────────────────────────────────

export const KBV_BASE_URL = 'https://fhir.kbv.de/StructureDefinition';

/** KBV Basis Patient Profil */
export const KBV_PR_BASE_PATIENT = `${KBV_BASE_URL}/KBV_PR_Base_Patient`;

/** KBV Basis Encounter Profil */
export const KBV_PR_BASE_ENCOUNTER = `${KBV_BASE_URL}/KBV_PR_Base_Encounter`;

/** KBV Basis Observation Profil */
export const KBV_PR_BASE_OBSERVATION = `${KBV_BASE_URL}/KBV_PR_Base_Observation`;

/** KBV Basis Condition Profil */
export const KBV_PR_BASE_CONDITION = `${KBV_BASE_URL}/KBV_PR_Base_Condition`;

/** KBV Basis Procedure Profil */
export const KBV_PR_BASE_PROCEDURE = `${KBV_BASE_URL}/KBV_PR_Base_Procedure`;

/** KBV Basis Medication Profil */
export const KBV_PR_BASE_MEDICATION = `${KBV_BASE_URL}/KBV_PR_Base_Medication`;

/** KBV Basis MedicationStatement Profil */
export const KBV_PR_BASE_MEDICATION_STATEMENT = `${KBV_BASE_URL}/KBV_PR_Base_MedicationStatement`;

/** KBV Basis AllergyIntolerance Profil */
export const KBV_PR_BASE_ALLERGY_INTOLERANCE = `${KBV_BASE_URL}/KBV_PR_Base_AllergyIntolerance`;

/** KBV Coverage (Versicherung) Profil */
export const KBV_PR_BASE_COVERAGE = `${KBV_BASE_URL}/KBV_PR_Base_Coverage`;

/** KBV Organization (Krankenkasse) Profil */
export const KBV_PR_BASE_ORGANIZATION = `${KBV_BASE_URL}/KBV_PR_Base_Organization`;

/** KBV Practitioner (Arzt) Profil */
export const KBV_PR_BASE_PRACTITIONER = `${KBV_BASE_URL}/KBV_PR_Base_Practitioner`;

/** KBV PractitionerRole Profil */
export const KBV_PR_BASE_PRACTITIONER_ROLE = `${KBV_BASE_URL}/KBV_PR_Base_PractitionerRole`;

/** KBV RelatedPerson Profil */
export const KBV_PR_BASE_RELATED_PERSON = `${KBV_BASE_URL}/KBV_PR_Base_RelatedPerson`;

/** KBV Location Profil */
export const KBV_PR_BASE_LOCATION = `${KBV_BASE_URL}/KBV_PR_Base_Location`;

/** KBV Device Profil */
export const KBV_PR_BASE_DEVICE = `${KBV_BASE_URL}/KBV_PR_Base_Device`;

/** KBV DocumentReference Profil */
export const KBV_PR_BASE_DOCUMENT_REFERENCE = `${KBV_BASE_URL}/KBV_PR_Base_DocumentReference`;

/** KBV Binary Profil */
export const KBV_PR_BASE_BINARY = `${KBV_BASE_URL}/KBV_PR_Base_Binary`;

/** KBV Bundle Profil */
export const KBV_PR_BASE_BUNDLE = `${KBV_BASE_URL}/KBV_PR_Base_Bundle`;

/** KBV Composition Profil */
export const KBV_PR_BASE_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_Base_Composition`;

/** KBV Flag Profil */
export const KBV_PR_BASE_FLAG = `${KBV_BASE_URL}/KBV_PR_Base_Flag`;

/** KBV RiskAssessment Profil */
export const KBV_PR_BASE_RISK_ASSESSMENT = `${KBV_BASE_URL}/KBV_PR_Base_RiskAssessment`;

// ─── KBV eRezept Profile ───────────────────────────────────

/** eRezept Patient Profil */
export const KBV_PR_ERP_PATIENT = `${KBV_BASE_URL}/KBV_PR_ERP_Patient`;

/** eRezept Composition (Verordnung) Profil */
export const KBV_PR_ERP_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_ERP_Composition`;

/** eRezept MedicationRequest (Verordnung) Profil */
export const KBV_PR_ERP_MEDICATION_REQUEST = `${KBV_BASE_URL}/KBV_PR_ERP_MedicationRequest`;

/** eRezept Medication (Arzneimittel) Profil */
export const KBV_PR_ERP_MEDICATION = `${KBV_BASE_URL}/KBV_PR_ERP_Medication`;

/** eRezept Medication Dispense (Abgabe) Profil */
export const KBV_PR_ERP_MEDICATION_DISPENSE = `${KBV_BASE_URL}/KBV_PR_ERP_MedicationDispense`;

/** eRezept Organization (Krankenkasse) Profil */
export const KBV_PR_ERP_ORGANIZATION = `${KBV_BASE_URL}/KBV_PR_ERP_Organization`;

/** eRezept Practitioner (Verordnender) Profil */
export const KBV_PR_ERP_PRACTITIONER = `${KBV_BASE_URL}/KBV_PR_ERP_Practitioner`;

/** eRezept PractitionerRole Profil */
export const KBV_PR_ERP_PRACTITIONERROLE = `${KBV_BASE_URL}/KBV_PR_ERP_PractitionerRole`;

/** eRezept Coverage Profil */
export const KBV_PR_ERP_COVERAGE = `${KBV_BASE_URL}/KBV_PR_ERP_Coverage`;

/** eRezept Bundle Profil */
export const KBV_PR_ERP_BUNDLE = `${KBV_BASE_URL}/KBV_PR_ERP_Bundle`;

// ─── KBV MIO (Medizinische Informationsobjekte) Profile ─────

/** MIO Zahnärztliche Behandlung Patient */
export const KBV_PR_MIO_ZAH_PATIENT = `${KBV_BASE_URL}/KBV_PR_MIO_ZAH_Patient`;

/** MIO Zahnärztliche Behandlung Composition */
export const KBV_PR_MIO_ZAH_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_MIO_ZAH_Composition`;

/** MIO Zahnärztliche Behandlung Observation */
export const KBV_PR_MIO_ZAH_OBSERVATION = `${KBV_BASE_URL}/KBV_PR_MIO_ZAH_Observation`;

/** MIO Zahnärztliche Behandlung Condition */
export const KBV_PR_MIO_ZAH_CONDITION = `${KBV_BASE_URL}/KBV_PR_MIO_ZAH_Condition`;

/** MIO Zahnärztliche Behandlung Procedure */
export const KBV_PR_MIO_ZAH_PROCEDURE = `${KBV_BASE_URL}/KBV_PR_MIO_ZAH_Procedure`;

/** MIO Kinderuntersuchung Patient */
export const KBV_PR_MIO_KIND_PATIENT = `${KBV_BASE_URL}/KBV_PR_MIO_KU_Patient`;

/** MIO Kinderuntersuchung Composition */
export const KBV_PR_MIO_KIND_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_MIO_KU_Composition`;

/** MIO Kinderuntersuchung Observation */
export const KBV_PR_MIO_KIND_OBSERVATION = `${KBV_BASE_URL}/KBV_PR_MIO_KU_Observation`;

/** MIO Impfen Patient */
export const KBV_PR_MIO_IMP_PATIENT = `${KBV_BASE_URL}/KBV_PR_MIO_IMP_Patient`;

/** MIO Impfen Immunization */
export const KBV_PR_MIO_IMP_IMMUNIZATION = `${KBV_BASE_URL}/KBV_PR_MIO_IMP_Immunization`;

/** MIO Impfen Composition */
export const KBV_PR_MIO_IMP_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_MIO_IMP_Composition`;

/** MIO Vorsorge Patient */
export const KBV_PR_MIO_VOR_PATIENT = `${KBV_BASE_URL}/KBV_PR_MIO_VOR_Patient`;

/** MIO Vorsorge Composition */
export const KBV_PR_MIO_VOR_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_MIO_VOR_Composition`;

// ─── KBV FOR (Fachrichtungsübergreifende Objekte) Profile ───

/** KBV FOR Patient Profil */
export const KBV_PR_FOR_PATIENT = `${KBV_BASE_URL}/KBV_PR_FOR_Patient`;

/** KBV FOR Coverage Profil */
export const KBV_PR_FOR_COVERAGE = `${KBV_BASE_URL}/KBV_PR_FOR_Coverage`;

/** KBV FOR Organization Profil */
export const KBV_PR_FOR_ORGANIZATION = `${KBV_BASE_URL}/KBV_PR_FOR_Organization`;

/** KBV FOR Practitioner Profil */
export const KBV_PR_FOR_PRACTITIONER = `${KBV_BASE_URL}/KBV_PR_FOR_Practitioner`;

/** KBV FOR Composition Profil */
export const KBV_PR_FOR_COMPOSITION = `${KBV_BASE_URL}/KBV_PR_FOR_Composition`;

// ─── KBV CodeSystem URLs ───────────────────────────────────

export const KBV_CS_BASE_URL = 'https://fhir.kbv.de/CodeSystem';

/** KBV CS für Status der Versicherung */
export const KBV_CS_SFHIR_ICD_DIAGNOSESICHERHEIT = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_ICD_DIAGNOSESICHERHEIT`;

/** KBV CS für Seitenlokalisation */
export const KBV_CS_SFHIR_ICD_SEITENLOKALISATION = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_ICD_SEITENLOKALISATION`;

/** KBV CS für Diagnosenart */
export const KBV_CS_SFHIR_DIAGNOSEART = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_DIAGNOSEART`;

/** KBV CS für Arzneimittelkategorie */
export const KBV_CS_SFHIR_ARZNEIMITTELKATEGORIE = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_ARZNEIMITTELKATEGORIE`;

/** KBV CS für Darreichungsform */
export const KBV_CS_SFHIR_DARREICHUNGSFORM = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_DARREICHUNGSFORM`;

/** KBV CS für Wirkstofftyp */
export const KBV_CS_SFHIR_WIRKSTOFFTYP = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_WIRKSTOFFTYP`;

/** KBV CS für Medikationsarten */
export const KBV_CS_SFHIR_MEDICATIONSARTEN = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_MEDICATIONSARTEN`;

/** KBV CS für Standardtherapie */
export const KBV_CS_SFHIR_STANDARDTHERAPIE = `${KBV_CS_BASE_URL}/KBV_CS_SFHIR_STANDARDTHERAPIE`;

// ─── KBV ValueSet URLs ─────────────────────────────────────

export const KBV_VS_BASE_URL = 'https://fhir.kbv.de/ValueSet';

/** KBV VS für Arzneimittelkategorie */
export const KBV_VS_SFHIR_ARZNEIMITTELKATEGORIE = `${KBV_VS_BASE_URL}/KBV_VS_SFHIR_ARZNEIMITTELKATEGORIE`;

/** KBV VS für Darreichungsform */
export const KBV_VS_SFHIR_DARREICHUNGSFORM = `${KBV_VS_BASE_URL}/KBV_VS_SFHIR_DARREICHUNGSFORM`;

/** KBV VS für Wirkstofftyp */
export const KBV_VS_SFHIR_WIRKSTOFFTYP = `${KBV_VS_BASE_URL}/KBV_VS_SFHIR_WIRKSTOFFTYP`;

/** KBV VS für Diagnosesicherheit */
export const KBV_VS_SFHIR_ICD_DIAGNOSESICHERHEIT = `${KBV_VS_BASE_URL}/KBV_VS_SFHIR_ICD_DIAGNOSESICHERHEIT`;

/** KBV VS für Seitenlokalisation */
export const KBV_VS_SFHIR_ICD_SEITENLOKALISATION = `${KBV_VS_BASE_URL}/KBV_VS_SFHIR_ICD_SEITENLOKALISATION`;

// ─── KBV Extension URLs ────────────────────────────────────

export const KBV_EX_BASE_URL = 'https://fhir.kbv.de/StructureDefinition';

/** KBV Extension für Abgabehinweis */
export const KBV_EX_BASE_MEDICATION_ABGABE_HINWEIS = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Ababe_Hinweis`;

/** KBV Extension für Herstellungsanweisung */
export const KBV_EX_BASE_MEDICATION_HERSTELLUNGSANWEISUNG = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Herstellungsanweisung`;

/** KBV Extension für Verarbeitungsanweisung */
export const KBV_EX_BASE_MEDICATION_VERARBEITUNGSANWEISUNG = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Verarbeitungsanweisung`;

/** KBV Extension für Packungsgröße */
export const KBV_EX_BASE_MEDICATION_PACKUNGSGROESSE = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Packungsgroesse`;

/** KBV Extension für Impfstoffname */
export const KBV_EX_BASE_MEDICATION_IMPSTOFFNAME = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Impfstoffname`;

/** KBV Extension für Bezeichnung des Impfstoffs */
export const KBV_EX_BASE_MEDICATION_BEZEICHNUNG_IMPSTOFF = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Bezeichnung_Impfstoff`;

/** KBV Extension für Wirkstoffrelation */
export const KBV_EX_BASE_MEDICATION_WIRKSTOFFRELATION = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Wirkstoffrelation`;

/** KBV Extension für Normgröße */
export const KBV_EX_BASE_MEDICATION_NORMGROESSE = `${KBV_EX_BASE_URL}/KBV_EX_Base_Medication_Normgroesse`;

/** KBV Extension für Rechtsgrundlage der Versorgung */
export const KBV_EX_BASE_RECHTSGRUNDLAGE = `${KBV_EX_BASE_URL}/KBV_EX_Base_Rechtsgrundlage`;

/** KBV Extension für Zuzahlungsstatus */
export const KBV_EX_BASE_ZUZAHLUNGSSTATUS = `${KBV_EX_BASE_URL}/KBV_EX_Base_Zuzahlungsstatus`;

// ─── Versionen ─────────────────────────────────────────────

export const KBV_VERSION_1_5_0 = '1.5.0';
export const KBV_VERSION_ERP_1_1_0 = '1.1.0';

// ─── Hilfsfunktionen ───────────────────────────────────────

/**
 * Gibt die vollständige Profil-URL mit Version zurück
 */
export function getKbvProfileUrl(profile: string, version?: string): string {
  return version ? `${profile}|${version}` : `${profile}|${KBV_VERSION_1_5_0}`;
}

/**
 * Prüft ob eine URL ein KBV-Profil ist
 */
export function isKbvProfile(url: string): boolean {
  return url.startsWith(KBV_BASE_URL);
}

/**
 * Gibt alle relevanten KBV Basis-Profile für Patienten zurück
 */
export function getKbvPatientProfiles(): string[] {
  return [
    KBV_PR_BASE_PATIENT,
    KBV_PR_FOR_PATIENT,
    KBV_PR_ERP_PATIENT,
  ];
}

/**
 * Gibt alle eRezept-relevanten Profile zurück
 */
export function getErezeptProfiles(): Record<string, string> {
  return {
    Patient: KBV_PR_ERP_PATIENT,
    Composition: KBV_PR_ERP_COMPOSITION,
    MedicationRequest: KBV_PR_ERP_MEDICATION_REQUEST,
    Medication: KBV_PR_ERP_MEDICATION,
    MedicationDispense: KBV_PR_ERP_MEDICATION_DISPENSE,
    Organization: KBV_PR_ERP_ORGANIZATION,
    Practitioner: KBV_PR_ERP_PRACTITIONER,
    Coverage: KBV_PR_ERP_COVERAGE,
    Bundle: KBV_PR_ERP_BUNDLE,
  };
}

/**
 * Gibt alle MIO-Profile zurück
 */
export function getMioProfiles(): Record<string, Record<string, string>> {
  return {
    zahn: {
      Patient: KBV_PR_MIO_ZAH_PATIENT,
      Composition: KBV_PR_MIO_ZAH_COMPOSITION,
      Observation: KBV_PR_MIO_ZAH_OBSERVATION,
      Condition: KBV_PR_MIO_ZAH_CONDITION,
      Procedure: KBV_PR_MIO_ZAH_PROCEDURE,
    },
    kinder: {
      Patient: KBV_PR_MIO_KIND_PATIENT,
      Composition: KBV_PR_MIO_KIND_COMPOSITION,
      Observation: KBV_PR_MIO_KIND_OBSERVATION,
    },
    impfen: {
      Patient: KBV_PR_MIO_IMP_PATIENT,
      Immunization: KBV_PR_MIO_IMP_IMMUNIZATION,
      Composition: KBV_PR_MIO_IMP_COMPOSITION,
    },
    vorsorge: {
      Patient: KBV_PR_MIO_VOR_PATIENT,
      Composition: KBV_PR_MIO_VOR_COMPOSITION,
    },
  };
}

// ─── eRezept Status Codes ──────────────────────────────────

export enum ErezeptStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  REVOKED = 'revoked',
  COMPLETED = 'completed',
  ENTERED_IN_ERROR = 'entered-in-error',
  STOPPED = 'stopped',
}

export enum ErezeptStatusReason {
  NONE = 'none',
  MEDICAL_PRESCRIPTION = 'medical-prescription',
  PHARMACY_ONLY = 'pharmacy-only',
  EMERGENCY_CARE = 'emergency-care',
}

// ─── KBV Diagnosesicherheit Codes ──────────────────────────

export enum KbvDiagnosesicherheit {
  GESICHERT = 'G',       // Gesicherte Diagnose
  VERDACHT = 'V',        // Verdacht auf / zum Ausschluss von
  ZUSTAND_NACH = 'Z',    // Zustand nach
  R = 'R',               // Röntgen/OP/bildgebendes Verfahren ohne Konsil
  A = 'A',               // Austrittsdiagnose
}

// ─── KBV Seitenlokalisation Codes ──────────────────────────

export enum KbvSeitenlokalisation {
  RECHTS = 'R',          // Rechts
  LINKS = 'L',           // Links
  BEIDSEITIG = 'B',      // Beidseitig
}

// ─── KBV Darreichungsform Codes (Auswahl) ──────────────────

export enum KbvDarreichungsform {
  TABLETTEN = 'TAB',
  KAPSELN = 'KAP',
  FILMTABLETTEN = 'FTA',
  DRAGEES = 'DRG',
  ZAEPELCHEN = 'ZPA',
  SALBE = 'SAL',
  CREME = 'CRE',
  GEL = 'GEL',
  LOESUNG = 'LOE',
  TROPFEN = 'TRO',
  SPRAY = 'SPR',
  PFLASTER = 'PFL',
  INJEKTION = 'INJ',
  INFUSION = 'INF',
}

// ─── KBV Arzneimittelkategorie Codes ───────────────────────

export enum KbvArzneimittelkategorie {
  ARZNEI = '00',         // Arzneimittel
  BTM = '01',            // Betäubungsmittel
  V = '02',              // Abgabe an Versicherte
  APOPFLICHT = '06',     // Apothekenpflichtig
  HERSTELLUNG = '07',    // Herstellung im Apothekenlabor
}
