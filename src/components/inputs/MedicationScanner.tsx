import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, ScanBarcode, QrCode, ImagePlus, RefreshCw, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { createWorker } from 'tesseract.js';

// ─── PZN Demo Database ─────────────────────────────────────
// Real-world PZN numbers mapped to common medications (demo only)
const PZN_DATABASE: Record<string, { name: string; dosage: string; manufacturer: string }> = {
    '00024830': { name: 'Ibuprofen', dosage: '400mg', manufacturer: 'Ratiopharm' },
    '01126111': { name: 'Paracetamol', dosage: '500mg', manufacturer: 'Ratiopharm' },
    '02394166': { name: 'Ramipril', dosage: '5mg', manufacturer: 'Hexal' },
    '03041347': { name: 'Metformin', dosage: '500mg', manufacturer: 'Hexal' },
    '04356998': { name: 'Bisoprolol', dosage: '5mg', manufacturer: '1A Pharma' },
    '04562798': { name: 'Amlodipin', dosage: '5mg', manufacturer: 'Dexcel' },
    '06312077': { name: 'Pantoprazol', dosage: '40mg', manufacturer: 'AbZ' },
    '06605927': { name: 'Candesartan', dosage: '16mg', manufacturer: 'Actavis' },
    '07387596': { name: 'Simvastatin', dosage: '20mg', manufacturer: 'Stada' },
    '07707475': { name: 'Torasemid', dosage: '10mg', manufacturer: 'Hexal' },
    '08850832': { name: 'L-Thyroxin', dosage: '75µg', manufacturer: 'Henning' },
    '09900184': { name: 'Metoprolol', dosage: '47.5mg', manufacturer: 'Stada' },
    '10019621': { name: 'Aspirin Protect', dosage: '100mg', manufacturer: 'Bayer' },
    '11100929': { name: 'Prednisolon', dosage: '5mg', manufacturer: 'Galen' },
    '12644650': { name: 'Omeprazol', dosage: '20mg', manufacturer: 'Aristo' },
};

// Resolve a PZN (strip leading zeros and "PZN-" prefix)
function lookupPZN(raw: string): { name: string; dosage: string; manufacturer: string } | null {
    const cleaned = raw.replace(/^PZN[-:\s]*/i, '').replace(/\s/g, '').padStart(8, '0');
    return PZN_DATABASE[cleaned] ?? null;
}

// Extract PZN from text (8-digit or PZN-prefixed)
function extractPZNFromText(text: string): string | null {
    const pznExplicit = text.match(/PZN[-:\s]*(\d{7,8})/i);
    if (pznExplicit) return pznExplicit[1];
    const standalone = text.match(/\b(\d{7,8})\b/);
    return standalone ? standalone[1] : null;
}

// Extract medication name from OCR text
function extractMedInfoFromOCR(text: string): { name?: string; dosage?: string; pzn?: string } {
    const result: { name?: string; dosage?: string; pzn?: string } = {};

    // PZN
    const pzn = extractPZNFromText(text);
    if (pzn) {
        result.pzn = pzn;
        const lookup = lookupPZN(pzn);
        if (lookup) {
            result.name = lookup.name;
            result.dosage = lookup.dosage;
        }
    }

    // Dosage patterns: 100mg, 5 mg, 500µg, etc.
    if (!result.dosage) {
        const dosMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:mg|µg|g|ml|IE|mcg))/i);
        if (dosMatch) result.dosage = dosMatch[1].replace(/\s+/g, '');
    }

    // Try to extract medication name from first meaningful line
    if (!result.name) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 40);
        for (const line of lines) {
            // Skip lines that are mostly numbers or very short
            if (/^\d+$/.test(line)) continue;
            if (/PZN|Charge|LOT|EXP|Reg/i.test(line)) continue;
            // A line with alphabetic chars is likely the name
            if (/[a-zA-ZäöüÄÖÜ]{3,}/.test(line)) {
                result.name = line.replace(/®|™/g, '').trim();
                break;
            }
        }
    }

    return result;
}

// ─── Types ─────────────────────────────────────────────────
type ScanMode = 'barcode' | 'qr' | 'photo';

interface MedicationScannerProps {
    onResult: (data: { name: string; dosage?: string; pzn?: string }) => void;
    onClose: () => void;
}

