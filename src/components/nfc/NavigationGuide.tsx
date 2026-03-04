// ═══════════════════════════════════════════════════════════════
// Modul 7: Navigation Guide — Room finding assistance
// ═══════════════════════════════════════════════════════════════

import { useTranslation } from 'react-i18next';

interface NavigationGuideProps {
  targetRoom: string;
  targetType: string;
  pathColor?: string;
  instructions?: string;
  videoUrl?: string;
  onDismiss?: () => void;
}

const ROOM_DIRECTIONS: Record<string, { color: string; direction: string; icon: string }> = {
  WAITING: { color: 'blue', direction: 'Folgen Sie dem blauen Streifen zum Wartezimmer', icon: '🪑' },
  LAB: { color: 'green', direction: 'Folgen Sie dem grünen Streifen zum Labor', icon: '🧪' },
  EKG: { color: 'red', direction: 'Folgen Sie dem roten Streifen zum EKG-Raum', icon: '💓' },
  CONSULTATION: { color: 'purple', direction: 'Folgen Sie dem lila Streifen zum Behandlungszimmer', icon: '👨‍⚕️' },
  CHECKOUT: { color: 'orange', direction: 'Folgen Sie dem orangen Streifen zum Ausgang', icon: '✅' },
  REGISTRATION: { color: 'yellow', direction: 'Bitte melden Sie sich an der Anmeldung', icon: '📋' },
};

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
};

export function NavigationGuide({ targetRoom, targetType, pathColor, instructions, videoUrl, onDismiss }: NavigationGuideProps) {
  const { t } = useTranslation();
  const guide = ROOM_DIRECTIONS[targetType] || { color: 'blue', direction: `Bitte gehen Sie zu ${targetRoom}`, icon: '📍' };
  const activeColor = pathColor || guide.color;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-primary)] shadow-lg">
      {/* Color strip at top */}
      <div className={`h-2 ${COLOR_MAP[activeColor] || 'bg-blue-500'}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
            activeColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
            activeColor === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
            activeColor === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
            activeColor === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
            activeColor === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {guide.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[var(--text-primary)] text-lg mb-1">{targetRoom}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {instructions || t(`nfc.guide_${targetType.toLowerCase()}`, guide.direction)}
            </p>
          </div>
        </div>

        {/* Color path indicator */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-primary)]">
          <div className={`w-6 h-6 rounded-full ${COLOR_MAP[activeColor] || 'bg-blue-500'} flex-shrink-0`} />
          <p className="text-sm text-[var(--text-primary)]">
            {t('nfc.follow_color', 'Folgen Sie der {{color}} Markierung am Boden', { color: activeColor === 'blue' ? 'blauen' : activeColor === 'green' ? 'grünen' : activeColor === 'red' ? 'roten' : activeColor === 'purple' ? 'lila' : activeColor === 'orange' ? 'orangen' : 'farbigen' })}
          </p>
        </div>

        {/* Video link */}
        {videoUrl && (
          <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl text-sm text-[var(--text-primary)] font-medium transition-colors border border-[var(--border-primary)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('nfc.watch_video', 'Video-Anleitung ansehen')}
          </button>
        )}

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="mt-3 w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('nfc.got_it', 'Verstanden')}
          </button>
        )}
      </div>
    </div>
  );
}

export default NavigationGuide;
