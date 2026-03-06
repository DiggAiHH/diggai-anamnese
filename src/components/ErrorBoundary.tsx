import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '../i18n';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in ErrorBoundary:', error, errorInfo);

        // Non-blocking error report to backend
        try {
            fetch('/api/system/error-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                }),
            }).catch(() => { /* Ignore — backend may be down */ });
        } catch { /* Ignore */ }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-primary)] font-sans">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold mb-4 tracking-tight">{i18n.t('errorBoundary.title', 'Ein Fehler ist aufgetreten')}</h1>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                            {i18n.t('errorBoundary.description', 'Die Applikation hat ein unerwartetes Problem festgestellt. Bitte laden Sie die Seite neu, um fortzufahren. Ihr bisheriger Fortschritt wurde (sofern möglich) lokal gesichert.')}
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95"
                        >
                            <RefreshCw className="w-5 h-5" />
                            {i18n.t('errorBoundary.reload', 'Seite neu laden')}
                        </button>
                        {this.state.error && import.meta.env.DEV && (
                            <div className="mt-8 text-left bg-black/50 p-4 rounded-xl overflow-auto text-xs text-red-400 font-mono">
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
