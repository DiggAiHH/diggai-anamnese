// ─── Service Usage Tracking Service ─────────────────────────
// Erfasst jede benutzte Leistung/Aktion pro Session für
// Tagesend-Zusammenfassung, Rechnung und ROI-Dashboard.

import { Prisma } from '@prisma/client';
import { prisma } from '../db';

// ─── Types ──────────────────────────────────────────────────

export type ServiceType =
    | 'ANAMNESE'
    | 'TRIAGE'
    | 'CHAT'
    | 'AI_SUMMARY'
    | 'PDF_EXPORT'
    | 'CSV_EXPORT'
    | 'JSON_EXPORT'
    | 'PVS_EXPORT'
    | 'REZEPT'
    | 'AU'
    | 'UEBERWEISUNG'
    | 'TERMIN'
    | 'ABSAGE'
    | 'TELEFON'
    | 'NACHRICHT'
    | 'BG_UNFALL';

// Geschätzte manuelle Zeiten (in Millisekunden) für jede Aktion
const MANUAL_TIME_ESTIMATES: Record<string, number> = {
    'ANAMNESE':     12 * 60 * 1000,   // 12 Min Papier-Anamnese
    'TRIAGE':        3 * 60 * 1000,   // 3 Min manuelles Durchschauen
    'CHAT':          2 * 60 * 1000,   // 2 Min Telefonat
    'AI_SUMMARY':    5 * 60 * 1000,   // 5 Min manuelle Zusammenfassung
    'PDF_EXPORT':    4 * 60 * 1000,   // 4 Min manuell abtippen
    'CSV_EXPORT':    4 * 60 * 1000,   // 4 Min
    'JSON_EXPORT':   4 * 60 * 1000,   // 4 Min
    'PVS_EXPORT':    6 * 60 * 1000,   // 6 Min manueller PVS-Import
    'REZEPT':        3 * 60 * 1000,   // 3 Min
    'AU':            4 * 60 * 1000,   // 4 Min
    'UEBERWEISUNG':  3 * 60 * 1000,   // 3 Min
    'TERMIN':        5 * 60 * 1000,   // 5 Min telefonische Terminvergabe
    'ABSAGE':        2 * 60 * 1000,   // 2 Min
    'TELEFON':       3 * 60 * 1000,   // 3 Min
    'NACHRICHT':     2 * 60 * 1000,   // 2 Min
    'BG_UNFALL':     8 * 60 * 1000,   // 8 Min BG-Formulare
};

// MFA-Stundensatz für Kostenberechnung (€/h)
const MFA_HOURLY_COST = 22.50;

// ─── Log a Service Usage ────────────────────────────────────

export interface LogUsageInput {
    tenantId: string;
    sessionId?: string;
    patientId?: string;
    serviceType: ServiceType;
    actionName: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}

export async function logServiceUsage(input: LogUsageInput): Promise<void> {
    const manualTimeMs = MANUAL_TIME_ESTIMATES[input.serviceType] || 5 * 60 * 1000;
    const actualDuration = input.durationMs || 0;
    const timeSavedMs = Math.max(0, manualTimeMs - actualDuration);
    const costEstimate = (timeSavedMs / 3600000) * MFA_HOURLY_COST;
    const metadata = input.metadata
        ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue
        : undefined;

    try {
        await prisma.serviceUsageLog.create({
            data: {
                tenantId: input.tenantId,
                sessionId: input.sessionId || null,
                patientId: input.patientId || null,
                serviceType: input.serviceType,
                actionName: input.actionName,
                durationMs: actualDuration || null,
                manualTimeMs: manualTimeMs,
                timeSavedMs: timeSavedMs,
                costEstimate: Math.round(costEstimate * 100) / 100,
                metadata,
            },
        });
    } catch (err) {
        // Non-blocking — never fail the main request
        console.error('[ServiceUsage] Log failed (non-critical):', err);
    }
}

// ─── Get Usage for Today ────────────────────────────────────

