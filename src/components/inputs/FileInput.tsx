import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, FileText, AlertCircle, X, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, getAuthToken } from '../../api/client';
import { useTranslation } from 'react-i18next';

interface FileInputProps {
    value?: { filename: string; originalName: string; size: number } | null | string;
    onChange: (value: { filename: string; originalName: string; size: number } | Record<string, unknown> | null) => void;
    className?: string;
    accept?: string;
}

export function FileInput({ value, onChange, className = '', accept = 'image/*,.pdf' }: FileInputProps) {
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;

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
            const token = getAuthToken();
            const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                }
            });

            if (response.data.success) {
                onChange(response.data);
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
