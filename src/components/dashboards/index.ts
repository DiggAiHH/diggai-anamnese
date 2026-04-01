/**
 * Dashboard Components Export
 * 
 * Zentrale Export-Datei fuer alle Dashboard-Komponenten.
 */

// Shared Components
export { PatientCard, PatientListItem } from './shared/PatientCard';
export { TriageBadge, TriageDot, TriageLabel } from './shared/TriageBadge';
export { StatusColumn, ColumnStats } from './shared/StatusColumn';

// MFA Components
export { MfaKanbanBoard } from './mfa/MfaKanbanBoard';
export { TriageAlertPanel } from './mfa/TriageAlertPanel';
export { LongestWaiters } from './mfa/LongestWaiters';

// Arzt Components
export { AnamneseRadar } from './arzt/AnamneseRadar';
export { ClinicalTags, ClinicalTag } from './arzt/ClinicalTags';
export { PriorityList } from './arzt/PriorityList';

// Admin Components
export { KpiCards, KpiCardDetailed } from './admin/KpiCards';
export { ThroughputChart } from './admin/ThroughputChart';
export { FunnelChart, CompactFunnel } from './admin/FunnelChart';
export { HeatmapCalendar, CompactHeatmap } from './admin/HeatmapCalendar';
export { AdminAnalyticsDashboard } from './admin/AdminAnalyticsDashboard';
