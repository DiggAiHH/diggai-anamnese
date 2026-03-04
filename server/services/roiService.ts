import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── ROI Configuration ─────────────────────────────────────

export interface ROIConfig {
    mfaHourlyCost: number;       // €/h — default 22.50
    avgManualIntakeMin: number;  // minutes — default 12
    monthlyLicenseCost: number;  // €/month — default 299
    workdaysPerMonth: number;    // default 21
}

const DEFAULT_CONFIG: ROIConfig = {
    mfaHourlyCost: 22.50,
    avgManualIntakeMin: 12.0,
    monthlyLicenseCost: 299.0,
    workdaysPerMonth: 21,
};

// In-memory config (overwritten by DB last snapshot or PUT /roi/config)
let currentConfig: ROIConfig = { ...DEFAULT_CONFIG };

export function getROIConfig(): ROIConfig {
    return { ...currentConfig };
}

export function setROIConfig(partial: Partial<ROIConfig>): ROIConfig {
    currentConfig = { ...currentConfig, ...partial };
    return getROIConfig();
}

// ─── Live Daily ROI ─────────────────────────────────────────

export interface DailyROI {
    date: string;
    patientsServed: number;
    sessionsCompleted: number;
    avgCompletionMinutes: number;
    mfaMinutesSaved: number;
    costSaving: number;
    licenseCostPerDay: number;
    netROI: number;
    cumulativeMonthROI: number;
}

export async function calculateTodayROI(): Promise<DailyROI> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sessionsCompleted, completedWithTime, monthSnapshots] = await Promise.all([
        prisma.patientSession.count({
            where: { status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } },
        }),
        prisma.patientSession.findMany({
            where: { status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow, not: null } },
            select: { createdAt: true, completedAt: true },
        }),
        // Get month's existing snapshots for cumulative
        prisma.rOISnapshot.findMany({
            where: {
                date: {
                    gte: new Date(today.getFullYear(), today.getMonth(), 1),
                    lt: today,
                },
            },
            select: { estimatedCostSaving: true, monthlyLicenseCost: true },
        }),
    ]);

    const patientsServed = sessionsCompleted;
    const avgCompletionMinutes = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, s) => {
            const diff = (s.completedAt!.getTime() - s.createdAt.getTime()) / 60000;
            return sum + diff;
        }, 0) / completedWithTime.length
        : 0;

    const mfaMinutesSaved = patientsServed * currentConfig.avgManualIntakeMin;
    const costSaving = (mfaMinutesSaved / 60) * currentConfig.mfaHourlyCost;
    const licenseCostPerDay = currentConfig.monthlyLicenseCost / currentConfig.workdaysPerMonth;
    const netROI = costSaving - licenseCostPerDay;

    // Cumulative month ROI from stored snapshots + today's live
    const previousMonthROI = monthSnapshots.reduce((sum, s) => {
        const snapLicPerDay = s.monthlyLicenseCost / currentConfig.workdaysPerMonth;
        return sum + (s.estimatedCostSaving - snapLicPerDay);
    }, 0);
    const cumulativeMonthROI = previousMonthROI + netROI;

    return {
        date: today.toISOString().split('T')[0],
        patientsServed,
        sessionsCompleted,
        avgCompletionMinutes: Math.round(avgCompletionMinutes * 10) / 10,
        mfaMinutesSaved: Math.round(mfaMinutesSaved * 10) / 10,
        costSaving: Math.round(costSaving * 100) / 100,
        licenseCostPerDay: Math.round(licenseCostPerDay * 100) / 100,
        netROI: Math.round(netROI * 100) / 100,
        cumulativeMonthROI: Math.round(cumulativeMonthROI * 100) / 100,
    };
}

// ─── Historical ROI ─────────────────────────────────────────

