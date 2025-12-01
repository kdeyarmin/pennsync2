import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function ComplianceScoreIndicator({
  roughNote,
  careType,
  visitType,
  diagnosis,
  onInsertElement
}) {
  const [complianceData, setComplianceData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Debounced analysis
  useEffect(() => {
    if (roughNote && roughNote.length > 30) {
      const timer = setTimeout(() => {
        analyzeCompliance();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [roughNote, careType, visitType]);

  const analyzeCompliance = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this nursing note for Medicare compliance elements. Be quick and precise.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || 'Not specified'}

NOTE:
${roughNote}

Check for these ${careType === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'} required elements:

${careType === 'home_health' ? `
1. HOMEBOUND STATUS - Why patient can't leave home safely
2. SKILLED NEED - Why RN skill/judgment is required
3. PATIENT RESPONSE - How patient responded to teaching/interventions
4. FUNCTIONAL STATUS - ADL/mobility limitations
5. VITAL SIGNS - Basic vitals documented
6. ASSESSMENT FINDINGS - Objective clinical findings
7. INTERVENTIONS - What nursing care was provided
8. PLAN/GOALS - Next steps and goals addressed
` : `
1. TERMINAL PROGNOSIS - Evidence of disease progression
2. SYMPTOM MANAGEMENT - Pain/comfort assessment
3. PATIENT/FAMILY COPING - Emotional/spiritual status
4. COMFORT MEASURES - Quality of life focus
5. VITAL SIGNS - Basic vitals if appropriate
6. MEDICATION REVIEW - Comfort medications
7. HOSPICE APPROPRIATENESS - Continued eligibility
8. GOALS OF CARE - Patient/family wishes
`}

Return JSON:
{
  "score": 0-100,
  "elements": [
    {
      "name": "Element name",
      "status": "present" | "partial" | "missing",
      "found_text": "Quote from note if present, null if missing",
      "suggested_addition": "Text to add if missing or partial"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                  found_text: { type: "string" },
                  suggested_addition: { type: "string" }
                }
              }
            }
          }
        }
      });
      setComplianceData(result);
    } catch (error) {
      console.error("Compliance analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'partial': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'missing': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

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

  if (!roughNote || roughNote.length < 30) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className={`text-2xl font-bold ${complianceData ? getScoreColor(complianceData.score) : 'text-gray-400'}`}>
                {isAnalyzing ? '...' : complianceData?.score || '--'}
              </span>
              <p className="text-xs text-gray-500">Compliance</p>
            </div>
            {complianceData && (
              <div className="flex-1 max-w-32">
                <Progress 
                  value={complianceData.score} 
                  className="h-2"
                  style={{ '--progress-foreground': getProgressColor(complianceData.score) }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {complianceData && (
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {complianceData.elements?.filter(e => e.status === 'present').length || 0} ✓
                </Badge>
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {complianceData.elements?.filter(e => e.status === 'missing').length || 0} ✗
                </Badge>
              </div>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isExpanded && complianceData && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {complianceData.elements?.map((element, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-2 p-2 rounded ${
                  element.status === 'present' ? 'bg-green-50' : 
                  element.status === 'partial' ? 'bg-yellow-50' : 'bg-red-50'
                }`}
              >
                {getStatusIcon(element.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{element.name}</p>
                  {element.found_text && (
                    <p className="text-xs text-gray-600 italic truncate">"{element.found_text}"</p>
                  )}
                </div>
                {element.status !== 'present' && element.suggested_addition && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsertElement && onInsertElement(element.suggested_addition);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}