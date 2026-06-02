import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/navigation/FavoriteButton";
import { cn } from "@/lib/utils";

export default function PageHeader({
  icon: IconProp,
  iconColor = "bg-blue-600",
  iconClassName,
  eyebrow,
  title,
  description,
  badges = [],
  actions,
  favoritePage,
  className,
  children,
}) {
  const iconEl = IconProp && (
    typeof IconProp === "function"
      ? <IconProp className={cn("w-6 h-6", iconClassName)} aria-hidden="true" />
      : IconProp
  );

  return (
    <Card className={cn("mb-6 border-0 bg-gradient-to-r from-white via-slate-50 to-blue-50/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)]", className)}>
      <CardContent className="p-5 sm:p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {iconEl ? (
              <div className="mb-3 flex items-center gap-3">
                <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-sm", iconColor)}>
                  {iconEl}
                </div>
                <div className="min-w-0">
                  {eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      {eyebrow}
                    </p>
                  )}
                  <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
                </div>
              </div>
            ) : (
              <>
                {eyebrow && (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    {eyebrow}
                  </p>
                )}
                <h1 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              </>
            )}

            {description && <p className="max-w-2xl text-sm text-slate-600 sm:text-base">{description}</p>}

            {badges.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    className={badge.className ?? "bg-blue-100 text-blue-800 hover:bg-blue-100"}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}

            {children}
          </div>

          {(actions || favoritePage) && (
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              {favoritePage && <FavoriteButton type="page" id={favoritePage} name={title} />}
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
