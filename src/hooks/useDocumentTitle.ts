import { useEffect } from 'react';

/**
 * Sets document.title for the current route. Restores the previous title on unmount.
 * Pattern: `${page} · Mega`
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Mega` : previous;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
