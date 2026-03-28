// ─── Daily Summary + Invoice Service ────────────────────────
// Generates end-of-day summary from ServiceUsageLog entries
// and produces invoice data for the Praxis.

import { Prisma } from '@prisma/client';
import { prisma } from '../db';

// ─── Types ──────────────────────────────────────────────────

export interface DailySummaryResult {
    id: string;
    tenantId: string;
    date: string;
    totalSessions: number;
    completedSessions: number;
    totalUsageActions: number;
    serviceBreakdown: Record<string, number>;
    totalTimeSavedMin: number;
    totalCostSaving: number;
    estimatedManualCost: number;
    invoiceGenerated: boolean;
    invoiceData: InvoiceData | null;
}

export interface InvoiceLineItem {
    serviceType: string;
    description: string;
    count: number;
    timeSavedMin: number;
    costSaving: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    tenantId: string;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    totalTimeSavedMin: number;
    totalSessions: number;
    generatedAt: string;
}

// Service-Typ Beschreibungen auf Deutsch
const SERVICE_DESCRIPTIONS: Record<string, string> = {
    'ANAMNESE': 'Digitale Patientenaufnahme (Fragebogen)',
    'TRIAGE': 'Automatische Triage-Auswertung',
    'CHAT': 'Patient-Praxis Kommunikation',
    'AI_SUMMARY': 'KI-Zusammenfassung & ICD-Codes',
    'PDF_EXPORT': 'PDF-Bericht Export',
    'CSV_EXPORT': 'CSV-Daten Export',
    'JSON_EXPORT': 'JSON-Daten Export',
    'PVS_EXPORT': 'PVS-Datenübertragung',
    'REZEPT': 'Rezeptanfrage-Verarbeitung',
    'AU': 'AU-Anfrage-Verarbeitung',
    'UEBERWEISUNG': 'Überweisungsanfrage-Verarbeitung',
    'TERMIN': 'Digitale Terminanfrage',
    'ABSAGE': 'Terminabsage-Verarbeitung',
    'TELEFON': 'Telefonanfrage-Verarbeitung',
    'NACHRICHT': 'Nachricht-Verarbeitung',
    'BG_UNFALL': 'BG-Unfall Dokumentation',
};

// ─── Generate Daily Summary ─────────────────────────────────

