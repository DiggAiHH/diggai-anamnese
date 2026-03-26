import { Suspense, type ReactNode, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  QuestionSkeleton, 
  DashboardSkeleton, 
  SessionSkeleton,
  FormSkeleton,
  FormBuilderSkeleton,
  CardGridSkeleton,
  ListSkeleton,
  TableSkeleton,
  LineChartSkeleton,
  StatSparklineSkeleton
} from './skeletons';

export type SkeletonType = 
  | 'question'
  | 'dashboard'
  | 'session'
  | 'form'
  | 'formBuilder'
  | 'cards'
  | 'list'
  | 'table'
  | 'chart'
  | 'stats'
  | 'default';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeletonType?: SkeletonType;
  skeletonProps?: Record<string, unknown>;
  /**
   * Delay before showing fallback (ms) - prevents flash for fast loads
   * @default 200
   */
  delay?: number;
}

/**
 * Maps route paths to appropriate skeleton types
 */
function getSkeletonTypeFromPath(pathname: string): SkeletonType {
  if (pathname.includes('/patient') || pathname.includes('/forms/run')) {
    return 'question';
  }
  if (pathname.includes('/verwaltung') || pathname.includes('/arzt') || pathname.includes('/admin')) {
    return 'dashboard';
  }
  if (pathname.includes('/forms/builder')) {
    return 'formBuilder';
  }
  if (pathname.includes('/pwa')) {
    return 'cards';
  }
  if (pathname.includes('/flows')) {
    return 'list';
  }
  if (pathname.includes('/epa')) {
    return 'table';
  }
  return 'default';
}

/**
 * Renders the appropriate skeleton component based on type
 */
function renderSkeleton(type: SkeletonType, props: Record<string, unknown> = {}): ReactNode {
  switch (type) {
    case 'question':
      return <QuestionSkeleton {...props} />;
    case 'dashboard':
      return <DashboardSkeleton {...props} />;
    case 'session':
      return <SessionSkeleton {...props} />;
    case 'form':
      return <FormSkeleton {...props} />;
    case 'formBuilder':
      return <FormBuilderSkeleton {...props} />;
    case 'cards':
      return <CardGridSkeleton {...props} />;
    case 'list':
      return <ListSkeleton {...props} />;
    case 'table':
      return <TableSkeleton {...props} />;
    case 'chart':
      return <LineChartSkeleton {...props} />;
    case 'stats':
      return <StatSparklineSkeleton {...props} />;
    case 'default':
    default:
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              Wird geladen...
            </p>
          </div>
        </div>
      );
  }
}

/**
 * SuspenseWrapper - Intelligent Suspense boundary with route-aware skeletons
 * 
 * Automatically selects appropriate skeleton based on:
 * 1. Explicit skeletonType prop
 * 2. Current route path
 * 3. Default spinner fallback
 * 
 * Features:
 * - Prevents flash for fast loads (configurable delay)
 * - Route-aware skeleton selection
 * - Custom fallback support
 * - Accessibility (aria-busy, aria-label)
 * 
 * @example
 * <SuspenseWrapper skeletonType="dashboard">
 *   <DashboardPage />
 * </SuspenseWrapper>
 * 
 * @example
 * // Auto-detects from route
 * <SuspenseWrapper>
 *   <RouteComponent />
 * </SuspenseWrapper>
 * 
 * @example
 * <SuspenseWrapper delay={500} skeletonType="cards" skeletonProps={{ count: 6 }}>
 *   <CardGrid />
 * </SuspenseWrapper>
 */
export function SuspenseWrapper({
  children,
  fallback,
  skeletonType,
  skeletonProps = {},
  delay: _delay = 200,
}: SuspenseWrapperProps) {
  const location = useLocation();
  
  // Determine skeleton type from prop or route
  const effectiveSkeletonType = skeletonType || getSkeletonTypeFromPath(location.pathname);
  
  // Render appropriate skeleton or custom fallback
  const suspenseFallback = fallback || renderSkeleton(effectiveSkeletonType, skeletonProps);
  
  return (
    <Suspense fallback={suspenseFallback}>
      {children}
    </Suspense>
  );
}

/**
 * HOC version of SuspenseWrapper for easy component wrapping
 * 
 * @example
 * const LazyDashboard = withSuspense(Dashboard, 'dashboard');
 * const LazyForm = withSuspense(Form, 'form', { fieldCount: 5 });
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  skeletonType?: SkeletonType,
  skeletonProps?: Record<string, unknown>,
  _delay?: number
) {
  return function SuspendedComponent(props: P) {
    return (
      <SuspenseWrapper 
        skeletonType={skeletonType} 
        skeletonProps={skeletonProps}
      >
        <Component {...props} />
      </SuspenseWrapper>
    );
  };
}

export default SuspenseWrapper;