export interface UsageTodayResult {
    date: string;
    totalActions: number;
    totalTimeSavedMin: number;
    totalCostSaving: number;
    breakdown: Record<string, { count: number; timeSavedMin: number; costSaving: number }>;
    actions: Array<{
        id: string;
        serviceType: string;
        actionName: string;
        timeSavedMs: number | null;
        costEstimate: number | null;
        createdAt: Date;
    }>;
}

export async function getUsageToday(tenantId: string): Promise<UsageTodayResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await prisma.serviceUsageLog.findMany({
        where: {
            tenantId,
            createdAt: { gte: today, lt: tomorrow },
        },
        orderBy: { createdAt: 'desc' },
    });

    const breakdown: Record<string, { count: number; timeSavedMin: number; costSaving: number }> = {};
    let totalTimeSavedMs = 0;
    let totalCostSaving = 0;

    for (const log of logs) {
        if (!breakdown[log.serviceType]) {
            breakdown[log.serviceType] = { count: 0, timeSavedMin: 0, costSaving: 0 };
        }
        breakdown[log.serviceType].count++;
        breakdown[log.serviceType].timeSavedMin += (log.timeSavedMs || 0) / 60000;
        breakdown[log.serviceType].costSaving += log.costEstimate || 0;
        totalTimeSavedMs += log.timeSavedMs || 0;
        totalCostSaving += log.costEstimate || 0;
    }

    // Round breakdown values
    for (const key of Object.keys(breakdown)) {
        breakdown[key].timeSavedMin = Math.round(breakdown[key].timeSavedMin * 10) / 10;
        breakdown[key].costSaving = Math.round(breakdown[key].costSaving * 100) / 100;
    }

    return {
        date: today.toISOString().split('T')[0],
        totalActions: logs.length,
        totalTimeSavedMin: Math.round((totalTimeSavedMs / 60000) * 10) / 10,
        totalCostSaving: Math.round(totalCostSaving * 100) / 100,
        breakdown,
        actions: logs.map(l => ({
            id: l.id,
            serviceType: l.serviceType,
            actionName: l.actionName,
            timeSavedMs: l.timeSavedMs,
            costEstimate: l.costEstimate,
            createdAt: l.createdAt,
        })),
    };
}

// ─── Get Usage by Period ────────────────────────────────────

export async function getUsageByPeriod(
    tenantId: string,
    from: Date,
    to: Date,
): Promise<UsageTodayResult> {
    const logs = await prisma.serviceUsageLog.findMany({
        where: {
            tenantId,
            createdAt: { gte: from, lt: to },
        },
        orderBy: { createdAt: 'desc' },
    });

    const breakdown: Record<string, { count: number; timeSavedMin: number; costSaving: number }> = {};
    let totalTimeSavedMs = 0;
    let totalCostSaving = 0;

    for (const log of logs) {
        if (!breakdown[log.serviceType]) {
            breakdown[log.serviceType] = { count: 0, timeSavedMin: 0, costSaving: 0 };
        }
        breakdown[log.serviceType].count++;
        breakdown[log.serviceType].timeSavedMin += (log.timeSavedMs || 0) / 60000;
        breakdown[log.serviceType].costSaving += log.costEstimate || 0;
        totalTimeSavedMs += log.timeSavedMs || 0;
        totalCostSaving += log.costEstimate || 0;
    }

    for (const key of Object.keys(breakdown)) {
        breakdown[key].timeSavedMin = Math.round(breakdown[key].timeSavedMin * 10) / 10;
        breakdown[key].costSaving = Math.round(breakdown[key].costSaving * 100) / 100;
    }

    return {
        date: `${from.toISOString().split('T')[0]} – ${to.toISOString().split('T')[0]}`,
        totalActions: logs.length,
        totalTimeSavedMin: Math.round((totalTimeSavedMs / 60000) * 10) / 10,
        totalCostSaving: Math.round(totalCostSaving * 100) / 100,
        breakdown,
        actions: logs.map(l => ({
            id: l.id,
            serviceType: l.serviceType,
            actionName: l.actionName,
            timeSavedMs: l.timeSavedMs,
            costEstimate: l.costEstimate,
            createdAt: l.createdAt,
        })),
    };
}
