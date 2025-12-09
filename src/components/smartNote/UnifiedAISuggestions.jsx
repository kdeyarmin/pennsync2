import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Wand2, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  Loader2,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus
} from "lucide-react";

export default function UnifiedAISuggestions({
  roughNote,
  diagnosis,
  vitalSigns,
  patientData,
  patientContext,
  careType = "home_health",
  visitType,
  appliedFixes = [],
  onApplyFix,
  onApplyAll
}) {
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [appliedIndices, setAppliedIndices] = useState(new Set());

  useEffect(() => {
    if (roughNote && roughNote.length >= 100) {
      const timer = setTimeout(() => {
        analyzeNote();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setAnalysisData(null);
    }
  }, [roughNote, diagnosis]);

  const analyzeNote = async () => {
    if (!roughNote || roughNote.length < 100) return;
    
    setIsAnalyzing(true);
    try {
      const vitalsString = vitalSigns ? Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => {
        if (k === 'o2') {
          const o2Text = `O2 Sat: ${v}`;
          if (vitalSigns.o2Source === 'on_oxygen' && vitalSigns.o2Flow) {
            return `${o2Text} on ${vitalSigns.o2Flow}L O2`;
          } else if (vitalSigns.o2Source === 'on_oxygen') {
            return `${o2Text} on supplemental O2`;
          }
          return `${o2Text} on room air`;
        }
        if (k === 'bp') return `Blood Pressure: ${v}`;
        if (k === 'hr') return `Heart Rate: ${v}`;
        if (k === 'temp') return `Temperature: ${v}`;
        if (k === 'pain') return `Pain: ${v}`;
        return `${k.toUpperCase()}: ${v}`;
      }).join(', ') : '';

      const patientContextStr = patientContext ? `
PATIENT MEDICAL HISTORY:
- Name: ${patientContext.name || 'Not specified'}
- Primary Diagnosis: ${patientContext.primaryDiagnosis || diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patientContext.secondaryDiagnoses?.join(', ') || 'None listed'}
- Allergies: ${patientContext.allergies || 'None documented'}
- Active Care Plan Goals: ${patientContext.carePlanGoals?.join('; ') || 'None specified'}
` : '';

      const prompt = `Analyze this nursing note for BOTH compliance gaps AND quality improvements.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VITAL SIGNS: ${vitalsString || 'None entered'}
${patientContextStr}

ROUGH NOTE:
${roughNote}

ANALYZE FOR:

1. COMPLIANCE GAPS - Missing Medicare-required elements:
${careType === 'home_health' ? `
   - HOMEBOUND STATUS: Why patient can't leave home safely
   - SKILLED NEED: Why RN skill/judgment is required
   - PATIENT RESPONSE: How patient responded to teaching
   - FUNCTIONAL STATUS: ADL/mobility limitations
   - VITAL SIGNS: Basic vitals documented
   - ASSESSMENT FINDINGS: Objective clinical findings
   - INTERVENTIONS: What nursing care was provided
   - PLAN/GOALS: Next steps and goals
` : `
   - TERMINAL PROGNOSIS: Disease progression
   - SYMPTOM MANAGEMENT: Pain/comfort assessment
   - PATIENT/FAMILY COPING: Emotional/spiritual status
   - COMFORT MEASURES: Quality of life focus
`}

2. QUALITY ISSUES - Documentation that needs improvement:
   - VAGUE LANGUAGE: "doing well", "stable" → specific observations
   - WEAK FLOW: Ensure logical clinical progression
   - GENERIC DESCRIPTIONS: "some edema" → "2+ pitting edema bilateral LE"
   - LAY TERMINOLOGY: "breathing worse" → "respiratory distress"
   - UNCLEAR OUTCOMES: "taught about meds" → specific teach-back

Return JSON with COMBINED suggestions:
{
  "overall_score": 0-100,
  "compliance_score": 0-100,
  "quality_score": 0-100,
  "suggestions": [
    {
      "type": "compliance_gap" | "quality_issue",
      "category": "string (e.g., HOMEBOUND STATUS, vague_language)",
      "priority": "high" | "medium" | "low",
      "issue": "What's wrong",
      "current_text": "Quote from note if partial, empty if missing",
      "suggested_fix": "Ready-to-paste clinical text",
      "rationale": "Why this matters"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            compliance_score: { type: "number" },
            quality_score: { type: "number" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  issue: { type: "string" },
                  current_text: { type: "string" },
                  suggested_fix: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysisData(result);
      
      // Auto-switch to compliance tab if critical gaps exist
      const hasHighPriorityCompliance = result.suggestions?.some(s => 
        s.type === 'compliance_gap' && s.priority === 'high'
      );
      if (hasHighPriorityCompliance) {
        setActiveTab('compliance');
      }
    } catch (error) {
      console.error("Analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const handleApply = (suggestion, idx) => {
    if (onApplyFix) {
      if (suggestion.type === 'quality_issue' && suggestion.current_text) {
        // Replace weak text with improved version
        const updatedNote = roughNote.replace(suggestion.current_text, suggestion.suggested_fix);
        onApplyFix(updatedNote, suggestion.category, true); // true = isReplacement
      } else {
        // Add missing compliance element
        onApplyFix(suggestion.suggested_fix, suggestion.category, false);
      }
      setAppliedIndices(prev => new Set([...prev, idx]));
    }
  };

  const handleApplyAll = () => {
    if (!onApplyAll || !analysisData?.suggestions) return;
    
    const unappliedSuggestions = analysisData.suggestions.filter((_, idx) => 
      !appliedIndices.has(idx) && !appliedFixes.includes(_.category)
    );
    
    if (unappliedSuggestions.length === 0) return;

    // Separate quality replacements from compliance additions
    const replacements = unappliedSuggestions
      .filter(s => s.type === 'quality_issue' && s.current_text)
      .map(s => ({ from: s.current_text, to: s.suggested_fix }));
    
    const additions = unappliedSuggestions
      .filter(s => s.type === 'compliance_gap' || !s.current_text)
      .map(s => s.suggested_fix);

    onApplyAll(replacements, additions);
    
    // Mark all as applied
    const allIndices = analysisData.suggestions.map((_, idx) => idx);
    setAppliedIndices(new Set(allIndices));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    return type === 'compliance_gap' 
      ? <AlertCircle className="w-4 h-4 text-orange-600" />
      : <Lightbulb className="w-4 h-4 text-purple-600" />;
  };

  if (roughNote.length < 100) return null;

  if (isAnalyzing) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-purple-800">Analyzing note quality & compliance...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) return null;

  const unappliedSuggestions = analysisData.suggestions?.filter((s, idx) => 
    !appliedIndices.has(idx) && !appliedFixes.includes(s.category)
  ) || [];

  const complianceSuggestions = unappliedSuggestions.filter(s => s.type === 'compliance_gap');
  const qualitySuggestions = unappliedSuggestions.filter(s => s.type === 'quality_issue');

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-b from-purple-50 to-white">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Suggestions
            <Badge className="bg-purple-600 text-white">
              {unappliedSuggestions.length}
            </Badge>
          </CardTitle>
          {unappliedSuggestions.length > 0 && (
            <Button
              size="sm"
              onClick={handleApplyAll}
              className="bg-purple-600 hover:bg-purple-700 h-7"
            >
              <Wand2 className="w-3 h-3 mr-1" /> Fix All ({unappliedSuggestions.length})
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1">
            <Progress value={analysisData.overall_score} className="h-2" />
          </div>
          <span className={`text-xs font-medium ${
            analysisData.overall_score >= 80 ? 'text-green-600' :
            analysisData.overall_score >= 60 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {analysisData.overall_score}%
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {unappliedSuggestions.length === 0 ? (
          <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-800 font-medium">Excellent! All suggestions applied.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="all" className="text-xs">
                All ({unappliedSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs">
                Compliance ({complianceSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="quality" className="text-xs">
                Quality ({qualitySuggestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 max-h-[500px] overflow-y-auto">
              {unappliedSuggestions.map((suggestion, idx) => (
                <SuggestionCard
                  key={idx}
                  suggestion={suggestion}
                  isApplied={appliedIndices.has(idx)}
                  getPriorityColor={getPriorityColor}
                  getTypeIcon={getTypeIcon}
                  onApply={() => handleApply(suggestion, idx)}
                />
              ))}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-2 max-h-[500px] overflow-y-auto">
              {complianceSuggestions.length === 0 ? (
                <div className="text-center py-4 text-sm text-green-700">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                  All compliance elements present
                </div>
              ) : (
                complianceSuggestions.map((suggestion, idx) => (
                  <SuggestionCard
                    key={idx}
                    suggestion={suggestion}
                    isApplied={appliedIndices.has(analysisData.suggestions.indexOf(suggestion))}
                    getPriorityColor={getPriorityColor}
                    getTypeIcon={getTypeIcon}
                    onApply={() => handleApply(suggestion, analysisData.suggestions.indexOf(suggestion))}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="quality" className="space-y-2 max-h-[500px] overflow-y-auto">
              {qualitySuggestions.length === 0 ? (
                <div className="text-center py-4 text-sm text-green-700">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                  Note quality looks great
                </div>
              ) : (
                qualitySuggestions.map((suggestion, idx) => (
                  <SuggestionCard
                    key={idx}
                    suggestion={suggestion}
                    isApplied={appliedIndices.has(analysisData.suggestions.indexOf(suggestion))}
                    getPriorityColor={getPriorityColor}
                    getTypeIcon={getTypeIcon}
                    onApply={() => handleApply(suggestion, analysisData.suggestions.indexOf(suggestion))}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion, isApplied, getPriorityColor, getTypeIcon, onApply }) {
  return (
    <div className={`rounded border p-3 ${
      isApplied ? 'bg-gray-50 opacity-50' : getPriorityColor(suggestion.priority)
    }`}>
      <div className="flex items-start gap-2">
        {isApplied ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          getTypeIcon(suggestion.type)
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {suggestion.category.replace(/_/g, ' ')}
            </Badge>
            <Badge className={`text-[10px] ${
              suggestion.priority === 'high' ? 'bg-red-600' :
              suggestion.priority === 'medium' ? 'bg-yellow-600' :
              'bg-blue-600'
            } text-white`}>
              {suggestion.priority}
            </Badge>
            {isApplied && <Badge className="text-[10px] bg-green-600 text-white">Applied</Badge>}
          </div>
          
          <p className="text-xs font-medium text-gray-900 mb-1">{suggestion.issue}</p>
          
          {suggestion.current_text && (
            <p className="text-xs text-red-800 line-through mb-1">
              Current: "{suggestion.current_text}"
            </p>
          )}
          
          <div className="bg-white/70 p-2 rounded border border-gray-200 mb-1">
            <p className="text-xs text-green-900 font-medium">
              {suggestion.type === 'quality_issue' ? 'Improved: ' : 'Add: '}
              "{suggestion.suggested_fix}"
            </p>
          </div>
          
          <p className="text-[10px] text-gray-600 italic">{suggestion.rationale}</p>
        </div>
        
        {!isApplied && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onApply}
            className="h-7 px-2 text-purple-700 hover:bg-purple-100 flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}