/**
 * SessionSkeleton - Loading placeholder for session recovery dialogs
 * Shows a skeleton representation of the session recovery UI
 */

export function SessionSkeleton() {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="alert"
      aria-busy="true"
      aria-label="Sitzungswiederherstellung wird geladen"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[var(--border-primary)] rounded-full animate-pulse" />
        </div>

        {/* Title */}
        <div className="h-8 bg-[var(--border-primary)] rounded-lg w-3/4 mx-auto mb-4 animate-pulse" />

        {/* Description lines */}
        <div className="space-y-2 mb-6">
          <div className="h-4 bg-[var(--border-primary)] rounded w-full animate-pulse" />
          <div className="h-4 bg-[var(--border-primary)] rounded w-5/6 mx-auto animate-pulse" />
        </div>

        {/* Session info card */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-[var(--border-primary)] rounded w-20 animate-pulse" />
            <div className="h-4 bg-[var(--border-primary)] rounded w-24 animate-pulse" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-[var(--border-primary)] rounded w-16 animate-pulse" />
            <div className="h-4 bg-[var(--border-primary)] rounded w-28 animate-pulse" />
          </div>
          <div className="h-2 bg-[var(--border-primary)] rounded-full w-full animate-pulse mt-2" />
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="h-12 bg-[var(--border-primary)] rounded-xl w-full animate-pulse" />
          <div className="h-12 bg-[var(--border-primary)] rounded-xl w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default SessionSkeleton;
