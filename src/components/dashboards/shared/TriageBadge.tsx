/**
 * TriageBadge Component
 * 
 * Zeigt das Triage-Level eines Patienten an.
 * Unterstuetzt pulsierende Animation fuer CRITICAL-Level.
 */

import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { TriageLevel } from '../../../types/dashboard';

interface TriageBadgeProps {
  level: TriageLevel;
  pulse?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TRIAGE_CONFIG = {
  CRITICAL: {
    label: 'Kritisch',
    shortLabel: '!',
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    icon: AlertTriangle,
    pulseAnimation: 'animate-pulse',
  },
  WARNING: {
    label: 'Warnung',
    shortLabel: '?',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    icon: AlertCircle,
    pulseAnimation: '',
  },
  NORMAL: {
    label: 'Normal',
    shortLabel: 'OK',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/50',
    icon: CheckCircle,
    pulseAnimation: '',
  },
} as const;

const SIZE_CONFIG = {
  sm: {
    container: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-5 h-5',
  },
} as const;

export const TriageBadge: React.FC<TriageBadgeProps> = ({
  level,
  pulse = false,
  showLabel = true,
  size = 'md',
  className,
}) => {
  const config = TRIAGE_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-md border backdrop-blur-sm',
        config.color,
        config.bgColor,
        config.borderColor,
        sizeConfig.container,
        pulse && level === 'CRITICAL' && config.pulseAnimation,
        className
      )}
      role="status"
      aria-label={`Triage-Level: ${config.label}`}
    >
      <Icon className={cn(sizeConfig.icon, 'shrink-0')} aria-hidden="true" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

/**
 * Kleine Triage-Indikator-Variante (nur Icon)
 */
export const TriageDot: React.FC<{
  level: TriageLevel;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}> = ({ level, size = 'md', pulse = false, className }) => {
  const config = TRIAGE_CONFIG[level];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        config.bgColor,
        config.color,
        sizeClasses[size],
        pulse && level === 'CRITICAL' && config.pulseAnimation,
        className
      )}
      role="status"
      aria-label={`Triage-Level: ${config.label}`}
    >
      <Icon className={iconSizes[size]} aria-hidden="true" />
    </span>
  );
};

/**
 * Triage-Label ohne Badge (nur Text)
 */
export const TriageLabel: React.FC<{
  level: TriageLevel;
  className?: string;
}> = ({ level, className }) => {
  const config = TRIAGE_CONFIG[level];
  
  return (
    <span
      className={cn('font-semibold', config.color, className)}
      role="status"
      aria-label={`Triage-Level: ${config.label}`}
    >
      {config.label}
    </span>
  );
};
