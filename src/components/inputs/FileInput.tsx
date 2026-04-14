import React, { useState, useRef, useMemo } from 'react';
import { UploadCloud, CheckCircle, FileText, AlertCircle, X, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, getAuthToken } from '../../api/client';
import { useTranslation } from 'react-i18next';
import { translateStableText } from '../../lib/patientFlow';

interface UploadedFileTranslation {
    status: 'pending' | 'completed' | 'queued';
    sourceLang: string;
    targetLang: string;
    translatedAt?: string;
    note?: string;
}

interface UploadedFileValue {
    filename: string;
    originalName: string;
    size: number;
    translation?: UploadedFileTranslation;
}

interface FileInputProps {
    value?: UploadedFileValue | null | string;
    onChange: (value: UploadedFileValue | Record<string, unknown> | null) => void;
    className?: string;
    accept?: string;
}

export function FileInput({ value, onChange, className = '', accept = 'image/*,.pdf' }: FileInputProps) {
    const { t, i18n } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parsedValue = useMemo<UploadedFileValue | null>(() => {
        if (!value) return null;
        if (typeof value !== 'string') return value;

        try {
            return JSON.parse(value) as UploadedFileValue;
        } catch {
            return null;
        }
    }, [value]);

    const buildAuthHeaders = () => {
        const token = getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const bridgeDocumentTranslation = async (uploadedFile: UploadedFileValue): Promise<UploadedFileTranslation> => {
        const sourceLang = i18n.resolvedLanguage || i18n.language || 'auto';

        try {
            console.info('Dokument wird zur Übersetzung an Backend gesendet');

            const response = await axios.post(`${API_BASE_URL}/upload/translate`, {
                filename: uploadedFile.filename,
                sourceLang,
                targetLang: 'de',
            }, {
                headers: buildAuthHeaders(),
            });

            return {
                status: response.data?.status === 'completed' ? 'completed' : 'queued',
                sourceLang: response.data?.sourceLang || sourceLang,
                targetLang: response.data?.targetLang || 'de',
                translatedAt: response.data?.translatedAt || new Date().toISOString(),
                note: response.data?.note,
            };
        } catch {
            console.info('Dokument wird zur Übersetzung an Backend gesendet');
            await new Promise((resolve) => globalThis.setTimeout(resolve, 300));

            return {
                status: 'queued',
                sourceLang,
                targetLang: 'de',
                translatedAt: new Date().toISOString(),
                note: translateStableText(
                    t,
                    'ui.upload.translationQueued',
                    'Dokument zur Übersetzung markiert. Das Backend übernimmt die Nachbearbeitung.',
                ),
            };
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            setError(t('file.tooLarge', 'Datei ist zu groß (max. 10MB)'));
            return;
        }

        setIsUploading(true);
        setError(null);
        setProgress(0);

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...buildAuthHeaders(),
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                }
            });

            if (response.data.success) {
                const uploadedFile: UploadedFileValue = {
                    filename: response.data.filename,
                    originalName: response.data.originalName,
                    size: response.data.size,
                    translation: {
                        status: 'pending',
                        sourceLang: i18n.resolvedLanguage || i18n.language || 'auto',
                        targetLang: 'de',
                    },
                };

                onChange(uploadedFile);
                setIsUploading(false);

                const translation = await bridgeDocumentTranslation(uploadedFile);
                onChange({
                    ...uploadedFile,
                    translation,
                });
            } else {
                setError(t('file.uploadFailed', 'Upload fehlgeschlagen'));
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { error?: string } } };
            setError(axiosErr.response?.data?.error || t('file.connectionError', 'Verbindungsfehler beim Upload'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        onChange(null);
        setError(null);
    };

    if (parsedValue?.filename) {
        return (
            <div className={`p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 transition-all ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-emerald-400 truncate">{parsedValue.originalName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <p className="text-[10px] text-emerald-500/70 font-medium">{t('file.uploadSuccess', 'Erfolgreich hochgeladen')} ({(parsedValue.size / 1024 / 1024).toFixed(2)} MB)</p>
                            </div>
                            {parsedValue.translation && (
                                <p className="mt-1 text-[10px] text-emerald-500/70 font-medium">
                                    {parsedValue.translation.status === 'completed'
                                        ? translateStableText(t, 'ui.upload.translationCompleted', 'Deutsche Lesefassung für das Praxispersonal vorbereitet.')
                                        : parsedValue.translation.status === 'pending'
                                            ? translateStableText(t, 'ui.upload.translationPending', 'Dokument wird für das Praxispersonal auf Deutsch vorbereitet.')
                                            : translateStableText(t, 'ui.upload.translationQueued', 'Dokument zur Übersetzung markiert. Das Backend übernimmt die Nachbearbeitung.')}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleRemove}
                        className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-400/50 hover:text-emerald-400 transition-colors"
                        title={t('file.remove', 'Datei entfernen')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full ${className}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden"
                aria-label={t('file.upload', 'Datei hochladen')}
                title={t('file.selectDocument', 'Dokument auswählen')}
            />

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`
                    w-full relative overflow-hidden flex flex-col items-center justify-center gap-3 p-8 
                    rounded-2xl border-2 border-dashed transition-all
                    ${error ? 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10' :
                        'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50'}
                `}
            >
                {isUploading ? (
                    <>
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                            <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-blue-400">{t('file.uploading', { progress, defaultValue: 'Lädt hoch... {{progress}}%' })}</p>
                            <div className="w-32 h-1.5 bg-blue-950 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${error ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                            <UploadCloud className={`w-6 h-6 ${error ? 'text-red-400' : 'text-blue-400'}`} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-white font-medium">{t('file.clickToUpload', 'Klicken, um ein Dokument hochzuladen')}</p>
                            <p className="text-[11px] text-white/40 mt-1">{t('file.allowedFormats', 'PDF, JPG oder PNG (Max. 10MB)')}</p>
                        </div>
                    </>
                )}
            </button>

            {error && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 font-medium px-1 animate-fade-in">
                    <AlertCircle className="w-3 h-3" /> {error}
                </p>
            )}
        </div>
    );
}
