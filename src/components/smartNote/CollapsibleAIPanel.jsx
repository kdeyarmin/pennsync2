import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CollapsibleAIPanel({
  title,
  icon: Icon,
  iconColor = "text-purple-600",
  bgColor = "bg-purple-50",
  children,
  defaultExpanded = false,
  alertCount = 0,
  alertType = "info", // "critical", "warning", "info", "success"
  summary = null,
  hasNewContent = false,
  onExpand
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState && onExpand) {
      onExpand();
    }
  };

  const getAlertStyle = () => {
    switch (alertType) {
      case 'critical':
        return 'bg-red-500 text-white animate-pulse';
      case 'warning':
        return 'bg-orange-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <Card className={`border transition-all duration-200 ${
      alertCount > 0 && alertType === 'critical' ? 'ring-2 ring-red-400' : ''
    }`}>
      <CardHeader 
        className={`py-2.5 px-3 cursor-pointer ${bgColor} hover:opacity-90 transition-opacity`}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon className={`w-4 h-4 ${iconColor}`} />
              {hasNewContent && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              )}
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            
            {alertCount > 0 && (
              <Badge className={`${getAlertStyle()} text-xs px-1.5 py-0`}>
                {alertCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isExpanded && summary && (
              <span className="text-xs text-gray-500 max-w-[150px] truncate hidden sm:block">
                {summary}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="p-3 pt-2">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}