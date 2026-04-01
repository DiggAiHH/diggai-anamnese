/**
 * Mock Dashboard Data Engine
 * 
 * Generiert realistische Testdaten für Dashboard-Entwicklung.
 * Simuliert Echtzeit-Updates für Patienten-Warteschlangen.
 */

import { faker } from '@faker-js/faker';
import { subHours, subMinutes } from 'date-fns';
import type {
  PatientQueueItem,
  QueueStatus,
  TriageLevel,
  CriticalFlag,
  QuickInfo,
  MockOptions,
  DashboardStats,
} from '../types/dashboard';

// Default-Optionen
const DEFAULT_OPTIONS: Required<MockOptions> = {
  patientCount: 15,
  simulationSpeed: 3000,
  enableRealtime: true,
  criticalProbability: 0.1,
  warningProbability: 0.2,
};

// Services-Liste
const SERVICES = [
  'Termin / Anamnese',
  'Rezeptanfrage',
  'AU (Krankschreibung)',
  'Überweisung',
  'BG-Unfall',
  'Dateien / Befunde',
  'Telefonanfrage',
  'Nachricht',
];

// Deutsche Namen für realistischere Daten
const FIRST_NAMES = [
  'Max', 'Maria', 'Thomas', 'Anna', 'Michael', 'Sophie', 'Stefan', 'Emma',
  'Andreas', 'Laura', 'Christian', 'Sarah', 'Markus', 'Julia', 'Alexander', 'Lena',
  'Daniel', 'Hannah', 'Matthias', 'Lisa', 'Sebastian', 'Katharina', 'Florian', 'Nina'
];

const LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann',
  'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt'
];

/**
 * Generiert einen zufälligen deutschen Namen
 */
function generateGermanName(): { first: string; last: string; full: string } {
  const first = faker.helpers.arrayElement(FIRST_NAMES);
  const last = faker.helpers.arrayElement(LAST_NAMES);
  return {
    first,
    last,
    full: `${first} ${last}`,
  };
}

/**
 * Generiert einen zufälligen Status mit gewichteter Wahrscheinlichkeit
 */
function generateRandomStatus(): QueueStatus {
  const statuses: QueueStatus[] = [
    'PENDING',
    'PENDING',
    'PENDING',
    'IN_ANAMNESE',
    'IN_ANAMNESE',
    'IN_ANAMNESE',
    'READY_FOR_DOCTOR',
    'READY_FOR_DOCTOR',
    'IN_TREATMENT',
    'COMPLETED',
  ];
  return faker.helpers.arrayElement(statuses);
}

/**
 * Generiert ein Triage-Level mit gewichteter Wahrscheinlichkeit
 */
function generateTriageLevel(options: Required<MockOptions>): TriageLevel {
  const rand = Math.random();
  if (rand < options.criticalProbability) return 'CRITICAL';
  if (rand < options.criticalProbability + options.warningProbability) return 'WARNING';
  return 'NORMAL';
}

/**
 * Generiert kritische Flags basierend auf Triage-Level
 */
function generateCriticalFlags(triageLevel: TriageLevel): CriticalFlag[] {
  const flags: CriticalFlag[] = [];
  
  if (triageLevel === 'CRITICAL') {
    flags.push({
      id: `flag-${faker.string.uuid()}`,
      type: 'ALLERGY',
      severity: 'HIGH',
      description: 'Schwere Penicillin-Allergie',
    });
  }
  
  if (Math.random() > 0.7) {
    flags.push({
      id: `flag-${faker.string.uuid()}`,
      type: 'CHRONIC',
      severity: 'MEDIUM',
      description: faker.helpers.arrayElement(['Diabetes Typ 2', 'Hypertonie', 'Asthma']),
    });
  }
  
  if (Math.random() > 0.8) {
    flags.push({
      id: `flag-${faker.string.uuid()}`,
      type: 'MEDICATION',
      severity: 'LOW',
      description: faker.helpers.arrayElement(['Marcumar', 'Insulin', 'Blutdrucksenker']),
    });
  }
  
  return flags;
}

/**
 * Generiert QuickInfo für einen Patienten
 */
function generateQuickInfo(triageLevel: TriageLevel): QuickInfo {
  const hasAllergies = Math.random() > 0.6 || triageLevel === 'CRITICAL';
  const hasChronic = Math.random() > 0.7;
  const hasMedications = Math.random() > 0.5;
  
  return {
    allergies: hasAllergies 
      ? faker.helpers.arrayElements(['Penicillin', 'Pollen', 'Hausstaub', 'Nüsse', 'Latex'], { min: 1, max: 2 })
      : [],
    chronicConditions: hasChronic
      ? faker.helpers.arrayElements(['Diabetes', 'Hypertonie', 'Asthma', 'Schilddrüsenunterfunktion'], { min: 1, max: 2 })
      : [],
    currentMedications: hasMedications
      ? faker.helpers.arrayElements(['Metformin', 'Ramipril', 'Simvastatin', 'L-Thyroxin'], { min: 1, max: 3 })
      : [],
    hasRedFlags: triageLevel === 'CRITICAL' || Math.random() > 0.85,
  };
}

