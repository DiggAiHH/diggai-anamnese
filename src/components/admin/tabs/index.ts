import { lazy } from 'react';

// Lazy-loaded admin tab components for code splitting
// Each tab is loaded on-demand when selected, reducing initial bundle size

export const OverviewTab = lazy(() => import('./OverviewTab'));
export const FlowTab = lazy(() => import('./FlowTab'));
export const SecurityTab = lazy(() => import('./SecurityTab'));
export const ExportTab = lazy(() => import('./ExportTab'));
export const ProductivityTab = lazy(() => import('./ProductivityTab'));
export const ArchitectureTab = lazy(() => import('./ArchitectureTab'));
export const ChangelogTab = lazy(() => import('./ChangelogTab'));

// Re-export shared components
export { GlassCard } from './GlassCard';
export { StatCardComponent } from './StatCardComponent';
export { FlowDiagram } from './FlowDiagram';
export * from './adminData';
