import { useState, useCallback, useEffect } from 'react';

export function useFullscreen(elementRef?: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async () => {
    try {
      const el = elementRef?.current ?? document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch { /* user denied */ }
  }, [elementRef]);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch { /* not in fullscreen */ }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) exit(); else enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, toggle, enter, exit };
}
