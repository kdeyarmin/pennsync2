import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  FileText,
  Eye,
  Check,
  Flag,
  AlertCircle,
  Zap,
  TrendingUp,
  Info
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function OASISAutomationPanel({ 
  oasisSuggestions = [],
  overallSummary = {},
  missingCriticalInfo = [],
  onApplySuggestion,
  onApplyAll,
  onReviewFlag,
  isLoading = false
}) {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  const getConfidenceColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "auto_update": return <Zap className="w-4 h-4 text-green-600" />;
      case "review": return <Eye className="w-4 h-4 text-yellow-600" />;
      case "flag": return <Flag className="w-4 h-4 text-red-600" />;
      case "no_change": return <Check className="w-4 h-4 text-gray-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-300";
      case "high": return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const handleApply = (suggestion) => {
    setAppliedSuggestions(prev => new Set([...prev, suggestion.item_number]));
    onApplySuggestion?.(suggestion);
  };

  const handleApplyAllHighConfidence = () => {
    const highConfidence = oasisSuggestions.filter(s => 
      s.confidence_score >= 80 && 
      s.action_needed === 'auto_update' &&
      !appliedSuggestions.has(s.item_number)
    );
    
    highConfidence.forEach(s => {
      setAppliedSuggestions(prev => new Set([...prev, s.item_number]));
    });
    
    onApplyAll?.(highConfidence);
  };

  const highConfidenceCount = oasisSuggestions.filter(s => 
    s.confidence_score >= 80 && 
    s.action_needed === 'auto_update' &&
    !appliedSuggestions.has(s.item_number)
  ).length;

  const discrepancies = oasisSuggestions.filter(s => s.discrepancy_flag);
  const needsReview = oasisSuggestions.filter(s => 
    s.action_needed === 'review' || s.action_needed === 'flag'
  );

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Analyzing clinical note and mapping to OASIS fields...</p>
        </CardContent>
      </Card>
    );
  }

  if (oasisSuggestions.length === 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          No OASIS suggestions available yet. Enhance your note first, then run OASIS automation.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI OASIS Automation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-purple-600">
                {overallSummary.total_items_mapped || oasisSuggestions.length}
              </p>
              <p className="text-xs text-gray-600">Items Mapped</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-600">
                {overallSummary.high_confidence_count || highConfidenceCount}
              </p>
              <p className="text-xs text-gray-600">High Confidence</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p className="text-2xl font-bold text-orange-600">
                {overallSummary.discrepancy_count || discrepancies.length}
              </p>
              <p className="text-xs text-gray-600">Discrepancies</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">
                {overallSummary.flagged_for_review_count || needsReview.length}
              </p>
              <p className="text-xs text-gray-600">Need Review</p>
            </div>
          </div>

          {/* Quick Actions */}
          {highConfidenceCount > 0 && (
            <Button
              onClick={handleApplyAllHighConfidence}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-Apply {highConfidenceCount} High Confidence Suggestion{highConfidenceCount > 1 ? 's' : ''}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Missing Critical Info Alert */}
      {missingCriticalInfo?.length > 0 && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription>
            <p className="font-semibold text-sm text-orange-800 mb-2">
              Missing Critical OASIS Information
            </p>
            <ul className="space-y-1 text-xs text-orange-700">
              {missingCriticalInfo.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.oasis_item}:</strong> {item.reason}
                  {item.suggestion && <span className="italic"> - {item.suggestion}</span>}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions List */}
      <Card className="border-gray-200">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">OASIS Field Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Accordion type="multiple" className="space-y-2">
            {oasisSuggestions.map((suggestion, idx) => {
              const isApplied = appliedSuggestions.has(suggestion.item_number);
              
              return (
                <AccordionItem 
                  key={idx} 
                  value={`item-${idx}`}
                  className={`border-2 rounded-lg ${getConfidenceColor(suggestion.confidence_score)} ${isApplied ? 'opacity-50' : ''}`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 text-left">
                        {getActionIcon(suggestion.action_needed)}
                        <div>
                          <p className="font-semibold text-sm">
                            {suggestion.item_number} - {suggestion.item_description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                              {suggestion.confidence_score}% confidence
                            </Badge>
                            {suggestion.discrepancy_flag && (
                              <Badge className={getSeverityColor(suggestion.discrepancy_severity)}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Discrepancy
                              </Badge>
                            )}
                            {isApplied && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold">
                          {suggestion.suggested_value}
                        </p>
                        <p className="text-xs text-gray-600">
                          {suggestion.suggested_value_label}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    {/* Supporting Evidence */}
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Evidence from Clinical Note:
                      </p>
                      <p className="text-xs text-gray-800 italic pl-4 border-l-2 border-blue-300">
                        "{suggestion.supporting_text}"
                      </p>
                      {suggestion.note_location && (
                        <p className="text-xs text-gray-500 mt-2">
                          📍 Found in: {suggestion.note_location}
                        </p>
                      )}
                    </div>

                    {/* Clinical Rationale */}
                    {suggestion.clinical_rationale && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-800 mb-1">
                          💡 Clinical Rationale:
                        </p>
                        <p className="text-xs text-blue-700">{suggestion.clinical_rationale}</p>
                      </div>
                    )}

                    {/* Discrepancy Details */}
                    {suggestion.discrepancy_flag && (
                      <div className={`p-3 rounded border-2 ${getSeverityColor(suggestion.discrepancy_severity)}`}>
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Discrepancy Detected:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <p className="font-medium">Current OASIS:</p>
                            <p className="font-bold">{suggestion.current_oasis_value || 'Not set'}</p>
                          </div>
                          <div>
                            <p className="font-medium">AI Suggests:</p>
                            <p className="font-bold text-green-700">{suggestion.suggested_value}</p>
                          </div>
                        </div>
                        <p className="text-xs">{suggestion.discrepancy_reason}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {!isApplied && (
                        <>
                          {suggestion.action_needed === 'auto_update' && (
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleApply(suggestion)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Apply Suggestion
                            </Button>
                          )}
                          {(suggestion.action_needed === 'review' || suggestion.action_needed === 'flag') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => onReviewFlag?.(suggestion)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review & Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReviewFlag?.(suggestion)}
                          >
                            <Flag className="w-4 h-4 mr-1" />
                            Flag for Manual Review
                          </Button>
                        </>
                      )}
                      {isApplied && (
                        <div className="flex-1 text-center py-2 text-sm text-green-700 font-medium">
                          ✓ Applied to OASIS
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}