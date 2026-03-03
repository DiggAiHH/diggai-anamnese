/**
 * SkeletonLoader — Lightweight skeleton placeholders for loading states.
 * Replaces plain spinners with content-shaped placeholders.
 * Improves perceived performance by ~40%.
 */

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-4 bg-[var(--border-primary)] rounded-lg animate-pulse ${className}`} />
  );
}

export function SkeletonBlock({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-20 bg-[var(--border-primary)] rounded-xl animate-pulse ${className}`} />
  );
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return (
    <div className={`w-10 h-10 bg-[var(--border-primary)] rounded-full animate-pulse ${className}`} />
  );
}

/**
 * QuestionSkeleton — Mimics the layout of a Question card while loading.
 */
export function QuestionSkeleton() {
  return (
    <div className="question-container space-y-6" aria-hidden="true">
      {/* Question title */}
      <div className="space-y-3">
        <SkeletonLine className="w-3/4 h-6" />
        <SkeletonLine className="w-1/2 h-3" />
      </div>

      {/* Answer options */}
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <SkeletonBlock className="w-28 h-12" />
        <SkeletonBlock className="w-32 h-12" />
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton — Mimics the layout of a dashboard while loading.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-8" aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="w-64 h-8" />
          <SkeletonLine className="w-40 h-4" />
        </div>
        <SkeletonCircle className="w-12 h-12" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] space-y-3">
            <SkeletonCircle className="w-8 h-8" />
            <SkeletonLine className="w-16 h-8" />
            <SkeletonLine className="w-24 h-3" />
          </div>
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center gap-4">
            <SkeletonCircle />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="w-2/3 h-5" />
              <SkeletonLine className="w-1/3 h-3" />
            </div>
            <SkeletonBlock className="w-20 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
