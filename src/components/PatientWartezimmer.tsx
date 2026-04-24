import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, Bell, CheckCircle, AlertTriangle,
  ClipboardList, Heart, Gamepad2, Newspaper
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../api/client';
import { useQueuePosition, useWaitingContent, useTrackContentView, useLikeContent, useTrackQuizAnswer } from '../hooks/usePatientApi';
import { QueueStatusCard } from './waiting/QueueStatusCard';
import { HealthTipCarousel } from './waiting/HealthTipCarousel';
import { WaitingGames } from './waiting/WaitingGames';
import { PraxisNewsFeed } from './waiting/PraxisNewsFeed';
import { MoodCheck } from './waiting/MoodCheck';
import { useWaitingRoomAvatarGuidance } from '../hooks/useWaitingRoomAvatarGuidance';

interface PatientWartezimmerProps {
  sessionId: string;
  patientName: string;
  service: string;
  token?: string;
}

type WaitingStatus = 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'DONE';
type WartezimmerTab = 'queue' | 'tipps' | 'games' | 'news';

/**
 * Online Wartezimmer — Reichhaltiges Entertainment-Center mit Tabs
 * für wartende Patienten.
 */
export const PatientWartezimmer: React.FC<PatientWartezimmerProps> = ({
  sessionId,
  patientName,
  service,
  token
}) => {
  const { t } = useTranslation();
  const [position, setPosition] = useState<number | null>(null);
  const [status, setStatus] = useState<WaitingStatus>('WAITING');
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [queueLength, setQueueLength] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [calledMessage, setCalledMessage] = useState<string | null>(null);
  const [joinedAt] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<WartezimmerTab>('queue');
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [seenContentIds, setSeenContentIds] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Polling fallback via React Query
  const { data: queueData } = useQueuePosition(sessionId);

  // Fetch content for tips/news
  const waitMin = Math.floor(elapsed / 60);
  const { data: tipsData } = useWaitingContent(
    { lang: 'de', waitMin, exclude: seenContentIds.join(','), limit: 10 }
  );
  const { data: newsData } = useWaitingContent(
    { lang: 'de', category: 'praxis', limit: 10 }
  );

  // Mutations for analytics
  const { mutate: trackView } = useTrackContentView();
  const { mutate: likeContent } = useLikeContent();
  const { mutate: trackQuizAnswer } = useTrackQuizAnswer();

  useWaitingRoomAvatarGuidance({
    enabled: true,
    status,
    position,
    estimatedWait,
  });

  // Update from polling
  useEffect(() => {
    if (queueData) {
      if (queueData.position !== undefined) setPosition(queueData.position);
      if (queueData.status) setStatus(queueData.status);
      const waitMinutes = queueData.estimatedWaitMinutes ?? queueData.estimatedWaitMin;
      if (waitMinutes !== undefined) setEstimatedWait(waitMinutes);
      if (queueData.queueLength !== undefined) setQueueLength(queueData.queueLength);
    }
  }, [queueData]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - joinedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [joinedAt]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const socket = io(SOCKET_BASE_URL || window.location.origin, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:session', sessionId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queue:position', (data: { position: number; status: WaitingStatus; estimatedWaitMinutes?: number; estimatedWaitMin?: number; queueLength?: number }) => {
      setPosition(data.position);
      setStatus(data.status);
      const waitMinutes = data.estimatedWaitMinutes ?? data.estimatedWaitMin;
      if (waitMinutes !== undefined) {
        setEstimatedWait(waitMinutes);
      }
      if (data.queueLength !== undefined) setQueueLength(data.queueLength);
    });

    socket.on('queue:called', (data: { message: string }) => {
      setStatus('CALLED');
      setCalledMessage(data.message);
      try {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj+a37nFdzANMIS/0LlkHgMvi7LVqFMFH3+q08RzAw==');
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => { });
      } catch { /* ignore */ }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('wartezimmer.calledTitle', 'Sie werden aufgerufen!'), {
          body: data.message,
          icon: '/icons/icon-192.png'
        });
      }
    });

    socket.on('queue:mood-check', () => {
      setShowMoodCheck(true);
    });

    return () => {
      // Memory Leak Fix: Clear audio ref and remove socket listeners
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queue:position');
      socket.off('queue:called');
      socket.off('queue:mood-check');
      socket.disconnect();
    };
  }, [sessionId, token, t]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show mood check at 10-min intervals
  useEffect(() => {
    const waitMinutes = Math.floor(elapsed / 60);
    if ([10, 20, 30].includes(waitMinutes) && status === 'WAITING') {
      setShowMoodCheck(true);
    }
  }, [Math.floor(elapsed / 60), status]);

  const handleContentView = useCallback((contentId: string) => {
    trackView({ contentId, sessionId, durationSec: 10 });
    setSeenContentIds((prev) => prev.includes(contentId) ? prev : [...prev, contentId]);
  }, [trackView, sessionId]);

  const handleContentLike = useCallback((contentId: string) => {
    likeContent({ contentId, sessionId });
  }, [likeContent, sessionId]);

  const handleQuizAnswer = useCallback((quizId: string, selectedOption: number, correct: boolean) => {
    trackQuizAnswer({ contentId: quizId, sessionId, selectedOption, correct });
  }, [trackQuizAnswer, sessionId]);

  const handleMoodRespond = useCallback((mood: string) => {
    socketRef.current?.emit('queue:mood-response', { sessionId, mood });
    setTimeout(() => setShowMoodCheck(false), 2000);
  }, [sessionId]);

  // ─── Called State ─────────────────────────────────────────

  if (status === 'CALLED') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-10 shadow-2xl shadow-emerald-500/20">
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-6 animate-pulse">
              <Bell className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-emerald-400 mb-3">
              {t('wartezimmer.youAreCalled', 'Sie werden aufgerufen!')}
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-4">
              {calledMessage || t('wartezimmer.pleaseGoTo', 'Bitte begeben Sie sich zum Behandlungszimmer.')}
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-emerald-400">{patientName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── In Treatment State ───────────────────────────────────

  if (status === 'IN_TREATMENT') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-10 shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-blue-400 mb-2">
              {t('wartezimmer.inTreatment', 'In Behandlung')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('wartezimmer.inTreatmentDesc', 'Sie befinden sich jetzt in der Behandlung.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Done State ───────────────────────────────────────────

  if (status === 'DONE') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-black text-emerald-400 mb-2">
              {t('wartezimmer.done', 'Behandlung abgeschlossen')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('wartezimmer.doneDesc', 'Vielen Dank für Ihren Besuch. Gute Besserung!')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Waiting State (Tab-based Entertainment Center) ───────

  const tipItems = (tipsData?.items ?? []).filter(
    (i: { type: string }) => i.type === 'HEALTH_TIP' || i.type === 'FUN_FACT' || i.type === 'SEASONAL_INFO'
  );
  const quizItems = (tipsData?.items ?? []).filter(
    (i: { type: string }) => i.type === 'MINI_QUIZ'
  );
  const newsItems = (newsData?.items ?? []).filter(
    (i: { type: string }) => i.type === 'PRAXIS_NEWS'
  );

  const TABS: { id: WartezimmerTab; icon: React.ReactNode; label: string }[] = [
    { id: 'queue', icon: <ClipboardList className="w-4 h-4" />, label: t('waiting.tabQueue', 'Queue') },
    { id: 'tipps', icon: <Heart className="w-4 h-4" />, label: t('waiting.tabTips', 'Gesundheit') },
    { id: 'games', icon: <Gamepad2 className="w-4 h-4" />, label: t('waiting.tabGames', 'Spiele') },
    { id: 'news', icon: <Newspaper className="w-4 h-4" />, label: t('waiting.tabNews', 'Praxis') },
  ];

  return (
    <div className="w-full p-6 space-y-4 animate-fade-in">
      {/* Header with compact queue display */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <Clock className="w-5 h-5 text-blue-400" />
          {t('wartezimmer.title', 'Online-Wartezimmer')}
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-[var(--text-secondary)]">{patientName}</span>
          <span className="text-[var(--text-muted)]">{service}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'queue' && (
          <QueueStatusCard
            position={position}
            estimatedMin={estimatedWait}
            status={status}
            queueLength={queueLength}
            connected={connected}
            elapsed={elapsed}
          />
        )}

        {activeTab === 'tipps' && (
          <HealthTipCarousel
            items={tipItems}
            onView={handleContentView}
            onLike={handleContentLike}
          />
        )}

        {activeTab === 'games' && (
          <WaitingGames
            sessionId={sessionId}
            quizItems={quizItems}
            onQuizAnswer={handleQuizAnswer}
          />
        )}

        {activeTab === 'news' && (
          <PraxisNewsFeed items={newsItems} />
        )}
      </div>

      {/* Mood check overlay */}
      {showMoodCheck && (
        <MoodCheck onRespond={handleMoodRespond} />
      )}

      {/* Notification hint */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-400/80 leading-relaxed">
          {t('wartezimmer.notifHint', 'Sie werden per Ton und Browserbenachrichtigung informiert, wenn Sie aufgerufen werden. Bitte lassen Sie diese Seite geöffnet.')}
        </p>
      </div>
    </div>
  );
};
