import Redis from 'ioredis';
import { config } from './config';

let redisClient: Redis | null = null;
let isConnecting = false;

/**
 * Redis-Client initialisieren und verbinden.
 * Graceful degradation: wenn Redis nicht verfügbar, wird In-Memory Fallback genutzt.
 */
export async function initRedis(): Promise<void> {
    if (redisClient || isConnecting) return;
    isConnecting = true;

    try {
        const client = new Redis(config.redisUrl, {
            connectTimeout: 5000,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
                if (times > 10) {
                    console.warn('[Redis] Max reconnection attempts reached. Using in-memory fallback.');
                    return null;
                }
                return Math.min(times * 500, 5000);
            },
            lazyConnect: true,
        });

        client.on('error', (err: Error) => {
            console.warn('[Redis] Connection error (fallback to in-memory):', err.message);
        });

        client.on('connect', () => {
            console.log('[Redis] ✅ Connected successfully');
        });

        client.on('reconnecting', () => {
            console.log('[Redis] 🔄 Reconnecting...');
        });

        await client.connect();
        redisClient = client;
    } catch (err) {
        console.warn('[Redis] ⚠️ Could not connect (using in-memory fallback):', (err as Error).message);
        redisClient = null;
    } finally {
        isConnecting = false;
    }
}

/**
 * Prüft ob Redis verbunden und bereit ist.
 */
export function isRedisReady(): boolean {
    return redisClient?.status === 'ready';
}

/**
 * Redis-Client abrufen. Kann null sein wenn Redis nicht verfügbar.
 */
export function getRedisClient(): Redis | null {
    return redisClient;
}

/**
 * Redis ordentlich beenden (für graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('[Redis] Connection closed');
        } catch {
            // Ignore close errors
        }
        redisClient = null;
    }
}
