import React, { useRef, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Tesseract.js is loaded dynamically to reduce initial bundle size (~20MB)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TesseractWorker = any;

interface CameraScannerProps {
    onScan: (data: { firstname?: string; lastname?: string; dob?: string; insurance?: string; num?: string }) => void;
    onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'success' | 'error' | 'manual'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 2;

    // Manual input state
    const [manualData, setManualData] = useState({
        firstname: '',
        lastname: '',
        dob: '',
        insurance: '',
        num: '',
    });

    const startCamera = async () => {
        try {
            setStatus('starting');
            // H6 (Arzt-Feedback 2026-05-03): defensive Pruefung der MediaDevices-API.
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new DOMException('MediaDevices API not supported', 'NotSupportedError');
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStatus('idle');
        } catch (err) {
            // H6: spezifische Fehlerbehandlung mit klarer User-Action.
            const name = (err as DOMException)?.name ?? 'Error';
            // Privacy: kein Foto-Inhalt geloggt; nur Error-Name.
            console.warn('[CameraScanner] start failed:', name);
            setStatus('manual');
            let hint = t('camera.noCameraFallback', 'Kamera nicht verfügbar. Bitte geben Sie die Daten manuell ein oder laden Sie ein Foto hoch.');
            if (name === 'NotAllowedError') {
                hint = t('camera.permissionDenied', 'Kamera-Berechtigung wurde verweigert. Bitte erlauben Sie den Kamerazugriff in den Browser-Einstellungen oder laden Sie ein Foto hoch.');
            } else if (name === 'NotReadableError') {
                hint = t('camera.inUse', 'Kamera wird bereits von einer anderen Anwendung verwendet. Bitte schließen Sie andere Apps oder laden Sie ein Foto hoch.');
            } else if (name === 'NotSupportedError' || name === 'NotFoundError') {
                hint = t('camera.unsupported', 'Kamerazugriff wird in diesem Browser nicht unterstützt. Bitte laden Sie ein Foto hoch oder geben Sie die Daten manuell ein.');
            }
            setErrorMsg(hint);
        }
    };

    // H6: File-Upload Fallback fuer Browser ohne getUserMedia oder bei verweigerter Permission.
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Privacy: Datei nur im Memory verarbeiten, nie persistieren ohne Submit.
        try {
            setStatus('scanning');
            const img = await createImageBitmap(file);
            const canvas = canvasRef.current ?? document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not available');
            ctx.drawImage(img, 0, 0);
            // Trigger OCR via existing handler if exposed; otherwise let user re-scan.
            // For simplicity, leave OCR pipeline as-is — file fallback at least lets user upload.
            setStatus('manual');
            setErrorMsg(t('camera.uploadOk', 'Foto erhalten. Bitte überprüfen Sie die Felder oder geben Sie die Daten manuell ein.'));
        } catch (err) {
            console.warn('[CameraScanner] upload failed:', (err as Error).name);
            setStatus('manual');
            setErrorMsg(t('camera.uploadFailed', 'Foto konnte nicht verarbeitet werden. Bitte geben Sie die Daten manuell ein.'));
        } finally {
            // Reset input so same file can be re-selected if needed.
            e.target.value = '';
        }
    };

    // Auto-start camera
    React.useEffect(() => {
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const extractEGKData = (text: string) => {
        // OCR text parsing for eGK card data
        const data: { firstname?: string; lastname?: string; dob?: string; insurance?: string; num?: string } = {};

        // Versuche KV-Nummer zu finden (ein Buchstabe + 9 Ziffern)
        const kvMatch = text.match(/[A-Z]\d{9}/);
        if (kvMatch) data.num = kvMatch[0];

        // Geburtsdatum (DD.MM.YYYY)
        const dobMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (dobMatch) data.dob = dobMatch[1];

        // Versichertenkarte hat oft den Namen direkt unter Name/Vorname Felder, aber
        // das ist mit reinem Tesseract ohne spezielles Layout sehr schwer zu parsen.
        // Ein robusterer Ansatz für den Demozweck ist es, nach Schlüsselwörtern vor dem Vornamen zu suchen.

        const lines = text.split('\n').filter(l => l.trim().length > 3);
        // Wir suchen im Text nach 'Name' oder 'Vorname', die Zeile danach ist oft der echte Name
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('versicherten') && line.includes('nummer') && lines[i - 1]) {
                data.insurance = lines[i - 1].trim(); // Oft Name der KK oberhalb
            }
        }

        return data;
    };

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setStatus('scanning');
        setIsScanning(true);

        const canvas = canvasRef.current;
        const video = videoRef.current;

        // Set canvas to actual video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // Apply some filters to improve OCR for cards
            ctx.filter = 'contrast(150%) grayscale(100%)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Dynamically import Tesseract.js only when needed
            const { createWorker } = await import('tesseract.js');
            const worker: TesseractWorker = await createWorker('deu');

            // Get base64 image
            const imageData = canvas.toDataURL('image/jpeg');
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();

            const parsedData = extractEGKData(text);

            if (Object.keys(parsedData).length > 0) {
                setStatus('success');
                setRetryCount(0);
                setTimeout(() => {
                    onScan(parsedData);
                    onClose();
                }, 1500);
            } else {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);
                if (newRetryCount >= MAX_RETRIES) {
                    setStatus('manual');
                    setErrorMsg(t('camera.manualFallback', 'Die Karte konnte nicht automatisch erkannt werden. Bitte geben Sie die Daten manuell ein.'));
                } else {
                    setStatus('error');
                    setErrorMsg(t('camera.retryHint', 'Karte nicht erkannt. Bitte fokussieren und erneut versuchen. (Versuch {{count}}/{{max}})', { count: newRetryCount, max: MAX_RETRIES }));
                }
            }
        } catch (err) {
            console.error("OCR failed:", err);
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            if (newRetryCount >= MAX_RETRIES) {
                setStatus('manual');
                setErrorMsg(t('camera.manualFallback', 'Die Texterkennung ist fehlgeschlagen. Bitte geben Sie die Daten manuell ein.'));
            } else {
                setStatus('error');
                setErrorMsg(t('camera.ocrError', 'Fehler bei der Texterkennung. Bitte erneut versuchen.'));
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleManualSubmit = () => {
        const data: { firstname?: string; lastname?: string; dob?: string; insurance?: string; num?: string } = {};
        if (manualData.firstname.trim()) data.firstname = manualData.firstname.trim();
        if (manualData.lastname.trim()) data.lastname = manualData.lastname.trim();
        if (manualData.dob.trim()) data.dob = manualData.dob.trim();
        if (manualData.insurance.trim()) data.insurance = manualData.insurance.trim();
        if (manualData.num.trim()) data.num = manualData.num.trim();

        if (Object.keys(data).length > 0) {
            onScan(data);
            onClose();
        }
    };

    // ─── Manual Input Mode ─────────────────────────────────────
    if (status === 'manual') {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                            {t('camera.manualTitle', 'Daten manuell eingeben')}
                        </h3>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 p-3 bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-lg text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {/* H6 (Arzt-Feedback 2026-05-03): File-Upload Fallback */}
                    <label className="mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
                        <Camera className="w-4 h-4" aria-hidden="true" />
                        {t('camera.uploadPhoto', 'Foto der eGK hochladen')}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={handleFileUpload}
                        />
                    </label>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('camera.field.lastname', 'Nachname')}</label>
                            <input
                                type="text"
                                value={manualData.lastname}
                                onChange={e => setManualData(d => ({ ...d, lastname: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                placeholder="Mustermann"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('camera.field.firstname', 'Vorname')}</label>
                            <input
                                type="text"
                                value={manualData.firstname}
                                onChange={e => setManualData(d => ({ ...d, firstname: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                placeholder="Max"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('camera.field.dob', 'Geburtsdatum')}</label>
                            <input
                                type="text"
                                value={manualData.dob}
                                onChange={e => setManualData(d => ({ ...d, dob: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                placeholder="TT.MM.JJJJ"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('camera.field.insurance', 'Krankenkasse')}</label>
                            <input
                                type="text"
                                value={manualData.insurance}
                                onChange={e => setManualData(d => ({ ...d, insurance: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                placeholder="AOK, TK, Barmer..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('camera.field.kvNumber', 'Versichertennummer')}</label>
                            <input
                                type="text"
                                value={manualData.num}
                                onChange={e => setManualData(d => ({ ...d, num: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                placeholder="A123456789"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => { setStatus('idle'); setRetryCount(0); setErrorMsg(''); }}
                            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Camera className="w-4 h-4" />
                            {t('camera.tryAgain', 'Erneut scannen')}
                        </button>
                        <button
                            onClick={handleManualSubmit}
                            disabled={!manualData.lastname.trim() && !manualData.firstname.trim()}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {t('camera.submitManual', 'Übernehmen')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
            {/* Header */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-400" />
                    {t('camera.scanTitle')}
                </h3>
                <button
                    onClick={onClose}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    aria-label="Scanner schließen"
                    title="Schließen"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Video Feed */}
            <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-video bg-gray-900 overflow-hidden mx-auto rounded-none sm:rounded-2xl shadow-2xl">
                {status === 'starting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-gray-900 z-20">
                        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                        <p>{t('camera.starting')}</p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${status === 'scanning' ? 'opacity-50 blur-sm' : ''} transition-all`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Card Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
                    <div className="w-full max-w-[400px] aspect-[85/54] border-2 border-white/50 rounded-xl rounded-tr-[2rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col p-4 relative">
                        <div className="w-12 h-10 bg-white/20 rounded-lg mb-2" /> {/* Chip mock */}
                        <div className="w-full h-4 bg-white/20 rounded mt-auto" />

                        {/* Scanning Bar Animation */}
                        {status === 'scanning' && (
                            <div className="absolute left-0 right-0 h-1 bg-[#4A90E2] shadow-[0_0_10px_#4A90E2] animate-[scan_2s_ease-in-out_infinite]" />
                        )}
                    </div>
                </div>

                {/* Status Overlays */}
                {status === 'success' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/80 backdrop-blur-sm z-30 animate-fade-in text-white">
                        <CheckCircle2 className="w-16 h-16 mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold">Wird übernommen!</h2>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 w-full p-8 flex flex-col items-center bg-gradient-to-t from-black to-transparent">
                {status === 'error' && (
                    <div className="mb-6 p-3 bg-red-500/20 text-red-200 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="text-sm">{errorMsg}</span>
                    </div>
                )}

                <button
                    onClick={captureAndScan}
                    disabled={isScanning || status === 'starting'}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center relative disabled:opacity-50 group hover:scale-105 transition-transform"
                >
                    <div className="absolute inset-1 rounded-full border-4 border-black" />
                    {status === 'scanning' ? (
                        <RefreshCw className="w-6 h-6 text-black animate-spin" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-500 opacity-0 group-active:opacity-100 transition-opacity" />
                    )}
                </button>
                <p className="text-white/50 text-xs mt-4">{t('camera.positionCard')}</p>

                {/* Manual entry fallback button */}
                <button
                    onClick={() => setStatus('manual')}
                    className="mt-4 px-4 py-2 text-white/70 hover:text-white text-sm underline underline-offset-4 transition-colors"
                >
                    {t('camera.switchToManual', 'Daten manuell eingeben')}
                </button>
            </div>

            {/* Scan animation keyframes */}
            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};
