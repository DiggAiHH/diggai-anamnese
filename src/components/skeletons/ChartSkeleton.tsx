/**
 * ChartSkeleton - Loading placeholders for chart and graph components
 * Shows skeleton representations of various chart types
 */

interface ChartSkeletonProps {
  height?: number;
}

/**
 * Line/Area chart skeleton
 */
export function LineChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div 
      className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6"
      role="alert"
      aria-busy="true"
      aria-label="Diagramm wird geladen"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-[var(--border-primary)] rounded w-48 animate-pulse" />
        <div className="h-8 bg-[var(--border-primary)] rounded-lg w-24 animate-pulse" />
      </div>

      {/* Chart area */}
      <div 
        className="relative"
        style={{ height: `${height}px` }}
      >
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 bg-[var(--border-primary)] rounded w-8 animate-pulse" />
          ))}
        </div>

        {/* Chart content */}
        <div className="absolute left-14 right-0 top-0 bottom-0">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-px bg-[var(--border-primary)] w-full" />
            ))}
          </div>

          {/* Animated line path */}
          <svg 
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--border-primary)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--border-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,80 Q50,60 100,70 T200,50 T300,60 T400,40 T500,55 V100 H0 Z"
              fill="url(#chartGradient)"
              className="animate-pulse"
            />
            <path
              d="M0,80 Q50,60 100,70 T200,50 T300,60 T400,40 T500,55"
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="3"
              className="animate-pulse"
            />
          </svg>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-4 pl-14">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 bg-[var(--border-primary)] rounded w-12 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/**
 * Bar chart skeleton
 */
export function BarChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div 
      className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6"
      role="alert"
      aria-busy="true"
      aria-label="Balkendiagramm wird geladen"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-[var(--border-primary)] rounded w-40 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 bg-[var(--border-primary)] rounded-lg w-20 animate-pulse" />
          <div className="h-8 bg-[var(--border-primary)] rounded-lg w-20 animate-pulse" />
        </div>
      </div>

      {/* Chart area */}
      <div 
        className="flex items-end justify-around gap-4 px-4"
        style={{ height: `${height - 80}px` }}
      >
        {Array.from({ length: 7 }).map((_, i) => {
          // Random heights for variety
          const heights = ['40%', '65%', '85%', '50%', '75%', '45%', '90%'];
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div 
                className="w-full max-w-[40px] bg-[var(--border-primary)] rounded-t-lg animate-pulse"
                style={{ height: heights[i] }}
              />
              <div className="h-3 bg-[var(--border-primary)] rounded w-8 animate-pulse" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Pie/Doughnut chart skeleton
 */
export function PieChartSkeleton() {
  return (
    <div 
      className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6"
      role="alert"
      aria-busy="true"
      aria-label="Kreisdiagramm wird geladen"
    >
      {/* Header */}
      <div className="h-6 bg-[var(--border-primary)] rounded w-48 mb-6 animate-pulse" />

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Pie chart */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="20"
              strokeDasharray="60 251"
              className="animate-pulse"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="20"
              strokeDasharray="80 251"
              strokeDashoffset="-60"
              className="animate-pulse"
              style={{ opacity: 0.7 }}
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="20"
              strokeDasharray="50 251"
              strokeDashoffset="-140"
              className="animate-pulse"
              style={{ opacity: 0.5 }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 bg-[var(--border-primary)] rounded w-16 animate-pulse" />
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 flex-1 w-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[var(--border-primary)] rounded animate-pulse" />
              <div className="h-4 bg-[var(--border-primary)] rounded w-24 animate-pulse" />
              <div className="h-4 bg-[var(--border-primary)] rounded w-12 ml-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Stats with sparkline skeleton
 */
export function StatSparklineSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={i}
          className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="h-4 bg-[var(--border-primary)] rounded w-24 mb-2 animate-pulse" />
              <div className="h-8 bg-[var(--border-primary)] rounded w-20 animate-pulse" />
            </div>
            <div className="h-6 bg-[var(--border-primary)] rounded w-16 animate-pulse" />
          </div>
          {/* Mini sparkline */}
          <div className="h-12 flex items-end gap-1">
            {Array.from({ length: 10 }).map((_, j) => {
              const heights = [30, 50, 40, 70, 60, 80, 65, 90, 75, 85];
              return (
                <div
                  key={j}
                  className="flex-1 bg-[var(--border-primary)] rounded-t animate-pulse"
                  style={{ height: `${heights[j]}%` }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LineChartSkeleton;
