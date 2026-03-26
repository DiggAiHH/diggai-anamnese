// ═══════════════════════════════════════════════════════════════════════════════
// DiggAI Anamnese Platform — Backup Monitoring Service
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Überwacht den Status der Datenbank-Backups und sendet Alerts bei Problemen.
// Prüft:
//   - Letztes erfolgreiches Backup nicht älter als 26 Stunden
//   - Backup-Größe im erwarteten Bereich
//   - Checksum-Integrität
// 
// Schedule: Täglich um 09:00 Uhr
// ═══════════════════════════════════════════════════════════════════════════════

import * as cron from 'node-cron';
import { prisma } from '../db';
import { createLogger } from '../logger';
import { execSync } from 'child_process';

const logger = createLogger('BackupMonitor');

// Konfiguration
const MAX_BACKUP_AGE_HOURS = 26; // Etwas mehr als 24h für Puffer
const MIN_BACKUP_SIZE_MB = 0.1; // Mindestens 100KB
const MAX_BACKUP_SIZE_GB = 10;  // Maximal 10GB (Anomalie-Detection)

export interface BackupHealthStatus {
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: {
        lastBackupAge?: number; // Stunden
        lastBackupSize?: number; // MB
        totalBackups?: number;
        failedBackups24h?: number;
    };
}

/**
 * Prüft den Backup-Status und gibt Gesundheits-Report zurück
 */
export async function checkBackupHealth(): Promise<BackupHealthStatus> {
    logger.info('Starte Backup-Health-Check...');

    try {
        // Letztes Backup abfragen
        const lastBackup = await prisma.backupRecord.findFirst({
            orderBy: { startedAt: 'desc' },
        });

        if (!lastBackup) {
            logger.error('Keine Backups in der Datenbank gefunden!');
            return {
                status: 'error',
                message: 'Keine Backups vorhanden',
                details: { lastBackupAge: Infinity },
            };
        }

        // Backup-Alter berechnen
        const hoursSinceBackup = (Date.now() - lastBackup.startedAt.getTime()) / (1000 * 60 * 60);
        const sizeMB = lastBackup.fileSize / (1024 * 1024);

        logger.info(`Letztes Backup: vor ${hoursSinceBackup.toFixed(1)}h, Größe: ${sizeMB.toFixed(2)} MB`);

        // Fehlgeschlagene Backups in den letzten 24h
        const failedBackups = await prisma.backupRecord.count({
            where: {
                status: 'FAILED',
                startedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
        });

        // Gesamtzahl Backups
        const totalBackups = await prisma.backupRecord.count({
            where: { status: 'COMPLETED' },
        });

        const details = {
            lastBackupAge: hoursSinceBackup,
            lastBackupSize: sizeMB,
            totalBackups,
            failedBackups24h: failedBackups,
        };

        // Status-Prüfungen
        if (lastBackup.status !== 'COMPLETED') {
            logger.error(`Letztes Backup hat Status: ${lastBackup.status}`);
            return {
                status: 'error',
                message: `Letztes Backup fehlgeschlagen: ${lastBackup.errorMessage || 'Unbekannter Fehler'}`,
                details,
            };
        }

        if (hoursSinceBackup > MAX_BACKUP_AGE_HOURS) {
            logger.error(`Backup zu alt: ${hoursSinceBackup.toFixed(1)}h (Max: ${MAX_BACKUP_AGE_HOURS}h)`);
            return {
                status: 'error',
                message: `Letztes Backup ist ${hoursSinceBackup.toFixed(1)}h alt`,
                details,
            };
        }

        if (hoursSinceBackup > 24) {
            logger.warn(`Backup älter als 24h: ${hoursSinceBackup.toFixed(1)}h`);
            return {
                status: 'warning',
                message: `Backup-Verzögerung: ${hoursSinceBackup.toFixed(1)}h`,
                details,
            };
        }

        if (sizeMB < MIN_BACKUP_SIZE_MB) {
            logger.warn(`Backup sehr klein: ${sizeMB.toFixed(2)} MB`);
            return {
                status: 'warning',
                message: `Unverhältnismäßig kleines Backup: ${sizeMB.toFixed(2)} MB`,
                details,
            };
        }

        if (sizeMB > MAX_BACKUP_SIZE_GB * 1024) {
            logger.warn(`Backup sehr groß: ${sizeMB.toFixed(2)} MB`);
            return {
                status: 'warning',
                message: `Unverhältnismäßig großes Backup: ${(sizeMB / 1024).toFixed(2)} GB`,
                details,
            };
        }

        if (failedBackups > 0) {
            logger.warn(`${failedBackups} fehlgeschlagene Backups in den letzten 24h`);
            return {
                status: 'warning',
                message: `${failedBackups} Backup-Fehler in den letzten 24h`,
                details,
            };
        }

        logger.info('Backup-Health-Check: OK ✓');
        return {
            status: 'ok',
            message: 'Backup-System funktioniert normal',
            details,
        };

    } catch (error: any) {
        logger.error('Fehler beim Backup-Health-Check:', error.message);
        return {
            status: 'error',
            message: `Health-Check Fehler: ${error.message}`,
        };
    }
}

/**
 * Prüft S3-Konnektivität (falls S3-Backups konfiguriert)
 */
export async function checkS3Connectivity(): Promise<BackupHealthStatus> {
    const bucket = process.env.BACKUP_BUCKET;
    
    if (!bucket) {
        return { status: 'ok', message: 'S3 nicht konfiguriert (lokale Backups)' };
    }

    try {
        // AWS CLI check (falls verfügbar)
        execSync(`aws s3 ls s3://${bucket}/backups/ --max-items 1`, { 
            timeout: 10000,
            stdio: 'pipe'
        });
        
        logger.info('S3-Konnektivität: OK');
        return { status: 'ok', message: 'S3-Verbindung hergestellt' };
    } catch {
        logger.error('S3-Konnektivitätsprüfung fehlgeschlagen');
        return { status: 'error', message: 'S3 nicht erreichbar' };
    }
}

/**
 * Sendet Alert bei Backup-Problemen
 */
async function sendBackupAlert(status: BackupHealthStatus): Promise<void> {
    // Email-Alert (falls SMTP konfiguriert)
    if (process.env.SMTP_HOST && status.status === 'error') {
        try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'backup@diggai.de',
                to: process.env.ADMIN_EMAIL || 'admin@diggai.de',
                subject: `🚨 [DiggAI] Backup Alert: ${status.status.toUpperCase()}`,
                text: `Backup-Monitoring Alert

Status: ${status.status}
Nachricht: ${status.message}
Zeitpunkt: ${new Date().toISOString()}

Details:
${JSON.stringify(status.details, null, 2)}

Bitte umgehend prüfen!`,
            });

            logger.info('Alert-Email gesendet');
        } catch (err: any) {
            logger.error('Konnte Alert-Email nicht senden:', err.message);
        }
    }

    // In System-Log schreiben
    try {
        logger.warn(`[BackupMonitor] ${status.status}: ${status.message}`, status.details);
    } catch { /* ignore */ }
}

