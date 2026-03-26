import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pen, RotateCcw, Check, Trash2 } from 'lucide-react';

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
  const lastPos = useRef<{ x: number; y: number } | null>(null);

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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isConfirmed) return;
    
    const { x, y } = getCanvasCoordinates(e);
    setIsDrawing(true);
    lastPos.current = { x, y };
    
    // Draw initial dot
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
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setIsEmpty(true);
    setIsConfirmed(false);
  };

  const confirm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const signatureData = canvas.toDataURL('image/png');
    setIsConfirmed(true);
    onConfirm?.(signatureData);
    onComplete?.(signatureData, signatureData);
  }, [isEmpty, onConfirm, onComplete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Pen className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          {label}
        </label>
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={clear}
            className="p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 text-sm"
            style={{ 
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-card)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isEmpty}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Zurücksetzen</span>
          </motion.button>
        </div>
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

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={confirm}
          disabled={isEmpty || isConfirmed}
          className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: isConfirmed 
              ? COLORS.confirmed 
              : 'linear-gradient(135deg, #4A90E2, #2C5F8A)'
          }}
          whileHover={!isEmpty && !isConfirmed ? { scale: 1.01 } : {}}
          whileTap={!isEmpty && !isConfirmed ? { scale: 0.99 } : {}}
        >
          <Check className="w-4 h-4" />
          {isConfirmed ? 'Gespeichert' : 'Bestätigen'}
        </motion.button>
        
        {onCancel && (
          <motion.button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-lg font-medium transition-all duration-200 border"
            style={{
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-card)'
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Abbrechen
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default SignaturePad;
