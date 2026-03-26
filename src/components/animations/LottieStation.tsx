import { useEffect, useRef, useState } from 'react';
import LottieReact, { type LottieRefCurrentProps } from 'lottie-react';

// lottie-react default export is the component itself in Vite ESM builds.
// The previous `.default` shim resolved to the module namespace (an object),
// triggering React Error #130 ("expected string/function, got object").
const Lottie = typeof LottieReact === 'function'
    ? LottieReact
    : (LottieReact as any)?.default ?? null;

interface LottieStationProps {
    /** Path to the Lottie JSON file relative to public/ */
    animationPath: string;
    /** Alt text for screen readers */
    label: string;
    /** Whether the station is currently active/visible */
    isActive?: boolean;
    className?: string;
}

/**
 * Lottie animation wrapper for DatenschutzGame stations (Phase 12).
 *
 * - Decorative (aria-hidden), not interactive
 * - Respects prefers-reduced-motion: pauses immediately when motion is reduced
 * - Plays only when isActive=true
 * - Assets served from public/assets/3d/ — no external CDN
 */
export function LottieStation({ animationPath, label, isActive = true, className = '' }: LottieStationProps) {
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [animationData, setAnimationData] = useState<unknown>(null);
    const prefersReduced = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    useEffect(() => {
        if (prefersReduced) return;
        fetch(animationPath)
            .then(r => r.json())
            .then(setAnimationData)
            .catch(() => {/* silently ignore missing assets */});
    }, [animationPath, prefersReduced]);

    useEffect(() => {
        if (!lottieRef.current || !animationData) return;
        if (isActive) {
            lottieRef.current.play();
        } else {
            lottieRef.current.pause();
        }
    }, [isActive, animationData]);

    if (prefersReduced) {
        // Static fallback for reduced-motion users
        return (
            <div
                className={`flex items-center justify-center opacity-60 ${className}`}
                aria-hidden="true"
                role="img"
                aria-label={label}
            >
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20" />
            </div>
        );
    }

    if (!animationData) {
        return <div className={className} aria-hidden="true" />;
    }

    return (
        <div aria-hidden="true" className={className}>
            {Lottie ? (
                <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    loop
                    autoplay={isActive}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                />
            ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10" />
            )}
        </div>
    );
}
