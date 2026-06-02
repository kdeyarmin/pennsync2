import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  Shield,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function UnifiedAIPanel({
  clinicalDecisionSupport,
  complianceSuggestions,
  proactiveSuggestions,
  realTimeGuidance,
  isCollapsed,
  onToggleCollapse,
  onApplySuggestion
}) {
  const [activeTab, setActiveTab] = useState("all");

  // Count total suggestions across all sources
  const totalSuggestions = 
    (clinicalDecisionSupport?.total || 0) +
    (complianceSuggestions?.total || 0) +
    (proactiveSuggestions?.total || 0) +
    (realTimeGuidance?.total || 0);

  const criticalCount = 
    (clinicalDecisionSupport?.critical || 0) +
    (complianceSuggestions?.critical || 0) +
    (proactiveSuggestions?.critical || 0);

  if (totalSuggestions === 0) return null;

  return (
    <Card className="border-2 border-purple-300 shadow-lg sticky top-4 z-10">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>AI Assistance</span>
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
            {totalSuggestions > 0 && (
              <Badge variant="secondary">
                {totalSuggestions} suggestion{totalSuggestions !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
              <TabsTrigger value="all" className="text-xs">
                All
                {totalSuggestions > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {totalSuggestions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="clinical" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Clinical
                {clinicalDecisionSupport?.total > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {clinicalDecisionSupport.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Compliance
                {complianceSuggestions?.total > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {complianceSuggestions.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="guidance" className="text-xs">
                <Lightbulb className="w-3 h-3 mr-1" />
                Guidance
                {proactiveSuggestions?.total > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {proactiveSuggestions.total}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[500px] overflow-y-auto p-4">
              <TabsContent value="all" className="mt-0 space-y-3">
                {renderAllSuggestions()}
              </TabsContent>

              <TabsContent value="clinical" className="mt-0">
                {clinicalDecisionSupport?.component}
              </TabsContent>

              <TabsContent value="compliance" className="mt-0">
                {complianceSuggestions?.component}
              </TabsContent>

              <TabsContent value="guidance" className="mt-0">
                {proactiveSuggestions?.component}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );

  function renderAllSuggestions() {
    const allItems = [];

    // Collect all suggestions with priority
    if (clinicalDecisionSupport?.items) {
      allItems.push(...clinicalDecisionSupport.items.map(item => ({
        ...item,
        source: 'clinical',
        sourceIcon: Sparkles,
        sourceColor: 'text-blue-600'
      })));
    }

    if (complianceSuggestions?.items) {
      allItems.push(...complianceSuggestions.items.map(item => ({
        ...item,
        source: 'compliance',
        sourceIcon: Shield,
        sourceColor: 'text-green-600'
      })));
    }

    if (proactiveSuggestions?.items) {
      allItems.push(...proactiveSuggestions.items.map(item => ({
        ...item,
        source: 'guidance',
        sourceIcon: Lightbulb,
        sourceColor: 'text-amber-600'
      })));
    }

    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allItems.sort((a, b) => 
      (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999)
    );

    if (allItems.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p className="text-sm">No AI suggestions at this time</p>
          <p className="text-xs text-slate-400 mt-1">Continue documenting your visit</p>
        </div>
      );
    }

    return allItems.map((item, idx) => (
      <Card 
        key={idx} 
        className={`border-l-4 ${
          item.priority === 'critical' ? 'border-l-red-600 bg-red-50' :
          item.priority === 'high' ? 'border-l-orange-500 bg-orange-50' :
          item.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-blue-500 bg-blue-50'
        }`}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <item.sourceIcon className={`w-4 h-4 ${item.sourceColor}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase">
                {item.source}
              </span>
            </div>
            <Badge className={
              item.priority === 'critical' ? 'bg-red-600' :
              item.priority === 'high' ? 'bg-orange-500' :
              item.priority === 'medium' ? 'bg-yellow-500' :
              'bg-blue-500'
            }>
              {item.priority}
            </Badge>
          </div>
          
          <p className="text-sm font-semibold text-slate-900 mb-2">{item.title}</p>
          
          {item.description && (
            <p className="text-xs text-slate-600 mb-2">{item.description}</p>
          )}

          {item.action && (
            <div className="bg-white p-2 rounded border mb-2">
              <p className="text-xs font-semibold text-slate-700 mb-1">Recommended Action:</p>
              <p className="text-xs text-slate-600">{item.action}</p>
            </div>
          )}

          {item.suggestions && item.suggestions.length > 0 && (
            <div className="space-y-1 mb-2">
              {item.suggestions.map((suggestion, i) => (
                <div key={i} className="text-xs text-slate-700 flex items-start gap-1">
                  <span>•</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {item.canApply && (
            <Button
              size="sm"
              className={`w-full text-xs h-7 ${
                item.priority === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                item.priority === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={() => onApplySuggestion && onApplySuggestion(item)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Apply Suggestion
            </Button>
          )}
        </CardContent>
      </Card>
    ));
  }
}