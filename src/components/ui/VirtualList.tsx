import React, { useRef, useState, useEffect, useCallback, memo } from 'react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
    containerHeight?: number | string;
}

/**
 * VirtualList Component - High-performance virtual scrolling
 * 
 * Renders only visible items + overscan for smooth scrolling.
 * Essential for long lists (100+ items) to maintain 60fps.
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={questions}
 *   itemHeight={80}
 *   renderItem={(question, index) => <QuestionCard question={question} />}
 *   overscan={5}
 * />
 * ```
 */
function VirtualListInner<T>({
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    className = '',
    containerHeight = '100vh',
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const [scrollTop, setScrollTop] = useState(0);

    // Calculate total height
    const totalHeight = items.length * itemHeight;

    // Update visible range on scroll
    const updateVisibleRange = useCallback(() => {
        if (!containerRef.current) return;

        const { scrollTop: st, clientHeight } = containerRef.current;
        setScrollTop(st);

        // Calculate visible indices with overscan
        const start = Math.max(0, Math.floor(st / itemHeight) - overscan);
        const end = Math.min(
            items.length,
            Math.ceil((st + clientHeight) / itemHeight) + overscan
        );

        setVisibleRange({ start, end });
    }, [items.length, itemHeight, overscan]);

    // Attach scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial calculation
        updateVisibleRange();

        // Use passive listener for better scroll performance
        container.addEventListener('scroll', updateVisibleRange, { passive: true });
        
        // Handle window resize
        const handleResize = () => updateVisibleRange();
        window.addEventListener('resize', handleResize);

        return () => {
            container.removeEventListener('scroll', updateVisibleRange);
            window.removeEventListener('resize', handleResize);
        };
    }, [updateVisibleRange]);

    // Recalculate when items change
    useEffect(() => {
        updateVisibleRange();
    }, [items, updateVisibleRange]);

    // Slice visible items
    const visibleItems = items.slice(visibleRange.start, visibleRange.end);

    // Calculate offset for visible items
    const offsetY = visibleRange.start * itemHeight;

    return (
        <div
            ref={containerRef}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
        >
            {/* Spacer element for total height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Visible items container with transform */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        transform: `translateY(${offsetY}px)`,
                        willChange: 'transform',
                    }}
                >
                    {visibleItems.map((item, index) => {
                        const actualIndex = visibleRange.start + index;
                        return (
                            <div
                                key={actualIndex}
                                style={{
                                    height: itemHeight,
                                    boxSizing: 'border-box',
                                }}
                            >
                                {renderItem(item, actualIndex)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Memoized version for performance
export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

// Type assertion to preserve generic type
export type { VirtualListProps };

// Default export
export default VirtualList;
