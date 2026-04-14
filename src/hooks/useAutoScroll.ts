/**
 * useAutoScroll — Smooth scroll to a target element when content changes.
 *
 * Designed for the Anamnese Questionnaire:  When the active question
 * changes the user should see the new content without the header or
 * navigation buttons covering the input area.
 *
 * Usage:
 *   const scrollRef = useAutoScroll(trigger);
 *   <div ref={scrollRef} className="question-card">…</div>
 *
 * The hook scrolls the viewport so that the referenced element is visible
 * with a comfortable top offset (accounting for the sticky header).
 *
 * @param trigger  Any value that changes when a scroll should occur
 *                 (e.g. the current question ID).
 * @param options  Optional configuration.
 */

import { useRef, useEffect } from 'react';

interface AutoScrollOptions {
    /** Pixels from the top of the viewport to keep as padding. Default: 80. */
    topOffset?: number;
    /** Delay in ms before scrolling (lets React finish painting). Default: 80. */
    delayMs?: number;
    /** Whether scroll is currently disabled (e.g. during overlay). Default: false. */
    disabled?: boolean;
}

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
    trigger: unknown,
    options: AutoScrollOptions = {},
): React.RefObject<T | null> {
    const { topOffset = 80, delayMs = 80, disabled = false } = options;
    const ref = useRef<T | null>(null);

    useEffect(() => {
        if (disabled || !trigger) return;

        const id = setTimeout(() => {
            const el = ref.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const isAlreadyVisible = rect.top >= topOffset && rect.bottom <= window.innerHeight;

            if (!isAlreadyVisible) {
                // Use scrollIntoView for elements inside a scrollable container
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Apply top-offset compensation after native scroll settles (~300ms)
                const compensationId = setTimeout(() => {
                    window.scrollBy({ top: -topOffset, behavior: 'smooth' });
                }, 320);

                return () => clearTimeout(compensationId);
            }
        }, delayMs);

        return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, disabled]);

    return ref;
}