export async function getROIHistory(period: 'week' | 'month' | 'year' = 'month') {
    const since = new Date();
    if (period === 'week') since.setDate(since.getDate() - 7);
    else if (period === 'month') since.setDate(since.getDate() - 30);
    else since.setFullYear(since.getFullYear() - 1);

    const snapshots = await prisma.rOISnapshot.findMany({
        where: { date: { gte: since } },
        orderBy: { date: 'asc' },
    });

    const avgDaily = snapshots.length > 0
        ? snapshots.reduce((sum, s) => sum + s.estimatedCostSaving, 0) / snapshots.length
        : 0;
    const total = snapshots.reduce((sum, s) => sum + s.estimatedCostSaving, 0);

    // Trend: compare last 7 days vs previous 7 days
    const last7 = snapshots.slice(-7);
    const prev7 = snapshots.slice(-14, -7);
    const last7Avg = last7.length > 0 ? last7.reduce((s, x) => s + x.estimatedCostSaving, 0) / last7.length : 0;
    const prev7Avg = prev7.length > 0 ? prev7.reduce((s, x) => s + x.estimatedCostSaving, 0) / prev7.length : 0;
    const trend = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;

    return {
        snapshots,
        summary: {
            avgDaily: Math.round(avgDaily * 100) / 100,
            total: Math.round(total * 100) / 100,
            trend: Math.round(trend * 10) / 10, // percentage
        },
    };
}

// ─── ROI Projection ─────────────────────────────────────────

export async function getROIProjection(months: number = 12) {
    // Base projection on last 30 days average
    const history = await getROIHistory('month');
    const avgDailyPatients = history.snapshots.length > 0
        ? history.snapshots.reduce((s, x) => s + x.patientsServed, 0) / history.snapshots.length
        : 5; // minimum assumption

    const monthly: Array<{
        month: string;
        projectedPatients: number;
        projectedSaving: number;
        projectedNetROI: number;
        cumulativeROI: number;
    }> = [];

    let cumulative = 0;
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthStr = d.toISOString().slice(0, 7); // "2026-03"
        const workdays = currentConfig.workdaysPerMonth;
        const projectedPatients = Math.round(avgDailyPatients * workdays);
        const mfaMinSaved = projectedPatients * currentConfig.avgManualIntakeMin;
        const projectedSaving = (mfaMinSaved / 60) * currentConfig.mfaHourlyCost;
        const projectedNetROI = projectedSaving - currentConfig.monthlyLicenseCost;
        cumulative += projectedNetROI;

        monthly.push({
            month: monthStr,
            projectedPatients,
            projectedSaving: Math.round(projectedSaving * 100) / 100,
            projectedNetROI: Math.round(projectedNetROI * 100) / 100,
            cumulativeROI: Math.round(cumulative * 100) / 100,
        });
    }

    return { monthly };
}

// ─── Daily Snapshot (called by cron job) ────────────────────

export async function createDailySnapshot(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sessionsCompleted, completedWithTime] = await Promise.all([
        prisma.patientSession.count({
            where: { status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } },
        }),
        prisma.patientSession.findMany({
            where: { status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow, not: null } },
            select: { createdAt: true, completedAt: true },
        }),
    ]);

    const patientsServed = sessionsCompleted;
    const avgCompletionMinutes = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, s) => {
            const diff = (s.completedAt!.getTime() - s.createdAt.getTime()) / 60000;
            return sum + diff;
        }, 0) / completedWithTime.length
        : 0;

    const mfaMinutesSaved = patientsServed * currentConfig.avgManualIntakeMin;
    const estimatedCostSaving = (mfaMinutesSaved / 60) * currentConfig.mfaHourlyCost;

    await prisma.rOISnapshot.upsert({
        where: { date: today },
        update: {
            patientsServed,
            sessionsCompleted,
            avgCompletionMinutes,
            mfaMinutesSaved,
            estimatedCostSaving,
            mfaHourlyCost: currentConfig.mfaHourlyCost,
            avgManualIntakeMin: currentConfig.avgManualIntakeMin,
            monthlyLicenseCost: currentConfig.monthlyLicenseCost,
        },
        create: {
            date: today,
            patientsServed,
            sessionsCompleted,
            avgCompletionMinutes,
            mfaMinutesSaved,
            estimatedCostSaving,
            mfaHourlyCost: currentConfig.mfaHourlyCost,
            avgManualIntakeMin: currentConfig.avgManualIntakeMin,
            monthlyLicenseCost: currentConfig.monthlyLicenseCost,
        },
    });

    console.log(`[ROI] Daily snapshot created: ${patientsServed} patients, €${estimatedCostSaving.toFixed(2)} saved`);
}