/**
 * Berechnet die Wartezeit basierend auf Check-in Zeit
 */
function calculateWaitTime(checkInTime: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - checkInTime.getTime();
  return Math.floor(diffMs / (1000 * 60)); // Minuten
}

/**
 * Mock Dashboard Engine
 * 
 * Generiert und verwaltet Mock-Daten für Dashboard-Entwicklung
 */
export class MockDashboardEngine {
  private options: Required<MockOptions>;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(data: PatientQueueItem[]) => void> = new Set();
  private queueItems: PatientQueueItem[] = [];
  private idCounter = 0;

  constructor(options: MockOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.generateInitialData();
  }

  /**
   * Generiert die initialen Patienten-Daten
   */
  private generateInitialData(): void {
    this.queueItems = Array.from({ length: this.options.patientCount }, (_, i) =>
      this.generatePatient(i)
    );
  }

  /**
   * Generiert einen einzelnen Patienten
   */
  private generatePatient(_index: number): PatientQueueItem {
    const name = generateGermanName();
    const triageLevel = generateTriageLevel(this.options);
    const status = generateRandomStatus();
    const checkInTime = subHours(new Date(), faker.number.float({ min: 0.1, max: 3 }));
    
    this.idCounter++;

    return {
      id: `patient-${this.idCounter}`,
      sessionId: faker.string.uuid(),
      patientName: name.full,
      displayName: `${name.first} ${name.last.charAt(0)}.`,
      status,
      triageLevel,
      service: faker.helpers.arrayElement(SERVICES),
      waitTimeMinutes: calculateWaitTime(checkInTime),
      checkInTime,
      criticalFlags: generateCriticalFlags(triageLevel),
      quickInfo: generateQuickInfo(triageLevel),
      assignedDoctorId: status === 'IN_TREATMENT' ? `doctor-${faker.number.int({ min: 1, max: 3 })}` : undefined,
      assignedDoctorName: status === 'IN_TREATMENT' ? faker.helpers.arrayElement(['Dr. Schmidt', 'Dr. Müller', 'Dr. Weber']) : undefined,
    };
  }

  /**
   * Startet die Echtzeit-Simulation
   */
  startRealtimeSimulation(): void {
    if (this.intervalId) return; // Bereits gestartet
    
    this.intervalId = setInterval(() => {
      this.simulateChanges();
      this.notifyListeners();
    }, this.options.simulationSpeed);
  }

  /**
   * Stoppt die Echtzeit-Simulation
   */
  stopRealtimeSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Simuliert Änderungen in der Warteschlange
   */
  private simulateChanges(): void {
    // Wartezeiten erhöhen (jede Minute)
    this.queueItems = this.queueItems.map(patient => ({
      ...patient,
      waitTimeMinutes: patient.waitTimeMinutes + 1,
    }));

    // Zufällige Status-Änderungen (15% Chance)
    this.queueItems.forEach(patient => {
      if (Math.random() > 0.85) {
        patient.status = this.getNextStatus(patient.status);
      }
    });

    // Neue Patienten hinzufügen (5% Chance pro Update)
    if (Math.random() > 0.95 && this.queueItems.length < 25) {
      this.queueItems.push(this.generatePatient(this.queueItems.length));
    }

    // Abgeschlossene Patienten entfernen (10% Chance)
    this.queueItems = this.queueItems.filter(patient => {
      if (patient.status === 'COMPLETED' && Math.random() > 0.9) {
        return false;
      }
      return true;
    });
  }

  /**
   * Bestimmt den nächsten Status basierend auf dem aktuellen
   */
  private getNextStatus(currentStatus: QueueStatus): QueueStatus {
    const transitions: Record<QueueStatus, QueueStatus[]> = {
      'PENDING': ['IN_ANAMNESE', 'CANCELLED'],
      'IN_ANAMNESE': ['READY_FOR_DOCTOR', 'CANCELLED'],
      'READY_FOR_DOCTOR': ['IN_TREATMENT'],
      'IN_TREATMENT': ['COMPLETED'],
      'COMPLETED': ['COMPLETED'],
      'CANCELLED': ['CANCELLED'],
    };
    
    return faker.helpers.arrayElement(transitions[currentStatus]);
  }

