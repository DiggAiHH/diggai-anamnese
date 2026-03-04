/**
 * AnamneseGame — Gamified Anamnese Adventure Map
 * 
 * 8 Stationen auf einer visuellen "Reise":
 * 1. Willkommen (Name/Daten)
 * 2. Zeitmaschine (Vorgeschichte)
 * 3. Medikamenten-Regal (Aktuelle Medikation)
 * 4. Körper-Scanner (Aktuelle Beschwerden)
 * 5. Allergie-Detektor (Allergien/Unverträglichkeiten)
 * 6. Familien-Stammbaum (Familienanamnese)
 * 7. Lifestyle-Check (Rauchen/Alkohol/Sport)
 * 8. Ziel erreicht! (Zusammenfassung)
 * 
 * Punkte, Badges, Progress-Animation
 * Kinder- und Erwachsenen-freundliches Design
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User, History, Pill, ScanLine, AlertCircle, Users,
  Heart, Trophy, Star, ChevronRight, ChevronLeft,
  Check, Lock, Sparkles, MapPin, Flag,
} from 'lucide-react';

// ─── Station Types ──────────────────────────────────────

interface Station {
  id: number;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
  emoji: string;
  points: number;
}

interface StationState {
  completed: boolean;
  answers: Record<string, string>;
  earnedPoints: number;
}

// ─── Station Definitions ────────────────────────────────

const STATIONS: Station[] = [
  {
    id: 1,
    titleKey: 'game.station.welcome',
    descKey: 'game.station.welcome_desc',
    icon: <User className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    emoji: '👋',
    points: 10,
  },
  {
    id: 2,
    titleKey: 'game.station.history',
    descKey: 'game.station.history_desc',
    icon: <History className="w-6 h-6" />,
    color: 'from-purple-500 to-indigo-500',
    emoji: '⏳',
    points: 15,
  },
  {
    id: 3,
    titleKey: 'game.station.medications',
    descKey: 'game.station.medications_desc',
    icon: <Pill className="w-6 h-6" />,
    color: 'from-emerald-500 to-teal-500',
    emoji: '💊',
    points: 15,
  },
  {
    id: 4,
    titleKey: 'game.station.symptoms',
    descKey: 'game.station.symptoms_desc',
    icon: <ScanLine className="w-6 h-6" />,
    color: 'from-rose-500 to-pink-500',
    emoji: '🔍',
    points: 20,
  },
  {
    id: 5,
    titleKey: 'game.station.allergies',
    descKey: 'game.station.allergies_desc',
    icon: <AlertCircle className="w-6 h-6" />,
    color: 'from-amber-500 to-orange-500',
    emoji: '⚠️',
    points: 15,
  },
  {
    id: 6,
    titleKey: 'game.station.family',
    descKey: 'game.station.family_desc',
    icon: <Users className="w-6 h-6" />,
    color: 'from-sky-500 to-blue-500',
    emoji: '👨‍👩‍👧‍👦',
    points: 15,
  },
  {
    id: 7,
    titleKey: 'game.station.lifestyle',
    descKey: 'game.station.lifestyle_desc',
    icon: <Heart className="w-6 h-6" />,
    color: 'from-red-500 to-rose-500',
    emoji: '🏃',
    points: 10,
  },
  {
    id: 8,
    titleKey: 'game.station.finish',
    descKey: 'game.station.finish_desc',
    icon: <Trophy className="w-6 h-6" />,
    color: 'from-yellow-500 to-amber-500',
    emoji: '🏆',
    points: 0,
  },
];

const MAX_POINTS = STATIONS.reduce((sum, s) => sum + s.points, 0);

// ─── Badges ─────────────────────────────────────────────

interface Badge {
  id: string;
  titleKey: string;
  emoji: string;
  condition: (totalPoints: number, stationsCompleted: number) => boolean;
}

const BADGES: Badge[] = [
  { id: 'starter', titleKey: 'game.badge.starter', emoji: '🌟', condition: (_, s) => s >= 1 },
  { id: 'halfway', titleKey: 'game.badge.halfway', emoji: '⭐', condition: (_, s) => s >= 4 },
  { id: 'dedicated', titleKey: 'game.badge.dedicated', emoji: '🌠', condition: (_, s) => s >= 6 },
  { id: 'champion', titleKey: 'game.badge.champion', emoji: '🏆', condition: (_, s) => s >= 7 },
  { id: 'perfectionist', titleKey: 'game.badge.perfectionist', emoji: '💎', condition: (p) => p >= MAX_POINTS },
];

// ─── Props ──────────────────────────────────────────────

interface AnamneseGameProps {
  /** Callback when game is completed with all answers */
  onComplete?: (answers: Record<string, string>, totalPoints: number) => void;
  /** Whether this is a child-friendly version (simpler language) */
  childMode?: boolean;
}

