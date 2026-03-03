/**
 * Trigger haptic feedback on mobile devices using the Vibration API.
 * Falls back silently if not supported. DSGVO-safe — no data collected.
 *
 * @param pattern - Duration in ms, or array of vibrate/pause durations
 */
export function hapticFeedback(pattern: number | number[] = 10): void {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    } catch {
        // Silently ignore — not all browsers support this
    }
}

/** Light tap feedback (button press) */
export function hapticTap(): void {
    hapticFeedback(10);
}

/** Medium feedback (navigation, selection) */
export function hapticSelect(): void {
    hapticFeedback(20);
}

/** Strong feedback (success, completion) */
export function hapticSuccess(): void {
    hapticFeedback([15, 50, 30]);
}

/** Warning/error feedback */
export function hapticWarning(): void {
    hapticFeedback([30, 30, 30]);
}