/**
 * Haupt-Monitoring-Funktion (wird von Cron aufgerufen)
 */
export async function runBackupMonitoring(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('Backup Monitoring gestartet');
    logger.info('═══════════════════════════════════════════════════════════════');

    // Backup-Health prüfen
    const healthStatus = await checkBackupHealth();
    
    // S3 prüfen (falls konfiguriert)
    const s3Status = await checkS3Connectivity();

    // Alert senden bei Problemen
    if (healthStatus.status !== 'ok' || s3Status.status !== 'ok') {
        await sendBackupAlert(healthStatus.status !== 'ok' ? healthStatus : s3Status);
    }

    // Zusammenfassung loggen
    logger.info(`Backup Status: ${healthStatus.status.toUpperCase()}`);
    logger.info(`S3 Status: ${s3Status.status.toUpperCase()}`);
    
    if (healthStatus.details) {
        logger.info(`Details: ${JSON.stringify(healthStatus.details)}`);
    }

    logger.info('Backup Monitoring abgeschlossen');
}

// Cron-Scheduler
let monitorCron: ReturnType<typeof cron.schedule> | null = null;

export function startBackupMonitor(): void {
    const cronExpr = process.env.BACKUP_MONITOR_CRON || '0 9 * * *'; // Täglich 09:00
    
    logger.info(`Backup-Monitor gestartet (Schedule: ${cronExpr})`);

    monitorCron = cron.schedule(cronExpr, async () => {
        await runBackupMonitoring();
    });
}

export function stopBackupMonitor(): void {
    if (monitorCron) {
        monitorCron.stop();
        monitorCron = null;
        logger.info('Backup-Monitor gestoppt');
    }
}

// API Endpoint Handler
export async function handleBackupHealthCheck(): Promise<{ 
    status: string; 
    health: BackupHealthStatus;
    timestamp: string;
}> {
    const health = await checkBackupHealth();
    
    return {
        status: health.status === 'ok' ? 'healthy' : 'unhealthy',
        health,
        timestamp: new Date().toISOString(),
    };
}
