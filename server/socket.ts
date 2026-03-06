import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { config } from './config';
import { prisma } from './db';
import type { AuthPayload } from './middleware/auth';
import { isTokenBlacklisted } from './middleware/auth';
import { sanitizeText } from './services/sanitize';

let io: Server | null = null;

// ─── Staff Online Presence Tracking ─────────────────────────
interface OnlineStaffUser {
    socketId: string;
    userId: string;
    displayName: string;
    role: string;
    status: 'online' | 'away' | 'busy';
}
const onlineStaff: Map<string, OnlineStaffUser> = new Map();

/**
 * Returns the Socket.io server instance
 */
export function getIO(): Server | null {
    return io;
}

/**
 * Emits an agent task status update to all connected staff clients.
 * Safe to call even when io is not yet initialized.
 */
export function emitAgentTaskUpdate(payload: {
    taskId: string;
    agentName: string;
    status: 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
}): void {
    if (io) {
        io.emit('agent:task:update', payload);
    }
}

function broadcastStaffPresence() {
    if (io) {
        const users = Array.from(onlineStaff.values()).map(u => ({
            userId: u.userId,
            displayName: u.displayName,
            role: u.role,
            status: u.status,
        }));
        io.to('arzt').emit('staff:presence', users);
    }
}

/**
 * Socket.io Setup für Live-Triage-Alerts an das Arzt-Dashboard
 * K-01 FIX: JWT-Authentifizierung für alle WebSocket-Verbindungen
 */
