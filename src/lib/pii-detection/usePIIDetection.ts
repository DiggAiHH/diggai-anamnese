/**
 * React Hook for PII Detection in Voice Input
 * 
 * Provides real-time PII detection with warning capabilities for German text.
 * Optimized for voice transcription input.
 * 
 * @module usePIIDetection
 * @example
 * ```tsx
 * const { detections, hasPII, warning, analyzeText } = usePIIDetection({
 *   onPIIDetected: (items) => console.log('PII found:', items),
 *   warnThreshold: 'medium'
 * });
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import {
  detectGermanPII,
  containsGermanPII,
  type PIIDetectionResult,
  type PIIDetectionOptions,
  type PIIType
} from './german-pii-patterns';

export interface UsePIIDetectionOptions {
  /** Minimum confidence level to trigger warning */
  warnThreshold?: 'low' | 'medium' | 'high';
  /** Callback when PII is detected */
  onPIIDetected?: (detections: PIIDetectionResult[]) => void;
  /** Callback when warning state changes */
  onWarningChange?: (hasWarning: boolean, detections: PIIDetectionResult[]) => void;
  /** Custom detection options */
  detectionOptions?: PIIDetectionOptions;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export interface UsePIIDetectionReturn {
  /** All detected PII items */
  detections: PIIDetectionResult[];
  /** Whether any PII was detected */
  hasPII: boolean;
  /** High/medium confidence detections that should trigger warning */
  warningDetections: PIIDetectionResult[];
  /** Whether warning should be shown */
  showWarning: boolean;
  /** Warning message text */
  warningMessage: string;
  /** Analyze text for PII */
  analyzeText: (text: string) => void;
  /** Reset detection state */
  reset: () => void;
  /** Get formatted warning text */
  getWarningText: () => string;
  /** Check specific PII type presence */
  hasPIIType: (type: PIIType) => boolean;
  /** Get detections by type */
  getDetectionsByType: (type: PIIType) => PIIDetectionResult[];
}

const CONFIDENCE_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1
};

const THRESHOLD_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1
};

/**
 * Generates user-friendly warning message
 */
function generateWarningMessage(detections: PIIDetectionResult[]): string {
  if (detections.length === 0) return '';
  
  const typeLabels: Record<PIIType, string> = {
    NAME: 'Namen',
    ADDRESS: 'Adresse',
    POSTAL_CODE: 'Postleitzahl',
    CITY: 'Stadt',
    BIRTHDATE: 'Geburtsdatum',
    PHONE: 'Telefonnummer',
    EMAIL: 'E-Mail-Adresse',
    IBAN: 'IBAN',
    INSURANCE_NUMBER: 'Versicherungsnummer',
    ID_CARD: 'Ausweisnummer'
  };
  
  const types = [...new Set(detections.map(d => d.type))];
  const typeNames = types.map(t => typeLabels[t] || t).join(', ');
  
  if (detections.length === 1) {
    return `Möglicherweise wurde ${typeNames} erkannt. Möchten Sie diese Information wirklich senden?`;
  }
  
  return `Möglicherweise wurden folgende persönliche Daten erkannt: ${typeNames}. Möchten Sie diese Informationen wirklich senden?`;
}

/**
 * React hook for PII detection
 */
export function usePIIDetection(
  options: UsePIIDetectionOptions = {}
): UsePIIDetectionReturn {
  const {
    warnThreshold = 'medium',
    onPIIDetected,
    onWarningChange,
    detectionOptions = {},
    debounceMs = 300
  } = options;
  
  const [detections, setDetections] = useState<PIIDetectionResult[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Filter detections based on threshold
  const warningDetections = useMemo(() => {
    const thresholdWeight = THRESHOLD_WEIGHT[warnThreshold];
    return detections.filter(d => CONFIDENCE_WEIGHT[d.confidence] >= thresholdWeight);
  }, [detections, warnThreshold]);
  
  const showWarning = warningDetections.length > 0;
  const hasPII = detections.length > 0;
  const warningMessage = useMemo(() => generateWarningMessage(warningDetections), [warningDetections]);
  
  // Analyze text with debouncing
  const analyzeText = useCallback((text: string) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      const newDetections = detectGermanPII(text, detectionOptions);
      setDetections(newDetections);
      
      if (newDetections.length > 0 && onPIIDetected) {
        onPIIDetected(newDetections);
      }
      
      const newWarningDetections = newDetections.filter(
        d => CONFIDENCE_WEIGHT[d.confidence] >= THRESHOLD_WEIGHT[warnThreshold]
      );
      
      if (onWarningChange) {
        onWarningChange(newWarningDetections.length > 0, newWarningDetections);
      }
    }, debounceMs);
    
    setDebounceTimer(timer);
  }, [debounceMs, detectionOptions, warnThreshold, onPIIDetected, onWarningChange, debounceTimer]);
  
  // Reset state
  const reset = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    setDetections([]);
    if (onWarningChange) {
      onWarningChange(false, []);
    }
  }, [debounceTimer, onWarningChange]);
  
  // Get formatted warning text
  const getWarningText = useCallback(() => {
    if (warningDetections.length === 0) return '';
    
    const lines = warningDetections.map(d => {
      const masked = d.value.substring(0, 2) + '***' + d.value.substring(d.value.length - 2);
      return `- ${d.type}: "${masked}" (Konfidenz: ${d.confidence})`;
    });
    
    return ['Folgende persönliche Daten wurden erkannt:', ...lines].join('\n');
  }, [warningDetections]);
  
  // Check if specific type present
  const hasPIIType = useCallback((type: PIIType) => {
    return detections.some(d => d.type === type);
  }, [detections]);
  
  // Get detections by type
  const getDetectionsByType = useCallback((type: PIIType) => {
    return detections.filter(d => d.type === type);
  }, [detections]);
  
  return {
    detections,
    hasPII,
    warningDetections,
    showWarning,
    warningMessage,
    analyzeText,
    reset,
    getWarningText,
    hasPIIType,
    getDetectionsByType
  };
}

/**
 * Simple hook for boolean PII check
 */
export function useHasPII(options: PIIDetectionOptions = {}): {
  hasPII: boolean;
  checkText: (text: string) => boolean;
} {
  const [hasPII, setHasPII] = useState(false);
  
  const checkText = useCallback((text: string) => {
    const result = containsGermanPII(text, options);
    setHasPII(result);
    return result;
  }, [options]);
  
  return { hasPII, checkText };
}

export default usePIIDetection;
