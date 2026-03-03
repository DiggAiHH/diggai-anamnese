import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, Users, Bell, MessageSquare, CheckCircle, AlertTriangle,
  Wifi, WifiOff, Volume2, Smartphone, Coffee, BookOpen
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../api/client';
import { useQueuePosition } from '../hooks/useApi';

interface PatientWartezimmerProps {
  sessionId: string;
  patientName: string;
  service: string;
  token?: string;
}

type WaitingStatus = 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'DONE';

/**
 * Online Wartezimmer — Patient sieht seine Wartenummer,
 * geschätzte Wartezeit und wird benachrichtigt wenn aufgerufen.
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
  const [connected, setConnected] = useState(false);
  const [calledMessage, setCalledMessage] = useState<string | null>(null);
  const [joinedAt] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Polling fallback via React Query
  const { data: queueData } = useQueuePosition(sessionId);

  // Update from polling
  useEffect(() => {
    if (queueData) {
      if (queueData.position !== undefined) setPosition(queueData.position);
      if (queueData.status) setStatus(queueData.status);
      if (queueData.estimatedWaitMinutes !== undefined) setEstimatedWait(queueData.estimatedWaitMinutes);
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
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:session', sessionId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queue:position', (data: { position: number; status: WaitingStatus; estimatedWaitMinutes: number }) => {
      setPosition(data.position);
      setStatus(data.status);
      setEstimatedWait(data.estimatedWaitMinutes);
    });

    socket.on('queue:called', (data: { message: string }) => {
      setStatus('CALLED');
      setCalledMessage(data.message);
      // Play notification sound
      try {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj+a37nFdzANMIS/0LlkHgMvi7LVqFMFH3+q08RzAw==');
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => { });
      } catch { /* ignore */ }
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('wartezimmer.calledTitle', 'Sie werden aufgerufen!'), {
          body: data.message,
          icon: '/icons/icon-192.png'
        });
      }
    });

    return () => { socket.disconnect(); };
  }, [sessionId, token, t]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Called State ─────────────────────────────────────────

  if (status === 'CALLED') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-10 shadow-2xl shadow-emerald-500/20">
            {/* Pulsing bell */}
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

  // ─── Waiting State (main view) ────────────────────────────

  return (
    <div className="w-full max-w-lg mx-auto p-6 space-y-6 animate-fade-in">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <Clock className="w-5 h-5 text-blue-400" />
          {t('wartezimmer.title', 'Online-Wartezimmer')}
        </h2>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? t('wartezimmer.connected', 'Verbunden') : t('wartezimmer.disconnected', 'Getrennt')}
        </div>
      </div>

      {/* Queue Number Card */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-gradient-to-b from-blue-600/10 to-violet-600/10 p-8 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
          {t('wartezimmer.yourNumber', 'Ihre Wartenummer')}
        </p>
        <div className="w-28 h-28 mx-auto rounded-2xl bg-[var(--bg-card)] border-2 border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
          <span className="text-5xl font-black text-blue-400">
            {position !== null ? position : '—'}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] font-medium">{patientName}</p>
        <p className="text-xs text-[var(--text-muted)]">{service}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-amber-400 mb-2" />
          <div className="text-lg font-black text-[var(--text-primary)]">{formatTime(elapsed)}</div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('wartezimmer.waited', 'Gewartet')}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-blue-400 mb-2" />
          <div className="text-lg font-black text-[var(--text-primary)]">
            {position !== null ? position - 1 : '—'}
          </div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('wartezimmer.ahead', 'Vor Ihnen')}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 text-center">
          <Coffee className="w-5 h-5 mx-auto text-emerald-400 mb-2" />
          <div className="text-lg font-black text-[var(--text-primary)]">
            {estimatedWait !== null ? `~${estimatedWait}` : '—'}
          </div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('wartezimmer.estMin', 'Min. geschätzt')}
          </div>
        </div>
      </div>

      {/* Tips while waiting */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          {t('wartezimmer.tips', 'Tipps während Sie warten')}
        </h3>
        <div className="space-y-2">
          {[
            { icon: <Smartphone className="w-4 h-4" />, text: t('wartezimmer.tip1', 'Halten Sie Ihre Versicherungskarte bereit') },
            { icon: <Volume2 className="w-4 h-4" />, text: t('wartezimmer.tip2', 'Aktivieren Sie den Ton für die Benachrichtigung') },
            { icon: <MessageSquare className="w-4 h-4" />, text: t('wartezimmer.tip3', 'Nutzen Sie den Chat bei Fragen an das Praxis-Team') },
          ].map((tip, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <div className="text-blue-400 shrink-0">{tip.icon}</div>
              {tip.text}
            </div>
          ))}
        </div>
      </div>

      {/* Notification hint */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-400/80 leading-relaxed">
          {t('wartezimmer.notifHint', 'Sie werden per Ton und Browserbenachrichtigung informiert, wenn Sie aufgerufen werden. Bitte lassen Sie diese Seite geöffnet.')}
        </p>
      </div>
    </div>
  );
};
