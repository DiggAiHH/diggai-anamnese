/**
 * Skeleton Components Index
 * 
 * Export all skeleton loading components for easy importing.
 * 
 * @example
 * import { QuestionSkeleton, DashboardSkeleton } from './skeletons';
 * 
 * @example
 * import { CardSkeleton, ListSkeleton } from '@/components/skeletons';
 */

// Re-export from existing SkeletonLoader
export { 
  SkeletonLine, 
  SkeletonBlock, 
  SkeletonCircle,
  QuestionSkeleton, 
  DashboardSkeleton 
} from '../SkeletonLoader';

// New skeleton components
export { SessionSkeleton } from './SessionSkeleton';
export { FormSkeleton, FormBuilderSkeleton } from './FormSkeleton';
export { 
  CardSkeleton, 
  CardGridSkeleton, 
  StatCardSkeleton, 
  InfoCardSkeleton 
} from './CardSkeleton';
export { 
  ListSkeleton, 
  ListItemSkeleton, 
  TableSkeleton, 
  TableRowSkeleton,
  TimelineSkeleton 
} from './ListSkeleton';
export { 
  LineChartSkeleton, 
  BarChartSkeleton, 
  PieChartSkeleton,
  StatSparklineSkeleton 
} from './ChartSkeleton';
