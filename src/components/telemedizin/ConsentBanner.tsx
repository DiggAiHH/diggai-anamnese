// ─── Telemedizin Consent Banner ────────────────────────────
// Modul 8: DSGVO consent banner before joining video calls

import { Shield, Video, Mic, HardDrive, AlertTriangle, X } from 'lucide-react';

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
  patientName?: string;
  arztName?: string;
  showRecordingNotice?: boolean;
}

export function ConsentBanner({
  onAccept,
  onDecline,
  patientName,
  arztName,
  showRecordingNotice = false,
}: ConsentBannerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold">Einwilligung Videosprechstunde</h2>
              <p className="text-sm text-blue-100">Gemäß § 630d BGB, DSGVO Art. 6+7+9</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {(patientName || arztName) && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {patientName && <span>Patient: <strong>{patientName}</strong></span>}
              {patientName && arztName && <span>·</span>}
              {arztName && <span>Arzt: <strong>{arztName}</strong></span>}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Video className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Videoübertragung</p>
                <p className="text-xs text-gray-500">Ende-zu-Ende-verschlüsselte Übertragung. Keine Server-seitige Speicherung des Videostreams.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Mic className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Audioübertragung</p>
                <p className="text-xs text-gray-500">Mikrofon wird für die Sprechstunde aktiviert. Sie können es jederzeit stumm schalten.</p>
              </div>
            </div>

            {showRecordingNotice && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <HardDrive className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Aufzeichnung</p>
                  <p className="text-xs text-amber-700">Der Arzt hat die Aufnahme aktiviert. Die Aufzeichnung wird 90 Tage gespeichert. Sie können der Aufnahme separat widersprechen.</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Ihre Rechte</p>
                <p className="text-xs text-blue-700">
                  Einwilligung ist freiwillig und jederzeit widerrufbar (Art. 7 Abs. 3 DSGVO).
                  Sie können die Sitzung jederzeit beenden. Bei Widerruf werden keine Nachteile für die Behandlung entstehen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <X className="w-4 h-4" /> Ablehnen
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <Shield className="w-4 h-4" /> Einwilligen & Beitreten
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;