export const MedicationScanner: React.FC<MedicationScannerProps> = ({ onResult, onClose }) => {
    const [mode, setMode] = useState<ScanMode>('barcode');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState<{ name: string; dosage?: string; pzn?: string } | null>(null);
    const [manualPzn, setManualPzn] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = 'med-scanner-container';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    // Cleanup scanner on unmount or mode change
    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) { // SCANNING
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch { /* ignore */ }
            scannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => { stopScanner(); };
    }, [stopScanner]);

    // Start barcode/QR scanner
    const startBarcodeScanner = useCallback(async () => {
        await stopScanner();
        setStatus('scanning');
        setErrorMsg('');
        setResult(null);

        // Small delay so DOM container is rendered
        await new Promise(r => setTimeout(r, 300));

        try {
            const formats = mode === 'qr'
                ? [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.DATA_MATRIX]
                : [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                ];

            const scanner = new Html5Qrcode(scannerContainerId, { formatsToSupport: formats, verbose: false });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 280, height: mode === 'qr' ? 280 : 120 },
                },
                (decodedText) => {
                    // Success callback
                    handleScannedCode(decodedText);
                },
                () => { /* ignore scan failures (no match yet) */ }
            );
        } catch (err) {
            console.error('Scanner start failed:', err);
            setStatus('error');
            setErrorMsg('Kamera konnte nicht gestartet werden. Bitte erlauben Sie den Zugriff.');
        }
    }, [mode, stopScanner]);

    // Handle decoded barcode/QR data
    const handleScannedCode = useCallback(async (code: string) => {
        await stopScanner();

        // Try PZN lookup first
        const pznFromCode = extractPZNFromText(code);
        if (pznFromCode) {
            const lookup = lookupPZN(pznFromCode);
            if (lookup) {
                setResult({ name: lookup.name, dosage: lookup.dosage, pzn: pznFromCode });
                setStatus('success');
                return;
            }
        }

        // QR codes might contain structured medication data
        if (code.startsWith('{')) {
            try {
                const parsed = JSON.parse(code);
                if (parsed.name) {
                    setResult({ name: parsed.name, dosage: parsed.dosage, pzn: parsed.pzn });
                    setStatus('success');
                    return;
                }
            } catch { /* not JSON */ }
        }

        // Fallback: use code as-is
        setResult({ name: code, pzn: pznFromCode ?? undefined });
        setStatus('success');
    }, [stopScanner]);

    // Handle photo OCR
    const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('scanning');
        setOcrProgress(0);
        setErrorMsg('');

        try {
            const worker = await createWorker('deu+eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.round(m.progress * 100));
                    }
                }
            });

            const imageUrl = URL.createObjectURL(file);
            const { data: { text } } = await worker.recognize(imageUrl);
            await worker.terminate();
            URL.revokeObjectURL(imageUrl);

            const extracted = extractMedInfoFromOCR(text);
            if (extracted.name || extracted.pzn) {
                if (extracted.pzn && !extracted.name) {
                    const lookup = lookupPZN(extracted.pzn);
                    if (lookup) extracted.name = lookup.name;
                }
                setResult({
                    name: extracted.name || 'Unbekannt',
                    dosage: extracted.dosage,
                    pzn: extracted.pzn,
                });
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg('Kein Medikament erkannt. Bitte fotografieren Sie die Vorderseite der Verpackung mit dem Namen deutlich sichtbar.');
            }
        } catch (err) {
            console.error('OCR failed:', err);
            setStatus('error');
            setErrorMsg('Fehler bei der Texterkennung. Bitte versuchen Sie es erneut.');
        }
    }, []);

    // Manual PZN lookup
    const handleManualPZN = useCallback(() => {
        if (!manualPzn.trim()) return;
        const lookup = lookupPZN(manualPzn);
        if (lookup) {
            setResult({ name: lookup.name, dosage: lookup.dosage, pzn: manualPzn });
            setStatus('success');
        } else {
            setStatus('error');
            setErrorMsg(`PZN "${manualPzn}" nicht in der Datenbank gefunden. Bitte prüfen Sie die Nummer.`);
        }
    }, [manualPzn]);

    // Accept result
    const acceptResult = useCallback(() => {
        if (result) {
            onResult(result);
            onClose();
        }
    }, [result, onResult, onClose]);

    // Start scanner when switching to barcode/qr mode
    useEffect(() => {
        if ((mode === 'barcode' || mode === 'qr') && status !== 'success') {
            startBarcodeScanner();
        } else if (mode === 'photo') {
            stopScanner();
            setStatus('idle');
        }
    }, [mode]);

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="p-4 flex items-center justify-between bg-black/60 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <ScanBarcode className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Medikament scannen</h3>
                        <p className="text-[10px] text-white/40">PZN, Barcode, QR-Code oder Foto</p>
                    </div>
                </div>
                <button
                    onClick={() => { stopScanner(); onClose(); }}
                    aria-label="Scanner schließen"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-white/10 bg-black/40">
                {([
                    { key: 'barcode' as ScanMode, icon: ScanBarcode, label: 'Barcode / PZN' },
                    { key: 'qr' as ScanMode, icon: QrCode, label: 'QR-Code' },
                    { key: 'photo' as ScanMode, icon: ImagePlus, label: 'Foto / OCR' },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setMode(tab.key); setStatus('idle'); setResult(null); setErrorMsg(''); }}
                        className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors
                            ${mode === tab.key
                                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
                {/* Success State */}
                {status === 'success' && result && (
                    <div className="w-full max-w-sm space-y-4 animate-fade-in">
                        <div className="text-center mb-6">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-white">Medikament erkannt</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                            <div>
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">Name</span>
                                <p className="text-sm font-medium text-white">{result.name}</p>
                            </div>
                            {result.dosage && (
                                <div>
                                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Dosierung</span>
                                    <p className="text-sm text-white">{result.dosage}</p>
                                </div>
                            )}
                            {result.pzn && (
                                <div>
                                    <span className="text-[10px] text-white/40 uppercase tracking-wider">PZN</span>
                                    <p className="text-sm text-white font-mono">{result.pzn}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStatus('idle'); setResult(null); }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm transition-colors"
                            >
                                Erneut scannen
                            </button>
                            <button
                                onClick={acceptResult}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
                            >
                                Übernehmen
                            </button>
                        </div>
                    </div>
                )}

                {/* Barcode/QR Camera View */}
                {(mode === 'barcode' || mode === 'qr') && status !== 'success' && (
                    <div className="w-full max-w-sm space-y-4">
                        <div
                            id={scannerContainerId}
                            className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden border border-white/10"
                        />
                        {status === 'scanning' && (
                            <p className="text-center text-xs text-white/40 animate-pulse">
                                {mode === 'barcode'
                                    ? 'Richten Sie die Kamera auf den Barcode der Medikamenten-Verpackung...'
                                    : 'Richten Sie die Kamera auf den QR-Code...'}
                            </p>
                        )}

                        {/* Manual PZN Input Fallback */}
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-[11px] text-white/30 mb-2 text-center">Oder PZN manuell eingeben:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualPzn}
                                    onChange={e => setManualPzn(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="z.B. 06312077"
                                    aria-label="PZN eingeben"
                                    maxLength={8}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                                />
                                <button
                                    onClick={handleManualPZN}
                                    disabled={manualPzn.length < 7}
                                    aria-label="PZN suchen"
                                    className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-white transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Photo/OCR Mode */}
                {mode === 'photo' && status !== 'success' && (
                    <div className="w-full max-w-sm space-y-4 text-center">
                        <div className="p-8 border-2 border-dashed border-white/15 rounded-2xl hover:border-emerald-500/30 transition-colors cursor-pointer"
                             onClick={() => fileInputRef.current?.click()}>
                            <Camera className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-sm text-white/60 mb-1">Foto der Medikamenten-Verpackung</p>
                            <p className="text-[11px] text-white/30">Tippen zum Aufnehmen / Auswählen</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            aria-label="Foto der Medikamenten-Verpackung aufnehmen"
                            title="Foto der Medikamenten-Verpackung aufnehmen"
                        />

                        {status === 'scanning' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2 text-emerald-400">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Texterkennung läuft...</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={ocrProgress} aria-valuemin={0} aria-valuemax={100} aria-label="OCR Fortschritt">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${ocrProgress}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-white/30">{ocrProgress}%</p>
                            </div>
                        )}

                        {/* Manual PZN fallback also here */}
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-[11px] text-white/30 mb-2">Oder PZN manuell eingeben:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualPzn}
                                    onChange={e => setManualPzn(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="z.B. 06312077"
                                    aria-label="PZN eingeben"
                                    maxLength={8}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                                />
                                <button
                                    onClick={handleManualPZN}
                                    disabled={manualPzn.length < 7}
                                    aria-label="PZN suchen"
                                    className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-white transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="w-full max-w-sm mt-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2 animate-fade-in">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
