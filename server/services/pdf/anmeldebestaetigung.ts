/**
 * server/services/pdf/anmeldebestaetigung.ts
 *
 * PDF-Generator für DiggAi-Capture Anmeldebestätigung.
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Dieses Modul ist Bucket-B (Pure-Capture) und gehört nach Phase 4 nach packages/capture/.
 *   - KEINE klinischen Aussagen, KEINE Diagnose-Hinweise, KEINE Triage-Output, KEINE Risiko-Bewertung.
 *   - Nur administrative Inhalte: Stammdaten, Termin, DSGVO-Konsent, Praxis-Kontakt.
 *   - Verbots-Wortliste (siehe CLAUDE.md Regulatory Guard) wird durch Type-Check gegen die Daten erzwungen.
 *
 * Connector-Mapping (siehe docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.6):
 *   - Quick-Win #2 aus dem Implementierungs-Plan
 *   - Adressiert D6 (IFU für Capture als PDF) als Vorstufe
 *   - Nutzt pdf-lib (bereits im Projekt verfügbar)
 *
 * Verwendung:
 *   import { generateAnmeldebestaetigung } from './anmeldebestaetigung';
 *   const pdfBuffer = await generateAnmeldebestaetigung({
 *     praxisName: 'Praxis Dr. Klapproth',
 *     praxisAdresse: '...',
 *     patientFullName: '...',
 *     terminDatum: new Date('2026-05-08T10:00:00'),
 *     anmeldeId: 'A-2026-1234',
 *     dsgvoZeitstempel: new Date(),
 *   });
 *   res.setHeader('Content-Type', 'application/pdf');
 *   res.send(pdfBuffer);
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Eingabe-Daten für die Anmeldebestätigung.
 *
 * WICHTIG: keine klinischen Felder erlaubt (z.B. diagnose, triage, riskScore).
 * Wenn solche Felder gebraucht werden, gehören sie nach packages/suite/.
 */
export interface AnmeldebestaetigungInput {
  /** Vollständiger Praxisname (z.B. "Praxis Dr. Klapproth, Hamburg-Eimsbüttel") */
  praxisName: string;
  /** Komplette Adresse (mehrzeilig erlaubt) */
  praxisAdresse: string;
  /** Praxis-Telefon */
  praxisTelefon?: string;
  /** Praxis-E-Mail */
  praxisEmail?: string;
  /** Patientenname (Vor- und Nachname) */
  patientFullName: string;
  /** Geplanter Termin (Datum + Uhrzeit) */
  terminDatum: Date;
  /** Eindeutige Anmelde-ID für die Session */
  anmeldeId: string;
  /** Zeitstempel der DSGVO-Einwilligung */
  dsgvoZeitstempel: Date;
  /** Optional: Sprache der Bestätigung */
  language?: 'de' | 'en';
}

/**
 * Lokalisierte Texte für die Anmeldebestätigung.
 *
 * Diese Strings sind administrativ — keine medizinischen Aussagen.
 */
const STRINGS = {
  de: {
    title: 'Anmeldebestätigung',
    subtitle: 'Bestätigung Ihrer digitalen Voranmeldung',
    intro: 'Sehr geehrte Patientin, sehr geehrter Patient,',
    introBody: 'wir bestätigen den Eingang Ihrer Voranmeldung über DiggAi. Bitte bringen Sie diese Bestätigung zu Ihrem Termin mit.',
    appointmentLabel: 'Ihr Termin',
    patientLabel: 'Patient/-in',
    practiceLabel: 'Praxis',
    idLabel: 'Anmelde-ID',
    dsgvoLabel: 'Datenschutz-Einwilligung erteilt am',
    workflowLabel: 'Hinweis zum Ablauf',
    workflowBody: 'Sollten Sie weitere Fragen zur Voranmeldung haben, sprechen Sie bitte das Praxispersonal an. Bei medizinischen Fragen oder akuten Beschwerden wenden Sie sich direkt an die Praxis oder im Notfall an die 112.',
    footer: 'Diese Bestätigung wurde automatisch erstellt. Sie ist kein Bescheid einer Behörde, kein Vertrag und keine medizinische Information.',
    legalNote: 'DiggAi ist eine administrative Software zur Erfassung und Übergabe von Stammdaten. Sie liefert keine medizinische Bewertung, Empfehlung oder Diagnose.',
  },
  en: {
    title: 'Registration Confirmation',
    subtitle: 'Confirmation of your digital pre-registration',
    intro: 'Dear patient,',
    introBody: 'we hereby confirm receipt of your pre-registration through DiggAi. Please bring this confirmation to your appointment.',
    appointmentLabel: 'Your appointment',
    patientLabel: 'Patient',
    practiceLabel: 'Practice',
    idLabel: 'Registration ID',
    dsgvoLabel: 'Data protection consent given on',
    workflowLabel: 'How to proceed',
    workflowBody: 'For further questions about your registration, please contact the practice staff. For medical questions or acute symptoms, please contact the practice directly or, in an emergency, call 112.',
    footer: 'This confirmation was generated automatically. It is not an official decision, not a contract, and not medical information.',
    legalNote: 'DiggAi is administrative software for capturing and forwarding patient master data. It does not provide medical assessment, recommendation, or diagnosis.',
  },
} as const;

/**
 * Generiert eine Anmeldebestätigung als PDF-Buffer.
 *
 * @param input  Anmelde-Daten
 * @returns Uint8Array (PDF binary, kann an res.send() oder fs.writeFile() gegeben werden)
 *
 * @example
 *   const buffer = await generateAnmeldebestaetigung({...});
 *   await fs.writeFile('confirmation.pdf', buffer);
 */
