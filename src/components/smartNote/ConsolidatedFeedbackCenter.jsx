import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Shield,
  Brain,
  X,
  ChevronRight,
  Sparkles,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConsolidatedFeedbackCenter({
  complianceAlerts = [],
  aiSuggestions = [],
  riskAlerts = [],
  missingElements = [],
  onApplyFix,
  onDismiss,
  onViewDetails
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissedIds, setDismissedIds] = useState([]);

  // Combine all items
  const allItems = [
    ...complianceAlerts.map(a => ({ ...a, type: 'compliance', icon: Shield, color: 'red' })),
    ...riskAlerts.map(a => ({ ...a, type: 'risk', icon: AlertTriangle, color: 'orange' })),
    ...missingElements.map(a => ({ ...a, type: 'missing', icon: Brain, color: 'yellow' })),
    ...aiSuggestions.map(a => ({ ...a, type: 'suggestion', icon: Lightbulb, color: 'blue' }))
  ].filter(item => !dismissedIds.includes(item.id));

  const filteredItems = activeFilter === 'all' 
    ? allItems 
    : allItems.filter(item => item.type === activeFilter);

  const getItemCounts = () => ({
    all: allItems.length,
    compliance: complianceAlerts.filter(a => !dismissedIds.includes(a.id)).length,
    risk: riskAlerts.filter(a => !dismissedIds.includes(a.id)).length,
    missing: missingElements.filter(a => !dismissedIds.includes(a.id)).length,
    suggestion: aiSuggestions.filter(a => !dismissedIds.includes(a.id)).length
  });

  const counts = getItemCounts();

  const handleDismiss = (id) => {
    setDismissedIds(prev => [...prev, id]);
    onDismiss?.(id);
  };

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-50 border-red-200 hover:bg-red-100',
      orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      green: 'bg-green-50 border-green-200 hover:bg-green-100'
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClass = (color) => {
    const colors = {
      red: 'text-red-600',
      orange: 'text-orange-600',
      yellow: 'text-yellow-600',
      blue: 'text-blue-600',
      green: 'text-green-600'
    };
    return colors[color] || colors.blue;
  };

  if (allItems.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-800">All Clear!</p>
          <p className="text-xs text-green-600">No pending actions or suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardHeader className="py-2 px-3 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-600" />
            Action Center
            <Badge className="bg-purple-600">{allItems.length}</Badge>
          </CardTitle>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'compliance', label: 'Compliance', count: counts.compliance, color: 'red' },
            { key: 'risk', label: 'Risk', count: counts.risk, color: 'orange' },
            { key: 'missing', label: 'Missing', count: counts.missing, color: 'yellow' },
            { key: 'suggestion', label: 'Tips', count: counts.suggestion, color: 'blue' }
          ].filter(f => f.count > 0 || f.key === 'all').map(filter => (
            <Button
              key={filter.key}
              size="sm"
              variant={activeFilter === filter.key ? "default" : "outline"}
              className={`h-6 text-xs px-2 ${activeFilter === filter.key ? '' : 'bg-white'}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              {filter.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-2">
        <ScrollArea className="h-[300px] pr-2">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-2 rounded-lg border mb-2 ${getColorClasses(item.color)}`}
              >
                <div className="flex items-start gap-2">
                  <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getIconColorClass(item.color)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold capitalize">{item.type}</span>
                      {item.priority && (
                        <Badge className={
                          item.priority === 'critical' ? 'bg-red-500' :
                          item.priority === 'high' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }>
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-800 font-medium">{item.title || item.message}</p>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      {item.fix && (
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => onApplyFix(item.fix, item.id)}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Apply Fix
                        </Button>
                      )}
                      {item.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => onViewDetails?.(item)}
                        >
                          View
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    onClick={() => handleDismiss(item.id || idx)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}