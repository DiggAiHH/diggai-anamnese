// @ts-ignore — redis types may not be installed in all environments
import { createClient, type RedisClientType } from 'redis';
import { config } from './config';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Redis-Client initialisieren und verbinden.
 * Graceful degradation: wenn Redis nicht verfügbar, wird In-Memory Fallback genutzt.
 */
export async function initRedis(): Promise<void> {
    if (redisClient || isConnecting) return;
    isConnecting = true;

    try {
        redisClient = createClient({
            url: config.redisUrl,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries: number) => {
                    if (retries > 10) {
                        console.warn('[Redis] Max reconnection attempts reached. Using in-memory fallback.');
                        return new Error('Max retries reached');
                    }
                    return Math.min(retries * 500, 5000);
                },
            },
        });

        redisClient.on('error', (err: Error) => {
            console.warn('[Redis] Connection error (fallback to in-memory):', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] ✅ Connected successfully');
        });

        redisClient.on('reconnecting', () => {
            console.log('[Redis] 🔄 Reconnecting...');
        });

        await redisClient.connect();
    } catch (err) {
        console.warn('[Redis] ⚠️ Could not connect (using in-memory fallback):', (err as Error).message);
        redisClient = null;
    } finally {
        isConnecting = false;
    }
}

/**
 * Redis-Client abrufen. Kann null sein wenn Redis nicht verfügbar.
 */
export function getRedisClient(): RedisClientType | null {
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
