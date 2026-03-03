import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface SessionTimerProps {
    /** Whether the timer is actively counting */
    active?: boolean;
    /** Optional start timestamp (ISO string) */
    startTime?: string;
}

/**
 * Displays elapsed time since session start.
 * Shows MM:SS format, updates every second.
 */
export const SessionTimer: React.FC<SessionTimerProps> = ({
    active = true,
    startTime,
}) => {
    const [startMs] = useState(() => startTime ? new Date(startTime).getTime() : Date.now());
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startMs) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [active]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono tabular-nums" aria-label={`${minutes} minutes ${seconds} seconds elapsed`}>
            <Timer className="w-3 h-3" />
            <span>{formatted}</span>
        </div>
    );
};
