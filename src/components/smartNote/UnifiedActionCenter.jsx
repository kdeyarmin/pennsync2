import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Lightbulb,
  Shield,
  CheckCircle2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react";

export default function UnifiedActionCenter({
  criticalItems = [],
  suggestions = [],
  complianceAlerts = [],
  onApplyAction,
  onDismiss
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedItems, setDismissedItems] = useState([]);

  const allItems = useMemo(() => {
    const items = [];
    
    // Add critical items first
    criticalItems.forEach((item, idx) => {
      items.push({
        id: `critical-${idx}`,
        type: 'critical',
        priority: 1,
        title: item.element || item.title,
        description: item.question || item.message,
        action: item.suggested_text,
        category: item.category
      });
    });

    // Add compliance alerts
    complianceAlerts.forEach((item, idx) => {
      items.push({
        id: `compliance-${idx}`,
        type: 'compliance',
        priority: 2,
        title: item.title || item.element,
        description: item.message || item.description,
        action: item.fix || item.suggested_text,
        category: 'compliance'
      });
    });

    // Add suggestions
    suggestions.forEach((item, idx) => {
      items.push({
        id: `suggestion-${idx}`,
        type: 'suggestion',
        priority: item.priority === 'high' ? 2 : 3,
        title: item.category || 'Suggestion',
        description: item.suggestion,
        action: item.text,
        category: item.category?.toLowerCase()
      });
    });

    return items
      .filter(item => !dismissedItems.includes(item.id))
      .sort((a, b) => a.priority - b.priority);
  }, [criticalItems, suggestions, complianceAlerts, dismissedItems]);

  const handleApply = (item) => {
    if (item.action && onApplyAction) {
      onApplyAction(item.action);
    }
    handleDismissItem(item.id);
  };

  const handleDismissItem = (id) => {
    setDismissedItems(prev => [...prev, id]);
    onDismiss?.(id);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'compliance': return <Shield className="w-4 h-4 text-orange-600" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-blue-600" />;
      default: return <Zap className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeBg = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-l-red-500';
      case 'compliance': return 'bg-orange-50 border-l-orange-500';
      case 'suggestion': return 'bg-blue-50 border-l-blue-500';
      default: return 'bg-gray-50 border-l-gray-500';
    }
  };

  if (allItems.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">All actions completed!</span>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = allItems.filter(i => i.type === 'critical').length;
  const complianceCount = allItems.filter(i => i.type === 'compliance').length;

  return (
    <Card className="border-indigo-200">
      <CardHeader 
        className="py-2 px-3 cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            Action Center
            <Badge className="bg-indigo-600 text-white text-xs">{allItems.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{criticalCount} Critical</Badge>
            )}
            {complianceCount > 0 && (
              <Badge className="bg-orange-500 text-white text-xs">{complianceCount} Compliance</Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-2">
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {allItems.slice(0, 8).map((item) => (
                <div 
                  key={item.id} 
                  className={`p-2 rounded-lg border-l-4 ${getTypeBg(item.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getTypeIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.action && (
                        <Button
                          size="sm"
                          onClick={() => handleApply(item)}
                          className="h-6 text-xs px-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismissItem(item.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {allItems.length > 8 && (
            <p className="text-xs text-center text-gray-500 mt-2">
              +{allItems.length - 8} more actions
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}