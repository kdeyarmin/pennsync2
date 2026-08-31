/**
 * Keeps a step's primary action reachable without scrolling back down a long form.
 *
 * Layout note: below `md` the app renders MobileBottomNav as a fixed 4rem
 * (h-16) bar, so the offset clears that plus the iOS safe area. Above `md` the
 * bottom nav is gone and a small inset is enough. The bar is `sticky` and sits
 * in the normal flow as the last element of the step, so it needs no spacer and
 * behaves the same inside the referral iframe as it does on the standalone page.
 */
export default function StickyActionBar({ status = null, children, className = "" }) {
  return (
    <div
      className={`sticky z-20 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] md:bottom-4 ${className}`}
    >
      <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Always rendered so the live region is stable across status changes. */}
        <div className="text-xs text-slate-600 sm:flex-1 min-w-0" aria-live="polite">
          {status}
        </div>
        <div className="flex gap-2 sm:shrink-0">{children}</div>
      </div>
    </div>
  );
}