export function setupSocketIO(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: config.frontendUrl,
            methods: ['GET', 'POST'],
        },
    });

    // ─── K-01: WebSocket JWT Auth Middleware ─────────────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token || typeof token !== 'string') {
            return next(new Error('Authentifizierung erforderlich'));
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret as jwt.Secret, {
                algorithms: ['HS256'], // Prevent algorithm confusion attacks
            }) as AuthPayload;

            // Check token blacklist — same security guarantee as REST endpoints
            if (decoded.jti) {
                const blacklisted = await isTokenBlacklisted(decoded.jti);
                if (blacklisted) {
                    return next(new Error('Token wurde widerrufen'));
                }
            }

            (socket as any).auth = decoded;
            next();
        } catch (_err) {
            return next(new Error('Ungültiger oder abgelaufener Token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const auth = (socket as any).auth as AuthPayload;
        console.log(`[Socket.io] Client verbunden: ${socket.id} (role: ${auth.role})`);

        // Arzt-Dashboard tritt dem "arzt" Raum bei — nur für Ärzte/Admin/MFA
        socket.on('join:arzt', () => {
            if (!['arzt', 'admin', 'mfa'].includes(auth.role)) {
                socket.emit('error', { message: 'Zugriff verweigert: Nur Arzt/Admin/MFA' });
                return;
            }
            socket.join('arzt');
            console.log(`[Socket.io] Arzt-Client beigetreten: ${socket.id} (${auth.role})`);
        });

        // Patient tritt Raum seiner Session bei — K-01: Session-Eigentum prüfen
        socket.on('join:session', (sessionId: string) => {
            // Patienten dürfen nur ihre eigene Session joinen
            if (auth.role === 'patient' && auth.sessionId !== sessionId) {
                socket.emit('error', { message: 'Kein Zugriff auf diese Sitzung' });
                return;
            }
            socket.join(`session:${sessionId}`);
            console.log(`[Socket.io] Client beigetreten: ${sessionId} (${auth.role})`);
        });

        // Nachricht von Arzt an Patient — K-06 FIX: sanitizeText
        socket.on('arzt:message', async (data: { sessionId: string, message: string, userId?: string }) => {
            const sanitizedMessage = sanitizeText(data.message || '');
            console.log(`[Socket.io] Nachricht von Arzt für Session ${data.sessionId}`);

            // Persistenz
            try {
                await prisma.chatMessage.create({
                    data: {
                        sessionId: data.sessionId,
                        senderType: 'ARZT',
                        senderId: data.userId,
                        text: sanitizedMessage,
                        fromName: 'Praxis-Team'
                    }
                });
            } catch (err) {
                console.error('[Socket.io] Fehler beim Speichern der Arzt-Nachricht:', err);
            }

            io?.to(`session:${data.sessionId}`).emit('patient:message', {
                text: sanitizedMessage,
                from: 'Praxis-Team',
                timestamp: new Date().toISOString()
            });
        });

        // Nachricht von Patient an Arzt — K-06 FIX: sanitizeText
        socket.on('patient:send_message', async (data: { sessionId: string, message: string }) => {
            const sanitizedMsg = sanitizeText(data.message || '');
            console.log(`[Socket.io] Nachricht von Patient in Session ${data.sessionId}`);

            // Persistenz
            try {
                await prisma.chatMessage.create({
                    data: {
                        sessionId: data.sessionId,
                        senderType: 'PATIENT',
                        text: sanitizedMsg,
                        fromName: 'Patient'
                    }
                });
            } catch (err) {
                console.error('[Socket.io] Fehler beim Speichern der Patienten-Nachricht:', err);
            }

            // Relais an Arzt-Dashboard (Raum "arzt")
            io?.to('arzt').emit('arzt:received_message', {
                sessionId: data.sessionId,
                text: sanitizedMsg,
                from: 'Patient',
                timestamp: new Date().toISOString()
            });
        });

        // Live Präsenz / Kollisionsvermeidung
        socket.on('view:session', (data: { sessionId: string, userName: string }) => {
            socket.to('arzt').emit('session:locked', data);
        });

        socket.on('unview:session', (data: { sessionId: string }) => {
            socket.to('arzt').emit('session:unlocked', data);
        });

        // Typing Indicators
        socket.on('patient:typing', (data: { sessionId: string }) => {
            io?.to('arzt').emit('patient:typing', { sessionId: data.sessionId });
        });

        socket.on('arzt:typing', (data: { sessionId: string }) => {
            io?.to(`session:${data.sessionId}`).emit('arzt:typing', { sessionId: data.sessionId });
        });

        // ─── Staff Chat: Join & Presence ─────────────────────────
        socket.on('staff:join', (data: { userId: string; displayName: string; role: string }) => {
            if (!['arzt', 'admin', 'mfa'].includes(auth.role)) {
                socket.emit('error', { message: 'Nur Personal kann dem Staff-Chat beitreten' });
                return;
            }
            onlineStaff.set(socket.id, {
                socketId: socket.id,
                userId: data.userId,
                displayName: data.displayName,
                role: data.role,
                status: 'online',
            });
            broadcastStaffPresence();
            console.log(`[Socket.io] Staff-Chat beigetreten: ${data.displayName} (${data.role})`);
        });

        // ─── Staff Chat: Send Message ────────────────────────────
        socket.on('staff:send_message', (data: { channel: string; message: string; userName: string; userRole: string }) => {
            if (!['arzt', 'admin', 'mfa'].includes(auth.role)) return;
            const msg = {
                text: data.message,
                from: data.userName,
                fromRole: data.userRole,
                timestamp: new Date().toISOString(),
                channel: data.channel,
            };
            io?.to('arzt').emit('staff:message', msg);
            console.log(`[Socket.io] Staff-Nachricht [${data.channel}]: ${data.userName}: ${data.message.substring(0, 50)}`);
        });

        // ─── Staff Chat: Typing ──────────────────────────────────
        socket.on('staff:typing', (data: { channel: string; userName: string }) => {
            if (!['arzt', 'admin', 'mfa'].includes(auth.role)) return;
            socket.to('arzt').emit('staff:typing', { channel: data.channel, userName: data.userName });
        });

        // ─── Queue: Mood Response from Patient ──────────────────
        socket.on('queue:mood-response', (data: { sessionId: string; mood: string }) => {
            console.log(`[Socket.io] Mood response from ${data.sessionId}: ${data.mood}`);
            // Forward mood data to staff dashboard
            io?.to('arzt').emit('queue:patient-mood', {
                sessionId: data.sessionId,
                mood: data.mood,
                timestamp: new Date().toISOString(),
            });
        });

        // ── Modul 7/8 Server → Client events are emitted from REST handlers ──
        // flow:step-changed, flow:delay-update → emitted from routes/flows.ts
        // navigation:guide                     → emitted from routes/flows.ts (call-patient)
        // checkout:ready                        → emitted from routes/feedback.ts
        // feedback:escalation                   → emitted from routes/feedback.ts
        // payment:status                        → emitted from routes/payment.ts

        // ── Modul 7/8: NFC & Flow Events ──────────────────────────────────

        // nfc:tap — Patient taps NFC chip at station
        socket.on('nfc:tap', async (data: { locationId: string; praxisId: string; signature: string; timestamp: number }) => {
            try {
                // Forward to REST handler for HMAC validation; emit result back
                socket.emit('nfc:tap:ack', { received: true, locationId: data.locationId, ts: Date.now() });
                // Broadcast to praxis room so MFA dashboard updates
                socket.to(`praxis:${data.praxisId}`).emit('nfc:tap:event', data);
            } catch (err: any) {
                socket.emit('nfc:tap:error', { error: err.message });
            }
        });

        // flow:advance — Staff advances patient to next step
        socket.on('flow:advance', async (data: { sessionId: string; fromStep: number; toStep: number; reason?: string }) => {
            try {
                const { sessionId, fromStep, toStep, reason } = data;
                io.to(`session:${sessionId}`).emit('flow:step-changed', {
                    sessionId,
                    currentStep: toStep,
                    fromStep,
                    reason: reason || 'Manueller Vorgang',
                    changedAt: new Date().toISOString(),
                });
            } catch (err: any) {
                socket.emit('flow:advance:error', { error: err.message });
            }
        });

        // flow:delay — Staff reports delay for patient session
        socket.on('flow:delay', async (data: { sessionId: string; delayMinutes: number; reason: string }) => {
            try {
                const { sessionId, delayMinutes, reason } = data;
                io.to(`session:${sessionId}`).emit('flow:delay-update', {
                    sessionId,
                    delayMinutes,
                    reason,
                    updatedAt: new Date().toISOString(),
                });
            } catch (err: any) {
                socket.emit('flow:delay:error', { error: err.message });
            }
        });

        // flow:call-patient — Staff calls patient to specific room
        socket.on('flow:call-patient', async (data: { sessionId: string; targetRoom: string; message?: string }) => {
            try {
                const { sessionId, targetRoom, message } = data;
                io.to(`session:${sessionId}`).emit('navigation:guide', {
                    sessionId,
                    type: 'TEXT',
                    content: message || `Bitte kommen Sie jetzt zu ${targetRoom}.`,
                    pathColor: 'blue',
                    targetRoom,
                    calledAt: new Date().toISOString(),
                });
            } catch (err: any) {
                socket.emit('flow:call-patient:error', { error: err.message });
            }
        });

        // chat:broadcast — Staff broadcasts message to waiting/all patients
        socket.on('chat:broadcast', async (data: { message: string; target: 'waiting' | 'all'; praxisId?: string }) => {
            try {
                const { message, target, praxisId } = data;
                const room = praxisId ? `praxis:${praxisId}` : 'broadcast';
                io.to(room).emit('chat:broadcast:received', {
                    message,
                    target,
                    sentAt: new Date().toISOString(),
                    senderType: 'SYSTEM',
                });
            } catch (err: any) {
                socket.emit('chat:broadcast:error', { error: err.message });
            }
        });

        // kiosk:heartbeat — Kiosk sends periodic heartbeat
        socket.on('kiosk:heartbeat', (data: { kioskId: string; status: string }) => {
            // Acknowledge and forward to admin room
            socket.emit('kiosk:heartbeat:ack', { kioskId: data.kioskId, receivedAt: Date.now() });
            socket.to('admin').emit('kiosk:status', { ...data, lastSeen: new Date().toISOString() });
        });

        // ─── WebRTC Signaling (Phase 12 — Videosprechstunde) ────────
        // Signal types: offer, answer, ice-candidate, hangup, mute, unmute,
        //               screen-share-start, screen-share-stop

        interface SignalPayload {
            sessionId: string;
            fromId: string;
            toId: string;
            type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'mute' | 'unmute' | 'screen-share-start' | 'screen-share-stop';
            data?: any;
        }

        function relaySignal(eventName: string, data: SignalPayload) {
            // Security: ensure fromId matches authenticated user
            if (data.fromId !== auth.userId) return;
            // Relay to same session room — only participants receive it
            socket.to(`session:${data.sessionId}`).emit(eventName, {
                ...data,
                relayedAt: new Date().toISOString(),
            });
        }

        socket.on('rtc:offer', (data: SignalPayload) => {
            relaySignal('rtc:offer', data);
            console.log(`[WebRTC] Offer: session=${data.sessionId}`);
        });

        socket.on('rtc:answer', (data: SignalPayload) => {
            relaySignal('rtc:answer', data);
            console.log(`[WebRTC] Answer: session=${data.sessionId}`);
        });

        socket.on('rtc:ice-candidate', (data: SignalPayload) => {
            relaySignal('rtc:ice-candidate', data);
        });

        socket.on('rtc:hangup', (data: SignalPayload) => {
            relaySignal('rtc:hangup', data);
            console.log(`[WebRTC] Hangup: session=${data.sessionId} by ${auth.userId}`);
        });

        socket.on('rtc:mute', (data: SignalPayload) => relaySignal('rtc:mute', data));
        socket.on('rtc:unmute', (data: SignalPayload) => relaySignal('rtc:unmute', data));
        socket.on('rtc:screen-share-start', (data: SignalPayload) => relaySignal('rtc:screen-share-start', data));
        socket.on('rtc:screen-share-stop', (data: SignalPayload) => relaySignal('rtc:screen-share-stop', data));

        // ─── End WebRTC Signaling ────────────────────────────────────

        socket.on('disconnect', () => {
            // Remove from online staff
            if (onlineStaff.has(socket.id)) {
                const user = onlineStaff.get(socket.id);
                onlineStaff.delete(socket.id);
                broadcastStaffPresence();
                console.log(`[Socket.io] Staff getrennt: ${user?.displayName}`);
            }
            console.log('[Socket.io] Client getrennt:', socket.id);
        });
    });

    return io;
}

