// ─── Video Room ────────────────────────────────────────────
// Modul 8: WebRTC video consultation room UI

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff,
  Monitor, MonitorOff, MessageSquare, FileText,
  Clock, Shield, Maximize2, Minimize2, Settings,
  AlertTriangle, Users
} from 'lucide-react';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

interface VideoRoomState {
  connectionState: ConnectionState;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  fullscreen: boolean;
  showChat: boolean;
  showNotes: boolean;
  duration: number;
  participantCount: number;
  consentGiven: boolean;
}

export function VideoRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const [state, setState] = useState<VideoRoomState>({
    connectionState: 'connecting',
    videoEnabled: true,
    audioEnabled: true,
    screenSharing: false,
    fullscreen: false,
    showChat: false,
    showNotes: false,
    duration: 0,
    participantCount: 1,
    consentGiven: false,
  });

  const [notes, setNotes] = useState('');
  const [showConsentDialog, setShowConsentDialog] = useState(true);

  // Simulate connection
  useEffect(() => {
    if (!state.consentGiven) return;

    const connectTimer = setTimeout(() => {
      setState(s => ({ ...s, connectionState: 'connected', participantCount: 2 }));
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, [state.consentGiven]);

  // Duration timer
  useEffect(() => {
    if (state.connectionState !== 'connected') return;

    timerRef.current = setInterval(() => {
      setState(s => ({ ...s, duration: s.duration + 1 }));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.connectionState]);

  const toggleVideo = useCallback(() => setState(s => ({ ...s, videoEnabled: !s.videoEnabled })), []);
  const toggleAudio = useCallback(() => setState(s => ({ ...s, audioEnabled: !s.audioEnabled })), []);
  const toggleScreenShare = useCallback(() => setState(s => ({ ...s, screenSharing: !s.screenSharing })), []);
  const toggleChat = useCallback(() => setState(s => ({ ...s, showChat: !s.showChat, showNotes: false })), []);
  const toggleNotes = useCallback(() => setState(s => ({ ...s, showNotes: !s.showNotes, showChat: false })), []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setState(s => ({ ...s, fullscreen: false }));
    } else {
      document.documentElement.requestFullscreen();
      setState(s => ({ ...s, fullscreen: true }));
    }
  }, []);

  const handleHangUp = useCallback(() => {
    // In production: close WebRTC connection, call endSession API
    navigate(-1);
  }, [navigate]);

  const handleConsent = useCallback(() => {
    setState(s => ({ ...s, consentGiven: true }));
    setShowConsentDialog(false);
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const connectionColors: Record<ConnectionState, string> = {
    connecting: 'text-amber-500',
    connected: 'text-green-500',
    reconnecting: 'text-amber-500',
    disconnected: 'text-red-500',
    failed: 'text-red-600',
  };

  // Consent Dialog
  if (showConsentDialog) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Videosprechstunde beitreten</h2>
            <p className="text-sm text-gray-500 mt-1">Sitzung: {sessionId?.slice(0, 8)}...</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 space-y-1">
                <p className="font-medium">Datenschutz-Hinweis (§ 630d BGB)</p>
                <p>Diese Videosprechstunde wird verschlüsselt übertragen (E2E). Keine Aufzeichnung ohne separate Einwilligung.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Video className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">Kamera-Zugriff erforderlich</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mic className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">Mikrofon-Zugriff erforderlich</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConsent}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Beitreten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800/80 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${connectionColors[state.connectionState]}`}>
            <div className={`w-2 h-2 rounded-full ${state.connectionState === 'connected' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-xs font-medium">
              {state.connectionState === 'connected' ? 'Verbunden' : 'Verbindung wird hergestellt...'}
            </span>
          </div>
          <span className="text-gray-500 text-xs">|</span>
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <Users className="w-3 h-3" /> {state.participantCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-white/80">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatDuration(state.duration)}</span>
          </span>
          {state.duration > 3300 && (
            <span className="flex items-center gap-1 text-amber-400 text-xs animate-pulse">
              <AlertTriangle className="w-3 h-3" /> 5 Min. verbleibend
            </span>
          )}
          <button onClick={toggleFullscreen} title="Vollbild umschalten" className="p-1.5 text-gray-400 hover:text-white rounded">
            {state.fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-1 relative flex">
        {/* Remote Video (large) */}
        <div className="flex-1 bg-gray-800 flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {state.connectionState === 'connecting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p>Warte auf Teilnehmer...</p>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-600">
          {state.videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
          {!state.audioEnabled && (
            <div className="absolute top-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Side Panel (Chat/Notes) */}
        {(state.showChat || state.showNotes) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-white">
                {state.showChat ? 'Chat' : 'Notizen'}
              </h3>
            </div>
            {state.showNotes && (
              <div className="flex-1 p-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Behandlungsnotizen..."
                  className="w-full h-full bg-gray-700 text-white text-sm rounded-lg p-3 resize-none outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
            {state.showChat && (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Chat wird geladen...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <footer className="flex items-center justify-center gap-3 px-4 py-4 bg-gray-800/80 backdrop-blur">
        <button
          onClick={toggleAudio}
          title="Mikrofon umschalten"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            state.audioEnabled ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {state.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          title="Kamera umschalten"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            state.videoEnabled ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {state.videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          title="Bildschirm teilen"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            state.screenSharing ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
        >
          {state.screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        <div className="w-px h-8 bg-gray-600 mx-2" />

        <button
          onClick={toggleChat}
          title="Chat anzeigen"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            state.showChat ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          onClick={toggleNotes}
          title="Notizen anzeigen"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            state.showNotes ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
        >
          <FileText className="w-4 h-4" />
        </button>

        <button title="Einstellungen" className="w-10 h-10 rounded-full bg-gray-600 text-white hover:bg-gray-500 flex items-center justify-center">
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-600 mx-2" />

        <button
          onClick={handleHangUp}
          title="Auflegen"
          className="w-14 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}

export default VideoRoom;
