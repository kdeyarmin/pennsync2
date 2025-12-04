import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Lightbulb,
  Zap
} from "lucide-react";

export default function InteractiveComplianceFeedback({
  complianceData,
  enhancedComplianceData,
  roughNote,
  enhancedNote,
  onInsertSuggestion,
  onHighlightSection,
  onFixAllAndReEnhance,
  isFixingAll
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewDialog, setPreviewDialog] = useState(null);
  const [selectedFixes, setSelectedFixes] = useState(new Set());

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Combine all issues for unified view
  const allIssues = [
    ...(complianceData?.elements?.filter(e => e.status !== 'present').map(e => ({
      ...e,
      source: 'rough',
      type: e.status
    })) || []),
    ...(enhancedComplianceData?.flagged_issues?.map(i => ({
      ...i,
      source: 'enhanced',
      name: i.element,
      type: i.issue_type
    })) || [])
  ];

  const handleSelectAll = () => {
    if (selectedFixes.size === allIssues.length) {
      setSelectedFixes(new Set());
    } else {
      setSelectedFixes(new Set(allIssues.map((_, i) => i)));
    }
  };

  const handleApplySelected = () => {
    const suggestions = Array.from(selectedFixes).map(idx => {
      const issue = allIssues[idx];
      return issue.suggested_addition || issue.suggestion;
    }).filter(Boolean);
    
    if (suggestions.length > 0 && onFixAllAndReEnhance) {
      onFixAllAndReEnhance(suggestions);
    }
    setSelectedFixes(new Set());
  };

  const score = enhancedComplianceData?.overall_score || complianceData?.score || 0;

  if (!complianceData && !enhancedComplianceData) return null;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-3">
        {/* Header with score */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score || '--'}
              </span>
              <p className="text-xs text-gray-500">Compliance</p>
            </div>
            <div className="flex-1 max-w-32">
              <Progress 
                value={score} 
                className="h-2"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {allIssues.length > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                {allIssues.length} issue{allIssues.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isExpanded && allIssues.length > 0 && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {/* Quick fix all button */}
            {allIssues.length > 1 && (
              <div className="flex items-center justify-between mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedFixes.size === allIssues.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-xs font-medium text-green-800">
                    Select all ({allIssues.length} issues)
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={selectedFixes.size === 0 || isFixingAll}
                  onClick={handleApplySelected}
                  className="bg-green-600 hover:bg-green-700 text-xs h-7"
                >
                  {isFixingAll ? (
                    <>Fixing...</>
                  ) : (
                    <><Zap className="w-3 h-3 mr-1" /> Fix Selected ({selectedFixes.size})</>
                  )}
                </Button>
              </div>
            )}

            {/* Individual issues */}
            {allIssues.map((issue, idx) => {
              const isSelected = selectedFixes.has(idx);
              const suggestionText = issue.suggested_addition || issue.suggestion;
              
              return (
                <div 
                  key={idx}
                  className={`rounded-lg border p-2 transition-all ${
                    issue.type === 'missing' ? 'bg-red-50 border-red-200' :
                    issue.type === 'partial' || issue.type === 'weak' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-orange-50 border-orange-200'
                  } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newSet = new Set(selectedFixes);
                        if (isSelected) {
                          newSet.delete(idx);
                        } else {
                          newSet.add(idx);
                        }
                        setSelectedFixes(newSet);
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    
                    {issue.type === 'missing' ? (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold">{issue.name || issue.element}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {issue.type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {issue.source === 'rough' ? 'Rough Note' : 'Enhanced Note'}
                        </Badge>
                      </div>
                      
                      {issue.why_needed && (
                        <p className="text-[10px] text-gray-600 mt-1">
                          <Lightbulb className="w-3 h-3 inline mr-1" />
                          {issue.why_needed}
                        </p>
                      )}
                      
                      {issue.problem && (
                        <p className="text-[10px] text-gray-600 mt-1">{issue.problem}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {suggestionText && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setPreviewDialog({ issue, suggestion: suggestionText })}
                            title="Preview suggestion"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => onInsertSuggestion?.(suggestionText)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            <span className="text-xs">Add</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Compliant elements */}
            {(complianceData?.elements?.filter(e => e.status === 'present').length > 0 ||
              enhancedComplianceData?.compliant_elements?.length > 0) && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-medium text-green-700 mb-1">✓ Compliant Elements</p>
                <div className="flex flex-wrap gap-1">
                  {complianceData?.elements?.filter(e => e.status === 'present').map((e, idx) => (
                    <Badge key={`rough-${idx}`} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                      {e.name}
                    </Badge>
                  ))}
                  {enhancedComplianceData?.compliant_elements?.map((e, idx) => (
                    <Badge key={`enhanced-${idx}`} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewDialog} onOpenChange={() => setPreviewDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Preview: {previewDialog?.issue?.name || previewDialog?.issue?.element}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs font-medium text-gray-500 mb-1">Suggested Text:</p>
                <p className="text-sm whitespace-pre-wrap">{previewDialog?.suggestion}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    onInsertSuggestion?.(previewDialog?.suggestion);
                    setPreviewDialog(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Notes
                </Button>
                <Button variant="outline" onClick={() => setPreviewDialog(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}