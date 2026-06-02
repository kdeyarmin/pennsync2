import { useEffect, useRef } from 'react';

/**
 * Custom hook to preserve scroll position when switching between pages/tabs
 * @param {string} key - Unique identifier for the scroll position
 * @param {React.RefObject} containerRef - Reference to scrollable container
 */
export function useScrollPosition(key, containerRef) {
  const scrollPositions = useRef({});

  // Save scroll position when unmounting
  useEffect(() => {
    return () => {
      if (containerRef?.current) {
        scrollPositions.current[key] = containerRef.current.scrollTop;
        try { sessionStorage.setItem(`scroll_${key}`, containerRef.current.scrollTop.toString()); } catch {}
      }
    };
  }, [key, containerRef]);

  // Restore scroll position when mounting
  useEffect(() => {
    let savedPosition = null;
    try { savedPosition = sessionStorage.getItem(`scroll_${key}`); } catch {}
    if (savedPosition && containerRef?.current) {
      const position = parseInt(savedPosition, 10);
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (containerRef?.current) {
          containerRef.current.scrollTop = position;
        }
      }, 0);
    }
  }, [key, containerRef]);
}
