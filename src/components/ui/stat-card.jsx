import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = "default",
  description,
  className 
}) {
  const variants = {
    default: {
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
      icon: "text-blue-600"
    },
    success: {
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-50",
      icon: "text-green-600"
    },
    warning: {
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50",
      icon: "text-amber-600"
    },
    critical: {
      gradient: "from-red-500 to-red-600",
      bg: "bg-red-50",
      icon: "text-red-600"
    },
    ai: {
      gradient: "from-navy-500 to-indigo-600",
      bg: "bg-navy-50",
      icon: "text-navy-600"
    }
  };

  const config = variants[variant];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-600";

  return (
    <div className={cn("modern-card overflow-hidden", className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            
            {(trend || description) && (
              <div className="mt-2 flex items-center gap-2">
                {trend && trendValue && (
                  <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{trendValue}</span>
                  </div>
                )}
                {description && (
                  <p className="text-sm text-slate-500">{description}</p>
                )}
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", config.bg)}>
              <Icon className={cn("w-6 h-6", config.icon)} />
            </div>
          )}
        </div>
      </div>
      
      {/* Gradient accent bar */}
      <div className={cn("h-1 bg-gradient-to-r", config.gradient)} />
    </div>
  );
}