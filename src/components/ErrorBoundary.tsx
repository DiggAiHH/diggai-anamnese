import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import i18n from '../i18n';

export type ErrorSeverity = 'fatal' | 'recoverable' | 'warning';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo, severity: ErrorSeverity) => void;
    onReset?: () => void;
    resetKeys?: Array<string | number>;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    severity: ErrorSeverity;
    errorId: string;
}

/**
 * Determines error severity based on error message and stack trace
 */
function determineErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Network errors are often recoverable
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return 'recoverable';
    }
    
    // Rendering errors are typically fatal
    if (stack.includes('react') && (stack.includes('render') || stack.includes('mount'))) {
        return 'fatal';
    }
    
    // Validation errors are warnings
    if (message.includes('validation') || message.includes('invalid')) {
        return 'warning';
    }
    
    return 'fatal';
}

/**
 * Generates a unique error ID for tracking
 */
function generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class ErrorBoundary extends Component<Props, State> {
    private resetTimeout: ReturnType<typeof setTimeout> | null = null;
    
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        severity: 'fatal',
        errorId: '',
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { 
            hasError: true, 
            error,
            severity: determineErrorSeverity(error),
            errorId: generateErrorId(),
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const severity = determineErrorSeverity(error);
        
        this.setState({ errorInfo, severity });
        
        console.error(`[ErrorBoundary:${this.state.errorId}]`, error, errorInfo);

        // Report to backend with error categorization
        this.reportError(error, errorInfo, severity);
        
        // Call optional onError handler
        this.props.onError?.(error, errorInfo, severity);
    }

    private async reportError(error: Error, errorInfo: ErrorInfo, severity: ErrorSeverity) {
        try {
            await fetch('/api/system/error-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errorId: this.state.errorId,
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    componentName: this.props.componentName,
                    severity,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                }),
            });
        } catch {
            // Silently fail - backend may be down
        }
    }

    public componentDidUpdate(prevProps: Props) {
        // Auto-reset when resetKeys change
        if (this.state.hasError && this.props.resetKeys) {
            const hasKeyChanged = this.props.resetKeys.some(
                (key, index) => key !== prevProps.resetKeys?.[index]
            );
            if (hasKeyChanged) {
                this.resetErrorBoundary();
            }
        }
    }

    public componentWillUnmount() {
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
        }
    }

    private resetErrorBoundary = () => {
        this.props.onReset?.();
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            severity: 'fatal',
            errorId: '',
        });
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    private handleGoBack = () => {
        window.history.back();
    };

    public render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { severity, error, errorId } = this.state;
            const isRecoverable = severity === 'recoverable';
            
            return (
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-primary)] font-sans" role="alert" aria-live="assertive">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                        {/* Error Icon */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                            isRecoverable ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
                        </div>
                        
                        {/* Title */}
                        <h1 className="text-2xl font-bold mb-4 tracking-tight">
                            {isRecoverable 
                                ? i18n.t('errorBoundary.recoverableTitle', 'Verbindungsproblem')
                                : i18n.t('errorBoundary.title', 'Ein Fehler ist aufgetreten')
                            }
                        </h1>
                        
                        {/* Description */}
                        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                            {isRecoverable
                                ? i18n.t('errorBoundary.recoverableDescription', 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.')
                                : i18n.t('errorBoundary.description', 'Die Applikation hat ein unerwartetes Problem festgestellt. Bitte laden Sie die Seite neu, um fortzufahren. Ihr bisheriger Fortschritt wurde (sofern möglich) lokal gesichert.')
                            }
                        </p>

                        {/* Error ID (for support) */}
                        <p className="text-xs text-[var(--text-muted)] mb-6 font-mono">
                            {i18n.t('errorBoundary.errorId', 'Fehler-ID')}: {errorId}
                        </p>
                        
                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {/* Primary Action */}
                            {isRecoverable ? (
                                <button
                                    type="button"
                                    onClick={this.resetErrorBoundary}
                                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <RefreshCw className="w-5 h-5" aria-hidden="true" />
                                    {i18n.t('errorBoundary.retry', 'Erneut versuchen')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={this.handleReload}
                                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <RefreshCw className="w-5 h-5" aria-hidden="true" />
                                    {i18n.t('errorBoundary.reload', 'Seite neu laden')}
                                </button>
                            )}
                            
                            {/* Secondary Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={this.handleGoBack}
                                    className="flex-1 flex justify-center items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] font-medium py-3 px-4 rounded-xl transition-all border border-[var(--border-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                                    {i18n.t('errorBoundary.goBack', 'Zurück')}
                                </button>
                                <button
                                    type="button"
                                    onClick={this.handleGoHome}
                                    className="flex-1 flex justify-center items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] font-medium py-3 px-4 rounded-xl transition-all border border-[var(--border-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <Home className="w-4 h-4" aria-hidden="true" />
                                    {i18n.t('errorBoundary.goHome', 'Startseite')}
                                </button>
                            </div>
                        </div>
                        
                        {/* Dev Mode Error Details */}
                        {error && import.meta.env.DEV && (
                            <details className="mt-8 text-left">
                                <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                                    {i18n.t('errorBoundary.showDetails', 'Technische Details anzeigen')}
                                </summary>
                                <div className="mt-4 bg-black/50 p-4 rounded-xl overflow-auto text-xs text-red-400 font-mono">
                                    <p className="font-bold text-red-300">{error.name}: {error.message}</p>
                                    <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
