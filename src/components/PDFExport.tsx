import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Printer, FileText, Check, PenTool, RotateCcw } from 'lucide-react';
import type { Question, Answer } from '../types/question';

interface PDFExportProps {
    questions: Question[];
    answers: Record<string, Answer>;
    activePathIds: string[];
    patientName?: string;
    selectedService?: string;
    onClose: () => void;
}

/**
 * PDF Export Komponente
 * Strukturierter medizinischer Bericht mit Unterschriftenfeld
 */
export const PDFExport: React.FC<PDFExportProps> = ({
    questions,
    answers,
    activePathIds,
    patientName,
    selectedService,
    onClose,
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { t } = useTranslation();
    const [isSigned, setIsSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    // Frage-Antwort-Paare für den Bericht
    const reportItems = activePathIds
        .map(id => {
            const question = questions.find(q => q.id === id);
            const answer = answers[id];
            if (!question || !answer) return null;

            let displayValue: string;
            if (Array.isArray(answer.value)) {
                const labels = answer.value.map(v => {
                    const opt = question.options?.find(o => o.value === v);
                    return opt?.label || v;
                });
                displayValue = labels.join(', ');
            } else if (question.options) {
                displayValue = question.options.find(o => o.value === answer.value)?.label || String(answer.value);
            } else {
                displayValue = String(answer.value || '');
            }

            return { question, displayValue, section: question.section };
        })
        .filter(Boolean) as { question: Question; displayValue: string; section: string }[];

    // Nach Sektion gruppieren
    const SECTION_LABELS: Record<string, string> = {
        'basis': t('Persönliche Daten'),
        'versicherung': t('Versicherung'),
        'adresse': t('Adressdaten'),
        'kontakt': t('Kontaktdaten'),
        'beschwerden': t('Aktuelle Beschwerden'),
        'koerpermasse': t('Körpermaße'),
        'rauchen': t('Raucherstatus'),
        'impfungen': t('pdfImpfungen', 'Impfungen'),
        'familie': t('Familienanamnese'),
        'diabetes': t('Diabetes'),
        'beeintraechtigung': t('Beeinträchtigungen'),
        'implantate': t('pdfImplantate', 'Implantate'),
        'blutverduenner': t('Blutverdünner'),
        'allergien': t('pdfAllergien', 'Allergien'),
        'gesundheitsstoerungen': t('Gesundheitsstörungen'),
        'vorerkrankungen': t('Vorerkrankungen'),
        'medikamente-freitext': t('Medikamente'),
        'schwangerschaft': t('pdfSchwangerschaft', 'Schwangerschaft'),
        'bg-unfall': t('Unfallmeldung (BG)'),
        'beruf': t('pdfBeruf', 'Beruf & Lebensumstände'),
        'rezepte': t('pdfRezepte', 'Rezeptanfrage'),
        'dateien': t('pdfDateien', 'Dokumentenübermittlung'),
        'au-anfrage': t('pdfAU', 'Krankschreibung (AU)'),
        'ueberweisung': t('Überweisung'),
        'absage': t('Terminabsage'),
        'telefon': t('pdfTelefon', 'Rückrufwunsch'),
        'befund-anforderung': t('pdfBefund', 'Befundanforderung'),
        'nachricht': t('pdfNachricht', 'Nachricht'),
        'abschluss': t('pdfAbschluss', 'Abschluss'),
    };

    const grouped: { label: string; items: typeof reportItems }[] = [];
    let currentSection = '';
    for (const item of reportItems) {
        if (item.section !== currentSection) {
            currentSection = item.section;
            grouped.push({
                label: SECTION_LABELS[currentSection] || currentSection,
                items: [],
            });
        }
        grouped[grouped.length - 1].items.push(item);
    }

    // Canvas Zeichnen (Unterschrift)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
        setIsSigned(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setIsSigned(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        // Browser-nativer Print-to-PDF
        window.print();
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
            {/* Toolbar (nicht gedruckt) */}
            <div className="print:hidden bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('Anamnese-Bericht')}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                        <Printer className="w-4 h-4" /> {t('Drucken')}
                    </button>
                    <button onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                        <Download className="w-4 h-4" /> {t('Als PDF speichern')}
                    </button>
                    <button onClick={onClose}
                        className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors">
                        {t('Schließen')}
                    </button>
                </div>
            </div>

            {/* Druckbarer Bereich */}
            <div className="flex-1 overflow-y-auto bg-gray-100 print:bg-white">
                <div ref={printRef} className="max-w-[210mm] mx-auto bg-white text-gray-900 shadow-xl my-8 print:my-0 print:shadow-none">
                    {/* Briefkopf */}
                    <div className="px-12 pt-10 pb-6 border-b-2 border-blue-600">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-blue-900">{t('Anamnese-Bericht')}</h1>
                                <p className="text-sm text-gray-500 mt-1">{t('pdfSubtitle', 'Digitaler Fragebogen')} – {selectedService ? t(selectedService) : t('pdfAllgemein', 'Allgemein')}</p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p>{t('pdfDatum', 'Datum')}: <strong className="text-gray-900">{dateStr}</strong></p>
                                <p>{t('pdfUhrzeit', 'Uhrzeit')}: <strong className="text-gray-900">{timeStr}</strong></p>
                                <p className="mt-2 text-xs text-gray-400">{t('pdfDokumentId', 'Dokument-ID')}: {crypto.randomUUID().slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Patient Header */}
                    {patientName && (
                        <div className="px-12 py-4 bg-blue-50 border-b border-blue-100">
                            <p className="text-sm text-gray-600">
                                {t('Patient:')}/in: <strong className="text-gray-900 text-base">{patientName}</strong>
                            </p>
                        </div>
                    )}

                    {/* Inhalt */}
                    <div className="px-12 py-8 space-y-8">
                        {grouped.map((group, gi) => (
                            <div key={gi}>
                                <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider pb-2 mb-4 border-b border-gray-200">
                                    {group.label}
                                </h2>
                                <div className="space-y-2">
                                    {group.items.map((item, i) => (
                                        <div key={i} className="flex py-1.5">
                                            <span className="text-xs text-gray-500 w-[60%] leading-relaxed">
                                                {item.question.question}
                                            </span>
                                            <span className="text-xs font-medium text-gray-900 w-[40%] leading-relaxed">
                                                {item.displayValue}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Unterschriftenfeld */}
                        <div className="mt-12 pt-8 border-t-2 border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <PenTool className="w-4 h-4" />
                                {t('pdfPatientConfirm', 'Bestätigung des Patienten')}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                {t('pdfConfirmText', 'Hiermit bestätige ich, dass die vorstehenden Angaben nach bestem Wissen und Gewissen gemacht wurden und der Wahrheit entsprechen. Ich bin mir bewusst, dass fehlerhafte Angaben die ärztliche Behandlung beeinträchtigen können.')}
                            </p>

                            <div className="print:hidden mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500">{t('pdfSignHere', 'Bitte unterschreiben Sie hier (Maus oder Finger)')}:</span>
                                    <button onClick={clearSignature}
                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5" /> {t('Löschen')}
                                    </button>
                                </div>
                                <canvas
                                    ref={canvasRef}
                                    width={500}
                                    height={120}
                                    role="application"
                                    aria-label={t('pdfSignatureCanvas', 'Unterschrift-Zeichenfeld')}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="w-full h-[120px] border-2 border-gray-300 rounded-lg cursor-crosshair touch-none"
                                    style={{ touchAction: 'none' }}
                                />
                            </div>

                            <div className="flex items-end justify-between mt-6">
                                <div className="text-center">
                                    <div className="w-48 border-b border-gray-400 mb-1" />
                                    <span className="text-xs text-gray-500">{t('pdfOrtDatum', 'Ort, Datum')}</span>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 border-b border-gray-400 mb-1" />
                                    <span className="text-xs text-gray-500">{t('pdfUnterschriftPatient', 'Unterschrift Patient/in')}</span>
                                </div>
                            </div>

                            {isSigned && (
                                <div className="print:hidden mt-4 flex items-center gap-2 text-emerald-600 text-xs">
                                    <Check className="w-4 h-4" /> {t('pdfSignCaptured', 'Unterschrift erfasst')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-12 py-4 bg-gray-50 border-t border-gray-200 text-center">
                        <p className="text-[10px] text-gray-400">
                            {t('pdfFooter', `Dieses Dokument wurde maschinell erstellt und ist ohne handschriftliche Unterschrift gültig. Erstellt am ${dateStr} um ${timeStr} Uhr. Vertrauliche medizinische Informationen – Nur für den behandelnden Arzt bestimmt.`)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
