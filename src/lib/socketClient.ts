// ─── Socket.IO Client — Modul 7/8 ───────────────────────────
// Central Socket.IO connection for real-time NFC/Flow/Chat/Payment events

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket!.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
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
