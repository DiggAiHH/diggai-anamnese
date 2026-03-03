import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
    canGoBack: boolean;
    canGoForward: boolean;
    isLastQuestion: boolean;
    isSubmitting: boolean;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
}

export function Navigation({
    canGoBack,
    canGoForward,
    isLastQuestion,
    isSubmitting,
    onBack,
    onNext,
    onSubmit
}: NavigationProps) {
    const { t } = useTranslation();
    return (
        <div className="flex justify-between items-center mt-8">
            <button
                type="button"
                onClick={onBack}
                disabled={!canGoBack}
                className="btn-secondary flex items-center gap-2 disabled:opacity-30"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('navigation.back', 'Zurück')}
            </button>

            {isLastQuestion ? (
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="btn-primary flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t('navigation.sending', 'Wird gesendet...')}
                        </>
                    ) : (
                        <>
                            {t('navigation.submit', 'Absenden')}
                            <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canGoForward}
                    className="btn-primary flex items-center gap-2"
                >
                    {t('navigation.next', 'Weiter')}
                    <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
