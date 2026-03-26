/**
 * ListSkeleton - Loading placeholders for list and table views
 * Shows skeleton rows that mimic list items
 */

interface ListSkeletonProps {
  rows?: number;
  showHeader?: boolean;
}

/**
 * Simple list item skeleton
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl">
      {/* Avatar/Icon placeholder */}
      <div className="w-10 h-10 bg-[var(--border-primary)] rounded-full animate-pulse flex-shrink-0" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-[var(--border-primary)] rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-[var(--border-primary)] rounded w-1/2 animate-pulse" />
      </div>
      
      {/* Action/Status placeholder */}
      <div className="w-20 h-8 bg-[var(--border-primary)] rounded-lg animate-pulse flex-shrink-0" />
    </div>
  );
}

/**
 * List with multiple rows
 */
export function ListSkeleton({ rows = 5, showHeader = true }: ListSkeletonProps) {
  return (
    <div 
      className="space-y-3"
      role="alert"
      aria-busy="true"
      aria-label="Liste wird geladen"
    >
      {/* Optional header */}
      {showHeader && (
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-primary)]">
          <div className="h-6 bg-[var(--border-primary)] rounded w-32 animate-pulse" />
          <div className="h-8 bg-[var(--border-primary)] rounded-lg w-24 animate-pulse" />
        </div>
      )}
      
      {/* List items */}
      {Array.from({ length: rows }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-primary)] last:border-b-0">
      {Array.from({ length: columns }).map((_, index) => (
        <div 
          key={index}
          className={`h-4 bg-[var(--border-primary)] rounded animate-pulse ${
            index === 0 ? 'flex-1' : 'w-24'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton with header
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div 
      className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden"
      role="alert"
      aria-busy="true"
      aria-label="Tabelle wird geladen"
    >
      {/* Table header */}
      <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
        {Array.from({ length: columns }).map((_, index) => (
          <div 
            key={index}
            className={`h-4 bg-[var(--border-primary)] rounded animate-pulse ${
              index === 0 ? 'flex-1' : 'w-24'
            }`}
          />
        ))}
      </div>
      
      {/* Table rows */}
      <div>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/**
 * Timeline/event list skeleton
 */
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div 
      className="relative space-y-0"
      role="alert"
      aria-busy="true"
      aria-label="Timeline wird geladen"
    >
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border-primary)]" />
      
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
          {/* Timeline dot */}
          <div className="relative z-10 w-8 h-8 bg-[var(--border-primary)] rounded-full animate-pulse flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 pt-1 space-y-2">
            <div className="h-5 bg-[var(--border-primary)] rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-[var(--border-primary)] rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-[var(--border-primary)] rounded w-32 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListSkeleton;
