<<<<<<< HEAD
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/navigation/FavoriteButton";

/**
 * PageHeader — Standardised page-level heading card.
 *
 * Props:
 *  icon        – React element or component. If a component (function/class), it is
 *                rendered at 24 × 24. If already an element, it is rendered as-is.
 *  iconColor   – Tailwind bg-* class for the icon container (default: "bg-blue-600")
 *  eyebrow     – Small uppercase label above the title (optional)
 *  title       – Main page heading (required)
 *  description – Short subtitle / helper text (optional)
 *  badges      – Array of { label, className? } for status badges (optional)
 *  actions     – ReactNode for the right-hand action area (optional)
 *  favoritePage– Page key string — when provided, renders a FavoriteButton (optional)
 *  children    – Additional content rendered below the standard layout (optional)
 */
export default function PageHeader({
  icon: IconProp,
  iconColor = "bg-blue-600",
  eyebrow,
  title,
  description,
  badges = [],
  actions,
  favoritePage,
  children,
}) {
  const iconEl = IconProp && (
    typeof IconProp === "function"
      ? <IconProp className="w-6 h-6" />
      : IconProp
  );

  return (
    <Card className="border-0 shadow-[0_20px_60px_rgba(15,23,42,0.08)] bg-gradient-to-r from-white via-slate-50 to-blue-50/70 mb-6">
      <CardContent className="p-5 sm:p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            {iconEl && (
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-12 w-12 rounded-2xl ${iconColor} text-white flex items-center justify-center shadow-sm flex-shrink-0`}>
                  {iconEl}
                </div>
                <div>
                  {eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      {eyebrow}
                    </p>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
                </div>
              </div>
            )}
            {!iconEl && (
              <>
                {eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 mb-1">
                    {eyebrow}
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{title}</h1>
              </>
            )}

            {description && (
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl">{description}</p>
            )}

            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {badges.map((b, i) => (
                  <Badge
                    key={i}
                    className={b.className ?? "bg-blue-100 text-blue-800 hover:bg-blue-100"}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            {children}
          </div>

          {(actions || favoritePage) && (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-shrink-0">
              {favoritePage && (
                <FavoriteButton type="page" id={favoritePage} name={title} />
              )}
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
=======
import { cn } from "@/lib/utils";

/**
 * PageHeader — the single, consistent page title block for PennSync.
 *
 * Standardizes the heading scale, color token (slate, per the design system),
 * icon treatment, optional description, and an actions slot so every page header
 * looks and behaves the same. This replaces the ad-hoc
 * `<h1 className="text-... text-slate-900 ...">` blocks that had drifted across
 * pages (varying sizes, `gray` vs `slate`, with/without description or actions).
 *
 * Usage:
 *   <PageHeader
 *     icon={Shield}
 *     title="Compliance Center"
 *     description="Medicare compliance monitoring, alerts, and regulatory tracking"
 *     actions={<Button>…</Button>}
 *   />
 */
export default function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  iconClassName,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 sm:mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {Icon && (
            <Icon
              className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0",
                iconClassName,
              )}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-slate-500 mt-1.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
>>>>>>> origin/main
  );
}
