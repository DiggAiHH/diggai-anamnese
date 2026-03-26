// ============================================
// WebSocket Notifier for Real-time PVS Updates
// ============================================

import { EventEmitter } from 'events';
import type { Server as SocketServer, Socket } from 'socket.io';

export type PvsNotificationType = 
  | 'pvs.connected'
  | 'pvs.disconnected'
  | 'pvs.sync.started'
  | 'pvs.sync.completed'
  | 'pvs.sync.failed'
  | 'pvs.file.received'
  | 'pvs.file.processed'
  | 'pvs.export.completed'
  | 'pvs.import.completed'
  | 'pvs.error';

export interface PvsNotification {
  type: PvsNotificationType;
  connectionId: string;
  pvsType: string;
  tenantId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: string;
}

export class PvsWebSocketNotifier extends EventEmitter {
  private io: SocketServer | null = null;
  private connectedClients = new Map<string, Socket>();

  initialize(io: SocketServer): void {
    this.io = io;
    
    io.on('connection', (socket: Socket) => {
      this.connectedClients.set(socket.id, socket);

      socket.on('subscribe:tenant', (tenantId: string) => {
        socket.join(`tenant:${tenantId}`);
      });

      socket.on('subscribe:pvs', (connectionId: string) => {
        socket.join(`pvs:${connectionId}`);
      });

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
      });
    });
  }

  notifyTenant(tenantId: string, notification: Omit<PvsNotification, 'timestamp'>): void {
    if (!this.io) return;
    const fullNotification: PvsNotification = { ...notification, timestamp: new Date() };
    this.io.to(`tenant:${tenantId}`).emit('pvs:notification', fullNotification);
  }

  notifyConnection(connectionId: string, notification: Omit<PvsNotification, 'timestamp'>): void {
    if (!this.io) return;
    const fullNotification: PvsNotification = { ...notification, timestamp: new Date() };
    this.io.to(`pvs:${connectionId}`).emit('pvs:notification', fullNotification);
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}

export const pvsWebSocketNotifier = new PvsWebSocketNotifier();
