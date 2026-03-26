/**
 * FormSkeleton - Loading placeholder for form builder/runner pages
 * Shows a skeleton representation of form elements
 */

interface FormSkeletonProps {
  fieldCount?: number;
}

export function FormSkeleton({ fieldCount = 4 }: FormSkeletonProps) {
  return (
    <div 
      className="min-h-screen bg-[var(--bg-primary)] p-6"
      role="alert"
      aria-busy="true"
      aria-label="Formular wird geladen"
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 bg-[var(--border-primary)] rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-[var(--border-primary)] rounded w-40 animate-pulse" />
          </div>
          <div className="h-10 bg-[var(--border-primary)] rounded-lg w-32 animate-pulse" />
        </div>
      </div>

      {/* Form fields */}
      <div className="max-w-4xl mx-auto space-y-6">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <div 
            key={index}
            className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6"
          >
            {/* Field label */}
            <div className="h-5 bg-[var(--border-primary)] rounded w-1/3 mb-2 animate-pulse" />
            
            {/* Field description */}
            <div className="h-3 bg-[var(--border-primary)] rounded w-2/3 mb-4 animate-pulse" />
            
            {/* Input placeholder */}
            <div className="h-12 bg-[var(--border-primary)] rounded-xl w-full animate-pulse" />
            
            {/* Helper text */}
            <div className="h-3 bg-[var(--border-primary)] rounded w-1/4 mt-2 animate-pulse" />
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <div className="h-12 bg-[var(--border-primary)] rounded-xl w-32 animate-pulse" />
          <div className="h-12 bg-[var(--border-primary)] rounded-xl w-40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * FormBuilderSkeleton - Specific layout for form builder with sidebar
 */
export function FormBuilderSkeleton() {
  return (
    <div 
      className="min-h-screen bg-[var(--bg-primary)] flex"
      role="alert"
      aria-busy="true"
      aria-label="Formular-Editor wird geladen"
    >
      {/* Sidebar */}
      <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-4 hidden lg:block">
        <div className="h-6 bg-[var(--border-primary)] rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-[var(--border-primary)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-[var(--border-primary)] rounded-lg w-48 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 bg-[var(--border-primary)] rounded-lg w-24 animate-pulse" />
            <div className="h-10 bg-[var(--border-primary)] rounded-lg w-24 animate-pulse" />
          </div>
        </div>

        {/* Canvas area */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] border-dashed rounded-2xl p-8 min-h-[500px]">
          <div className="space-y-4 max-w-2xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--border-primary)] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormSkeleton;
