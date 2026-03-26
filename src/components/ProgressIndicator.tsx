import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────

interface ProgressIndicatorProps {
  /** Current step (0-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step labels */
  labels?: string[];
  /** Visual variant */
  variant?: 'default' | 'calm' | 'minimal';
  /** Show percentage */
  showPercentage?: boolean;
  /** Custom className */
  className?: string;
}

interface StepDotProps {
  step: number;
  currentStep: number;
  label?: string;
  variant: 'default' | 'calm' | 'minimal';
}

// ─── Step Dot Component ────────────────────────────────

const StepDot = React.memo(function StepDot({ 
  step, 
  currentStep, 
  label, 
  variant 
}: StepDotProps) {
  const isCompleted = step < currentStep;
  const isActive = step === currentStep;
  const isPending = step > currentStep;

  // Calm, trust-building colors
  const variantColors = {
    default: {
      completed: '#81B29A', // Sage green - calming success
      active: '#4A90E2',    // Serene blue - trustworthy
      pending: 'rgba(255,255,255,0.15)',
    },
    calm: {
      completed: '#5A8F76', // Deeper sage
      active: '#5E8B9E',    // Dusty blue
      pending: 'rgba(94,139,158,0.2)',
    },
    minimal: {
      completed: 'var(--text-secondary)',
      active: 'var(--accent)',
      pending: 'var(--border-primary)',
    },
  };

  const colors = variantColors[variant];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Step Circle */}
      <motion.div
        initial={false}
        animate={{
          scale: isActive ? 1.1 : 1,
          backgroundColor: isCompleted 
            ? colors.completed 
            : isActive 
              ? colors.active 
              : 'transparent',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          border-2 transition-colors duration-300
          ${isPending ? 'border-white/20' : 'border-transparent'}
        `}
        style={{
          borderColor: isPending ? colors.pending : undefined,
          boxShadow: isActive 
            ? `0 0 0 4px ${colors.active}20, 0 0 20px ${colors.active}30` 
            : isCompleted 
              ? `0 0 0 2px ${colors.completed}20` 
              : undefined,
        }}
      >
        {isCompleted ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : isActive ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-white"
          />
        ) : (
          <Circle className="w-4 h-4 text-white/30" />
        )}
      </motion.div>

      {/* Label */}
      {label && (
        <motion.span
          initial={false}
          animate={{
            color: isActive 
              ? 'rgb(255,255,255)' 
              : isCompleted 
                ? 'rgba(255,255,255,0.8)' 
                : 'rgba(255,255,255,0.4)',
          }}
          className={`
            text-xs font-medium whitespace-nowrap
            transition-colors duration-300
          `}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
});

// ─── Main Progress Indicator Component ─────────────────

export const ProgressIndicator = React.memo(function ProgressIndicator({
  currentStep,
  totalSteps,
  labels,
  variant = 'default',
  showPercentage = false,
  className = '',
}: ProgressIndicatorProps) {
  const progress = Math.min(100, Math.max(0, ((currentStep + 1) / totalSteps) * 100));

  // Calm progress bar colors
  const progressColors = {
    default: {
      track: 'rgba(44,95,138,0.15)',
      fill: 'linear-gradient(90deg, #4A90E2 0%, #81B29A 100%)',
    },
    calm: {
      track: 'rgba(94,139,158,0.15)',
      fill: 'linear-gradient(90deg, #5E8B9E 0%, #4A90E2 100%)',
    },
    minimal: {
      track: 'var(--border-primary)',
      fill: 'var(--accent)',
    },
  };

  const colors = progressColors[variant];

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="relative mb-6">
        {/* Track */}
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.track }}
        >
          {/* Fill */}
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: colors.fill,
              boxShadow: '0 0 10px rgba(74,144,226,0.3)',
            }}
          />
        </div>

        {/* Percentage Label */}
        {showPercentage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-6 right-0"
          >
            <span className="text-sm font-medium text-white/60">
              {Math.round(progress)}%
            </span>
          </motion.div>
        )}
      </div>

      {/* Step Indicators */}
      <div className="relative">
        {/* Connecting Line */}
        <div 
          className="absolute top-4 left-0 right-0 h-0.5 -translate-y-1/2"
          style={{ backgroundColor: colors.track }}
        >
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ background: colors.fill }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps }, (_, i) => (
            <StepDot
              key={i}
              step={i}
              currentStep={currentStep}
              label={labels?.[i]}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Questionnaire Progress Component ──────────────────

interface QuestionnaireProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  section?: string;
  className?: string;
}

export const QuestionnaireProgress = React.memo(function QuestionnaireProgress({
  currentQuestion,
  totalQuestions,
  section,
  className = '',
}: QuestionnaireProgressProps) {
  const progress = Math.min(100, Math.max(0, (currentQuestion / totalQuestions) * 100));

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {section && (
            <span className="text-sm font-medium text-[#4A90E2]">
              {section}
            </span>
          )}
        </div>
        <span className="text-sm text-white/50">
          {currentQuestion} / {totalQuestions}
        </span>
      </div>

      {/* Progress Bar with Calm Colors */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#4A90E2] to-[#81B29A]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            boxShadow: '0 0 12px rgba(74,144,226,0.4)',
          }}
        />
      </div>

      {/* Calming completion message */}
      {progress >= 100 && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-[#81B29A] mt-2 flex items-center gap-1"
        >
          <CheckCircle className="w-4 h-4" />
          Fast geschafft!
        </motion.p>
      )}
    </div>
  );
});

// ─── Circular Progress Component ───────────────────────

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress = React.memo(function CircularProgress({
  progress,
  size = 60,
  strokeWidth = 4,
  showPercentage = true,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4A90E2" />
            <stop offset="100%" stopColor="#81B29A" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Percentage Label */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
});

export default ProgressIndicator;
