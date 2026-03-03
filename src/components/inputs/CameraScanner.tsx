import React, { useRef, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useTranslation } from 'react-i18next';

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
    const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const startCamera = async () => {
        try {
            setStatus('starting');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStatus('idle');
        } catch (err) {
            console.error("Camera access denied or failed:", err);
            setStatus('error');
            setErrorMsg(t('camera.error'));
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

            const worker = await createWorker('deu');

            // Get base64 image
            const imageData = canvas.toDataURL('image/jpeg');
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();

            const parsedData = extractEGKData(text);

            if (Object.keys(parsedData).length > 0) {
                setStatus('success');
                setTimeout(() => {
                    onScan(parsedData);
                    onClose();
                }, 1500);
            } else {
                setStatus('error');
                setErrorMsg('Karte nicht erkannt. Bitte fokussieren und erneut versuchen.');
            }
        } catch (err) {
            console.error("OCR failed:", err);
            setStatus('error');
            setErrorMsg('Fehler bei der Texterkennung.');
        } finally {
            setIsScanning(false);
        }
    };

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
                            <div className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
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
