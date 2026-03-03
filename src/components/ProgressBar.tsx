import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
    progress: number;
    currentStep: number;
    totalSteps: number;
    colorClass?: string;
}

export function ProgressBar({ progress, currentStep, totalSteps, colorClass = 'text-blue-500' }: ProgressBarProps) {
    const { t } = useTranslation();

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-400">{t('Fortschritt')}</span>
                <span className="text-sm font-medium text-gray-400">
                    {t('Frage')} {currentStep} {t('von')} {totalSteps}
                </span>
            </div>
            <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`${t('Fortschritt')}: ${Math.round(progress)}%`}>
                <div
                    className={`progress-bar-fill ${colorClass}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            <div className="text-right mt-1">
                <span className={`text-xs font-semibold ${colorClass}`}>{Math.round(progress)}%</span>
            </div>
        </div>
    );
}
