import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyState({ 
  title = "No data found", 
  description = "There is currently no data to display in this section.",
  icon: Icon = Inbox,
  action = null,
  className
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-slate-200 bg-white/50 border-dashed", className)}>
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}