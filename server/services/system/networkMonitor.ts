// Modul 6: Network Health Monitor — 60s polling for DB, Redis, TI, Internet
import type { NetworkStatus, ServiceHealth } from './types';

const prisma = () => (globalThis as any).__prisma;

let lastStatus: NetworkStatus | null = null;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = prisma();
    if (!db) return { status: 'disconnected', lastChecked: new Date().toISOString() };
    await db.$queryRaw`SELECT 1`;
    return { status: 'connected', latencyMs: Date.now() - start, lastChecked: new Date().toISOString() };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - start, lastChecked: new Date().toISOString(), errorMessage: e.message };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { getRedisClient } = await import('../../redis');
    const redis = getRedisClient();
    if (!redis || redis.status !== 'ready') return { status: 'disconnected', lastChecked: new Date().toISOString() };
    await redis.ping();
    return { status: 'connected', latencyMs: Date.now() - start, lastChecked: new Date().toISOString() };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - start, lastChecked: new Date().toISOString(), errorMessage: e.message };
  }
}

async function checkTIKonnektor(): Promise<ServiceHealth> {
  const url = process.env.TI_KONNEKTOR_URL;
  if (!url) return { status: 'disconnected', lastChecked: new Date().toISOString(), errorMessage: 'TI_KONNEKTOR_URL nicht konfiguriert' };

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${url}/connector.sds`, { signal: controller.signal, method: 'GET' });
    clearTimeout(timeout);
    return {
      status: response.ok ? 'connected' : 'error',
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - start, lastChecked: new Date().toISOString(), errorMessage: e.message };
  }
}

async function checkInternet(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://dns.google/resolve?name=google.com&type=A', { signal: controller.signal });
    clearTimeout(timeout);
    return { status: response.ok ? 'connected' : 'error', latencyMs: Date.now() - start, lastChecked: new Date().toISOString() };
  } catch (e: any) {
    return { status: 'disconnected', latencyMs: Date.now() - start, lastChecked: new Date().toISOString(), errorMessage: e.message };
  }
}

async function checkDns(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { promises: dns } = await import('dns');
    await dns.resolve4('google.com');
    return { status: 'connected', latencyMs: Date.now() - start, lastChecked: new Date().toISOString() };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - start, lastChecked: new Date().toISOString(), errorMessage: e.message };
  }
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (lastStatus && Date.now() - new Date(lastStatus.lastCheck).getTime() < 10000) {
    return lastStatus; // Cache for 10s
  }

  const [database, redis, tiKonnektor, internet, dns] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkTIKonnektor(),
    checkInternet(),
    checkDns(),
  ]);

  lastStatus = {
    database,
    redis,
    tiKonnektor,
    internet,
    dns,
    uptime: Math.floor(process.uptime()),
    lastCheck: new Date().toISOString(),
  };

  return lastStatus;
}

export function startNetworkMonitor(intervalSec: number = 60): void {
  if (monitorInterval) return;
  console.log(`[NetworkMonitor] Starting health monitoring every ${intervalSec}s`);
  monitorInterval = setInterval(async () => {
    try {
      await getNetworkStatus();
    } catch (e) {
      console.error('[NetworkMonitor] Health check error:', e);
    }
  }, intervalSec * 1000);
}

export function stopNetworkMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function getCachedNetworkStatus(): NetworkStatus | null {
  return lastStatus;
}
