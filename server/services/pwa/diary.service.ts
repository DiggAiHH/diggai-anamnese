// ─── Modul 5: Patient Portal PWA — Diary Service ─────────────
// Trend-Analyse, Offline-Sync und Export für das Patienten-Tagebuch

// ─── Types ──────────────────────────────────────────────────

export type MetricType =
  | 'bloodPressure'
  | 'heartRate'
  | 'weight'
  | 'temperature'
  | 'bloodSugar'
  | 'mood'
  | 'pain'
  | 'sleep';

export type PeriodType = '7d' | '30d' | '90d' | '365d';

export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface DataPoint {
  date: string; // ISO date string
  value: number;
}

export interface TrendData {
  metric: MetricType;
  period: PeriodType;
  dataPoints: DataPoint[];
  average: number | null;
  min: number | null;
  max: number | null;
  trend: TrendDirection;
  unit: string;
}

export interface OfflineDiaryEntry {
  date?: string;
  mood?: 'VERY_BAD' | 'BAD' | 'NEUTRAL' | 'GOOD' | 'VERY_GOOD';
  painLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  symptoms?: string[];
  notes?: string;
  vitalBp?: string;
  vitalPulse?: number;
  vitalTemp?: number;
  vitalWeight?: number;
  vitalBloodSugar?: number;
  offlineCreated?: boolean;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

// ─── Prisma helper ──────────────────────────────────────────

function getPrisma() {
  const prisma = (globalThis as any).__prisma;
  if (!prisma) {
    throw new Error('Prisma client nicht initialisiert');
  }
  return prisma;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Berechnet die lineare Regressions-Steigung (Least Squares).
 * Gibt die Steigung zurück (positiv = ansteigend, negativ = fallend).
 */
export function linearRegression(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Bestimmt anhand der Steigung und des Metrik-Typs die Trend-Richtung.
 * Für Schmerzen und Blutdruck: positiv = verschlechternd.
 * Für Stimmung, Schlaf: positiv = verbessernd.
 */
function determineTrend(slope: number, metric: MetricType): TrendDirection {
  const THRESHOLD = 0.05;

  // Metriken wo ein Anstieg negativ (verschlechternd) ist
  const negativeMetrics: MetricType[] = ['bloodPressure', 'pain', 'bloodSugar', 'temperature'];

  if (Math.abs(slope) < THRESHOLD) return 'stable';

  if (negativeMetrics.includes(metric)) {
    return slope > 0 ? 'worsening' : 'improving';
  } else {
    // mood, sleep, heartRate, weight — Anstieg ist verbessernd
    return slope > 0 ? 'improving' : 'worsening';
  }
}

/**
 * Gibt die Einheit für eine Metrik zurück.
 */
function getUnit(metric: MetricType): string {
  const units: Record<MetricType, string> = {
    bloodPressure: 'mmHg',
    heartRate: 'bpm',
    weight: 'kg',
    temperature: '°C',
    bloodSugar: 'mg/dL',
    mood: '/5',
    pain: '/10',
    sleep: 'h',
  };
  return units[metric];
}

/**
 * Wandelt einen Mood-String in einen Zahlenwert um (für Trendberechnung).
 */
function moodToNumber(mood: string): number {
  const map: Record<string, number> = {
    VERY_BAD: 1,
    BAD: 2,
    NEUTRAL: 3,
    GOOD: 4,
    VERY_GOOD: 5,
  };
  return map[mood] ?? 3;
}

/**
 * Berechnet die Datumsgrenzen für einen Period-String.
 */
function getPeriodRange(period: PeriodType): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  const days: Record<PeriodType, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365,
  };

  from.setDate(from.getDate() - days[period]);
  return { from, to };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Liefert Trend-Daten für eine bestimmte Metrik und einen Zeitraum.
 */
export async function getTrends(
  accountId: string,
  metric: MetricType,
  period: PeriodType
): Promise<TrendData> {
  const prisma = getPrisma();
  const { from, to } = getPeriodRange(period);

  const entries = await prisma.diaryEntry.findMany({
    where: {
      accountId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  });

  const dataPoints: DataPoint[] = [];

  for (const entry of entries) {
    let value: number | null = null;

    switch (metric) {
      case 'bloodPressure':
        // Systolischer Wert für primäre Kurve; vitalBpSys bevorzugt, Fallback auf vitalBp-Parse
        if (entry.vitalBpSys != null) {
          value = entry.vitalBpSys;
        } else if (entry.vitalBp) {
          const parts = entry.vitalBp.split('/');
          if (parts.length === 2) value = parseInt(parts[0], 10) || null;
        }
        break;
      case 'heartRate':
        value = entry.vitalPulse ?? null;
        break;
      case 'weight':
        value = entry.vitalWeight ?? null;
        break;
      case 'temperature':
        value = entry.vitalTemp ?? null;
        break;
      case 'bloodSugar':
        value = entry.vitalBloodSugar ?? null;
        break;
      case 'mood':
        value = entry.mood ? moodToNumber(entry.mood) : null;
        break;
      case 'pain':
        value = entry.painLevel ?? null;
        break;
      case 'sleep':
        value = entry.sleepHours ?? null;
        break;
    }

    if (value !== null && !isNaN(value as number)) {
      dataPoints.push({
        date: entry.date.toISOString().split('T')[0],
        value: value as number,
      });
    }
  }

  if (dataPoints.length === 0) {
    return {
      metric,
      period,
      dataPoints: [],
      average: null,
      min: null,
      max: null,
      trend: 'stable',
      unit: getUnit(metric),
    };
  }

  const values = dataPoints.map((dp) => dp.value);
  const average = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const slope = linearRegression(values);
  const trend = determineTrend(slope, metric);

  return {
    metric,
    period,
    dataPoints,
    average,
    min,
    max,
    trend,
    unit: getUnit(metric),
  };
}

/**
 * Synchronisiert Offline-Tagebucheinträge (Batch-Insert mit Duplikat-Erkennung).
 */
export async function syncOfflineDiary(
  accountId: string,
  patientId: string,
  entries: OfflineDiaryEntry[]
): Promise<SyncResult> {
  const prisma = getPrisma();
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      const entryDate = entry.date ? new Date(entry.date) : new Date();

      // Duplikat-Prüfung: gleicher Account + Datum innerhalb 1 Minute
      const oneMinuteBefore = new Date(entryDate.getTime() - 60 * 1000);
      const oneMinuteAfter = new Date(entryDate.getTime() + 60 * 1000);

      const duplicate = await prisma.diaryEntry.findFirst({
        where: {
          accountId,
          date: { gte: oneMinuteBefore, lte: oneMinuteAfter },
        },
      });

      if (duplicate) {
        skipped++;
        continue;
      }

      // BP-String "120/80" → vitalBpSys + vitalBpDia
      let vitalBpSys: number | null = null;
      let vitalBpDia: number | null = null;

      if (entry.vitalBp) {
        const parts = entry.vitalBp.split('/');
        if (parts.length === 2) {
          const sys = parseInt(parts[0], 10);
          const dia = parseInt(parts[1], 10);
          if (!isNaN(sys)) vitalBpSys = sys;
          if (!isNaN(dia)) vitalBpDia = dia;
        }
      }

      await prisma.diaryEntry.create({
        data: {
          accountId,
          patientId,
          date: entryDate,
          mood: entry.mood ?? null,
          painLevel: entry.painLevel ?? null,
          sleepQuality: entry.sleepQuality ?? null,
          sleepHours: entry.sleepHours ?? null,
          symptoms: entry.symptoms ?? [],
          notes: entry.notes ?? null,
          vitalBp: entry.vitalBp ?? null,
          vitalBpSys,
          vitalBpDia,
          vitalPulse: entry.vitalPulse ?? null,
          vitalTemp: entry.vitalTemp ?? null,
          vitalWeight: entry.vitalWeight ?? null,
          vitalBloodSugar: entry.vitalBloodSugar ?? null,
          offlineCreated: entry.offlineCreated ?? true,
          syncedAt: new Date(),
        },
      });

      synced++;
    } catch (err: any) {
      errors.push(`Eintrag ${i + 1}: ${err?.message ?? 'Unbekannter Fehler'}`);
    }
  }

  return { synced, skipped, errors };
}

/**
 * Exportiert alle Tagebucheinträge als JSON-Array oder CSV-String.
 */
export async function exportDiary(
  accountId: string,
  format: 'json' | 'csv'
): Promise<string> {
  const prisma = getPrisma();

  const entries = await prisma.diaryEntry.findMany({
    where: { accountId },
    orderBy: { date: 'asc' },
  });

  if (format === 'json') {
    return JSON.stringify(entries, null, 2);
  }

  // CSV-Export
  const headers = [
    'date',
    'mood',
    'painLevel',
    'sleepHours',
    'bpSys',
    'bpDia',
    'pulse',
    'temp',
    'weight',
    'bloodSugar',
    'notes',
  ];

  const rows = entries.map((entry: any) => {
    // BP: vitalBpSys bevorzugt, Fallback auf vitalBp-Parse
    let bpSys = entry.vitalBpSys ?? '';
    let bpDia = entry.vitalBpDia ?? '';

    if ((!bpSys || !bpDia) && entry.vitalBp) {
      const parts = entry.vitalBp.split('/');
      if (parts.length === 2) {
        bpSys = bpSys || parts[0].trim();
        bpDia = bpDia || parts[1].trim();
      }
    }

    const escapeCsv = (val: unknown): string => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCsv(entry.date?.toISOString()?.split('T')[0] ?? ''),
      escapeCsv(entry.mood ?? ''),
      escapeCsv(entry.painLevel ?? ''),
      escapeCsv(entry.sleepHours ?? ''),
      escapeCsv(bpSys),
      escapeCsv(bpDia),
      escapeCsv(entry.vitalPulse ?? ''),
      escapeCsv(entry.vitalTemp ?? ''),
      escapeCsv(entry.vitalWeight ?? ''),
      escapeCsv(entry.vitalBloodSugar ?? ''),
      escapeCsv(entry.notes ?? ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
