import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  BookOpen,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function AINarrativeReviewer({
  enhancedNote,
  diagnosis,
  visitType,
  careType,
  vitalSigns,
  patient,
  onReviewComplete
}) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResults, setReviewResults] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastReviewedNote, setLastReviewedNote] = useState("");

  // Auto-review when enhanced note changes significantly
  useEffect(() => {
    if (enhancedNote && enhancedNote.length > 100 && enhancedNote !== lastReviewedNote) {
      const timer = setTimeout(() => {
        runReview();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [enhancedNote]);

  const runReview = async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;

    setIsReviewing(true);
    try {
      const prompt = `You are an expert clinical documentation reviewer for home health nursing. Perform a comprehensive review of this clinical narrative and provide actionable feedback.

CLINICAL NARRATIVE TO REVIEW:
${enhancedNote}

CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Visit Type: ${visitType?.replace(/_/g, ' ') || 'Routine visit'}
- Care Type: ${careType || 'Home Health'}
- Patient Age: ${patient?.date_of_birth ? calculateAge(patient.date_of_birth) : 'Unknown'}
- Vital Signs Documented: ${formatVitals(vitalSigns)}

PERFORM THE FOLLOWING ANALYSIS:

1. **ADVANCED COMPLIANCE REVIEW**: Go beyond basic Medicare requirements. Check for:
   - Specificity of skilled nursing need justification
   - Adequacy of homebound status documentation
   - Patient response to interventions (teaching, treatments)
   - Measurable outcomes documented
   - Care coordination documentation
   - Safety assessment completeness

2. **CLINICAL TERMINOLOGY IMPROVEMENTS**: Identify where:
   - Vague terms could be replaced with precise medical terminology
   - Abbreviations should be spelled out for clarity
   - Clinical descriptions could be more specific
   - Assessment findings need quantification

3. **MISSING DOCUMENTATION ELEMENTS**: Based on the diagnosis and visit type, identify:
   - Diagnosis-specific assessments not documented
   - Required visit type elements missing
   - Pain assessment details if applicable
   - Medication reconciliation gaps
   - Fall risk documentation if applicable
   - Wound documentation if applicable

4. **CLARITY & CONCISENESS**: Identify:
   - Redundant phrases that could be removed
   - Run-on sentences that should be split
   - Unclear or ambiguous statements
   - Areas needing better organization

5. **RISK DETECTION**: Flag any:
   - Contradictions in the documentation
   - Clinically concerning findings not addressed in plan
   - Potential liability issues
   - Missing follow-up documentation

Return a structured JSON response:
{
  "overall_quality_score": 0-100,
  "review_summary": "Brief 1-2 sentence summary of the note quality",
  "compliance_issues": [
    {
      "id": "unique_id",
      "issue": "Description of the compliance gap",
      "severity": "critical|high|medium",
      "location": "Which part of the note",
      "fix": "Suggested text to add or change",
      "rationale": "Why this matters for Medicare"
    }
  ],
  "terminology_suggestions": [
    {
      "id": "unique_id",
      "current_text": "The vague or imprecise text",
      "suggested_text": "More precise clinical terminology",
      "reason": "Why this is better"
    }
  ],
  "missing_elements": [
    {
      "id": "unique_id",
      "element": "What's missing",
      "importance": "required|recommended",
      "suggested_text": "Template text to add",
      "reason": "Why this is needed for this diagnosis/visit type"
    }
  ],
  "clarity_improvements": [
    {
      "id": "unique_id",
      "issue": "Description of clarity problem",
      "current_text": "The unclear text",
      "suggested_text": "Clearer version",
      "type": "redundancy|ambiguity|organization|conciseness"
    }
  ],
  "risk_flags": [
    {
      "id": "unique_id",
      "risk": "Description of the risk",
      "severity": "critical|high|medium",
      "recommendation": "What to do about it"
    }
  ],
  "strengths": ["List of things done well in the documentation"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            review_summary: { type: "string" },
            compliance_issues: { type: "array", items: { type: "object" } },
            terminology_suggestions: { type: "array", items: { type: "object" } },
            missing_elements: { type: "array", items: { type: "object" } },
            clarity_improvements: { type: "array", items: { type: "object" } },
            risk_flags: { type: "array", items: { type: "object" } },
            strengths: { type: "array", items: { type: "string" } }
          }
        }
      });

      setReviewResults(result);
      setLastReviewedNote(enhancedNote);
      
      // Send results to parent for Consolidated Feedback Center
      if (onReviewComplete) {
        onReviewComplete(result);
      }
    } catch (error) {
      console.error("Error reviewing narrative:", error);
    }
    setIsReviewing(false);
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatVitals = (vitals) => {
    if (!vitals) return 'None';
    const parts = [];
    if (vitals.bp) parts.push(`BP: ${vitals.bp}`);
    if (vitals.hr) parts.push(`HR: ${vitals.hr}`);
    if (vitals.temp) parts.push(`Temp: ${vitals.temp}`);
    if (vitals.o2) parts.push(`O2: ${vitals.o2}%`);
    if (vitals.pain) parts.push(`Pain: ${vitals.pain}/10`);
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTotalIssues = () => {
    if (!reviewResults) return 0;
    return (
      (reviewResults.compliance_issues?.length || 0) +
      (reviewResults.terminology_suggestions?.length || 0) +
      (reviewResults.missing_elements?.length || 0) +
      (reviewResults.clarity_improvements?.length || 0) +
      (reviewResults.risk_flags?.length || 0)
    );
  };

  if (!enhancedNote) return null;

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader 
        className="py-2 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            AI Narrative Review
            {reviewResults && (
              <>
                <Badge className={getScoreColor(reviewResults.overall_quality_score)}>
                  {reviewResults.overall_quality_score}/100
                </Badge>
                {getTotalIssues() > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {getTotalIssues()} suggestions
                  </Badge>
                )}
              </>
            )}
            {isReviewing && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); runReview(); }}
              disabled={isReviewing}
              className="h-7 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${isReviewing ? 'animate-spin' : ''}`} />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3">
          {!reviewResults && !isReviewing && (
            <div className="text-center py-4">
              <Brain className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">AI will review your enhanced note</p>
              <Button
                onClick={runReview}
                className="bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Review Now
              </Button>
            </div>
          )}

          {isReviewing && !reviewResults && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm text-gray-600">Analyzing clinical narrative...</p>
            </div>
          )}

          {reviewResults && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{reviewResults.review_summary}</p>
              </div>

              {/* Strengths */}
              {reviewResults.strengths?.length > 0 && (
                <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-800">Strengths</span>
                  </div>
                  <ul className="list-disc ml-5 text-xs text-green-700">
                    {reviewResults.strengths.slice(0, 3).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-5 gap-1 text-center">
                <div className={`p-1.5 rounded ${reviewResults.compliance_issues?.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <Shield className="w-3 h-3 mx-auto text-red-500" />
                  <p className="text-xs font-bold">{reviewResults.compliance_issues?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Comply</p>
                </div>
                <div className={`p-1.5 rounded ${reviewResults.terminology_suggestions?.length > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <BookOpen className="w-3 h-3 mx-auto text-blue-500" />
                  <p className="text-xs font-bold">{reviewResults.terminology_suggestions?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Terms</p>
                </div>
                <div className={`p-1.5 rounded ${reviewResults.missing_elements?.length > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  <FileText className="w-3 h-3 mx-auto text-yellow-500" />
                  <p className="text-xs font-bold">{reviewResults.missing_elements?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Missing</p>
                </div>
                <div className={`p-1.5 rounded ${reviewResults.clarity_improvements?.length > 0 ? 'bg-purple-50' : 'bg-gray-50'}`}>
                  <Lightbulb className="w-3 h-3 mx-auto text-purple-500" />
                  <p className="text-xs font-bold">{reviewResults.clarity_improvements?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Clarity</p>
                </div>
                <div className={`p-1.5 rounded ${reviewResults.risk_flags?.length > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <AlertTriangle className="w-3 h-3 mx-auto text-orange-500" />
                  <p className="text-xs font-bold">{reviewResults.risk_flags?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Risks</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Detailed suggestions available in the Action Center →
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}