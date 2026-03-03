import React, { useState } from 'react';
import { CreditCard, ShoppingCart, CheckCircle, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/client';

interface Service {
    id: string;
    name: string;
    price: number;
    description: string;
}

const SERVICES: Service[] = [
    { id: 'gesund_check', name: 'Gesundheits-Check-up (erweiterter)', price: 69.02, description: 'Erweiterte Vorsorge mit Labordiagnostik über den GKV-Standard hinaus (GOÄ 29, 250, 3550).' },
    { id: 'hautkrebsscreening', name: 'Hautkrebsscreening (Auflichtmikroskopie)', price: 44.85, description: 'Detaillierte Untersuchung auffälliger Muttermale mittels Dermatoskop (GOÄ 750, 612).' },
    { id: 'sono_abdomen', name: 'Ultraschall Bauchorgane (Vorsorge)', price: 46.92, description: 'Sonographie des Abdomens als Vorsorge ohne GKV-Anspruch (GOÄ 410, 420).' },
    { id: 'reisemedizin', name: 'Reisemedizinische Beratung + Impfung', price: 25.00, description: 'Individuelle Beratung inkl. Impfplan für Ihr Reiseziel. Impfstoffkosten separat.' },
    { id: 'labor_erw', name: 'Erweitertes Laborprofil (Vitamine, Schilddrüse)', price: 72.50, description: 'Vitamin D, B12, Ferritin, TSH, fT3/fT4 – häufig gewünschte Werte außerhalb der GKV-Abrechnung.' },
    { id: 'attest', name: 'Ärztliches Attest / Bescheinigung', price: 15.00, description: 'Einfaches ärztliches Attest (z.B. für Sport, Reise, Arbeitgeber).' },
    { id: 'ernaehrung', name: 'Ernährungsberatung (30 Min)', price: 46.92, description: 'Individuelle Ernährungsberatung bei Übergewicht, Diabetes, Unverträglichkeiten (GOÄ 33).' }
];

export const IGelServices: React.FC = () => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (!selected) return;
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`${API_BASE_URL}/payments/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceId: selected, email: 'patient@example.com' })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Checkout failed');
            setCheckoutUrl(data.checkoutUrl);
        } catch (err) {
            const msg = err instanceof Error ? err.message : t('igel.unknownError', 'Unbekannter Fehler');
            setError(msg);
            console.error('[IGelServices] Checkout error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (checkoutUrl) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-fade-in">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('Checkout bereit')}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">{t('checkoutRedirect', 'Sie werden nun zum sicheren Zahlungsanbieter weitergeleitet.')}</p>
                <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-xl shadow-emerald-500/20"
                >
                    {t('Zahlung starten')}
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                    <ShoppingCart className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('Zusatzleistungen (IGeL)')}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{t('igelSubtitle', 'Optionale Leistungen, die wir Ihnen direkt in der Praxis anbieten. Preise nach GOÄ.')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SERVICES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelected(s.id)}
                        className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${selected === s.id
                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                                : 'bg-[var(--bg-card)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-[var(--text-primary)]">{s.name}</h4>
                            <span className="text-blue-400 font-bold whitespace-nowrap">{s.price.toFixed(2)} €</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed pr-4">{s.description}</p>

                        {selected === s.id && (
                            <div className="absolute top-2 right-2">
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-8 p-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-relaxed">
                    {t('igel.disclaimer', 'Hinweis: Dies sind Privatleistungen nach GOÄ. Die Abrechnung erfolgt direkt über unseren Zahlungsdienstleister. Nach erfolgreicher Zahlung erhalten Sie eine Bestätigung und wir bereiten alles für Ihren Termin vor.')}
                </p>
            </div>

            {selected && (
                <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full mt-4 flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 scale-100 active:scale-95"
                >
                    <CreditCard className="w-5 h-5" />
                    {loading ? t('Sichere Verbindung...') : t('Sicher bezahlen')}
                </button>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
            )}
        </div>
    );
};
