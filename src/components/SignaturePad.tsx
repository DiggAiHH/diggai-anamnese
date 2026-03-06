import { useEffect, useRef, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
    onComplete: (signatureData: string, documentHash: string) => void;
    onClear?: () => void;
    documentText?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * DSGVO-konforme digitale Unterschrift (Phase 12).
 * FES nach eIDAS Art. 26 — Canvas-basiert, touch+mouse+stylus.
 * Konsistent mit PatternLock.tsx (devicePixelRatio-Skalierung).
 */
export function SignaturePad({ onComplete, onClear, documentText = '', className = '', disabled = false }: SignaturePadProps) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // DPI-aware sizing — same pattern as PatternLock.tsx
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.parentElement?.getBoundingClientRect();
        const w = rect?.width || 600;
        canvas.width = w * ratio;
        canvas.height = 160 * ratio;
        canvas.style.width = `${w}px`;
        canvas.style.height = '160px';
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(ratio, ratio);

        padRef.current = new SignaturePadLib(canvas, {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            penColor: '#1e40af',
            minWidth: 1.5,
            maxWidth: 3,
        });

        padRef.current.addEventListener('beginStroke', () => setIsEmpty(false));

        return () => {
            padRef.current?.off();
        };
    }, []);

    const handleClear = () => {
        padRef.current?.clear();
        setIsEmpty(true);
        setIsConfirmed(false);
        onClear?.();
    };

    const handleConfirm = async () => {
        if (!padRef.current || padRef.current.isEmpty()) return;

        const signatureData = padRef.current.toDataURL('image/png');

        // Compute SHA-256 hash of the document text in browser (SubtleCrypto)
        let documentHash = 'no-document';
        if (documentText) {
            try {
                const encoded = new TextEncoder().encode(documentText);
                const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch {
                // Fallback: simple hash not available
                documentHash = 'hash-unavailable';
            }
        }

        setIsConfirmed(true);
        padRef.current.off(); // Lock the pad after confirming
        onComplete(signatureData, documentHash);
    };

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            <p className="text-sm text-[var(--text-secondary)]">
                {t('signature.hint', 'Bitte unterschreiben Sie mit Ihrem Finger oder der Maus im Feld unten.')}
            </p>

            <div
                className="relative rounded-xl border-2 border-dashed bg-white/5 overflow-hidden"
                style={{ borderColor: isConfirmed ? '#16a34a' : isEmpty ? 'rgba(255,255,255,0.2)' : '#3b82f6' }}
            >
                <canvas
                    ref={canvasRef}
                    className="block w-full cursor-crosshair touch-none"
                    aria-label={t('signature.canvas_label', 'Unterschriften-Feld')}
                    style={{ pointerEvents: disabled || isConfirmed ? 'none' : 'auto' }}
                />
                {isEmpty && !isConfirmed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[var(--text-secondary)] text-sm opacity-50 select-none">
                            {t('signature.placeholder', 'Hier unterschreiben…')}
                        </span>
                    </div>
                )}
                {isConfirmed && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('signature.confirmed', 'Bestätigt')}
                    </div>
                )}
            </div>

            {!isConfirmed && (
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex-1 py-2 px-4 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm hover:bg-white/5 transition-colors"
                    >
                        {t('signature.clear', 'Löschen')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isEmpty}
                        className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('signature.confirm', 'Unterschrift bestätigen')}
                    </button>
                </div>
            )}

            {isConfirmed && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-[var(--text-secondary)] underline underline-offset-2 text-center hover:text-[var(--text-primary)] transition-colors"
                >
                    {t('signature.redo', 'Unterschrift neu zeichnen')}
                </button>
            )}
        </div>
    );
}
