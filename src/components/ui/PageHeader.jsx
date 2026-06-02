import { cn } from "@/lib/utils";

/**
 * PageHeader — the single, consistent page title block for PennSync.
 *
 * Standardizes the heading scale, color token (slate, per the design system),
 * icon treatment, optional description, and an actions slot so every page header
 * looks and behaves the same. This replaces the ad-hoc
 * `<h1 className="text-... text-gray-900 ...">` blocks that had drifted across
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
  );
}
