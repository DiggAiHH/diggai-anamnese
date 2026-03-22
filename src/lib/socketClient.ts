// ─── Socket.IO Client — Modul 7/8 ───────────────────────────
// Central Socket.IO connection for real-time NFC/Flow/Chat/Payment events

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let manualDisconnect = false;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    function scheduleReconnect() {
      if (manualDisconnect || reconnectAttempt >= 10) return;
      const base = 1000 * Math.pow(2, reconnectAttempt);
      const jitter = Math.random() * 1000 - 500;
      const delay = Math.min(base + jitter, 30000);
      reconnectAttempt++;
      reconnectTimer = setTimeout(() => {
        if (!manualDisconnect && socket && !socket.connected) {
          socket.connect();
        }
      }, delay);
    }

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket!.id);
      reconnectAttempt = 0;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      // io client disconnect = intentional — do not reconnect
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      scheduleReconnect();
    });
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  manualDisconnect = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (socket?.connected) {
    socket.disconnect();
  }
}

// ─── Agent Task Events ────────────────────────────────────────

export interface AgentTaskUpdate {
    taskId: string;
    agentName: string;
    status: 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
}

export function onAgentTaskUpdate(callback: (update: AgentTaskUpdate) => void): () => void {
    const s = getSocket();
    s.on('agent:task:update', callback);
    return () => s.off('agent:task:update', callback);
}

export default getSocket;
