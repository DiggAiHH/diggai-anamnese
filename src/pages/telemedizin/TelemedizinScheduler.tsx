// ─── Telemedizin Scheduler ─────────────────────────────────
// Modul 8: Schedule and manage video consultations

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Calendar, Clock, User, Plus, Play,
  XCircle, AlertTriangle, CheckCircle2, Search,
  ChevronLeft, ChevronRight, Phone
} from 'lucide-react';

type SessionStatus = 'SCHEDULED' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface ScheduledSession {
  id: string;
  arztId: string;
  patientId: string;
  patientName: string;
  arztName: string;
  scheduledAt: string;
  duration: number;
  status: SessionStatus;
  consentGiven: boolean;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; icon: typeof Clock }> = {
  SCHEDULED: { label: 'Geplant', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  WAITING: { label: 'Wartet', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ACTIVE: { label: 'Aktiv', color: 'bg-green-100 text-green-700', icon: Video },
  COMPLETED: { label: 'Abgeschlossen', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Abgesagt', color: 'bg-red-100 text-red-600', icon: XCircle },
  NO_SHOW: { label: 'Nicht erschienen', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
};

// Demo data
const DEMO_SESSIONS: ScheduledSession[] = [
  { id: 's1', arztId: 'a1', patientId: 'p1', patientName: 'Maria Schmidt', arztName: 'Dr. Müller', scheduledAt: new Date(Date.now() + 3600000).toISOString(), duration: 30, status: 'SCHEDULED', consentGiven: true },
  { id: 's2', arztId: 'a1', patientId: 'p2', patientName: 'Hans Weber', arztName: 'Dr. Müller', scheduledAt: new Date(Date.now() + 7200000).toISOString(), duration: 20, status: 'SCHEDULED', consentGiven: false },
  { id: 's3', arztId: 'a2', patientId: 'p3', patientName: 'Anna Bauer', arztName: 'Dr. Fischer', scheduledAt: new Date(Date.now() - 1800000).toISOString(), duration: 25, status: 'ACTIVE', consentGiven: true },
  { id: 's4', arztId: 'a1', patientId: 'p4', patientName: 'Thomas Keller', arztName: 'Dr. Müller', scheduledAt: new Date(Date.now() - 86400000).toISOString(), duration: 30, status: 'COMPLETED', consentGiven: true },
];

export function TelemedizinScheduler() {
  const navigate = useNavigate();
  const [sessions] = useState<ScheduledSession[]>(DEMO_SESSIONS);
  const [filter, setFilter] = useState<SessionStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [, setShowNewDialog] = useState(false);
  const [selectedDate] = useState(new Date());

  const filteredSessions = sessions.filter(s => {
    if (filter !== 'ALL' && s.status !== filter) return false;
    if (search && !s.patientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleJoin = useCallback((sessionId: string) => {
    navigate(`/telemedizin/room/${sessionId}`);
  }, [navigate]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" /> Telemedizin
            </h1>
            <p className="text-sm text-gray-500">{sessions.filter(s => s.status === 'SCHEDULED').length} geplante Sitzungen</p>
          </div>
          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Neue Sitzung
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Patient suchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['ALL', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'ALL' ? 'Alle' : STATUS_CONFIG[f].label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-medium text-gray-800">
            {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Keine Sitzungen gefunden</p>
            </div>
          )}

          {filteredSessions.map(session => {
            const { date, time } = formatDateTime(session.scheduledAt);
            const statusCfg = STATUS_CONFIG[session.status];
            const StatusIcon = statusCfg.icon;
            const isJoinable = session.status === 'SCHEDULED' || session.status === 'WAITING' || session.status === 'ACTIVE';

            return (
              <div key={session.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  {/* Time */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-xl font-bold text-gray-800">{time}</p>
                    <p className="text-xs text-gray-400">{date}</p>
                  </div>

                  <div className="w-px h-12 bg-gray-200" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">{session.patientName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {session.arztName}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.duration} Min.</span>
                      {session.consentGiven && (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Einwilligung</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isJoinable && (
                      <button
                        onClick={() => handleJoin(session.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                      >
                        <Play className="w-4 h-4" /> Beitreten
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Heute geplant', value: sessions.filter(s => s.status === 'SCHEDULED').length, color: 'text-blue-600' },
            { label: 'Aktiv', value: sessions.filter(s => s.status === 'ACTIVE').length, color: 'text-green-600' },
            { label: 'Abgeschlossen', value: sessions.filter(s => s.status === 'COMPLETED').length, color: 'text-gray-600' },
            { label: 'No-Show', value: sessions.filter(s => s.status === 'NO_SHOW').length, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TelemedizinScheduler;
