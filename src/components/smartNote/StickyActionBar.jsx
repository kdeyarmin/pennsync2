import { useLayoutEffect, useRef, useState } from "react";

/**
 * Keeps a step's primary action reachable without scrolling back down a long form.
 *
 * WHY FIXED AND NOT STICKY: the app shell's <main> carries `overflow-x-hidden`
 * (Layout.jsx), which computes `overflow-y: auto` and makes it the sticky
 * positioning container. Because main's height always equals its content height
 * it never actually scrolls, so a `position: sticky` child never engages — it
 * just rides along in normal flow. Verified in Chromium against the real shell
 * CSS: a sticky bottom bar sat 1.7k pixels below the viewport instead of pinning
 * to it. So below `md` the bar is fixed, with an in-flow spacer of the measured
 * height so the content beneath it is never covered.
 *
 * At `md` and up it returns to normal flow: there is no bottom nav to clear, the
 * sidebar makes a viewport-width fixed bar awkward to place, and the step is
 * short enough there that the action stays in reach.
 *
 * The fixed offset clears MobileBottomNav (fixed, h-16 = 4rem) plus the iOS safe
 * area.
 */
export default function StickyActionBar({ status = null, children, className = "" }) {
  const barRef = useRef(null);
  const [barHeight, setBarHeight] = useState(0);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const measure = () => setBarHeight((h) => (h === el.offsetHeight ? h : el.offsetHeight));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    // The status text wraps on narrow screens, so the height is not a constant.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" className="md:hidden" style={{ height: barHeight }} />
      <div
        ref={barRef}
        className={`fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:static md:px-0 md:pb-0 md:z-auto ${className}`}
      >
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Always rendered so the live region is stable across status changes. */}
          <div className="text-xs text-slate-600 sm:flex-1 min-w-0" aria-live="polite">
            {status}
          </div>
          <div className="flex gap-2 sm:shrink-0">{children}</div>
        </div>
      </div>
    </>
  );
}
