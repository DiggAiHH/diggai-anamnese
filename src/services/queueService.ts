/**
 * Queue Service
 * 
 * Service-Layer fuer Queue-Operationen.
 * Unterstuetzt Mock-Daten (Entwicklung) und echte API (Produktion).
 */

import type {
  PatientQueueItem,
  QueueStatus,
  DashboardStats,
  QueueApiResponse,
} from '../types/dashboard';
import { getSocket, connectSocket } from '../lib/socketClient';
import { getMockDashboardEngine, destroyMockDashboardEngine } from '../data/mockDashboards';

// Feature-Flag fuer Mock-Daten
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DASHBOARD === 'true' || !import.meta.env.VITE_API_URL;

export interface QueueService {
  getQueue(): Promise<PatientQueueItem[]>;
  getStats(): Promise<DashboardStats>;
  updateStatus(patientId: string, newStatus: QueueStatus): Promise<void>;
  assignDoctor(patientId: string, doctorId: string): Promise<void>;
  subscribe(callback: (items: PatientQueueItem[]) => void): () => void;
  startRealtime(): void;
  stopRealtime(): void;
  destroy(): void;
}

// ═══════════════════════════════════════════════════════════
// Mock Implementation
// ═══════════════════════════════════════════════════════════

class MockQueueService implements QueueService {
  private engine: ReturnType<typeof getMockDashboardEngine> | null = null;
  private listeners: Set<(items: PatientQueueItem[]) => void> = new Set();

  private getEngine() {
    if (!this.engine) {
      this.engine = getMockDashboardEngine();
    }
    return this.engine;
  }

  async getQueue(): Promise<PatientQueueItem[]> {
    return this.getEngine().getQueueItems();
  }

  async getStats(): Promise<DashboardStats> {
    return this.getEngine().getStats();
  }

  async updateStatus(patientId: string, newStatus: QueueStatus): Promise<void> {
    this.getEngine().movePatient(patientId, newStatus);
  }

  async assignDoctor(patientId: string, doctorId: string): Promise<void> {
    this.getEngine().updatePatient(patientId, {
      assignedDoctorId: doctorId,
      assignedDoctorName: `Dr. ${doctorId}`,
    });
  }

  subscribe(callback: (items: PatientQueueItem[]) => void): () => void {
    this.listeners.add(callback);
    const unsubscribe = this.getEngine().subscribe((items: PatientQueueItem[]) => {
      callback(items);
      this.listeners.forEach((cb) => cb(items));
    });
    return () => {
      unsubscribe();
      this.listeners.delete(callback);
    };
  }

  startRealtime(): void {
    this.getEngine().startRealtimeSimulation();
  }

  stopRealtime(): void {
    this.getEngine().stopRealtimeSimulation();
  }

  destroy(): void {
    this.stopRealtime();
    if (this.engine) {
      destroyMockDashboardEngine();
      this.engine = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// API Implementation
// ═══════════════════════════════════════════════════════════

class ApiQueueService implements QueueService {
  private listeners: Set<(items: PatientQueueItem[]) => void> = new Set();
  private currentItems: PatientQueueItem[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupSocketListeners();
  }

  async getQueue(): Promise<PatientQueueItem[]> {
    const response = await fetch('/api/queue');
    if (!response.ok) throw new Error('Failed to fetch queue');
    const data: QueueApiResponse = await response.json();
    this.currentItems = data.items;
    return data.items;
  }

  async getStats(): Promise<DashboardStats> {
    const response = await fetch('/api/queue/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    return data.stats as DashboardStats;
  }

  async updateStatus(patientId: string, newStatus: QueueStatus): Promise<void> {
    const response = await fetch(`/api/queue/${patientId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!response.ok) throw new Error('Failed to update status');

    const s = getSocket();
    s.emit('queue:status:changed', { patientId, newStatus });
  }

  async assignDoctor(patientId: string, doctorId: string): Promise<void> {
    const response = await fetch(`/api/queue/${patientId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId }),
    });
    
    if (!response.ok) throw new Error('Failed to assign doctor');
  }

  subscribe(callback: (items: PatientQueueItem[]) => void): () => void {
    this.listeners.add(callback);
    if (this.currentItems.length > 0) {
      callback(this.currentItems);
    }
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(items: PatientQueueItem[]): void {
    this.currentItems = items;
    this.listeners.forEach((cb) => cb(items));
  }

  private setupSocketListeners(): void {
    const s = getSocket();

    s.on('queue:updated', (data: { items: PatientQueueItem[] }) => {
      this.notifyListeners(data.items);
    });
    
    s.on('queue:patient:added', (patient: PatientQueueItem) => {
      this.notifyListeners([...this.currentItems, patient]);
    });
    
    s.on('queue:patient:updated', (update: { patientId: string; data: Partial<PatientQueueItem> }) => {
      this.notifyListeners(
        this.currentItems.map((p) =>
          p.id === update.patientId ? { ...p, ...update.data } : p
        )
      );
    });
    
    s.on('queue:patient:removed', (patientId: string) => {
      this.notifyListeners(this.currentItems.filter((p) => p.id !== patientId));
    });
  }

  startRealtime(): void {
    const s = getSocket();
    if (!s.connected) {
      connectSocket();
    }
    
    this.pollingInterval = setInterval(async () => {
      try {
        const items = await this.getQueue();
        this.notifyListeners(items);
      } catch (error) {
        console.warn('[QueueService] Polling error:', error);
      }
    }, 5000);
  }

  stopRealtime(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  destroy(): void {
    this.stopRealtime();
    this.listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════

let queueServiceInstance: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = USE_MOCK_DATA 
      ? new MockQueueService() 
      : new ApiQueueService();
  }
  return queueServiceInstance;
}

export function destroyQueueService(): void {
  if (queueServiceInstance) {
    queueServiceInstance.destroy();
    queueServiceInstance = null;
  }
}

export function isMockMode(): boolean {
  return USE_MOCK_DATA;
}

export { USE_MOCK_DATA };
