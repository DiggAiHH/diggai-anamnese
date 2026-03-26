// ─── useUsageDashboard Hook ─────────────────────────────────
// React Query hooks for the Praxis Business Dashboard.

import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL, getAuthToken } from '../api/client';

// ─── Types ──────────────────────────────────────────────────

export interface UsageBreakdownItem {
    count: number;
    timeSavedMin: number;
    costSaving: number;
}

export interface UsageAction {
    id: string;
    serviceType: string;
    actionName: string;
    timeSavedMs: number | null;
    costEstimate: number | null;
    createdAt: string;
}

export interface UsageTodayData {
    date: string;
    totalActions: number;
    totalTimeSavedMin: number;
    totalCostSaving: number;
    breakdown: Record<string, UsageBreakdownItem>;
    actions: UsageAction[];
}

export interface DailySummaryItem {
    id: string;
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
    lineItems: InvoiceLineItem[];
    subtotal: number;
    totalTimeSavedMin: number;
    totalSessions: number;
    generatedAt: string;
}

export interface UsageSummaryData {
    usage: UsageTodayData;
    dailySummaries: DailySummaryItem[];
    period: string;
    from: string;
    to: string;
}

export interface ROITodayData {
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

// ─── API Helper ─────────────────────────────────────────────

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Query Keys ─────────────────────────────────────────────

const USAGE_KEYS = {
    all: ['usage'] as const,
    today: () => [...USAGE_KEYS.all, 'today'] as const,
    summary: (period: string, from?: string, to?: string) => [...USAGE_KEYS.all, 'summary', period, from, to] as const,
    breakdown: (from?: string, to?: string) => [...USAGE_KEYS.all, 'breakdown', from, to] as const,
    invoice: (date: string) => [...USAGE_KEYS.all, 'invoice', date] as const,
    roi: () => ['roi', 'today'] as const,
    roiHistory: (period: string) => ['roi', 'history', period] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useUsageToday() {
    return useQuery<UsageTodayData>({
        queryKey: USAGE_KEYS.today(),
        queryFn: async () => {
            const { data } = await apiClient.get('/api/usage/today');
            return data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds for live data
    });
}

export function useUsageSummary(period: string = 'day', from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from && to) {
        params.set('from', from);
        params.set('to', to);
    } else {
        params.set('period', period);
    }

    return useQuery<UsageSummaryData>({
        queryKey: USAGE_KEYS.summary(period, from, to),
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/usage/summary?${params.toString()}`);
            return data;
        },
    });
}

export function useUsageBreakdown(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return useQuery({
        queryKey: USAGE_KEYS.breakdown(from, to),
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/usage/breakdown?${params.toString()}`);
            return data as { breakdown: Record<string, UsageBreakdownItem>; totalActions: number; totalTimeSavedMin: number; totalCostSaving: number };
        },
    });
}

export function useInvoice(date: string) {
    return useQuery<DailySummaryItem>({
        queryKey: USAGE_KEYS.invoice(date),
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/usage/invoice/${date}`);
            return data;
        },
        enabled: !!date,
    });
}

export function useGenerateSummary() {
    return useMutation({
        mutationFn: async (date?: string) => {
            const { data } = await apiClient.post('/api/usage/generate-summary', { date });
            return data;
        },
    });
}

export function useROIToday() {
    return useQuery<ROITodayData>({
        queryKey: USAGE_KEYS.roi(),
        queryFn: async () => {
            const { data } = await apiClient.get('/api/roi/today');
            return data;
        },
        refetchInterval: 60000, // Refresh every minute
    });
}

export function useROIHistory(period: string = 'month') {
    return useQuery({
        queryKey: USAGE_KEYS.roiHistory(period),
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/roi/history?period=${period}`);
            return data;
        },
    });
}
