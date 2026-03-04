import { Maximize, Minimize } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';

export function FullscreenButton({ className }: { className?: string }) {
  const { isFullscreen, toggle } = useFullscreen();

  return (
    <button
      onClick={toggle}
      title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
      aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className ?? ''}`}
    >
      {isFullscreen
        ? <Minimize className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        : <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      }
    </button>
  );
}
