/**
 * Gemeinsame Typen für useApi Hooks
 * 
 * Enthält alle TypeScript-Interfaces und Typen, die von mehreren
 * API-Hooks verwendet werden.
 */

import type { CreateSessionPayload, SubmitAnswerPayload } from '../../api/client';

// Re-export für Kompatibilität
export type { CreateSessionPayload, SubmitAnswerPayload };

/**
 * Basis-Paginierungs-Parameter
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
}

/**
 * Standard-API-Fehler-Response
 */
export interface ApiErrorResponse {
    response?: {
        data?: {
            error?: string;
        };
    };
}

/**
 * Session-bezogene Typen
 */
export interface SessionResponse {
    token?: string;
    sessionId: string;
    nextAtomIds?: string[];
    progress?: {
        completed: number;
        total: number;
        percentage: number;
    };
}

/**
 * Triage-Alert Typ
 */
export interface TriageAlert {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    atomId?: string;
}

/**
 * Antwort-Submission Response
 */
export interface SubmitAnswerResponse {
    redFlags?: TriageAlert[];
    progress?: {
        completed: number;
        total: number;
        percentage: number;
    };
}

/**
 * User Typ für Admin-Funktionen
 */
export interface User {
    id: string;
    username: string;
    displayName: string;
    role: string;
    isActive: boolean;
}

/**
 * Queue Entry Typ
 */
export interface QueueEntry {
    id: string;
    sessionId: string;
    patientName: string;
    service: string;
    priority?: string;
    status: 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'COMPLETED';
    createdAt: string;
}

/**
 * PVS Connection Typ
 */
export interface PvsConnection {
    id: string;
    pvsType: string;
    protocol: string;
    name: string;
    isActive: boolean;
    lastSyncAt?: string;
}

/**
 * Therapy Plan Typ
 */
export interface TherapyPlan {
    id: string;
    sessionId: string;
    patientId: string;
    title: string;
    diagnosis?: string;
    icdCodes?: string[];
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
}
