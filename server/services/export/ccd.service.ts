interface CcdAnswer {
  atomId: string;
  questionText: string;
  section: string;
  value: string;
  answeredAt: Date;
}

interface CcdTriageEvent {
  level: string;
  atomId: string;
  message: string;
  createdAt: Date;
}

export interface CcdExportPayload {
  sessionId: string;
  patientName: string;
  gender?: string | null;
  birthDate?: Date | string | null;
  insuranceType?: string | null;
  selectedService: string;
  status: string;
  createdAt: Date;
  exportedAt: Date;
  answers: CcdAnswer[];
  triageEvents: CcdTriageEvent[];
}

const SECTION_LABELS: Record<string, string> = {
  basis: 'Personalien',
  versicherung: 'Versicherung',
  adresse: 'Adresse',
  kontakt: 'Kontaktdaten',
  beschwerden: 'Aktuelle Beschwerden',
  koerpermasse: 'Körpermaße',
  rauchen: 'Raucherstatus',
  impfungen: 'Impfstatus',
  familie: 'Familienanamnese',
  beruf: 'Beruf & Lebensstil',
  diabetes: 'Diabetes',
  beeintraechtigung: 'Beeinträchtigungen',
  implantate: 'Implantate',
  blutverduenner: 'Blutverdünner',
  allergien: 'Allergien',
  gesundheitsstoerungen: 'Gesundheitsstörungen',
  vorerkrankungen: 'Vorerkrankungen',
  'medikamente-freitext': 'Medikamente',
  schwangerschaft: 'Schwangerschaft',
  rezepte: 'Rezeptanfrage',
  dateien: 'Dokumenten-Upload',
  'au-anfrage': 'AU-Anfrage',
  ueberweisung: 'Überweisungsanfrage',
  absage: 'Terminabsage',
  telefon: 'Telefonanfrage',
  'befund-anforderung': 'Befundanforderung',
  nachricht: 'Nachricht',
  abschluss: 'Abschluss',
  'bg-unfall': 'BG-Unfall',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateOnly(value?: Date | string | null): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0] as string;
}

function formatCdaTimestamp(value: Date): string {
  const iso = value.toISOString();
  const [datePart, timeWithMs] = iso.split('T');
  const timePart = timeWithMs.replace(/\.\d{3}Z$/, '').replace(/:/g, '');

  return `${datePart.replace(/-/g, '')}${timePart}+0000`;
}

function splitPatientName(name: string): { given: string; family: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { given: 'Unbekannt', family: 'Patient' };
  }

  const [given, ...familyParts] = trimmed.split(/\s+/);
  return {
    given: given || 'Unbekannt',
    family: familyParts.join(' ') || 'Patient',
  };
}

function renderAnswersSection(answers: CcdAnswer[]): string {
  if (answers.length === 0) {
    return `
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.10" />
          <code code="11329-0" codeSystem="2.16.840.1.113883.6.1" displayName="History General" />
          <title>Anamnese-Antworten</title>
          <text>Keine Antworten vorhanden.</text>
        </section>
      </component>`;
  }

  const rows = answers
    .map((answer) => {
      const sectionLabel = SECTION_LABELS[answer.section] || answer.section;
      const answeredAt = formatCdaTimestamp(answer.answeredAt);

      return `<tr><td>${escapeXml(sectionLabel)}</td><td>${escapeXml(answer.questionText)}</td><td>${escapeXml(answer.value || '-')}</td><td>${escapeXml(answeredAt)}</td></tr>`;
    })
    .join('');

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.10" />
        <code code="11329-0" codeSystem="2.16.840.1.113883.6.1" displayName="History General" />
        <title>Anamnese-Antworten</title>
        <text>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Sektion</th>
                <th>Frage</th>
                <th>Antwort</th>
                <th>Zeitpunkt</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </text>
      </section>
    </component>`;
}

function renderTriageSection(triageEvents: CcdTriageEvent[]): string {
  if (triageEvents.length === 0) {
    return `
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.5.1" />
          <code code="75310-3" codeSystem="2.16.840.1.113883.6.1" displayName="Health concerns" />
          <title>Triage-Hinweise</title>
          <text>Keine Triage-Hinweise vorhanden.</text>
        </section>
      </component>`;
  }

  const rows = triageEvents
    .map((event) => {
      const createdAt = formatCdaTimestamp(event.createdAt);
      return `<tr><td>${escapeXml(event.level)}</td><td>${escapeXml(event.atomId)}</td><td>${escapeXml(event.message)}</td><td>${escapeXml(createdAt)}</td></tr>`;
    })
    .join('');

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.5.1" />
        <code code="75310-3" codeSystem="2.16.840.1.113883.6.1" displayName="Health concerns" />
        <title>Triage-Hinweise</title>
        <text>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Level</th>
                <th>Atom</th>
                <th>Nachricht</th>
                <th>Zeitpunkt</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </text>
      </section>
    </component>`;
}

export function buildCcdXml(payload: CcdExportPayload): string {
  const now = payload.exportedAt;
  const createdAt = payload.createdAt;
  const birthDate = formatDateOnly(payload.birthDate);
  const { given, family } = splitPatientName(payload.patientName);

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040" />
  <templateId root="2.16.840.1.113883.10.20.22.1.2" />
  <id root="2.16.840.1.113883.19.5" extension="${escapeXml(payload.sessionId)}" />
  <code code="34133-9" codeSystem="2.16.840.1.113883.6.1" displayName="Summarization of episode note" />
  <title>DiggAI Anamnese CCD Export</title>
  <effectiveTime value="${formatCdaTimestamp(now)}" />
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" />
  <languageCode code="de-DE" />

  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.19.5.99999.1" extension="${escapeXml(payload.sessionId)}" />
      <patient>
        <name>
          <given>${escapeXml(given)}</given>
          <family>${escapeXml(family)}</family>
        </name>
        ${payload.gender ? `<administrativeGenderCode code="${escapeXml(payload.gender)}" />` : ''}
        ${birthDate ? `<birthTime value="${escapeXml(birthDate.replace(/-/g, ''))}" />` : ''}
      </patient>
    </patientRole>
  </recordTarget>

  <author>
    <time value="${formatCdaTimestamp(now)}" />
    <assignedAuthor>
      <id root="2.16.840.1.113883.19.5.99999.2" extension="DiggAI" />
      <assignedPerson>
        <name>
          <given>DiggAI</given>
          <family>Anamnese</family>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>

  <component>
    <structuredBody>
      <component>
        <section>
          <code code="55107-7" codeSystem="2.16.840.1.113883.6.1" displayName="Clinical presentation" />
          <title>Sitzungsdaten</title>
          <text>
            <list>
              <item>Session-ID: ${escapeXml(payload.sessionId)}</item>
              <item>Service: ${escapeXml(payload.selectedService)}</item>
              <item>Status: ${escapeXml(payload.status)}</item>
              <item>Versicherung: ${escapeXml(payload.insuranceType || '-')}</item>
              <item>Erstellt: ${escapeXml(formatCdaTimestamp(createdAt))}</item>
              <item>Exportiert: ${escapeXml(formatCdaTimestamp(now))}</item>
            </list>
          </text>
        </section>
      </component>
      ${renderAnswersSection(payload.answers)}
      ${renderTriageSection(payload.triageEvents)}
    </structuredBody>
  </component>
</ClinicalDocument>`;
}
