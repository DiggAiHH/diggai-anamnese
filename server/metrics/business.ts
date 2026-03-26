// Business Metrics Collector
import { getRedisClient } from '../redis';

interface BusinessMetrics {
  activeSessions: number;
  completedAnamnesen: number;
  triageAlertsHour: number;
  userRegistrations: number;
  apiErrorRate: number;
  avgResponseTime: number;
}

class BusinessMetricsCollector {
  private metrics: Partial<BusinessMetrics> = {};
  
  async increment(metric: keyof BusinessMetrics, value: number = 1) {
    const redis = getRedisClient();
    if (redis) {
      await redis.hincrby('metrics:business', metric, value);
      // Setze TTL für automatische Rotation
      await redis.expire('metrics:business', 86400); // 24h
    }
  }
  
  async set(metric: keyof BusinessMetrics, value: number) {
    const redis = getRedisClient();
    if (redis) {
      await redis.hset('metrics:business', metric, String(value));
    }
  }
  
  async getAll(): Promise<Partial<BusinessMetrics>> {
    const redis = getRedisClient();
    if (redis) {
      const data = await redis.hgetall('metrics:business');
      return Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, parseFloat(v)])
      ) as Partial<BusinessMetrics>;
    }
    return {};
  }
}

export const businessMetrics = new BusinessMetricsCollector();

// Convenience-Funktionen
export const trackSessionStart = () => businessMetrics.increment('activeSessions');
export const trackSessionEnd = () => businessMetrics.increment('activeSessions', -1);
export const trackAnamneseComplete = () => businessMetrics.increment('completedAnamnesen');
export const trackTriageAlert = () => businessMetrics.increment('triageAlertsHour');
