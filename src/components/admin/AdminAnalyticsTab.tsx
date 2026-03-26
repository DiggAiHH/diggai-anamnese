import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, Euro, TrendingUp, MessageSquare, BrainCircuit, RefreshCw } from 'lucide-react';

export const AdminAnalyticsTab: React.FC = () => {
    const { t } = useTranslation();

    // Mock-Daten für die Anzeige
    const roiStats = {
        patientsServed: 124,
        sessionsCompleted: 110,
        mfaMinutesSaved: 1320, // 22 Stunden
        estimatedCostSaving: 495, // 22h * 22.50€
        chatbotSuccessRate: '92%',
        faqGenerated: 3,
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h2 className="text-xl font-black text-white">{t('arzt.analytics', 'Analytics & ROI Dashboard')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">{t('arzt.timeSaved', 'Zeit gespart')}</h3>
                    </div>
                    <p className="text-3xl font-black text-white">{Math.round(roiStats.mfaMinutesSaved / 60)}h</p>
                    <p className="text-xs text-emerald-400 mt-2">Diesen Monat</p>
                </div>
                
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                        <Euro className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">{t('arzt.costSaved', 'Kosten gespart')}</h3>
                    </div>
                    <p className="text-3xl font-black text-white">{roiStats.estimatedCostSaving} €</p>
                    <p className="text-xs text-blue-400 mt-2">Diesen Monat</p>
                </div>

                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">{t('arzt.chatbotSuccess', 'KI Chatbot')}</h3>
                    </div>
                    <p className="text-3xl font-black text-white">{roiStats.chatbotSuccessRate}</p>
                    <p className="text-xs text-purple-400 mt-2">Erfolgsquote ohne Eskalation</p>
                </div>

                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                        <BrainCircuit className="w-5 h-5 text-orange-400" />
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">{t('arzt.faqGenerated', 'Generierte FAQs')}</h3>
                    </div>
                    <p className="text-3xl font-black text-white">{roiStats.faqGenerated}</p>
                    <p className="text-xs text-orange-400 mt-2">Aus Chat & Telefonanfragen</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-white/40" /> 
                        {t('arzt.requestTimeline', 'Anfragen-Zeitachse (Woche)')}
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2 border-b border-white/10 pb-4 pt-4">
                        {/* Mock Chart */}
                        {[35, 42, 28, 55, 48, 12, 5].map((val, i) => (
                            <div key={i} className="w-full flex flex-col items-center gap-2">
                                <div className="w-full bg-blue-500/50 rounded-t-sm" style={{ height: `${val}%` }} />
                                <span className="text-[10px] text-white/40">Mo-So</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-emerald-400" /> 
                        {t('arzt.systemInsights', 'System Insights')}
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-orange-400 mb-1">Neues FAQ erkannt</p>
                            <p className="text-sm text-white/80">"Wann sind die besten Zeiten für telefonische Krankschreibung?" wurde diese Woche 14x gefragt.</p>
                            <button className="mt-3 text-xs bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg">Zum Chatbot hinzufügen</button>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-blue-400 mb-1">Tomedo Re-Sync nötig</p>
                            <p className="text-sm text-white/80">3 Patientenakten haben asynchrone Versicherungsnummern.</p>
                            <button className="mt-3 text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <RefreshCw className="w-3 h-3" /> Sync starten
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