export async function generateAnmeldebestaetigung(
  input: AnmeldebestaetigungInput
): Promise<Uint8Array> {
  // Sicherheits-Check: keine klinischen Felder im Input erlaubt
  validateNoClinicalFields(input);

  const lang = input.language ?? 'de';
  const T = STRINGS[lang];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Layout-Konstanten
  const margin = 50;
  let y = height - margin;
  const lineHeight = 16;

  // --- Header ---
  drawText(page, T.title, { x: margin, y, font: helvBold, size: 22 });
  y -= 28;
  drawText(page, T.subtitle, { x: margin, y, font: helv, size: 12, color: rgb(0.4, 0.4, 0.4) });
  y -= lineHeight * 2;

  // --- Praxis-Block ---
  drawText(page, T.practiceLabel, { x: margin, y, font: helvBold, size: 11 });
  y -= lineHeight;
  drawText(page, input.praxisName, { x: margin, y, font: helv, size: 11 });
  y -= lineHeight;
  for (const addrLine of input.praxisAdresse.split('\n')) {
    drawText(page, addrLine, { x: margin, y, font: helv, size: 11 });
    y -= lineHeight;
  }
  if (input.praxisTelefon) {
    drawText(page, `Tel: ${input.praxisTelefon}`, { x: margin, y, font: helv, size: 11 });
    y -= lineHeight;
  }
  if (input.praxisEmail) {
    drawText(page, `E-Mail: ${input.praxisEmail}`, { x: margin, y, font: helv, size: 11 });
    y -= lineHeight;
  }
  y -= lineHeight;

  // --- Anrede ---
  drawText(page, T.intro, { x: margin, y, font: helv, size: 11 });
  y -= lineHeight;
  drawWrapped(page, T.introBody, { x: margin, y, font: helv, size: 11, maxWidth: width - 2 * margin });
  y -= lineHeight * 4;

  // --- Termin-Block ---
  drawText(page, T.appointmentLabel, { x: margin, y, font: helvBold, size: 13 });
  y -= lineHeight + 4;
  const formattedDate = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(input.terminDatum);
  drawText(page, formattedDate, { x: margin, y, font: helv, size: 12 });
  y -= lineHeight * 2;

  // --- Patient-Block ---
  drawText(page, `${T.patientLabel}:`, { x: margin, y, font: helvBold, size: 11 });
  drawText(page, input.patientFullName, { x: margin + 110, y, font: helv, size: 11 });
  y -= lineHeight;

  drawText(page, `${T.idLabel}:`, { x: margin, y, font: helvBold, size: 11 });
  drawText(page, input.anmeldeId, { x: margin + 110, y, font: helv, size: 11 });
  y -= lineHeight;

  drawText(page, `${T.dsgvoLabel}:`, { x: margin, y, font: helvBold, size: 11 });
  const dsgvoFormatted = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(input.dsgvoZeitstempel);
  drawText(page, dsgvoFormatted, { x: margin + 220, y, font: helv, size: 11 });
  y -= lineHeight * 2;

  // --- Workflow-Hinweis (administrative Sprache, kein klinischer Hinweis) ---
  drawText(page, T.workflowLabel, { x: margin, y, font: helvBold, size: 11 });
  y -= lineHeight;
  drawWrapped(page, T.workflowBody, { x: margin, y, font: helv, size: 10, maxWidth: width - 2 * margin });
  y -= lineHeight * 5;

  // --- Footer / Legal ---
  drawWrapped(page, T.legalNote, { x: margin, y: 100, font: helv, size: 8, color: rgb(0.5, 0.5, 0.5), maxWidth: width - 2 * margin });
  drawWrapped(page, T.footer, { x: margin, y: 60, font: helv, size: 8, color: rgb(0.5, 0.5, 0.5), maxWidth: width - 2 * margin });

  return pdf.save();
}

/**
 * Validiert dass keine klinischen Felder versehentlich übergeben wurden.
 *
 * Wirft, wenn ein verbotenes Feld erkannt wird. Das schützt vor
 * Class-IIa-Drift falls ein Entwickler aus Bequemlichkeit klinische
 * Daten in die Anmeldebestätigung einbauen will.
 */
function validateNoClinicalFields(input: AnmeldebestaetigungInput): void {
  const forbidden = ['diagnose', 'triage', 'risk', 'verdacht', 'symptom', 'therapyplan', 'aiSummary', 'redFlag'];
  const inputAsRecord = input as unknown as Record<string, unknown>;
  for (const key of Object.keys(inputAsRecord)) {
    const lower = key.toLowerCase();
    if (forbidden.some((bad) => lower.includes(bad))) {
      throw new Error(`[anmeldebestaetigung] Forbidden clinical field detected: "${key}". This module is Bucket-B (Pure-Capture) and must remain administrative-only. Move clinical data handling to packages/suite/.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------
interface DrawOpts {
  x: number;
  y: number;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
}

function drawText(page: PDFPage, text: string, opts: DrawOpts): void {
  page.drawText(text, {
    x: opts.x,
    y: opts.y,
    font: opts.font,
    size: opts.size,
    color: opts.color ?? rgb(0, 0, 0),
  });
}

function drawWrapped(
  page: PDFPage,
  text: string,
  opts: DrawOpts & { maxWidth: number }
): void {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w;
    const width = opts.font.widthOfTextAtSize(candidate, opts.size);
    if (width > opts.maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  let y = opts.y;
  for (const ln of lines) {
    drawText(page, ln, { ...opts, y });
    y -= opts.size + 4;
  }
}