// ─── Main Component ─────────────────────────────────────

export function AnamneseGame({ onComplete, childMode = false }: AnamneseGameProps) {
  const { t } = useTranslation();
  const [currentStation, setCurrentStation] = useState(0); // 0 = map view
  const [stationStates, setStationStates] = useState<Record<number, StationState>>({});
  const [showCelebration, setShowCelebration] = useState(false);

  // ─── Computed Values ──────────────────────────────────
  const completedCount = useMemo(
    () => Object.values(stationStates).filter(s => s.completed).length,
    [stationStates]
  );

  const totalPoints = useMemo(
    () => Object.values(stationStates).reduce((sum, s) => sum + s.earnedPoints, 0),
    [stationStates]
  );

  const earnedBadges = useMemo(
    () => BADGES.filter(b => b.condition(totalPoints, completedCount)),
    [totalPoints, completedCount]
  );

  const progressPercent = Math.round((completedCount / (STATIONS.length - 1)) * 100); // Exclude finish station

  // ─── Station Navigation ───────────────────────────────
  const canAccessStation = useCallback((stationId: number) => {
    if (stationId === 1) return true; // First station always accessible
    // All previous stations must be completed
    for (let i = 1; i < stationId; i++) {
      if (!stationStates[i]?.completed) return false;
    }
    return true;
  }, [stationStates]);

  const completeStation = useCallback((stationId: number, answers: Record<string, string>) => {
    const station = STATIONS.find(s => s.id === stationId);
    if (!station) return;

    const points = station.points;
    setStationStates(prev => ({
      ...prev,
      [stationId]: { completed: true, answers, earnedPoints: points },
    }));

    // Show celebration
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    // Check if all non-finish stations are done
    const allDone = STATIONS
      .filter(s => s.id !== 8) // Exclude finish
      .every(s => s.id === stationId || stationStates[s.id]?.completed);

    if (allDone) {
      // Auto-advance to finish
      setTimeout(() => setCurrentStation(8), 1500);
      // Collect all answers
      const allAnswers: Record<string, string> = {};
      Object.values(stationStates).forEach(s => Object.assign(allAnswers, s.answers));
      Object.assign(allAnswers, answers);
      onComplete?.(allAnswers, totalPoints + points);
    } else {
      // Go back to map after 1.5s
      setTimeout(() => setCurrentStation(0), 1500);
    }
  }, [stationStates, onComplete, totalPoints]);

  // ─── Render Map View ──────────────────────────────────
  if (currentStation === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
        {/* Header with Points + Badges */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                {childMode
                  ? t('game.title_child', '🗺️ Deine Gesundheitsreise')
                  : t('game.title', '🗺️ Anamnese-Abenteuer')
                }
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {childMode
                  ? t('game.subtitle_child', 'Besuche alle Stationen und sammle Sterne!')
                  : t('game.subtitle', 'Besuchen Sie alle Stationen und füllen Sie den Fragebogen spielerisch aus.')
                }
              </p>
            </div>

            {/* Points Display */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-500 tabular-nums">{totalPoints}</span>
              <span className="text-xs text-[var(--text-muted)]">/ {MAX_POINTS}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[var(--text-muted)]">{progressPercent}%</span>
            <span className="text-xs text-[var(--text-muted)]">{completedCount}/{STATIONS.length - 1} {t('game.stations', 'Stationen')}</span>
          </div>

          {/* Badges Row */}
          {earnedBadges.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
              {earnedBadges.map(badge => (
                <span
                  key={badge.id}
                  className="px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-sm"
                  title={t(badge.titleKey, badge.id)}
                >
                  {badge.emoji} {t(badge.titleKey, badge.id)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Station Grid (Adventure Map) */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATIONS.map((station) => {
              const isCompleted = stationStates[station.id]?.completed;
              const isAccessible = canAccessStation(station.id);
              const isFinish = station.id === 8;
              const isCurrent = !isCompleted && isAccessible;

              return (
                <button
                  key={station.id}
                  onClick={() => isAccessible && setCurrentStation(station.id)}
                  disabled={!isAccessible}
                  className={`
                    relative p-5 rounded-2xl border transition-all duration-300
                    ${isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                      : isCurrent
                        ? `bg-gradient-to-br ${station.color} border-transparent shadow-lg hover:shadow-xl transform hover:scale-[1.02]`
                        : 'bg-[var(--bg-card)] border-[var(--border-primary)] opacity-50 cursor-not-allowed'
                    }
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
                  `}
                  aria-label={`Station ${station.id}: ${t(station.titleKey, '')}`}
                >
                  {/* Status Icon */}
                  <div className="absolute top-2 right-2">
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : !isAccessible ? (
                      <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : null}
                  </div>

                  {/* Station Number */}
                  <div className={`
                    inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-3
                    ${isCompleted
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : isCurrent
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--bg-input)] text-[var(--text-muted)]'
                    }
                  `}>
                    {isFinish ? <Flag className="w-4 h-4" /> : station.id}
                  </div>

                  {/* Emoji + Title */}
                  <div className="text-2xl mb-2">{station.emoji}</div>
                  <h3 className={`text-sm font-semibold mb-1 ${isCurrent && !isCompleted ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                    {t(station.titleKey, `Station ${station.id}`)}
                  </h3>
                  <p className={`text-xs ${isCurrent && !isCompleted ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                    {t(station.descKey, '')}
                  </p>

                  {/* Points Badge */}
                  {station.points > 0 && (
                    <div className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-white/20 text-white/80' : 'bg-[var(--bg-input)] text-[var(--text-muted)]'
                    }`}>
                      <Star className="w-3 h-3" />
                      {isCompleted ? stationStates[station.id]?.earnedPoints : station.points} {t('game.points', 'Pkt.')}
                    </div>
                  )}

                  {/* Pulse ring for current station */}
                  {isCurrent && !isCompleted && (
                    <MapPin className="absolute -top-2 -left-2 w-6 h-6 text-white animate-bounce" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-center animate-bounce">
              <div className="text-6xl mb-2">🎉</div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {t('game.station_complete', 'Station geschafft!')}
              </div>
              <div className="text-yellow-500 font-bold">
                +{STATIONS.find(s => s.id === currentStation)?.points || 0} {t('game.points', 'Pkt.')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render Station Content ───────────────────────────
  const station = STATIONS.find(s => s.id === currentStation);
  if (!station) return null;

  // Finish Station
  if (station.id === 8) {
    return (
      <FinishStation
        totalPoints={totalPoints}
        maxPoints={MAX_POINTS}
        badges={earnedBadges}
        childMode={childMode}
        onBackToMap={() => setCurrentStation(0)}
      />
    );
  }

  return (
    <StationContent
      station={station}
      childMode={childMode}
      onComplete={(answers) => completeStation(station.id, answers)}
      onBack={() => setCurrentStation(0)}
    />
  );
}

// ─── Station Content Component ──────────────────────────

function StationContent({
  station,
  childMode,
  onComplete,
  onBack,
}: {
  station: Station;
  childMode: boolean;
  onComplete: (answers: Record<string, string>) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(() => {
    onComplete(answers);
  }, [answers, onComplete]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('game.back_to_map', 'Zurück zur Karte')}
        </button>

        {/* Station Header */}
        <div className={`p-6 rounded-2xl bg-gradient-to-br ${station.color} mb-6`}>
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 rounded-xl bg-white/20">
              {station.icon}
            </div>
            <div>
              <div className="text-sm text-white/70">Station {station.id} / 7</div>
              <h2 className="text-xl font-bold">{station.emoji} {t(station.titleKey, `Station ${station.id}`)}</h2>
              <p className="text-sm text-white/80 mt-1">{t(station.descKey, '')}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
            <Star className="w-4 h-4 text-yellow-300" />
            {station.points} {t('game.points_available', 'Punkte verfügbar')}
          </div>
        </div>

        {/* Station-specific Input Area (placeholder — extend per station) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 mb-6">
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {childMode
              ? t('game.instruction_child', 'Beantworte die Fragen so gut du kannst! 🌟')
              : t('game.instruction', 'Bitte beantworten Sie die folgenden Fragen.')
            }
          </p>

          {/* Generic text input for station — in production, each station would have custom UI */}
          <textarea
            className="w-full h-32 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            placeholder={t('game.input_placeholder', 'Ihre Antwort...')}
            value={answers[`station_${station.id}`] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [`station_${station.id}`]: e.target.value }))}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 inline mr-2" />
            {t('game.back', 'Zurück')}
          </button>
          <button
            onClick={handleSubmit}
            className={`px-8 py-3 rounded-xl bg-gradient-to-r ${station.color} text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all`}
          >
            {t('game.complete_station', 'Station abschließen')}
            <ChevronRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Finish Station ─────────────────────────────────────

function FinishStation({
  totalPoints,
  maxPoints,
  badges,
  childMode,
  onBackToMap,
}: {
  totalPoints: number;
  maxPoints: number;
  badges: Badge[];
  childMode: boolean;
  onBackToMap: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Trophy Animation */}
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          {childMode
            ? t('game.finish_title_child', 'Super gemacht! 🎉')
            : t('game.finish_title', 'Geschafft! 🎉')
          }
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          {childMode
            ? t('game.finish_desc_child', 'Du hast alle Stationen besucht!')
            : t('game.finish_desc', 'Sie haben die Anamnese-Reise erfolgreich abgeschlossen.')
          }
        </p>

        {/* Score Card */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-6 mb-6">
          <div className="text-sm text-[var(--text-secondary)] mb-1">{t('game.total_score', 'Gesamtpunktzahl')}</div>
          <div className="text-4xl font-bold text-yellow-500 tabular-nums mb-2">
            {totalPoints} <span className="text-lg text-[var(--text-muted)]">/ {maxPoints}</span>
          </div>

          {/* Stars Rating */}
          <div className="flex justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${i < Math.ceil(totalPoints / maxPoints * 5) ? 'text-yellow-500 fill-yellow-500' : 'text-[var(--text-muted)]'}`}
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-[var(--text-secondary)] mb-2">{t('game.earned_badges', 'Verdiente Abzeichen')}</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {badges.map(badge => (
                <span
                  key={badge.id}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-sm"
                >
                  {badge.emoji} {t(badge.titleKey, badge.id)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onBackToMap}
            className="w-full px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
          >
            {t('game.view_map', 'Karte ansehen')}
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            {t('game.data_submitted', 'Ihre Daten wurden sicher an die Praxis übermittelt.')}
          </p>
        </div>
      </div>
    </div>
  );
}
