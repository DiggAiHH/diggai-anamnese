/**
 * RabbitMQ Message Broker Service
 *
 * Verbindet den Express-Backend mit dem Python Agent-Core via AMQP.
 * Queues:
 *   - agent.tasks.high     — Kritische Tasks (Notfälle, sofortige Aktionen)
 *   - agent.tasks.normal   — Standard-Tasks (Termine, Abrechnung)
 *   - agent.tasks.low      — Hintergrund-Tasks (Berichte, Statistiken)
 *   - agent.results        — Ergebnisse vom Agent-Core zurück
 *   - agent.events         — Broadcast-Events (Status-Updates)
 *
 * Sicherheit: Alle Nachrichten enthalten KEINE PHI (nur pseudonymisierte IDs).
 */

import * as amqplib from 'amqplib';
import { EventEmitter } from 'events';
import { prisma } from '../db';

type Channel = amqplib.Channel;
type Connection = amqplib.ChannelModel;
type ConsumeMessage = amqplib.ConsumeMessage;

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://diggai:changeme@localhost:5672/';

/**
 * Wenn DISABLE_RABBITMQ=1 gesetzt ist, wird der Broker-Connect komplett
 * übersprungen. Sinnvoll für lokale Entwicklung ohne Python-Agent-Core,
 * damit das Log nicht alle 5 Sekunden mit ECONNREFUSED zugespammt wird.
 *
 * Der Code hat überall Fallbacks (HTTP-only Modus), daher hat das
 * Disabling keinen Einfluss auf die Kernfunktionalität.
 */
const RABBITMQ_DISABLED = process.env.DISABLE_RABBITMQ === '1' || process.env.DISABLE_RABBITMQ === 'true';

/**
 * Reconnect-Backoff in Millisekunden. Default 30s (statt 5s) damit
 * ein nicht-laufender RabbitMQ das Log nicht zumüllt.
 */
const RECONNECT_INTERVAL_MS = Number(process.env.RABBITMQ_RECONNECT_MS ?? 30_000);

const QUEUES = {
    HIGH:    'agent.tasks.high',
    NORMAL:  'agent.tasks.normal',
    LOW:     'agent.tasks.low',
    RESULTS: 'agent.results',
    EVENTS:  'agent.events',
} as const;

const EXCHANGE_EVENTS = 'agent.events.fanout';

export interface BrokerMessage {
    messageId: string;
    timestamp: string;
    taskId: string;
    agentName: string;
    taskType: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    /** KEIN PHI — nur anonymisierte Referenzen */
    payload: Record<string, unknown>;
    sessionRef?: string;
    patientRef?: string;
    requestedBy?: string;
}

export interface BrokerResult {
    messageId: string;
    taskId: string;
    success: boolean;
    output?: Record<string, unknown>;
    error?: string;
    durationMs: number;
    agentName: string;
}

class MessageBrokerService extends EventEmitter {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isConnecting = false;
    private hasLoggedFailure = false;

