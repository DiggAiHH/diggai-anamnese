// ============================================
// GDT 3.0 — Feldkennungen & Satzarten
// ============================================

/** GDT 3.0 Feldkennungen → DiggAI-Mapping */
export const GDT_FIELDS = {
  // Header
  SATZLAENGE:     '8100',
  SATZART:        '8000',
  GDT_VERSION:    '9218',
  SENDER_ID:      '8402',
  RECEIVER_ID:    '8401',

  // Patientendaten
  PAT_NR:         '3000',  // → Patient.id (PVS-intern)
  PAT_NAME:       '3101',  // → Patient.lastName
  PAT_VORNAME:    '3102',  // → Patient.firstName
  PAT_GEBDAT:     '3103',  // → Patient.dateOfBirth (TTMMJJJJ)
  PAT_GESCHLECHT: '3110',  // 1=m, 2=w, 3=d
  PAT_STRASSE:    '3107',
  PAT_PLZ:        '3112',
  PAT_ORT:        '3113',
  PAT_VERSART:    '4104',  // → Patient.versichertenArt
  PAT_KASSENNAME: '4102',  // → Patient.kassenname
  PAT_KASSENNR:   '4103',  // → Patient.kassennummer
  PAT_VERSNR:     '3105',  // → Patient.versichertenNr

  // Befund / Ergebnis
  BEFUND_TEXT:     '6220',  // Befundtext (mehrzeilig)
  BEFUND_DATUM:    '6200',  // TTMMJJJJ
  BEFUND_ZEIT:     '6201',  // HHMMSS
  TEST_IDENT:      '8410',  // Test-Identifikation
  TEST_BEZ:        '8411',  // Test-Bezeichnung
  ERGEBNIS_WERT:   '8420',
  ERGEBNIS_EINH:   '8421',
  KOMMENTAR:       '6227',

  // Satzende
  SATZENDE:       '8100',
} as const;

/** GDT 3.0 Satzarten */
export const GDT_SATZARTEN = {
  STAMMDATEN_ANFORDERN:      '6300',
  STAMMDATEN_UEBERMITTELN:   '6311',
  UNTERSUCHUNG_ANFORDERN:    '6302',
  UNTERSUCHUNG_UEBERMITTELN: '6310',
  ERGEBNIS_UEBERMITTELN:     '6301',
} as const;

/** GDT 3.0 Version string */
export const GDT_VERSION = '03.00';

/** GDT gender mapping: PVS code → internal */
export const GDT_GENDER_MAP: Record<string, 'male' | 'female' | 'diverse' | 'unknown'> = {
  '1': 'male',
  '2': 'female',
  '3': 'diverse',
  'M': 'male',
  'W': 'female',
  'D': 'diverse',
};

/** Reverse gender mapping: internal → GDT code */
export const GENDER_TO_GDT: Record<string, string> = {
  'male': '1',
  'female': '2',
  'diverse': '3',
  'unknown': '0',
  'M': '1',
  'W': '2',
  'D': '3',
};

/** Default field mappings: GDT field ID → DiggAI model.field */
export const DEFAULT_GDT_MAPPINGS: Array<{
  gdtField: string;
  diggaiModel: string;
  diggaiField: string;
  transform?: string;
}> = [
  { gdtField: '3000', diggaiModel: 'Patient', diggaiField: 'patientNumber' },
  { gdtField: '3101', diggaiModel: 'Patient', diggaiField: 'lastName', transform: 'decrypt' },
  { gdtField: '3102', diggaiModel: 'Patient', diggaiField: 'firstName', transform: 'decrypt' },
  { gdtField: '3103', diggaiModel: 'Patient', diggaiField: 'birthDate', transform: 'format:date:DDMMYYYY' },
  { gdtField: '3110', diggaiModel: 'Patient', diggaiField: 'gender', transform: 'map:gender' },
  { gdtField: '3105', diggaiModel: 'Patient', diggaiField: 'versichertenNr' },
  { gdtField: '4102', diggaiModel: 'Patient', diggaiField: 'kassenname' },
  { gdtField: '4103', diggaiModel: 'Patient', diggaiField: 'kassennummer' },
  { gdtField: '4104', diggaiModel: 'Patient', diggaiField: 'versichertenArt' },
];
