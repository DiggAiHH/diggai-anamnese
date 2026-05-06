import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, RotateCcw, Check, Zap } from 'lucide-react';

interface SignaturePadProps {
  onConfirm?: (signatureData: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  label?: string;
  documentText?: string;
  onComplete?: (signatureData: string, documentHash: string) => void;
}

// Psychology-based colors
const COLORS = {
  pen: '#2C5F8A',        // Deep Trust Blue
  confirmed: '#81B29A',  // Sage Green
  empty: 'rgba(107, 139, 164, 0.3)'
};

export function SignaturePad({
  onConfirm,
  onCancel,
  width = 400,
  height = 200,
  label = 'Unterschrift',
  documentText: _documentText,
  onComplete,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const saveBarRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs to avoid stale closures in timer callback
  const isEmptyRef = useRef(true);
  const isConfirmedRef = useRef(false);

  useEffect(() => { isEmptyRef.current = isEmpty; }, [isEmpty]);
  useEffect(() => { isConfirmedRef.current = isConfirmed; }, [isConfirmed]);

  // IntersectionObserver: show sticky bar when save buttons scroll out of view
  useEffect(() => {
    const el = saveBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!(entry?.isIntersecting ?? true)),
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Schedule auto-save after 3 s of inactivity
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (isEmptyRef.current || isConfirmedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const signatureData = canvas.toDataURL('image/png');
      setIsConfirmed(true);
      setAutoSaved(true);
      onConfirm?.(signatureData);
      onComplete?.(signatureData, signatureData);
      setTimeout(() => setAutoSaved(false), 2500);
    }, 3000);
  }, [onConfirm, onComplete]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isConfirmed) return;
    // Cancel any pending auto-save when user starts a new stroke
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaved(false);

    const { x, y } = getCanvasCoordinates(e);
    setIsDrawing(true);
    lastPos.current = { x, y };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.pen;
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current) return;

    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = COLORS.pen;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    lastPos.current = { x, y };
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
    // Start auto-save countdown after stroke ends
    if (!isEmptyRef.current && !isConfirmedRef.current) {
      scheduleAutoSave();
    }
  };

  const clear = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setIsEmpty(true);
    setIsConfirmed(false);
    setAutoSaved(false);
  };

  const confirm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    const signatureData = canvas.toDataURL('image/png');
    setIsConfirmed(true);
    onConfirm?.(signatureData);
    onComplete?.(signatureData, signatureData);
  }, [isEmpty, onConfirm, onComplete]);

  // Shared button bar (used both inline and in sticky overlay)
  const renderActionButtons = (sticky = false) => (
    <div className={`flex gap-3${sticky ? ' px-4 py-3' : ''}`}>
      <motion.button
        type="button"
        onClick={clear}
        aria-label="Unterschrift zurücksetzen"
        className="flex-1 min-h-[44px] p-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5 text-sm"
        style={{
          borderColor: 'var(--border-primary)',
          color: 'var(--text-secondary)',
          backgroundColor: sticky ? 'var(--bg-secondary)' : 'var(--bg-card)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isEmpty}
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Unterschrift zurücksetzen</span>
      </motion.button>

      <motion.button
        type="button"
        onClick={confirm}
        aria-label={isConfirmed ? 'Unterschrift gespeichert' : 'Unterschrift bestätigen'}
        disabled={isEmpty || isConfirmed}
        className="flex-1 min-h-[44px] py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          background: isConfirmed
            ? COLORS.confirmed
            : 'linear-gradient(135deg, #4A90E2, #2C5F8A)',
        }}
        whileHover={!isEmpty && !isConfirmed ? { scale: 1.01 } : {}}
        whileTap={!isEmpty && !isConfirmed ? { scale: 0.99 } : {}}
      >
        <Check className="w-4 h-4" />
        {/* Klarstellung 2026-05-06: explizit "Unterschrift", damit Patient
            nicht denkt, dass das gesamte Formular gespeichert/abgesendet wird. */}
        {isConfirmed ? 'Unterschrift gespeichert' : 'Unterschrift bestätigen'}
      </motion.button>

      {onCancel && !sticky && (
        <motion.button
          type="button"
          onClick={onCancel}
          aria-label="Unterschrift abbrechen"
          className="min-h-[44px] py-2.5 px-4 rounded-lg font-medium transition-all duration-200 border"
          style={{
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-card)',
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          Abbrechen
        </motion.button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Pen className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          {label}
        </label>

        {/* Auto-save feedback badge */}
        <AnimatePresence>
          {autoSaved && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
              style={{ color: COLORS.confirmed, backgroundColor: `${COLORS.confirmed}18` }}
            >
              <Zap className="w-3 h-3" />
              Automatisch gespeichert
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative rounded-xl overflow-hidden border-2 transition-colors duration-300"
        style={{
          borderColor: isConfirmed ? COLORS.confirmed : isEmpty ? COLORS.empty : COLORS.pen,
          backgroundColor: 'var(--bg-secondary)'
        }}
        animate={{
          boxShadow: isConfirmed
            ? `0 0 0 3px ${COLORS.confirmed}20`
            : '0 0 0 0 transparent'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="touch-none cursor-crosshair block"
          style={{
            width: '100%',
            height: 'auto',
            opacity: isConfirmed ? 0.7 : 1
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {isEmpty && !isConfirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Hier unterschreiben...
            </span>
          </div>
        )}

        {isConfirmed && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div
              className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{
                backgroundColor: `${COLORS.confirmed}20`,
                border: `1px solid ${COLORS.confirmed}40`
              }}
            >
              <Check className="w-5 h-5" style={{ color: COLORS.confirmed }} />
              <span className="text-sm font-medium" style={{ color: COLORS.confirmed }}>
                Unterschrift gespeichert
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Inline action buttons (observed for visibility) */}
      <div ref={saveBarRef}>
        {renderActionButtons()}
      </div>

      {/* Sticky save bar — appears when inline buttons scroll out of view */}
      <AnimatePresence>
        {showStickyBar && !isEmpty && !isConfirmed && (
          <motion.div
            role="toolbar"
            aria-label="Unterschrift speichern"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-4 left-0 right-0 z-40 mx-auto max-w-sm px-4"
          >
            <div
              className="rounded-2xl border shadow-2xl overflow-hidden"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-card)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              }}
            >
              {renderActionButtons(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SignaturePad;
