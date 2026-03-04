// ─── Voice Clone Settings ──────────────────────────────────
// Modul 8: Admin panel for managing voice cloning per staff member

import { useState, useCallback } from 'react';
import {
  Mic, Upload, ShieldCheck, ShieldOff, AlertTriangle,
  CheckCircle2, Clock, Trash2, Settings, Volume2, Globe
} from 'lucide-react';

interface VoiceCloneSettingsProps {
  staffId: string;
  staffName: string;
  currentAvatar?: {
    voiceCloneId?: string;
    avatarType: string;
    avatarUrl?: string;
    voiceSettings?: {
      pitch: number;
      speed: number;
      volume: number;
      style?: string;
      provider: string;
    };
    supportedLanguages: string[];
    consentSignedAt?: string;
    isActive: boolean;
  };
  onUpdate?: (settings: any) => void;
  onConsent?: () => void;
  onRevokeConsent?: () => void;
  onStartClone?: (audioSamples: string[], consentToken: string) => void;
}

type CloneStatus = 'none' | 'consented' | 'processing' | 'ready';

export function VoiceCloneSettings({
  staffId,
  staffName,
  currentAvatar,
  onUpdate,
  onConsent,
  onRevokeConsent,
  onStartClone,
}: VoiceCloneSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'voice' | 'clone'>('general');
  const [voiceSettings, setVoiceSettings] = useState(currentAvatar?.voiceSettings || {
    pitch: 0,
    speed: 1.0,
    volume: 0.8,
    style: 'professional',
    provider: 'azure',
  });
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [audioSamples] = useState<string[]>([]);

  const cloneStatus = (currentAvatar?.voiceCloneId
    ? 'ready'
    : currentAvatar?.consentSignedAt
    ? 'consented'
    : 'none') as CloneStatus;

  const handleVoiceUpdate = useCallback((key: string, value: number | string) => {
    const updated = { ...voiceSettings, [key]: value };
    setVoiceSettings(updated);
    onUpdate?.({ voiceSettings: updated });
  }, [voiceSettings, onUpdate]);

  const handleConsentSign = useCallback(() => {
    onConsent?.();
    setShowConsentDialog(false);
  }, [onConsent]);

  const handleStartClone = useCallback(() => {
    if (audioSamples.length === 0) return;
    const consentToken = `consent_${staffId}_${Date.now()}`;
    onStartClone?.(audioSamples, consentToken);
  }, [audioSamples, staffId, onStartClone]);

  const tabs = [
    { key: 'general' as const, label: 'Allgemein', icon: Settings },
    { key: 'voice' as const, label: 'Stimme', icon: Volume2 },
    { key: 'clone' as const, label: 'Voice Clone', icon: Mic },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Avatar-Einstellungen: {staffName}</h3>
        <p className="text-sm text-gray-500 mt-0.5">ID: {staffId.slice(0, 8)}...</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar-Typ</label>
              <select
                value={currentAvatar?.avatarType || '2D'}
                onChange={e => onUpdate?.({ avatarType: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="2D">2D Illustration</option>
                <option value="3D">3D Modell</option>
                <option value="REAL_PHOTO">Echtes Foto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
              <input
                type="url"
                value={currentAvatar?.avatarUrl || ''}
                onChange={e => onUpdate?.({ avatarUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" /> Unterstützte Sprachen
              </label>
              <div className="flex flex-wrap gap-2">
                {['de-DE', 'en-US', 'tr-TR', 'ar-SA', 'ru-RU'].map(lang => (
                  <label key={lang} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all">
                    <input
                      type="checkbox"
                      checked={currentAvatar?.supportedLanguages?.includes(lang) || false}
                      onChange={e => {
                        const current = currentAvatar?.supportedLanguages || [];
                        const updated = e.target.checked
                          ? [...current, lang]
                          : current.filter(l => l !== lang);
                        onUpdate?.({ supportedLanguages: updated });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentAvatar?.isActive || false}
                onChange={e => onUpdate?.({ isActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Avatar aktiv</span>
            </label>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                Tonhöhe (Pitch)
                <span className="text-gray-400">{voiceSettings.pitch.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={voiceSettings.pitch}
                onChange={e => handleVoiceUpdate('pitch', parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Tief</span><span>Normal</span><span>Hoch</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                Geschwindigkeit
                <span className="text-gray-400">{voiceSettings.speed.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={voiceSettings.speed}
                onChange={e => handleVoiceUpdate('speed', parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Langsam</span><span>Normal</span><span>Schnell</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                Lautstärke
                <span className="text-gray-400">{Math.round(voiceSettings.volume * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={voiceSettings.volume}
                onChange={e => handleVoiceUpdate('volume', parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprechstil</label>
              <select
                value={voiceSettings.style || 'professional'}
                onChange={e => handleVoiceUpdate('style', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="professional">Professionell</option>
                <option value="friendly">Freundlich</option>
                <option value="calm">Ruhig</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTS Provider</label>
              <select
                value={voiceSettings.provider}
                onChange={e => handleVoiceUpdate('provider', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="azure">Azure Cognitive Services</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="local">Lokaler TTS</option>
              </select>
            </div>
          </div>
        )}

        {/* Clone Tab */}
        {activeTab === 'clone' && (
          <div className="space-y-5">
            {/* Status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              cloneStatus === 'ready' ? 'bg-green-50 border-green-200' :
              cloneStatus === 'processing' ? 'bg-amber-50 border-amber-200' :
              cloneStatus === 'consented' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              {cloneStatus === 'ready' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
               cloneStatus === 'processing' ? <Clock className="w-5 h-5 text-amber-600 animate-spin" /> :
               cloneStatus === 'consented' ? <ShieldCheck className="w-5 h-5 text-blue-600" /> :
               <ShieldOff className="w-5 h-5 text-gray-400" />}
              <div>
                <p className="text-sm font-medium">
                  {cloneStatus === 'ready' ? 'Voice Clone aktiv' :
                   cloneStatus === 'processing' ? 'Clone wird verarbeitet...' :
                   cloneStatus === 'consented' ? 'Einwilligung erteilt' :
                   'Keine Einwilligung'}
                </p>
                {currentAvatar?.consentSignedAt && (
                  <p className="text-xs text-gray-500">
                    Einwilligung: {new Date(currentAvatar.consentSignedAt).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            </div>

            {/* Consent */}
            {!currentAvatar?.consentSignedAt && !showConsentDialog && (
              <button
                onClick={() => setShowConsentDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> Einwilligung erteilen
              </button>
            )}

            {showConsentDialog && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-800">DSGVO-Einwilligung Voice Cloning</p>
                    <p className="text-xs text-amber-700">
                      Ich stimme zu, dass meine Stimme für Text-to-Speech-Zwecke analysiert und
                      ein personalisiertes Stimmmodell erstellt wird. Diese Einwilligung kann jederzeit
                      widerrufen werden (Art. 7 Abs. 3 DSGVO). Bei Widerruf werden alle Stimmmodelle
                      unwiderruflich gelöscht.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConsentDialog(false)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    Abbrechen
                  </button>
                  <button onClick={handleConsentSign} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Einwilligen
                  </button>
                </div>
              </div>
            )}

            {/* Upload Samples */}
            {currentAvatar?.consentSignedAt && cloneStatus !== 'ready' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Sprachproben hochladen (min. 1, max. 10)</p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Audio-Dateien hier ablegen</p>
                  <p className="text-xs text-gray-400 mt-1">MP3, WAV · je 10–60 Sek. · max. 50MB</p>
                </div>
                {audioSamples.length > 0 && (
                  <p className="text-sm text-green-600">{audioSamples.length} Dateien ausgewählt</p>
                )}
                <button
                  onClick={handleStartClone}
                  disabled={audioSamples.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 transition-all"
                >
                  <Mic className="w-4 h-4" /> Clone starten
                </button>
              </div>
            )}

            {/* Revoke Consent */}
            {currentAvatar?.consentSignedAt && (
              <button
                onClick={onRevokeConsent}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Einwilligung widerrufen & Daten löschen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceCloneSettings;