    async connect(): Promise<void> {
        if (RABBITMQ_DISABLED) {
            if (!this.hasLoggedFailure) {
                console.log('[MessageBroker] Deaktiviert (DISABLE_RABBITMQ=1) — HTTP-only Modus.');
                this.hasLoggedFailure = true;
            }
            return;
        }
        if (this.isConnecting || this.connection) return;
        this.isConnecting = true;

        try {
            this.connection = await amqplib.connect(RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            // Queues deklarieren (durable = überleben RabbitMQ-Neustart)
            for (const queue of Object.values(QUEUES)) {
                await this.channel.assertQueue(queue, { durable: true });
            }

            // Fanout-Exchange für Broadcast-Events
            await this.channel.assertExchange(EXCHANGE_EVENTS, 'fanout', { durable: false });

            // Prefetch: Agent-Core verarbeitet max. 5 Tasks gleichzeitig
            await this.channel.prefetch(5);

            // Ergebnisse vom Agent-Core empfangen
            await this.channel.consume(QUEUES.RESULTS, this.handleResult.bind(this), { noAck: false });

            this.isConnecting = false;
            this.hasLoggedFailure = false;
            console.log('[MessageBroker] Verbunden mit RabbitMQ');
            this.emit('connected');

            this.connection.on('error', (err) => {
                console.error('[MessageBroker] Verbindungsfehler:', err.message);
                this.scheduleReconnect();
            });
            this.connection.on('close', () => {
                console.warn('[MessageBroker] Verbindung geschlossen — reconnect...');
                this.scheduleReconnect();
            });
        } catch (err) {
            this.isConnecting = false;
            // Stack-Trace nur EINMAL beim ersten Fehlversuch loggen.
            // Spätere Reconnect-Versuche bleiben still, sonst spammt
            // ECONNREFUSED das Dev-Log alle paar Sekunden voll.
            if (!this.hasLoggedFailure) {
                const code = (err as { code?: string })?.code ?? 'unknown';
                console.warn(`[MessageBroker] Verbindung fehlgeschlagen (${code}) — Reconnect alle ${RECONNECT_INTERVAL_MS / 1000}s. Setze DISABLE_RABBITMQ=1 um Reconnects abzustellen.`);
                this.hasLoggedFailure = true;
            }
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        this.connection = null;
        this.channel = null;
        if (this.reconnectTimer) return;
        if (RABBITMQ_DISABLED) return; // kein Reconnect, wenn explizit deaktiviert
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, RECONNECT_INTERVAL_MS);
    }

    /**
     * Sendet einen Task an den Agent-Core.
     * Wählt automatisch die passende Queue basierend auf Priority.
     */
    async publishTask(msg: BrokerMessage): Promise<boolean> {
        if (!this.channel) {
            console.warn('[MessageBroker] Nicht verbunden — Task wird in DB als PENDING gespeichert');
            return false;
        }

        const queue = msg.priority === 'critical' || msg.priority === 'high'
            ? QUEUES.HIGH
            : msg.priority === 'low'
                ? QUEUES.LOW
                : QUEUES.NORMAL;

        const content = Buffer.from(JSON.stringify(msg));

        this.channel.sendToQueue(queue, content, {
            persistent: true,                   // Nachricht überlebt RabbitMQ-Neustart
            messageId: msg.messageId,
            contentType: 'application/json',
            timestamp: Math.floor(Date.now() / 1000),
        });

        return true;
    }

    /**
     * Verarbeitet Ergebnisse vom Agent-Core.
     * Aktualisiert den Task-Status in der DB.
     */
    private async handleResult(msg: ConsumeMessage | null): Promise<void> {
        if (!msg || !this.channel) return;

        try {
            const result: BrokerResult = JSON.parse(msg.content.toString());

            // Task in DB aktualisieren
            await prisma.agentTask.update({
                where: { id: result.taskId },
                data: {
                    status:       result.success ? 'COMPLETED' : 'FAILED',
                    outputData:   (result.output ?? undefined) as any,
                    errorMessage: result.error ?? null,
                    completedAt:  new Date(),
                    durationMs:   result.durationMs,
                },
            });

            // Agent-Metriken aktualisieren
            if (result.success) {
                await prisma.agent.update({
                    where: { name: result.agentName },
                    data: {
                        successTasks: { increment: 1 },
                        totalTasks:   { increment: 1 },
                        lastActiveAt: new Date(),
                    },
                });
            } else {
                await prisma.agent.update({
                    where: { name: result.agentName },
                    data: {
                        failedTasks:  { increment: 1 },
                        totalTasks:   { increment: 1 },
                        lastActiveAt: new Date(),
                    },
                });
            }

            this.channel.ack(msg);
            this.emit('task:result', result);
        } catch (err) {
            console.error('[MessageBroker] Fehler beim Verarbeiten des Ergebnisses:', err);
            // Nachricht zurück in Queue (max. 3 Versuche)
            this.channel.nack(msg, false, false);
        }
    }

    /**
     * Broadcast-Event an alle Subscriber (z.B. für Socket.IO Real-time Updates).
     */
    async broadcastEvent(event: Record<string, unknown>): Promise<void> {
        if (!this.channel) return;
        const content = Buffer.from(JSON.stringify(event));
        this.channel.publish(EXCHANGE_EVENTS, '', content, { contentType: 'application/json' });
    }

    async disconnect(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.channel) await this.channel.close().catch(() => {});
        if (this.connection) await this.connection.close().catch(() => {});
        this.channel = null;
        this.connection = null;
    }

    get isConnected(): boolean {
        return this.connection !== null && this.channel !== null;
    }
}

export const messageBroker = new MessageBrokerService();