/**
 * Sendet einen CRITICAL Triage-Alert an alle verbundenen Arzt-Dashboards
 */
export function emitTriageAlert(sessionId: string, alert: {
    level: string;
    atomId: string;
    message: string;
    triggerValues: any;
}): void {
    if (io) {
        io.to('arzt').emit('triage:alert', {
            sessionId,
            ...alert,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Senachrichtigt Ärzte über eine abgeschlossene Session
 */
export function emitSessionComplete(sessionId: string, service: string): void {
    if (io) {
        io.to('arzt').emit('session:complete', {
            sessionId,
            service,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Pushes answer-submitted event to the doctor dashboard in real-time
 */
export function emitAnswerSubmitted(sessionId: string, data: {
    atomId: string;
    progress: number;
    totalAnswers: number;
    hasRedFlag: boolean;
}): void {
    if (io) {
        io.to('arzt').emit('answer:submitted', {
            sessionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Pushes session progress update to patient and doctor rooms
 */
export function emitSessionProgress(sessionId: string, progress: number): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('session:progress', {
            sessionId,
            progress,
            timestamp: new Date().toISOString(),
        });
        io.to('arzt').emit('session:progress', {
            sessionId,
            progress,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Sendet eine Chat-Nachricht an einen spezifischen Patienten
 */
export function emitPatientMessage(sessionId: string, message: { text: string; from: string; timestamp: string }): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('patient:message', message);
    }
}

/**
 * Pushes entertainment content to a waiting patient
 */
export function emitQueueEntertainment(sessionId: string, content: any, reason: string): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:entertainment', { content, reason });
    }
}

/**
 * Sends a practice-wide announcement to all waiting patients
 */
export function emitQueueAnnouncement(title: string, body: string, type: 'info' | 'urgent'): void {
    if (io) {
        io.emit('queue:announcement', { title, body, type, timestamp: new Date().toISOString() });
    }
}

/**
 * Sends a mood check to a specific patient
 */
export function emitMoodCheck(sessionId: string): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:mood-check', {
            question: 'Wie geht es Ihnen gerade?',
            options: ['😊 Gut', '😐 Geht so', '😟 Ungeduldig', '😰 Besorgt'],
        });
    }
}

/**
 * Triggers an InfoBreak in the questionnaire flow
 */
export function emitInfoBreak(sessionId: string, contentId: string, type: string, durationSec: number): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:infobreak-trigger', { contentId, type, durationSec });
    }
}

// ─── Modul 3: PVS Events ───────────────────────────────────

export function emitPvsPatientImported(sessionId: string, data: {
    patientId: string;
    pvsType: string;
    patientNumber: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:patient-imported', {
            ...data,
            sessionId,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitPvsExportCompleted(sessionId: string, data: {
    connectionId: string;
    pvsType: string;
    fieldsExported: number;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:export-completed', {
            ...data,
            sessionId,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitPvsExportFailed(sessionId: string, data: {
    connectionId: string;
    pvsType: string;
    error: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:export-failed', {
            ...data,
            sessionId,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitPvsSessionRequested(data: {
    patientNumber: string;
    pvsType: string;
    connectionId: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:session-requested', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitPvsConnectionStatus(data: {
    connectionId: string;
    pvsType: string;
    status: 'connected' | 'disconnected' | 'error';
    message?: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:connection-status', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

// ─── Modul 4: Therapy Events ────────────────────────────────

export function emitTherapyPlanUpdated(data: {
    planId: string;
    patientId: string;
    status: string;
    updatedBy: string;
}): void {
    if (io) {
        io.to('arzt').emit('therapy:plan-updated', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitTherapyAiSuggestion(data: {
    planId: string;
    patientId: string;
    suggestionType: string;
    confidence: number;
    summary: string;
}): void {
    if (io) {
        io.to('arzt').emit('therapy:ai-suggestion', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitTherapyAiRealtime(sessionId: string, data: {
    type: 'analysis' | 'suggestion' | 'warning';
    content: string;
    confidence?: number;
}): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('therapy:ai-realtime', {
            ...data,
            sessionId,
            timestamp: new Date().toISOString(),
        });
    }
}

export function emitTherapyMeasureDue(data: {
    planId: string;
    measureId: string;
    patientId: string;
    title: string;
    dueDate: string;
}): void {
    if (io) {
        io.to('arzt').emit('therapy:measure-due', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}
