import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, FileX, Database, Home, ArrowLeft } from 'lucide-react';
import i18n from '../i18n';

type RouteType = 'patient' | 'staff' | 'pwa' | 'admin' | 'default';

interface RouteErrorBoundaryProps {
    children: ReactNode;
    routeType: RouteType;
    fallback?: ReactNode;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorId: string;
}

/**
 * Route-specific error fallback components
 */
function PatientRouteError({ error, errorId, onReset }: { error: Error | null; errorId: string; onReset: () => void }) {
    const isOffline = !navigator.onLine || error?.message?.toLowerCase().includes('network');
    
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6" role="alert" aria-live="polite">
            <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isOffline ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                }`}>
                    {isOffline ? <WifiOff className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                
                <h1 className="text-2xl font-bold mb-4">
                    {isOffline 
                        ? i18n.t('routeError.patient.offlineTitle', 'Sie sind offline')
                        : i18n.t('routeError.patient.title', 'Anmeldung unterbrochen')
                    }
                </h1>
                
                <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                    {isOffline
                        ? i18n.t('routeError.patient.offlineDesc', 'Ihre Antworten wurden lokal gespeichert und werden automatisch übertragen, sobald die Verbindung wiederhergestellt ist.')
                        : i18n.t('routeError.patient.desc', 'Ein Problem ist aufgetreten. Ihr Fortschritt wurde automatisch gespeichert. Sie können später fortfahren.')
                    }
                </p>

                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-[var(--text-muted)] mb-1">{i18n.t('routeError.sessionId', 'Sitzungs-ID')}</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">{errorId}</p>
                </div>
                
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg"
                    >
                        <RefreshCw className="w-5 h-5" />
                        {isOffline ? i18n.t('routeError.retry', 'Erneut versuchen') : i18n.t('routeError.continue', 'Fortsetzen')}
                    </button>
                    
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="flex-1 py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all"
                        >
                            <ArrowLeft className="w-4 h-4 inline mr-2" />
                            {i18n.t('routeError.back', 'Zurück')}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.href = '/'}
                            className="flex-1 py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all"
                        >
                            <Home className="w-4 h-4 inline mr-2" />
                            {i18n.t('routeError.home', 'Start')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StaffRouteError({ error, errorId, onReset }: { error: Error | null; errorId: string; onReset: () => void }) {
    const isDataError = error?.message?.toLowerCase().includes('data') || error?.message?.toLowerCase().includes('fetch');
    
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6" role="alert">
            <div className="max-w-lg w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {isDataError ? <Database className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                    </div>
                    <div className="text-left">
                        <h1 className="text-xl font-bold mb-1">
                            {isDataError
                                ? i18n.t('routeError.staff.dataTitle', 'Daten konnten nicht geladen werden')
                                : i18n.t('routeError.staff.title', 'Dashboard-Fehler')
                            }
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {isDataError
                                ? i18n.t('routeError.staff.dataDesc', 'Die Patientendaten konnten momentan nicht abgerufen werden. Bitte versuchen Sie es erneut.')
                                : i18n.t('routeError.staff.desc', 'Ein technisches Problem ist im Dashboard aufgetreten.')
                            }
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-[var(--text-muted)]">{i18n.t('routeError.errorId', 'Fehler-ID')}</span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(errorId)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            {i18n.t('routeError.copy', 'Kopieren')}
                        </button>
                    </div>
                    <p className="text-sm font-mono text-[var(--text-primary)]">{errorId}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                        {i18n.t('routeError.reload', 'Neu laden')}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = '/verwaltung'}
                        className="flex-1 py-3 px-6 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all"
                    >
                        {i18n.t('routeError.dashboard', 'Zum Dashboard')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PwaRouteError({ error: _error, errorId, onReset }: { error: Error | null; errorId: string; onReset: () => void }) {
    const isOffline = !navigator.onLine;
    const queueCount = parseInt(localStorage.getItem('pwa_pending_queue') || '0', 10);
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6" role="alert">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isOffline ? <WifiOff className="w-8 h-8" /> : <FileX className="w-8 h-8" />}
                </div>
                
                <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
                    {isOffline
                        ? i18n.t('routeError.pwa.offlineTitle', 'Offline-Modus')
                        : i18n.t('routeError.pwa.title', 'Sync-Fehler')
                    }
                </h1>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                    {isOffline
                        ? i18n.t('routeError.pwa.offlineDesc', 'Sie sind offline. Ihre Daten werden synchronisiert, sobald die Verbindung wiederhergestellt ist.')
                        : i18n.t('routeError.pwa.desc', 'Die Synchronisierung konnte nicht abgeschlossen werden.')
                    }
                </p>

                {queueCount > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                            {i18n.t('routeError.pwa.pendingItems', '{{count}} Einträge warten auf Synchronisierung', { count: queueCount })}
                        </p>
                    </div>
                )}

                <div className="text-center mb-6">
                    <p className="text-xs text-gray-400 font-mono">ID: {errorId}</p>
                </div>
                
                <button
                    type="button"
                    onClick={onReset}
                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all"
                >
                    <RefreshCw className="w-5 h-5" />
                    {isOffline ? i18n.t('routeError.checkConnection', 'Verbindung prüfen') : i18n.t('routeError.retrySync', 'Sync wiederholen')}
                </button>
            </div>
        </div>
    );
}

function AdminRouteError({ error: _error, errorId, onReset }: { error: Error | null; errorId: string; onReset: () => void }) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6" role="alert">
            <div className="max-w-lg w-full bg-[var(--bg-card)] border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">{i18n.t('routeError.admin.title', 'Systemfehler')}</h1>
                        <p className="text-sm text-[var(--text-secondary)]">{i18n.t('routeError.admin.subtitle', 'Admin-Bereich')}</p>
                    </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    <p className="text-sm text-red-300 mb-2">{i18n.t('routeError.admin.impact', 'Dieser Fehler kann Systemfunktionen beeinträchtigen.')}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{i18n.t('routeError.errorId', 'Fehler-ID')}: {errorId}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        {i18n.t('routeError.retry', 'Erneut versuchen')}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = '/verwaltung/system'}
                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] font-medium py-3 px-6 rounded-xl transition-all"
                    >
                        {i18n.t('routeError.systemStatus', 'Systemstatus')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DefaultRouteError({ error: _error, errorId, onReset }: { error: Error | null; errorId: string; onReset: () => void }) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6" role="alert">
            <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold mb-4">{i18n.t('routeError.default.title', 'Fehler aufgetreten')}</h1>
                <p className="text-sm text-[var(--text-secondary)] mb-6">{i18n.t('routeError.default.desc', 'Ein unerwartetes Problem ist aufgetreten.')}</p>
                <p className="text-xs text-[var(--text-muted)] mb-6 font-mono">ID: {errorId}</p>
                <button
                    type="button"
                    onClick={onReset}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all"
                >
                    <RefreshCw className="w-5 h-5 inline mr-2" />
                    {i18n.t('routeError.reload', 'Neu laden')}
                </button>
            </div>
        </div>
    );
}

/**
 * RouteErrorBoundary - Provides route-specific error handling
 * 
 * Usage:
 * <RouteErrorBoundary routeType="patient">
 *   <PatientRoutes />
 * </RouteErrorBoundary>
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
    public state: RouteErrorBoundaryState = {
        hasError: false,
        error: null,
        errorId: '',
    };

    public static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
        return {
            hasError: true,
            error,
            errorId: `rte-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[RouteErrorBoundary:${this.props.routeType}]`, error, errorInfo);
        
        // Report to backend
        try {
            fetch('/api/system/error-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errorId: this.state.errorId,
                    routeType: this.props.routeType,
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                }),
            }).catch(() => {});
        } catch {}
    }

    private resetErrorBoundary = () => {
        this.setState({
            hasError: false,
            error: null,
            errorId: '',
        });
    };

    private renderErrorComponent() {
        const { routeType, fallback } = this.props;
        const { error, errorId } = this.state;

        if (fallback) {
            return fallback;
        }

        const props = { error, errorId, onReset: this.resetErrorBoundary };

        switch (routeType) {
            case 'patient':
                return <PatientRouteError {...props} />;
            case 'staff':
                return <StaffRouteError {...props} />;
            case 'pwa':
                return <PwaRouteError {...props} />;
            case 'admin':
                return <AdminRouteError {...props} />;
            default:
                return <DefaultRouteError {...props} />;
        }
    }

    public render() {
        if (this.state.hasError) {
            return this.renderErrorComponent();
        }

        return this.props.children;
    }
}

export default RouteErrorBoundary;
