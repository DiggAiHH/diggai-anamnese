/**
 * CardSkeleton - Generic card layout skeletons
 * For dashboard cards, info cards, and similar components
 */

interface CardSkeletonProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Single card skeleton with icon, title, and value
 */
export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-[var(--border-primary)] rounded-xl animate-pulse" />
        <div className="w-16 h-6 bg-[var(--border-primary)] rounded-lg animate-pulse" />
      </div>
      <div className="h-4 bg-[var(--border-primary)] rounded w-2/3 mb-2 animate-pulse" />
      <div className="h-3 bg-[var(--border-primary)] rounded w-1/2 animate-pulse" />
    </div>
  );
}

/**
 * Grid of card skeletons
 */
export function CardGridSkeleton({ count = 4, columns = 4 }: CardSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={`grid ${gridCols[columns]} gap-4`}
      role="alert"
      aria-busy="true"
      aria-label="Karten werden geladen"
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Stat card skeleton with large value
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--border-primary)] rounded-xl animate-pulse" />
        <div className="flex-1">
          <div className="h-8 bg-[var(--border-primary)] rounded w-24 mb-2 animate-pulse" />
          <div className="h-4 bg-[var(--border-primary)] rounded w-32 animate-pulse" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
        <div className="h-3 bg-[var(--border-primary)] rounded w-full animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Info card skeleton with image/header
 */
export function InfoCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
      {/* Header/Image area */}
      <div className="h-32 bg-[var(--border-primary)] animate-pulse" />
      
      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="h-6 bg-[var(--border-primary)] rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-[var(--border-primary)] rounded w-full animate-pulse" />
        <div className="h-4 bg-[var(--border-primary)] rounded w-2/3 animate-pulse" />
        
        {/* Footer */}
        <div className="pt-3 flex items-center justify-between">
          <div className="h-4 bg-[var(--border-primary)] rounded w-20 animate-pulse" />
          <div className="h-8 bg-[var(--border-primary)] rounded-lg w-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default CardSkeleton;