  /**
   * Abonniert Änderungen an der Warteschlange
   */
  subscribe(callback: (data: PatientQueueItem[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.queueItems]); // Initiale Daten senden
    
    return () => this.listeners.delete(callback);
  }

  /**
   * Benachrichtigt alle Listener über Änderungen
   */
  private notifyListeners(): void {
    const data = [...this.queueItems];
    this.listeners.forEach(callback => callback(data));
  }

  /**
   * Gibt die aktuellen Queue-Items zurück
   */
  getQueueItems(): PatientQueueItem[] {
    return [...this.queueItems];
  }

  /**
   * Gibt aktuelle Statistiken zurück
   */
  getStats(): DashboardStats {
    const items = this.queueItems;
    const totalToday = items.length + faker.number.int({ min: 5, max: 20 }); // + abgeschlossene
    
    return {
      totalToday,
      activeCount: items.filter(i => i.status !== 'COMPLETED' && i.status !== 'CANCELLED').length,
      completedCount: totalToday - items.length,
      averageWaitTime: Math.floor(items.reduce((sum, i) => sum + i.waitTimeMinutes, 0) / (items.length || 1)),
      criticalCount: items.filter(i => i.triageLevel === 'CRITICAL').length,
      warningCount: items.filter(i => i.triageLevel === 'WARNING').length,
    };
  }

  /**
   * Ändert den Status eines Patienten (für Drag & Drop)
   */
  movePatient(patientId: string, newStatus: QueueStatus): void {
    const patient = this.queueItems.find(p => p.id === patientId);
    if (patient) {
      patient.status = newStatus;
      this.notifyListeners();
    }
  }

  /**
   * Aktualisiert einen Patienten
   */
  updatePatient(patientId: string, updates: Partial<PatientQueueItem>): void {
    const index = this.queueItems.findIndex(p => p.id === patientId);
    if (index !== -1) {
      this.queueItems[index] = { ...this.queueItems[index], ...updates };
      this.notifyListeners();
    }
  }

  /**
   * Cleanup - stoppt Simulation und entfernt Listener
   */
  destroy(): void {
    this.stopRealtimeSimulation();
    this.listeners.clear();
  }
}

// Singleton-Instanz für einfachen Zugriff
let mockEngineInstance: MockDashboardEngine | null = null;

/**
 * Gibt die Singleton-Instanz der Mock Engine zurück
 */
export function getMockDashboardEngine(options?: MockOptions): MockDashboardEngine {
  if (!mockEngineInstance) {
    mockEngineInstance = new MockDashboardEngine(options);
  }
  return mockEngineInstance;
}

/**
 * Zerstört die Singleton-Instanz
 */
export function destroyMockDashboardEngine(): void {
  if (mockEngineInstance) {
    mockEngineInstance.destroy();
    mockEngineInstance = null;
  }
}

/**
 * Generiert Mock-Daten für Analytics (Stundendurchsatz)
 */
export function generateMockHourlyData(): Array<{ hour: string; patients: number; avgWaitTime: number; triageAlerts: number }> {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  
  return hours.map(hour => ({
    hour,
    patients: faker.number.int({ min: 2, max: 15 }),
    avgWaitTime: faker.number.int({ min: 5, max: 35 }),
    triageAlerts: faker.number.int({ min: 0, max: 3 }),
  }));
}

/**
 * Generiert Mock-Daten für Funnel-Chart
 */
export function generateMockFunnelData(): Array<{ name: string; value: number; dropOff: number; avgTime: number }> {
  const baseValue = 100;
  
  return [
    { name: 'Check-in', value: baseValue, dropOff: 0, avgTime: 2 },
    { name: 'Anamnese gestartet', value: Math.floor(baseValue * 0.85), dropOff: Math.floor(baseValue * 0.15), avgTime: 3 },
    { name: 'Anamnese abgeschlossen', value: Math.floor(baseValue * 0.72), dropOff: Math.floor(baseValue * 0.13), avgTime: 8 },
    { name: 'Arzt gesehen', value: Math.floor(baseValue * 0.68), dropOff: Math.floor(baseValue * 0.04), avgTime: 15 },
    { name: 'Behandlung abgeschlossen', value: Math.floor(baseValue * 0.65), dropOff: Math.floor(baseValue * 0.03), avgTime: 22 },
  ];
}

/**
 * Generiert Mock-Daten für Heatmap
 */
export function generateMockHeatmapData(): Array<{ day: string; hour: number; value: number }> {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  const data: Array<{ day: string; hour: number; value: number }> = [];
  
  days.forEach(day => {
    for (let hour = 8; hour <= 17; hour++) {
      data.push({
        day,
        hour,
        value: faker.number.int({ min: 0, max: 10 }),
      });
    }
  });
  
  return data;
}
