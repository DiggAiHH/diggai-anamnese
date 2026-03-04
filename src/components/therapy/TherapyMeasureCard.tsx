import React, { useState } from 'react';
import { Pill, Stethoscope, ArrowRightLeft, FlaskConical, ScanLine, Heart, CalendarCheck, FileText, Wrench, ChevronDown, ChevronUp, Check, X, Clock, Play, SkipForward, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    MEDICATION: { label: 'Medikament', icon: <Pill className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
    PROCEDURE: { label: 'Maßnahme', icon: <Stethoscope className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
    REFERRAL: { label: 'Überweisung', icon: <ArrowRightLeft className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950' },
    LAB_ORDER: { label: 'Laborauftrag', icon: <FlaskConical className="w-4 h-4" />, color: 'text-green-600 bg-green-50 dark:bg-green-950' },
    IMAGING: { label: 'Bildgebung', icon: <ScanLine className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
    LIFESTYLE: { label: 'Lifestyle', icon: <Heart className="w-4 h-4" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950' },
    FOLLOW_UP: { label: 'Nachsorge', icon: <CalendarCheck className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950' },
    DOCUMENTATION: { label: 'Dokumentation', icon: <FileText className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800' },
    CUSTOM: { label: 'Sonstige', icon: <Wrench className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PLANNED: { label: 'Geplant', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    IN_PROGRESS: { label: 'Laufend', icon: <Play className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
    COMPLETED: { label: 'Abgeschlossen', icon: <Check className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
    SKIPPED: { label: 'Übersprungen', icon: <SkipForward className="w-3.5 h-3.5" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
    OVERDUE: { label: 'Überfällig', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
};

interface MeasureCardProps {
    measure: any;
    onStatusChange?: (id: string, status: string) => void;
    onApprove?: (id: string) => void;
    onDelete?: (id: string) => void;
    readonly?: boolean;
}

export function TherapyMeasureCard({ measure, onStatusChange, onApprove, onDelete, readonly }: MeasureCardProps) {
    const [expanded, setExpanded] = useState(false);
    const type = TYPE_CONFIG[measure.type] || TYPE_CONFIG.CUSTOM;
    const status = STATUS_CONFIG[measure.status] || STATUS_CONFIG.PLANNED;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-md ${measure.aiSuggested && !measure.arztApproved ? 'ring-2 ring-amber-300 dark:ring-amber-700' : ''}`}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                {/* Type icon */}
                <div className={`p-2 rounded-lg ${type.color}`}>{type.icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{measure.title}</span>
                        {measure.aiSuggested && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">KI</span>
                        )}
                        {measure.arztApproved && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">✓ Arzt</span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{type.label}</span>
                        {measure.dosage && <span>· {measure.dosage}</span>}
                        {measure.duration && <span>· {measure.duration}</span>}
                        {measure.referralTo && <span>· → {measure.referralTo}</span>}
                    </div>
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.icon} {status.label}
                </span>

                {/* Expand toggle */}
                {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
                    {measure.description && <p className="text-sm text-gray-600 dark:text-gray-400">{measure.description}</p>}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {measure.medicationName && <div><span className="text-gray-500">Medikament:</span> {measure.medicationName}</div>}
                        {measure.pzn && <div><span className="text-gray-500">PZN:</span> {measure.pzn}</div>}
                        {measure.atcCode && <div><span className="text-gray-500">ATC:</span> {measure.atcCode}</div>}
                        {measure.referralReason && <div><span className="text-gray-500">Grund:</span> {measure.referralReason}</div>}
                        {measure.referralUrgency && <div><span className="text-gray-500">Dringlichkeit:</span> {measure.referralUrgency}</div>}
                        {measure.labParameters?.length > 0 && <div className="col-span-2"><span className="text-gray-500">Labor:</span> {measure.labParameters.join(', ')}</div>}
                        {measure.scheduledDate && <div><span className="text-gray-500">Geplant:</span> {new Date(measure.scheduledDate).toLocaleDateString('de-DE')}</div>}
                        {measure.dueDate && <div><span className="text-gray-500">Fällig:</span> {new Date(measure.dueDate).toLocaleDateString('de-DE')}</div>}
                        {measure.notes && <div className="col-span-2"><span className="text-gray-500">Notiz:</span> {measure.notes}</div>}
                    </div>

                    {!readonly && (
                        <div className="flex gap-2 pt-1">
                            {onStatusChange && measure.status !== 'COMPLETED' && (
                                <button onClick={() => onStatusChange(measure.id, 'COMPLETED')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                                    <Check className="w-3 h-3 inline mr-1" />Erledigt
                                </button>
                            )}
                            {onStatusChange && measure.status === 'PLANNED' && (
                                <button onClick={() => onStatusChange(measure.id, 'IN_PROGRESS')} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                                    <Play className="w-3 h-3 inline mr-1" />Starten
                                </button>
                            )}
                            {onApprove && measure.aiSuggested && !measure.arztApproved && (
                                <button onClick={() => onApprove(measure.id)} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">
                                    <Check className="w-3 h-3 inline mr-1" />Bestätigen
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={() => onDelete(measure.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 ml-auto">
                                    <X className="w-3 h-3 inline mr-1" />Entfernen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
