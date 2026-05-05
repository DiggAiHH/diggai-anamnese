import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { prisma } from './db';
import type { AuthPayload } from './middleware/auth';
import { isTokenBlacklisted, normalizeAuthRole } from './middleware/auth';
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

function getSocketToken(socket: Socket): string | null {
    const directToken = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (typeof directToken === 'string' && directToken.trim().length > 0) {
        return directToken;
    }

    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
        return null;
    }

    for (const cookie of cookieHeader.split(';')) {
        const [rawName, ...rawValueParts] = cookie.trim().split('=');
        if (rawName !== 'access_token') {
            continue;
        }

        const rawValue = rawValueParts.join('=');
        return rawValue ? decodeURIComponent(rawValue) : null;
    }

    return null;
}

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
            credentials: true,
        },
    });

    // ─── K-01: WebSocket JWT Auth Middleware ─────────────────────
    io.use(async (socket, next) => {
        const token = getSocketToken(socket);
        if (!token) {
            return next(new Error('Authentifizierung erforderlich'));
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret as jwt.Secret, {
                algorithms: ['HS256'], // Prevent algorithm confusion attacks
            }) as AuthPayload;
            const normalizedRole = normalizeAuthRole(decoded.role);
            if (!normalizedRole) {
                return next(new Error('Ungültiger oder abgelaufener Token'));
            }

            // Check token blacklist — same security guarantee as REST endpoints
            if (decoded.jti) {
                const blacklisted = await isTokenBlacklisted(decoded.jti);
                if (blacklisted) {
                    return next(new Error('Token wurde widerrufen'));
                }
            }

            (socket as any).auth = {
                ...decoded,
                role: normalizedRole,
            } satisfies AuthPayload;
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
                io?.to(`session:${sessionId}`).emit('flow:step-changed', {
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
                io?.to(`session:${sessionId}`).emit('flow:delay-update', {
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
                io?.to(`session:${sessionId}`).emit('navigation:guide', {
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
                io?.to(room).emit('chat:broadcast:received', {
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

        // ─── Tomedo Bridge Events ────────────────────────────────────
        // @phase PHASE_4_WEBSOCKET - Real-time Bridge Updates
        
        // Subscribe to bridge events for a specific session
        socket.on('bridge:subscribe', (data: { tenantId: string; patientSessionId: string }) => {
            if (!['arzt', 'admin', 'mfa'].includes(auth.role)) {
                socket.emit('error', { message: 'Nur Personal kann Bridge-Events abonnieren' });
                return;
            }
            socket.join(`bridge:${data.tenantId}:${data.patientSessionId}`);
            console.log(`[Socket.io] Bridge-Subscription: ${data.tenantId}/${data.patientSessionId}`);
        });

        // Unsubscribe from bridge events
        socket.on('bridge:unsubscribe', (data: { tenantId: string; patientSessionId: string }) => {
            socket.leave(`bridge:${data.tenantId}:${data.patientSessionId}`);
            console.log(`[Socket.io] Bridge-Unsubscription: ${data.tenantId}/${data.patientSessionId}`);
        });

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
 * Sendet einen Routing-Hinweis an alle verbundenen Arzt-Dashboards.
 *
 * Empfänger ist medizinisches Fachpersonal — `staffMessage` darf fachliche
 * Begriffe enthalten. NIEMALS dieses Event an Patient-Clients weiterleiten.
 *
 * @see docs/REGULATORY_POSITION.md §5.3
 * @see docs/ROUTING_RULES.md
 */
export function emitRoutingHint(sessionId: string, hint: {
    ruleId: string;
    level: 'INFO' | 'PRIORITY';
    atomId: string;
    staffMessage: string;
    triggerValues: unknown;
    workflowAction?: string;
}): void {
    if (!io) return;
    const payload = {
        sessionId,
        ...hint,
        timestamp: new Date().toISOString(),
    };
    // Neuer kanonischer Event-Name
    io.to('arzt').emit('routing:hint', payload);
    // Backwards-Compat: alte Listener auf 'triage:alert' weiterhin bedienen.
    // TODO(REGULATORY-MIGRATION): Entfernen, sobald alle Frontend-Listener
    // auf 'routing:hint' umgestellt sind (siehe docs/CHANGE_LOG_REGULATORY.md).
    io.to('arzt').emit('triage:alert', {
        sessionId,
        level: hint.level === 'PRIORITY' ? 'CRITICAL' : 'WARNING',
        atomId: hint.atomId,
        message: hint.staffMessage,
        triggerValues: hint.triggerValues,
        timestamp: payload.timestamp,
    });
}

/**
 * @deprecated Verwende `emitRoutingHint`. Diese Funktion bleibt erhalten,
 * damit Aufrufer migriert werden können, ohne den Live-Pfad zu brechen.
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
 * Benachrichtigt Ärzte über eine abgeschlossene Session
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
        const payload = {
            sessionId,
            progress,
            timestamp: new Date().toISOString(),
        };
        io.to(`session:${sessionId}`).emit('session:progress', payload);
        io.to('arzt').emit('session:progress', payload);
    }
}

/**
 * Sendet eine Chat-Nachricht an den Patienten
 */
export function emitPatientMessage(sessionId: string, message: { text: string; from: string; timestamp: string }): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('patient:message', message);
    }
}

/**
 * Sendet Unterhaltungsinhalte an wartende Patienten
 */
export function emitQueueEntertainment(sessionId: string, content: any, reason: string): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:entertainment', {
            content,
            reason,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Broadcasts an announcement to all waiting patients
 */
export function emitQueueAnnouncement(title: string, body: string, type: 'info' | 'urgent'): void {
    if (io) {
        io.emit('queue:announcement', {
            title,
            body,
            type,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Requests a mood check from the patient
 */
export function emitMoodCheck(sessionId: string): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:mood-check', {
            sessionId,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Sends an info break to the patient
 */
export function emitInfoBreak(sessionId: string, contentId: string, type: string, durationSec: number): void {
    if (io) {
        io.to(`session:${sessionId}`).emit('queue:info-break', {
            sessionId,
            contentId,
            type,
            durationSec,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies staff that a patient was imported from PVS
 */
export function emitPvsPatientImported(sessionId: string, data: {
    patientId: string;
    pvsPatientId: string;
    pvsType: string;
    patientName: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:patient-imported', {
            sessionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies staff that PVS export completed
 */
export function emitPvsExportCompleted(sessionId: string, data: {
    pvsType: string;
    transferLogId: string;
    pvsReferenceId?: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:export-completed', {
            sessionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies staff that PVS export failed
 */
export function emitPvsExportFailed(sessionId: string, data: {
    pvsType: string;
    error: string;
    transferLogId: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:export-failed', {
            sessionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies staff about a new PVS session request
 */
export function emitPvsSessionRequested(data: {
    sessionId: string;
    pvsType: string;
    patientName: string;
    service: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:session-requested', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Broadcasts PVS connection status change
 */
export function emitPvsConnectionStatus(data: {
    connectionId: string;
    pvsType: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    message: string;
}): void {
    if (io) {
        io.to('arzt').emit('pvs:connection-status', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies staff that a therapy plan was updated
 */
export function emitTherapyPlanUpdated(data: {
    planId: string;
    patientId: string;
    patientName: string;
    updatedBy: string;
}): void {
    if (io) {
        io.to('arzt').emit('therapy:plan-updated', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Sends AI therapy suggestion to staff
 */
export function emitTherapyAiSuggestion(data: {
    sessionId: string;
    patientId: string;
    suggestions: Array<{
        type: string;
        description: string;
        confidence: number;
    }>;
}): void {
    if (io) {
        io.to('arzt').emit('therapy:ai-suggestion', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Streams real-time therapy AI output
 */
export function emitTherapyAiRealtime(sessionId: string, data: {
    chunk: string;
    isComplete: boolean;
}): void {
    if (io) {
        io.to(`session:${sessionId}`).to('arzt').emit('therapy:ai-realtime', {
            sessionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

// ─── Tomedo Bridge Batch Events ─────────────────────────────────
// @phase PHASE_6_BATCH_PROCESSING

export interface BridgeBatchEvent {
    jobId: string;
    tenantId: string;
    total?: number;
    progress?: number;
    current?: number;
}

/**
 * Emits batch job started event
 */
export function emitBridgeBatchStarted(data: BridgeBatchEvent): void {
    if (io) {
        io.to('arzt').emit('bridge:batch:started', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Emits batch job progress event
 */
export function emitBridgeBatchProgress(data: BridgeBatchEvent & { progress: number; current: number }): void {
    if (io) {
        io.to('arzt').emit('bridge:batch:progress', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Emits batch job completed event
 */
export function emitBridgeBatchCompleted(data: BridgeBatchEvent): void {
    if (io) {
        io.to('arzt').emit('bridge:batch:completed', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

// ─── FHIR Subscription Events ─────────────────────────────────
// @phase PHASE_7_FHIR_SUBSCRIPTIONS

export interface FhirNotificationEvent {
    subscriptionId: string;
    tenantId: string;
    resourceType: string;
    event: string;
    resourceId: string;
}

/**
 * Emits FHIR subscription notification
 */
export function emitFhirNotification(data: FhirNotificationEvent): void {
    if (io) {
        io.to('arzt').emit('fhir:notification', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Notifies about therapy measure due date
 */
export function emitTherapyMeasureDue(data: {
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

// ─── Tomedo Bridge Event Emitters ─────────────────────────────────
// @phase PHASE_4_WEBSOCKET - Real-time Bridge Updates

export interface BridgeEventData {
    patientSessionId: string;
    tenantId: string;
    taskId?: string;
    team?: string;
    agent?: string;
    progress?: number;
    error?: string;
    dlqCount?: number;
}

/**
 * Emits bridge started event
 */
export function emitBridgeStarted(data: BridgeEventData): void {
    if (io) {
        const event = {
            type: 'bridge:started',
            timestamp: new Date().toISOString(),
            data,
        };
        io.to(`bridge:${data.tenantId}:${data.patientSessionId}`).emit('bridge:event', event);
        io.to('arzt').emit('bridge:event', event);
    }
}

/**
 * Emits bridge completed event
 */
export function emitBridgeCompleted(data: BridgeEventData & { result?: unknown }): void {
    if (io) {
        const event = {
            type: 'bridge:completed',
            timestamp: new Date().toISOString(),
            data,
        };
        io.to(`bridge:${data.tenantId}:${data.patientSessionId}`).emit('bridge:event', event);
        io.to('arzt').emit('bridge:event', event);
    }
}

/**
 * Emits bridge failed event
 */
export function emitBridgeFailed(data: BridgeEventData & { error: string }): void {
    if (io) {
        const event = {
            type: 'bridge:failed',
            timestamp: new Date().toISOString(),
            data,
        };
        io.to(`bridge:${data.tenantId}:${data.patientSessionId}`).emit('bridge:event', event);
        io.to('arzt').emit('bridge:event', event);
    }
}

/**
 * Emits DLQ updated event
 */
export function emitBridgeDLQUpdated(data: BridgeEventData & { dlqCount: number }): void {
    if (io) {
        const event = {
            type: 'bridge:dlq:updated',
            timestamp: new Date().toISOString(),
            data,
        };
        io.to(`bridge:${data.tenantId}:${data.patientSessionId}`).emit('bridge:event', event);
        io.to('arzt').emit('bridge:event', event);
    }
}

/**
 * Emits team progress event
 */
export function emitBridgeTeamProgress(data: BridgeEventData & { team: string; agent: string; progress: number }): void {
    if (io) {
        const event = {
            type: 'bridge:team:progress',
            timestamp: new Date().toISOString(),
            data,
        };
        io.to(`bridge:${data.tenantId}:${data.patientSessionId}`).emit('bridge:event', event);
    }
}
