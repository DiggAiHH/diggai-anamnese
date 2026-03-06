import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <p className="text-8xl font-black text-[var(--accent)] mb-4 select-none">404</p>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Seite nicht gefunden</h1>
                <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                    Die angeforderte Seite existiert nicht oder wurde verschoben.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Zurück
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Startseite
                    </button>
                </div>
            </div>
        </div>
    );
}
