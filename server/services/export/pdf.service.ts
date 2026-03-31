import PDFDocument from 'pdfkit';
import type { NormalizedSessionExport } from './session-export.service';
import { SECTION_LABELS } from './session-export.service';

function groupAnswersBySection(data: NormalizedSessionExport) {
  const grouped = new Map<string, typeof data.answers>();
  for (const answer of data.answers) {
    const key = answer.section || 'sonstige';
    const list = grouped.get(key) || [];
    list.push(answer);
    grouped.set(key, list);
  }
  return grouped;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

export async function renderSessionPdf(data: NormalizedSessionExport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Anamnese-Bericht',
        Author: 'DiggAI',
        Subject: 'Medizinische Patientenaufnahme',
      },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#1d4ed8').text('Anamnese-Bericht');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text('Medizinische Patientenaufnahme');
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Patientendaten');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Patient: ${data.patient.name}`);
    doc.text(`Geschlecht: ${data.patient.gender || '-'}`);
    doc.text(`Geburtsdatum: ${data.patient.birthDate ? new Date(data.patient.birthDate).toLocaleDateString('de-DE') : '-'}`);
    doc.text(`Versicherung: ${data.patient.insuranceType || '-'}`);
    doc.text(`Anliegen: ${data.service}`);
    doc.text(`Status: ${data.status}`);
    doc.text(`Erstellt am: ${new Date(data.createdAt).toLocaleString('de-DE')}`);
    doc.text(`Exportiert am: ${new Date().toLocaleString('de-DE')}`);
    doc.moveDown(1);

    if (data.triageEvents.length > 0) {
      ensureSpace(doc, 80);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#b91c1c').text('Triage-Alarme');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
      for (const event of data.triageEvents) {
        ensureSpace(doc, 30);
        doc.text(`[${event.level}] ${event.message}`);
        doc.fillColor('#64748b').text(`Frage ${event.atomId} • ${new Date(event.createdAt).toLocaleString('de-DE')}`);
        doc.fillColor('#0f172a');
        doc.moveDown(0.4);
      }
      doc.moveDown(0.8);
    }

    const groupedAnswers = groupAnswersBySection(data);
    for (const [section, answers] of groupedAnswers.entries()) {
      ensureSpace(doc, 50);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a8a').text(SECTION_LABELS[section] || section);
      doc.moveDown(0.3);
      for (const answer of answers) {
        ensureSpace(doc, 48);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(answer.questionText);
        doc.font('Helvetica').fontSize(10).fillColor('#334155').text(answer.displayValue || '-', {
          indent: 12,
        });
        doc.moveDown(0.35);
      }
      doc.moveDown(0.5);
    }

    ensureSpace(doc, 80);
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(8).fillColor('#475569').text(
      'Dieses Dokument enthält Gesundheitsdaten nach Art. 9 DSGVO und ist ausschließlich für die behandelnde Praxis bestimmt.',
      { align: 'left' },
    );
    doc.moveDown(0.2);
    doc.text('Unbefugte Weitergabe ist unzulässig. Aufbewahrungspflichten richten sich nach § 630f BGB.');

    doc.end();
  });
}

