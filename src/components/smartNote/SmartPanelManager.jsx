import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function SmartPanelManager({
  title,
  icon: Icon,
  children,
  isRelevant = true,
  isCompleted = false,
  relevanceReason,
  defaultExpanded = true,
  badgeText,
  badgeVariant = "default"
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded && isRelevant);

  // Auto-collapse completed panels
  React.useEffect(() => {
    if (isCompleted && isExpanded) {
      setIsExpanded(false);
    }
  }, [isCompleted]);

  // Auto-expand when becomes relevant
  React.useEffect(() => {
    if (isRelevant && !isCompleted && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isRelevant]);

  if (!isRelevant) {
    return (
      <Card className="opacity-50 border-dashed">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2 text-gray-500">
              {Icon && <Icon className="w-4 h-4" />}
              {title}
            </CardTitle>
            <Badge variant="outline" className="text-xs text-gray-400">
              {relevanceReason || 'Not applicable'}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`transition-all ${isCompleted ? 'border-green-200 bg-green-50/50' : ''}`}>
      <CardHeader 
        className={`py-2 px-3 cursor-pointer ${isCompleted ? 'bg-green-50' : 'hover:bg-gray-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {Icon && <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-indigo-600'}`} />}
            {title}
            {isCompleted && (
              <Badge className="bg-green-500 text-white text-xs">Done</Badge>
            )}
            {badgeText && !isCompleted && (
              <Badge variant={badgeVariant} className="text-xs">{badgeText}</Badge>
            )}
          </CardTitle>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}