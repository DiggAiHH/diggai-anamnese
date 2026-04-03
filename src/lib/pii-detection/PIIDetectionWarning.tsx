/**
 * PII Detection Warning Component
 * 
 * Displays a warning when PII is detected in voice/text input.
 * Allows users to review and confirm before submitting.
 */

import React from 'react';
import { AlertTriangle, X, User, MapPin, Calendar, Phone, Mail, CreditCard } from 'lucide-react';
import type { PIIDetectionResult, PIIType } from './german-pii-patterns';

export interface PIIDetectionWarningProps {
  /** Detected PII items */
  detections: PIIDetectionResult[];
  /** Whether warning is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm/submit handler */
  onConfirm: () => void;
  /** Cancel/edit handler */
  onCancel: () => void;
  /** Custom title text */
  title?: string;
  /** Custom confirm button text */
  confirmText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Additional CSS classes */
  className?: string;
}

const PII_ICONS: Record<PIIType, React.ReactNode> = {
  NAME: <User className="w-5 h-5" />,
  ADDRESS: <MapPin className="w-5 h-5" />,
  POSTAL_CODE: <MapPin className="w-5 h-5" />,
  CITY: <MapPin className="w-5 h-5" />,
  BIRTHDATE: <Calendar className="w-5 h-5" />,
  PHONE: <Phone className="w-5 h-5" />,
  EMAIL: <Mail className="w-5 h-5" />,
  IBAN: <CreditCard className="w-5 h-5" />,
  INSURANCE_NUMBER: <CreditCard className="w-5 h-5" />,
  ID_CARD: <CreditCard className="w-5 h-5" />
};

const PII_LABELS_DE: Record<PIIType, string> = {
  NAME: 'Name',
  ADDRESS: 'Adresse',
  POSTAL_CODE: 'Postleitzahl',
  CITY: 'Ort',
  BIRTHDATE: 'Geburtsdatum',
  PHONE: 'Telefonnummer',
  EMAIL: 'E-Mail',
  IBAN: 'IBAN',
  INSURANCE_NUMBER: 'Krankenversicherungsnummer',
  ID_CARD: 'Ausweisnummer'
};

const CONFIDENCE_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
};

const CONFIDENCE_LABELS_DE = {
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig'
};

/**
 * Masks PII value for display (shows first/last 2 chars)
 */
function maskValue(value: string): string {
  if (value.length <= 4) return '***';
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
}

/**
 * Groups detections by type for display
 */
function groupByType(detections: PIIDetectionResult[]): Map<PIIType, PIIDetectionResult[]> {
  const grouped = new Map<PIIType, PIIDetectionResult[]>();
  
  for (const detection of detections) {
    const existing = grouped.get(detection.type) || [];
    existing.push(detection);
    grouped.set(detection.type, existing);
  }
  
  return grouped;
}

export const PIIDetectionWarning: React.FC<PIIDetectionWarningProps> = ({
  detections,
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title = 'Persönliche Daten erkannt',
  confirmText = 'Trotzdem senden',
  cancelText = 'Bearbeiten',
  className = ''
}) => {
  if (!isOpen || detections.length === 0) return null;
  
  const grouped = groupByType(detections);
  const highConfidenceCount = detections.filter(d => d.confidence === 'high').length;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${className}`}>
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {detections.length} Datenelement(e) mit {highConfidenceCount} hoher Konfidenz
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600">
            In Ihrer Eingabe wurden möglicherweise persönliche Daten erkannt. 
            Bitte überprüfen Sie, ob Sie diese wirklich senden möchten:
          </p>
          
          {/* Detection list */}
          <div className="space-y-2">
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div 
                key={type}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-600">{PII_ICONS[type]}</span>
                  <span className="font-medium text-gray-900">{PII_LABELS_DE[type]}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {items.length}x erkannt
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {items.map((item, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${CONFIDENCE_COLORS[item.confidence]}`}
                      title={`Konfidenz: ${CONFIDENCE_LABELS_DE[item.confidence]}`}
                    >
                      {maskValue(item.value)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Privacy note */}
          <div className="p-3 text-xs text-gray-500 bg-blue-50 rounded-lg border border-blue-100">
            <strong>Datenschutzhinweis:</strong> Diese Daten werden lokal auf Ihrem Gerät verarbeitet 
            und nicht an externe Server gesendet. Die Erkennung erfolgt offline.
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact inline warning badge for PII detection
 */
export interface PIIWarningBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export const PIIWarningBadge: React.FC<PIIWarningBadgeProps> = ({
  count,
  onClick,
  className = ''
}) => {
  if (count === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-full hover:bg-amber-200 transition-colors ${className}`}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      {count} Datenelement(e)
    </button>
  );
};

export default PIIDetectionWarning;
