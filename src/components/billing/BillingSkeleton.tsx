// ─── BillingSkeleton Component ─────────────────────────────
// Loading state for Billing Dashboard with animated skeleton UI

import { motion } from 'framer-motion';

interface SkeletonBlockProps {
  width?: string;
  height?: string;
  className?: string;
  delay?: number;
}

function SkeletonBlock({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  delay = 0 
}: SkeletonBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className={`
        bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
        bg-[length:200%_100%]
        rounded-lg
        animate-shimmer
        ${className}
      `}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  children: React.ReactNode;
  delay?: number;
  'aria-label'?: string;
}

function SkeletonCard({ children, delay = 0, 'aria-label': ariaLabel }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-xl p-6 border border-[var(--border-primary)] shadow-sm"
      role="status"
      aria-label={ariaLabel || 'Loading content'}
    >
      {children}
    </motion.div>
  );
}

/**
 * BillingSkeleton - Loading state for Billing Dashboard
 * 
 * Features:
 * - Animated shimmer effect for better UX
 * - Accessible with ARIA labels
 * - Staggered animation for visual hierarchy
 * - Matches Billing Dashboard layout structure
 */
export function BillingSkeleton() {
  return (
    <div 
      className="space-y-6"
      role="status"
      aria-label="Loading billing information"
      aria-busy="true"
    >
      {/* Subscription Status Card Skeleton */}
      <SkeletonCard delay={0} aria-label="Loading subscription details">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock width="48px" height="48px" className="rounded-xl" />
            <div className="space-y-2">
              <SkeletonBlock width="160px" height="20px" />
              <SkeletonBlock width="100px" height="14px" />
            </div>
          </div>
          <SkeletonBlock width="80px" height="28px" className="rounded-full" />
        </div>
        <div className="border-t border-[var(--border-primary)] pt-4 mt-4">
          <div className="flex justify-between items-center">
            <SkeletonBlock width="120px" height="16px" />
            <SkeletonBlock width="140px" height="16px" />
          </div>
        </div>
      </SkeletonCard>

      {/* Usage Quota Card Skeleton */}
      <SkeletonCard delay={0.1} aria-label="Loading usage statistics">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBlock width="20px" height="20px" className="rounded" />
          <SkeletonBlock width="140px" height="18px" />
        </div>
        <div className="space-y-4">
          {/* Progress bar skeleton */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <SkeletonBlock width="80px" height="14px" />
              <SkeletonBlock width="60px" height="14px" />
            </div>
            <SkeletonBlock width="100%" height="8px" className="rounded-full" />
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <SkeletonBlock width="100%" height="50px" className="rounded-lg" />
            <SkeletonBlock width="100%" height="50px" className="rounded-lg" delay={0.05} />
            <SkeletonBlock width="100%" height="50px" className="rounded-lg" delay={0.1} />
          </div>
        </div>
      </SkeletonCard>

      {/* Payment Method Card Skeleton */}
      <SkeletonCard delay={0.2} aria-label="Loading payment methods">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock width="40px" height="28px" className="rounded" />
            <div className="space-y-1">
              <SkeletonBlock width="120px" height="16px" />
              <SkeletonBlock width="80px" height="12px" />
            </div>
          </div>
          <SkeletonBlock width="60px" height="14px" />
        </div>
      </SkeletonCard>

      {/* Invoices List Skeleton */}
      <SkeletonCard delay={0.3} aria-label="Loading invoice history">
        <SkeletonBlock width="100px" height="18px" className="mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className="flex items-center justify-between py-3 border-b border-[var(--border-primary)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <SkeletonBlock width="36px" height="36px" className="rounded-lg" delay={0.05 * i} />
                <div className="space-y-1">
                  <SkeletonBlock width="100px" height="14px" delay={0.05 * i} />
                  <SkeletonBlock width="80px" height="12px" delay={0.05 * i} />
                </div>
              </div>
              <SkeletonBlock width="80px" height="16px" delay={0.05 * i} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Action Buttons Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex flex-wrap gap-3 pt-2"
        aria-hidden="true"
      >
        <SkeletonBlock width="140px" height="44px" className="rounded-xl" />
        <SkeletonBlock width="140px" height="44px" className="rounded-xl" delay={0.05} />
        <SkeletonBlock width="120px" height="44px" className="rounded-xl" delay={0.1} />
      </motion.div>

      {/* Screen reader only text */}
      <span className="sr-only">
        Billing information is loading. Please wait...
      </span>
    </div>
  );
}

/**
 * Compact billing skeleton for sidebar or small containers
 */
export function BillingSkeletonCompact() {
  return (
    <div 
      className="space-y-4"
      role="status"
      aria-label="Loading billing summary"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <SkeletonBlock width="40px" height="40px" className="rounded-xl" />
        <div className="space-y-1 flex-1">
          <SkeletonBlock width="60%" height="16px" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
      </div>
      <SkeletonBlock width="100%" height="6px" className="rounded-full" />
      <div className="flex justify-between">
        <SkeletonBlock width="80px" height="12px" />
        <SkeletonBlock width="60px" height="12px" />
      </div>
    </div>
  );
}

/**
 * Skeleton for subscription tier cards
 */
export function PricingCardsSkeleton() {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      role="status"
      aria-label="Loading pricing options"
      aria-busy="true"
    >
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="bg-white rounded-xl p-6 border border-[var(--border-primary)] shadow-sm"
        >
          <SkeletonBlock width="80px" height="20px" className="mb-4" />
          <SkeletonBlock width="120px" height="40px" className="mb-6" />
          <div className="space-y-3 mb-6">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <SkeletonBlock width="16px" height="16px" className="rounded-full" delay={j * 0.05} />
                <SkeletonBlock width="80%" height="14px" delay={j * 0.05} />
              </div>
            ))}
          </div>
          <SkeletonBlock width="100%" height="44px" className="rounded-xl" />
        </motion.div>
      ))}
    </div>
  );
}

export default BillingSkeleton;
