import { useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Bell,
  Shield,
  Smartphone,
  Lock,
  LogOut,
  Globe,
  ChevronRight,
  Loader2,
  Check,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  usePwaProfile,
  usePwaSettings,
  usePwaUpdateSettings,
  usePwaConsents,
  usePwaUpdateConsents,
  usePwaDevices,
  usePwaChangePassword,
  usePwaSetPin,
} from '../../hooks/useApi';
import { usePwaStore } from '../../stores/pwaStore';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
] as const;

type Section = 'profile' | 'notifications' | 'consents' | 'devices' | 'security' | 'language' | null;

/* ── Module-level helper components ── */

function SectionHeader({
  icon: Icon,
  label,
  section,
  color,
  expanded,
  onToggle,
}: {
  icon: ElementType;
  label: string;
  section: Section;
  color: string;
  expanded: Section;
  onToggle: (s: Section) => void;
}) {
  return (
    <button
      onClick={() => onToggle(section)}
      className="w-full rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 text-left">{label}</span>
      <ChevronRight
        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${expanded === section ? 'rotate-90' : ''}`}
      />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-200 truncate ml-4 text-right">{value}</span>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked="true"
        aria-label={label}
        onClick={onChange}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function consentLabel(type: string): string {
  const map: Record<string, string> = {
    DATA_PROCESSING: 'Datenverarbeitung',
    RESEARCH: 'Forschungsteilnahme',
    MARKETING: 'Marketing-Kommunikation',
    THIRD_PARTY: 'Weitergabe an Dritte',
    ANALYTICS: 'Analysen & Statistiken',
    TERMS: 'Nutzungsbedingungen',
    PRIVACY: 'Datenschutzerklärung',
  };
  return map[type] ?? type;
}

/* ── Main component ── */

export default function PwaSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = usePwaStore((s) => s.logout);

  const profile = usePwaProfile();
  const settings = usePwaSettings();
  const updateSettings = usePwaUpdateSettings();
  const consents = usePwaConsents();
  const updateConsents = usePwaUpdateConsents();
  const devices = usePwaDevices();
  const changePassword = usePwaChangePassword();
  const setPin = usePwaSetPin();

  const [expanded, setExpanded] = useState<Section>(null);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // PIN form
  const [pin, setPinValue] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData: any = (profile.data as any)?.data ?? (profile.data as any) ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settingsData: any = (settings.data as any)?.data ?? (settings.data as any) ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consentList: any[] = (consents.data as any)?.data ?? (consents.data as any) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceList: any[] = (devices.data as any)?.data ?? (devices.data as any) ?? [];

  const toggle = (section: Section) => setExpanded(expanded === section ? null : section);

  const handleNotificationToggle = async (key: string, current: boolean) => {
    try {
      await updateSettings.mutateAsync({ [key]: !current });
    } catch {
      /* handled */
    }
  };

  const handleConsentToggle = async (type: string, currentGranted: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = consentList.map((c: any) =>
      c.type === type ? { type: c.type, granted: !currentGranted } : { type: c.type, granted: c.granted }
    );
    try {
      await updateConsents.mutateAsync(updated);
    } catch {
      /* handled */
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || newPassword.length < 8) return;
    setPwSuccess(false);
    try {
      await changePassword.mutateAsync({ oldPassword, newPassword });
      setPwSuccess(true);
      setOldPassword('');
      setNewPassword('');
    } catch {
      /* handled */
    }
  };

  const handleSetPin = async () => {
    if (!pin || pin.length < 4) return;
    setPinSuccess(false);
    try {
      await setPin.mutateAsync(pin);
      setPinSuccess(true);
      setPinValue('');
    } catch {
      /* handled */
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/pwa/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* ── Header ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('pwa.nav.settings')}
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('Sicherheit')}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* ────────────── Profile ────────────── */}
        <SectionHeader icon={User} label={t('Persönliche Daten')} section="profile" color="bg-sky-100 text-sky-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'profile' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-3 ml-1">
            {profile.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
            ) : (
              <>
                <InfoRow label={t('certify.patient_number')} value={profileData.patientNumber ?? '–'} />
                <InfoRow label={t('E-Mail-Adresse')} value={profileData.email ?? '–'} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('Identität bestätigt')}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      profileData.emailVerified
                        ? 'bg-green-50 text-green-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {profileData.emailVerified ? (
                      <>
                        <Check className="w-3 h-3" /> {t('Ja')}
                      </>
                    ) : (
                      t('Nein')
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────────── Notifications ────────────── */}
        <SectionHeader icon={Bell} label={t('Benachrichtigungen')} section="notifications" color="bg-amber-100 text-amber-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'notifications' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-4 ml-1">
            {settings.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
            ) : (
              <>
                <ToggleRow
                  label={t('E-Mail-Benachrichtigungen')}
                  checked={!!settingsData.emailNotifications}
                  onChange={() => handleNotificationToggle('emailNotifications', !!settingsData.emailNotifications)}
                  disabled={updateSettings.isPending}
                />
                <ToggleRow
                  label={t('Push-Benachrichtigungen')}
                  checked={!!settingsData.pushNotifications}
                  onChange={() => handleNotificationToggle('pushNotifications', !!settingsData.pushNotifications)}
                  disabled={updateSettings.isPending}
                />
                <ToggleRow
                  label={t('SMS-Benachrichtigungen')}
                  checked={!!settingsData.smsNotifications}
                  onChange={() => handleNotificationToggle('smsNotifications', !!settingsData.smsNotifications)}
                  disabled={updateSettings.isPending}
                />
              </>
            )}
          </div>
        )}

        {/* ────────────── Consents ────────────── */}
        <SectionHeader icon={Shield} label={t('Datenschutz-Einwilligung')} section="consents" color="bg-emerald-100 text-emerald-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'consents' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-4 ml-1">
            {consents.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
            ) : consentList.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center py-2">{t('Keine')}</p>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              consentList.map((c: any) => (
                <ToggleRow
                  key={c.type}
                  label={t(consentLabel(c.type))}
                  checked={!!c.granted}
                  onChange={() => handleConsentToggle(c.type, !!c.granted)}
                  disabled={updateConsents.isPending}
                />
              ))
            )}
          </div>
        )}

        {/* ────────────── Devices ────────────── */}
        <SectionHeader icon={Smartphone} label={t('Shunt / Dialysezugang')} section="devices" color="bg-violet-100 text-violet-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'devices' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-3 ml-1">
            {devices.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
            ) : deviceList.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center py-2">{t('Keine')}</p>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deviceList.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{d.deviceName ?? d.name ?? t('Unbekannt')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{d.deviceType ?? d.type ?? '–'}</p>
                  </div>
                  <button
                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                    aria-label={t('Entfernen')}
                    title={t('Entfernen')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ────────────── Security ────────────── */}
        <SectionHeader icon={Lock} label={t('Sicherheit')} section="security" color="bg-red-100 text-red-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'security' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-5 ml-1">
            {/* Change password */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Passwort ändern')}</h3>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t('Aktuelles Passwort')}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400"
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('Neues Passwort (min. 8 Zeichen)')}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={!oldPassword || newPassword.length < 8 || changePassword.isPending}
                className="w-full rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('Passwort ändern')}
              </button>
              {pwSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('Passwort erfolgreich geändert.')}
                </p>
              )}
              {changePassword.isError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {t('Fehler beim Ändern des Passworts.')}
                </p>
              )}
            </div>

            {/* PIN */}
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('PIN festlegen')}</h3>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                placeholder={t('PIN festlegen')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <button
                onClick={handleSetPin}
                disabled={pin.length < 4 || setPin.isPending}
                className="w-full rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {setPin.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('PIN speichern')}
              </button>
              {pinSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('PIN erfolgreich gespeichert.')}
                </p>
              )}
              {setPin.isError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {t('Fehler beim Speichern der PIN.')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ────────────── Language ────────────── */}
        <SectionHeader icon={Globe} label={t('Sprache wechseln')} section="language" color="bg-indigo-100 text-indigo-600" expanded={expanded} onToggle={toggle} />
        {expanded === 'language' && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 space-y-1 ml-1">
            {LANGUAGES.map(({ code, label }) => {
              const isActive = (settingsData.language ?? 'de') === code;
              return (
                <button
                  key={code}
                  onClick={() => updateSettings.mutate({ language: code })}
                  disabled={updateSettings.isPending}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                    isActive ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{label}</span>
                  {isActive && <Check className="w-4 h-4 text-sky-500" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ────────────── Logout ────────────── */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl bg-white border border-red-100 shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-100 text-red-500">
            <LogOut className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-medium text-red-600">{t('Abmelden')}</span>
        </button>
      </main>
    </div>
  );
}