export async function generateDailySummary(tenantId: string, date: Date): Promise<DailySummaryResult> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Get all usage logs for the day
    const logs = await prisma.serviceUsageLog.findMany({
        where: {
            tenantId,
            createdAt: { gte: dayStart, lt: dayEnd },
        },
    });

    // Get session counts
    const [totalSessions, completedSessions] = await Promise.all([
        prisma.patientSession.count({
            where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.patientSession.count({
            where: { tenantId, status: 'COMPLETED', completedAt: { gte: dayStart, lt: dayEnd } },
        }),
    ]);

    // Calculate breakdown
    const breakdown: Record<string, number> = {};
    let totalTimeSavedMs = 0;
    let totalCostSaving = 0;
    let estimatedManualCostMs = 0;

    for (const log of logs) {
        breakdown[log.serviceType] = (breakdown[log.serviceType] || 0) + 1;
        totalTimeSavedMs += log.timeSavedMs || 0;
        totalCostSaving += log.costEstimate || 0;
        estimatedManualCostMs += log.manualTimeMs || 0;
    }

    const estimatedManualCost = (estimatedManualCostMs / 3600000) * 22.50; // MFA hourly cost

    // Generate invoice data
    const invoiceLineItems: InvoiceLineItem[] = [];
    const lineBreakdown: Record<string, { count: number; timeSavedMs: number; costSaving: number }> = {};

    for (const log of logs) {
        if (!lineBreakdown[log.serviceType]) {
            lineBreakdown[log.serviceType] = { count: 0, timeSavedMs: 0, costSaving: 0 };
        }
        lineBreakdown[log.serviceType].count++;
        lineBreakdown[log.serviceType].timeSavedMs += log.timeSavedMs || 0;
        lineBreakdown[log.serviceType].costSaving += log.costEstimate || 0;
    }

    for (const [serviceType, data] of Object.entries(lineBreakdown)) {
        invoiceLineItems.push({
            serviceType,
            description: SERVICE_DESCRIPTIONS[serviceType] || serviceType,
            count: data.count,
            timeSavedMin: Math.round((data.timeSavedMs / 60000) * 10) / 10,
            costSaving: Math.round(data.costSaving * 100) / 100,
        });
    }

    const invoiceData: InvoiceData = {
        invoiceNumber: `DIG-${dayStart.toISOString().split('T')[0].replace(/-/g, '')}-${tenantId.slice(0, 6).toUpperCase()}`,
        date: dayStart.toISOString().split('T')[0],
        tenantId,
        lineItems: invoiceLineItems.sort((a, b) => b.count - a.count),
        subtotal: Math.round(totalCostSaving * 100) / 100,
        totalTimeSavedMin: Math.round((totalTimeSavedMs / 60000) * 10) / 10,
        totalSessions,
        generatedAt: new Date().toISOString(),
    };
    const invoiceDataJson = JSON.parse(JSON.stringify(invoiceData)) as Prisma.InputJsonValue;

    // Upsert daily summary
    const summary = await prisma.dailySummary.upsert({
        where: { tenantId_date: { tenantId, date: dayStart } },
        update: {
            totalSessions,
            completedSessions,
            totalUsageActions: logs.length,
            serviceBreakdown: breakdown,
            totalTimeSavedMin: Math.round((totalTimeSavedMs / 60000) * 10) / 10,
            totalCostSaving: Math.round(totalCostSaving * 100) / 100,
            estimatedManualCost: Math.round(estimatedManualCost * 100) / 100,
            invoiceGenerated: true,
            invoiceData: invoiceDataJson,
        },
        create: {
            tenantId,
            date: dayStart,
            totalSessions,
            completedSessions,
            totalUsageActions: logs.length,
            serviceBreakdown: breakdown,
            totalTimeSavedMin: Math.round((totalTimeSavedMs / 60000) * 10) / 10,
            totalCostSaving: Math.round(totalCostSaving * 100) / 100,
            estimatedManualCost: Math.round(estimatedManualCost * 100) / 100,
            invoiceGenerated: true,
            invoiceData: invoiceDataJson,
        },
    });

    return {
        id: summary.id,
        tenantId: summary.tenantId,
        date: summary.date.toISOString().split('T')[0],
        totalSessions: summary.totalSessions,
        completedSessions: summary.completedSessions,
        totalUsageActions: summary.totalUsageActions,
        serviceBreakdown: summary.serviceBreakdown as Record<string, number>,
        totalTimeSavedMin: summary.totalTimeSavedMin,
        totalCostSaving: summary.totalCostSaving,
        estimatedManualCost: summary.estimatedManualCost,
        invoiceGenerated: summary.invoiceGenerated,
        invoiceData,
    };
}

// ─── Get Daily Summaries for a Period ───────────────────────

export async function getDailySummaries(
    tenantId: string,
    from: Date,
    to: Date,
): Promise<DailySummaryResult[]> {
    const summaries = await prisma.dailySummary.findMany({
        where: {
            tenantId,
            date: { gte: from, lte: to },
        },
        orderBy: { date: 'desc' },
    });

    return summaries.map(s => ({
        id: s.id,
        tenantId: s.tenantId,
        date: s.date.toISOString().split('T')[0],
        totalSessions: s.totalSessions,
        completedSessions: s.completedSessions,
        totalUsageActions: s.totalUsageActions,
        serviceBreakdown: s.serviceBreakdown as Record<string, number>,
        totalTimeSavedMin: s.totalTimeSavedMin,
        totalCostSaving: s.totalCostSaving,
        estimatedManualCost: s.estimatedManualCost,
        invoiceGenerated: s.invoiceGenerated,
        invoiceData: s.invoiceData as InvoiceData | null,
    }));
}

// ─── Get Invoice for a Specific Date ────────────────────────

export async function getInvoiceForDate(tenantId: string, date: Date): Promise<DailySummaryResult> {
    // Generate/refresh the summary for that date
    return generateDailySummary(tenantId, date);
}
