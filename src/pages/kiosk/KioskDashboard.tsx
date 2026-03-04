// ─── Kiosk Dashboard ───────────────────────────────────────
// Modul 7/8: Lobby kiosk mode — locked, auto-reset, large touch targets

import { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, RefreshCw, QrCode, Wifi, WifiOff, Clock, Users, Globe, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

type KioskView = 'home' | 'checkin' | 'status' | 'success' | 'error';

const INACTIVITY_TIMEOUT = 60_000; // 60s auto-reset
const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

interface KioskState {
  view: KioskView;
  sessionCode: string;
  language: string;
  queuePosition: number | null;
  patientName: string;
  isOnline: boolean;
  currentTime: string;
}

export function KioskDashboard() {
  const [state, setState] = useState<KioskState>({
    view: 'home',
    sessionCode: '',
    language: 'de',
    queuePosition: null,
    patientName: '',
    isOnline: navigator.onLine,
  currentTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const clockRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-reset on inactivity
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState(s => ({ ...s, view: 'home', sessionCode: '', queuePosition: null, patientName: '' }));
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetTimer();
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    resetTimer();

    // Clock update
    clockRef.current = setInterval(() => {
      setState(s => ({
        ...s,
        currentTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        isOnline: navigator.onLine,
      }));
    }, 10_000);

    // Online/offline
    const onOnline = () => setState(s => ({ ...s, isOnline: true }));
    const onOffline = () => setState(s => ({ ...s, isOnline: false }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [resetTimer]);

  const t = useCallback((de: string, en: string) => state.language === 'de' ? de : en, [state.language]);

  const handleCheckin = async () => {
    if (!state.sessionCode.trim()) return;
    setState(s => ({ ...s, view: 'status' }));

    // Simulate check-in (would call API in production)
    await new Promise(r => setTimeout(r, 1500));

    const success = state.sessionCode.length >= 4;
    if (success) {
      setState(s => ({
        ...s,
        view: 'success',
        queuePosition: Math.floor(Math.random() * 8) + 1,
        patientName: 'Patient',
      }));
    } else {
      setState(s => ({ ...s, view: 'error' }));
    }
  };

  const goHome = () => setState(s => ({ ...s, view: 'home', sessionCode: '', queuePosition: null }));

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-800">DiggAI Kiosk</span>
        </div>
        <div className="flex items-center gap-6 text-lg">
          <span className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            {state.currentTime}
          </span>
          {state.isOnline ? (
            <span className="flex items-center gap-1 text-green-600"><Wifi className="w-5 h-5" /> Online</span>
          ) : (
            <span className="flex items-center gap-1 text-red-500"><WifiOff className="w-5 h-5" /> Offline</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {state.view === 'home' && (
          <div className="w-full max-w-2xl space-y-8">
            <h1 className="text-4xl font-bold text-center text-gray-800">
              {t('Willkommen in unserer Praxis', 'Welcome to our Practice')}
            </h1>
            <p className="text-xl text-center text-gray-500">
              {t('Bitte melden Sie sich an', 'Please check in below')}
            </p>

            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => setState(s => ({ ...s, view: 'checkin' }))}
                className="flex items-center justify-between p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-400 active:scale-[0.98]"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-semibold text-gray-800">{t('Check-in mit Code', 'Check in with Code')}</p>
                    <p className="text-lg text-gray-500">{t('Geben Sie Ihren Sitzungscode ein', 'Enter your session code')}</p>
                  </div>
                </div>
                <ChevronRight className="w-8 h-8 text-gray-400" />
              </button>

              <button
                onClick={() => setState(s => ({ ...s, view: 'checkin' }))}
                className="flex items-center justify-between p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-green-400 active:scale-[0.98]"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-semibold text-gray-800">{t('NFC Check-in', 'NFC Check-in')}</p>
                    <p className="text-lg text-gray-500">{t('Halten Sie Ihre Karte an das Lesegerät', 'Hold your card to the reader')}</p>
                  </div>
                </div>
                <ChevronRight className="w-8 h-8 text-gray-400" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Globe className="w-5 h-5 text-gray-400" />
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setState(s => ({ ...s, language: lang.code }))}
                  className={`px-4 py-2 rounded-lg text-lg transition-all ${
                    state.language === lang.code
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {lang.flag} {lang.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.view === 'checkin' && (
          <div className="w-full max-w-lg space-y-8">
            <h2 className="text-3xl font-bold text-center text-gray-800">
              {t('Sitzungscode eingeben', 'Enter Session Code')}
            </h2>

            <input
              type="text"
              value={state.sessionCode}
              onChange={e => setState(s => ({ ...s, sessionCode: e.target.value.toUpperCase() }))}
              placeholder={t('z.B. AB12-CD34', 'e.g. AB12-CD34')}
              className="w-full text-center text-4xl font-mono tracking-widest p-6 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none"
              autoFocus
              maxLength={12}
            />

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9','←','0','✓'].map(key => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === '←') setState(s => ({ ...s, sessionCode: s.sessionCode.slice(0, -1) }));
                    else if (key === '✓') handleCheckin();
                    else setState(s => ({ ...s, sessionCode: s.sessionCode + key }));
                  }}
                  className={`p-6 text-3xl font-bold rounded-xl transition-all active:scale-95 ${
                    key === '✓'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : key === '←'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-white text-gray-800 hover:bg-gray-100 shadow'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              onClick={goHome}
              className="w-full p-4 text-xl text-gray-500 hover:text-gray-700"
            >
              {t('← Zurück', '← Back')}
            </button>
          </div>
        )}

        {state.view === 'status' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-2xl text-gray-600">{t('Wird geprüft...', 'Checking...')}</p>
          </div>
        )}

        {state.view === 'success' && (
          <div className="w-full max-w-lg text-center space-y-8">
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-green-700">
              {t('Erfolgreich angemeldet!', 'Successfully checked in!')}
            </h2>
            <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
              <p className="text-xl text-gray-600">{t('Ihre Warteposition', 'Your queue position')}</p>
              <p className="text-7xl font-bold text-blue-600">{state.queuePosition}</p>
              <p className="text-lg text-gray-500">
                {t('Geschätzte Wartezeit: ca. ', 'Estimated wait: approx. ')}
                {(state.queuePosition || 1) * 8} min
              </p>
            </div>
            <button
              onClick={goHome}
              className="w-full p-5 bg-blue-600 text-white text-xl font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              {t('Fertig', 'Done')}
            </button>
          </div>
        )}

        {state.view === 'error' && (
          <div className="w-full max-w-lg text-center space-y-8">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-14 h-14 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-red-700">
              {t('Code nicht gefunden', 'Code not found')}
            </h2>
            <p className="text-xl text-gray-500">
              {t('Bitte überprüfen Sie Ihren Code und versuchen Sie es erneut.',
                 'Please check your code and try again.')}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setState(s => ({ ...s, view: 'checkin', sessionCode: '' }))}
                className="w-full p-5 bg-blue-600 text-white text-xl font-semibold rounded-xl hover:bg-blue-700"
              >
                {t('Erneut versuchen', 'Try again')}
              </button>
              <button onClick={goHome} className="w-full p-4 text-lg text-gray-500 hover:text-gray-700">
                {t('← Startseite', '← Home')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-3 bg-white/60 backdrop-blur text-center text-sm text-gray-400 flex items-center justify-between">
        <span>DiggAI Anamnese v3.0</span>
        <button onClick={goHome} className="flex items-center gap-2 text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-4 h-4" /> {t('Zurücksetzen', 'Reset')}
        </button>
      </footer>
    </div>
  );
}

export default KioskDashboard;
