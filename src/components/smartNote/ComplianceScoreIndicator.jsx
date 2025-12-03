import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lightbulb
} from "lucide-react";

export default function ComplianceScoreIndicator({
  roughNote,
  enhancedNote,
  careType,
  visitType,
  diagnosis,
  onInsertElement,
  onUpdateEnhancedNote,
  onFlaggedIssues
}) {
  const [complianceData, setComplianceData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enhancedComplianceData, setEnhancedComplianceData] = useState(null);
  const [isAnalyzingEnhanced, setIsAnalyzingEnhanced] = useState(false);
  const [insertedIssues, setInsertedIssues] = useState(new Set());
  const [isReadyToPaste, setIsReadyToPaste] = useState(false);

  // Default suggestions for missing elements - comprehensive, Medicare-compliant text with explicit headers
  const getDefaultSuggestion = (elementName, type) => {
    // These suggestions include explicit headers/labels that AI will recognize during enhanced note analysis
    const homeHealthDefaults = {
      "HOMEBOUND STATUS": "HOMEBOUND STATUS: Patient is homebound due to severe dyspnea on exertion, requiring rest after ambulating approximately 15-20 feet. Patient experiences significant fatigue and weakness that limits ability to leave home independently. Leaving home requires considerable and taxing effort due to medical condition. Patient unable to safely access transportation without assistance. Any absence from home is infrequent, short duration, and for medical appointments only.",
      "SKILLED NEED": "SKILLED NURSING NEED: Skilled nursing services required for comprehensive assessment of cardiopulmonary status including auscultation of heart and lung sounds, evaluation of peripheral edema and skin integrity, medication reconciliation of complex medication regimen, and patient/caregiver education on disease process and warning signs requiring immediate medical attention. Assessment, clinical judgment, and teaching require professional nursing skills that cannot be safely performed by non-skilled personnel.",
      "PATIENT RESPONSE": "PATIENT RESPONSE TO TEACHING/INTERVENTIONS: Patient verbalized understanding of medication schedule, purpose, and potential side effects. Patient correctly demonstrated teach-back of warning signs requiring physician notification. Patient agreed to follow recommended dietary modifications and activity guidelines. Patient expressed commitment to adhering to plan of care and stated understanding of when to contact nurse or physician.",
      "FUNCTIONAL STATUS": "FUNCTIONAL STATUS: Patient requires moderate assistance with ADLs including bathing, dressing, and grooming. Ambulates with assistive device (walker/cane) for short distances with supervision due to unsteady gait and fall risk. Limited endurance noted - requires rest periods after 5-10 minutes of activity. Transfers with minimal assistance. Cognitively intact and oriented to person, place, and time.",
      "VITAL SIGNS": "VITAL SIGNS: Blood pressure within expected parameters for patient. Heart rate regular. Respiratory rate unlabored. Temperature afebrile. Oxygen saturation adequate on room air. Pain assessed using 0-10 scale - patient reports current pain level.",
      "ASSESSMENT FINDINGS": "ASSESSMENT FINDINGS: Comprehensive skilled nursing assessment completed. Cardiovascular: Heart sounds regular, peripheral pulses palpable, edema assessment completed. Respiratory: Lung sounds clear bilaterally, no acute distress, work of breathing normal. Integumentary: Skin intact, no new lesions or wounds noted. Neurological: Alert and oriented, follows commands appropriately. Patient reports current condition stable since last visit.",
      "INTERVENTIONS": "SKILLED NURSING INTERVENTIONS: Skilled nursing interventions provided including comprehensive head-to-toe assessment, medication reconciliation and review of all current medications for therapeutic effect and side effects, patient and caregiver education on disease management and warning signs, coordination of care with physician and interdisciplinary team, assessment of home safety and fall prevention measures.",
      "PLAN/GOALS": "PLAN OF CARE/GOALS: Continue current plan of care with skilled nursing visits as ordered. Patient progressing toward established goals. Goals reviewed and remain appropriate. Will continue to monitor for signs of improvement or decline. Patient and caregiver understand when to contact nurse or seek emergency care. Next visit scheduled per physician orders. Will reassess progress at next visit and update plan as needed."
    };

    const hospiceDefaults = {
      "TERMINAL PROGNOSIS": "TERMINAL PROGNOSIS: Patient continues to demonstrate decline consistent with terminal diagnosis and 6-month prognosis. Disease progression noted with increased symptom burden including decreased functional status, increased fatigue, decreased appetite and oral intake, and progressive weakness. Patient/family aware of terminal nature of illness and have elected comfort-focused care.",
      "SYMPTOM MANAGEMENT": "SYMPTOM MANAGEMENT: Comprehensive pain and symptom assessment completed. Current pain level assessed using appropriate scale - patient reports pain controlled with current regimen. Assessed for dyspnea, nausea, anxiety, and other distressing symptoms. Comfort medications reviewed for effectiveness. PRN medications available and patient/caregiver instructed on appropriate use.",
      "PATIENT/FAMILY COPING": "PATIENT/FAMILY COPING: Patient and family coping with terminal diagnosis and disease progression. Emotional support provided during visit. Assessed for signs of anticipatory grief and provided appropriate support. Spiritual needs addressed and chaplain services offered/provided. Family verbalizes understanding of disease trajectory and comfort-focused goals.",
      "COMFORT MEASURES": "COMFORT MEASURES: Focus of care remains on quality of life, dignity, and patient comfort. Comfort-focused interventions provided including positioning for comfort, skin care and hygiene assistance, medication administration for symptom relief, and emotional support. Patient's wishes and preferences honored. Environment maintained for patient comfort and safety.",
      "VITAL SIGNS": "VITAL SIGNS: Vital signs assessed as clinically appropriate for hospice care. Monitoring focused on comfort assessment rather than curative intervention. Patient's baseline and current status documented for trending and symptom management purposes.",
      "MEDICATION REVIEW": "MEDICATION REVIEW: Comfort medications reviewed for effectiveness in managing pain and symptoms. PRN medications available and caregiver instructed on indications and administration. Non-essential medications discontinued per physician orders. Medication administration route appropriate for patient's current condition and ability to swallow.",
      "HOSPICE APPROPRIATENESS": "HOSPICE APPROPRIATENESS: Patient continues to meet hospice eligibility criteria with documented decline in functional status and disease progression consistent with terminal prognosis. Decline noted in ability to perform ADLs, nutritional status, and overall strength. Patient/family remain committed to comfort-focused care and goals of hospice.",
      "GOALS OF CARE": "GOALS OF CARE: Goals of care reviewed and confirmed with patient and family. Focus remains on comfort, dignity, and quality of remaining life. Advance directives in place and reviewed. DNR/comfort measures only confirmed. Patient and family understand and agree with comfort-focused plan. Preferences for end-of-life care documented and will be honored."
    };

    const defaults = type === 'hospice' ? hospiceDefaults : homeHealthDefaults;
    
    // Try to match the element name with flexible matching
    const normalizedElement = elementName.toUpperCase().replace(/[^A-Z\s]/g, '');
    for (const [key, value] of Object.entries(defaults)) {
      const normalizedKey = key.replace(/[^A-Z\s]/g, '');
      if (normalizedElement.includes(normalizedKey) || normalizedKey.includes(normalizedElement) ||
          normalizedElement.split(' ').some(word => normalizedKey.includes(word) && word.length > 3)) {
        return value;
      }
    }
    
    // Fallback with more helpful generic text including header
    return `${elementName.toUpperCase()}: Provide specific clinical details including objective findings, patient assessment, interventions performed, patient response to care, and any changes from previous visit. Include measurable data and professional nursing observations that support the skilled nature of the visit.`;
  };

  // Debounced analysis for rough note
  useEffect(() => {
    if (roughNote && roughNote.length > 30) {
      const timer = setTimeout(() => {
        analyzeCompliance();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [roughNote, careType, visitType]);

  // Auto-analyze enhanced note when it changes
  useEffect(() => {
    if (enhancedNote && enhancedNote.length > 50) {
      const timer = setTimeout(() => {
        analyzeEnhancedNote();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [enhancedNote]);

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

IMPORTANT: For EVERY element that is "missing" or "partial", you MUST provide a specific, realistic suggested_addition that can be directly added to the note. Use clinical language with specific details. Never return null or empty strings for suggested_addition.

Example suggestions:
- Homebound: "Patient is homebound due to severe shortness of breath on exertion, requiring rest after ambulating 10 feet. Leaving home requires considerable and taxing effort."
- Skilled Need: "Skilled nursing required for comprehensive cardiac assessment, medication management, and patient education on disease process and warning signs."
- Patient Response: "Patient verbalized understanding of medication schedule and demonstrated correct return demonstration of blood glucose monitoring technique."

Return JSON:
{
  "score": 0-100,
  "elements": [
    {
      "name": "Element name",
      "status": "present" | "partial" | "missing",
      "found_text": "Quote from note if present, empty string if missing",
      "suggested_addition": "REQUIRED: Specific clinical text to add - never null or empty for missing/partial elements"
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

  const analyzeEnhancedNote = async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;
    
    setIsAnalyzingEnhanced(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ENHANCED nursing note for Medicare compliance. Identify specific phrases or sections that need improvement.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || 'Not specified'}

ENHANCED NOTE:
${enhancedNote}

For ${careType === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'} documentation, check:
${careType === 'home_health' ? `
- HOMEBOUND STATUS: Must clearly state why patient cannot leave home safely
- SKILLED NEED: Must justify why RN skill/judgment is required (not just tasks an aide could do)
- PATIENT RESPONSE: Must document how patient responded to teaching/interventions
- MEASURABLE GOALS: Should reference progress toward specific, measurable goals
` : `
- TERMINAL PROGNOSIS: Evidence of disease progression toward end of life
- COMFORT FOCUS: Quality of life and symptom management emphasis
- FAMILY SUPPORT: Documentation of emotional/spiritual support provided
`}

IMPORTANT: Find specific text passages that are weak or missing required elements.

For each issue, provide:
1. A ready-to-insert text that can be directly added to the note - THIS IS REQUIRED, never null or empty
2. The best placement location (beginning, after_assessment, after_vitals, after_interventions, before_plan, end)

CRITICAL REQUIREMENTS FOR SUGGESTIONS:
1. The "suggestion" field MUST contain a COMPLETE, READY-TO-USE clinical statement that fully addresses the identified problem
2. Suggestions must be specific enough to directly fix the compliance issue when added to the note
3. Never return null, empty strings, or generic placeholders
4. Use professional clinical language with realistic, specific details
5. Each suggestion should be a standalone paragraph that can be inserted directly

EXAMPLES OF GOOD SUGGESTIONS (these contain the EXACT KEY PHRASES that Medicare auditors look for):
- For missing Homebound Status: "HOMEBOUND STATUS: Patient is homebound due to severe dyspnea on exertion, requiring rest after ambulating approximately 15 feet. Patient experiences fatigue and weakness that limits ability to leave home. Leaving home requires considerable and taxing effort due to cardiac/respiratory limitations. Patient unable to safely access transportation without assistance. Any absences from home are infrequent, of short duration, and require taxing effort."
- For missing Skilled Need: "SKILLED NURSING NEED: Skilled nursing services required for comprehensive cardiovascular assessment including auscultation of heart and lung sounds, evaluation of peripheral edema, medication reconciliation of complex cardiac regimen, and patient/caregiver education on heart failure warning signs requiring immediate medical attention. Assessment and teaching require professional nursing judgment that cannot be performed by non-skilled personnel."
- For missing Patient Response: "PATIENT RESPONSE TO TEACHING: Patient verbalized understanding of medication schedule and importance of daily weight monitoring. Patient correctly demonstrated teach-back of warning signs requiring physician notification including weight gain >3 lbs in 24 hours, increased shortness of breath, and chest pain. Patient agreed to follow recommended dietary sodium restrictions and activity modifications."
- For weak documentation: "ASSESSMENT FINDINGS: Skilled nursing assessment revealed bilateral lower extremity edema +2 pitting, lungs with bilateral basilar crackles, and oxygen saturation of 94% on room air. Patient reports increased dyspnea with activity over past 3 days. INTERVENTIONS: Medication review completed, disease process education provided, and coordination with physician regarding symptom changes."

Return JSON:
{
  "overall_score": 0-100,
  "flagged_issues": [
    {
      "issue_type": "missing" | "weak" | "non_compliant",
      "element": "Which compliance element (e.g., Homebound Status, Skilled Need)",
      "location_hint": "Brief quote or description of where in note this applies",
      "problem": "What's wrong or missing",
      "suggestion": "A COMPLETE clinical paragraph starting with the element name as a header (e.g., 'HOMEBOUND STATUS:', 'SKILLED NEED:', 'PATIENT RESPONSE:'). This header helps ensure the AI recognizes the element when re-analyzing. Must be detailed enough to satisfy Medicare requirements when added to the note. Include specific clinical observations, patient responses, or interventions as appropriate for the element type.",
      "severity": "high" | "medium" | "low"
    }
  ],
  "compliant_elements": ["List of elements that are well documented"],
  "quick_fixes": [
    {
      "original_text": "Text that could be improved (exact quote if possible)",
      "improved_text": "Better version of the text",
      "reason": "Why this is better"
    }
  ],
  "ready_to_paste": true or false (true if score >= 85 and no high/critical severity issues)
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            flagged_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue_type: { type: "string" },
                  element: { type: "string" },
                  location_hint: { type: "string" },
                  problem: { type: "string" },
                  suggestion: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            compliant_elements: { type: "array", items: { type: "string" } },
            quick_fixes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original_text: { type: "string" },
                  improved_text: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            ready_to_paste: { type: "boolean" }
          }
        }
      });
      
      setEnhancedComplianceData(result);
      setIsReadyToPaste(result.ready_to_paste || result.overall_score >= 85);
      setInsertedIssues(new Set());
      if (onFlaggedIssues) {
        onFlaggedIssues(result);
      }
    } catch (error) {
      console.error("Enhanced compliance analysis error:", error);
    }
    setIsAnalyzingEnhanced(false);
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIssueTypeIcon = (type) => {
    switch (type) {
      case 'missing': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'weak': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'non_compliant': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const insertToRoughNote = (suggestion, issueIdx) => {
    if (!onInsertElement) return;
    
    // Add the suggestion to the rough note for nurse to edit
    onInsertElement('\n\n' + suggestion.trim());
    setInsertedIssues(prev => new Set([...prev, issueIdx]));
  };

  // Don't render if no note content
  if ((!roughNote || roughNote.length < 30) && !enhancedNote) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-3">
        {/* Rough Note Analysis */}
        {roughNote && roughNote.length >= 30 && (
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
        )}

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
                {element.status !== 'present' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const suggestion = element.suggested_addition || getDefaultSuggestion(element.name, careType);
                          onInsertElement && onInsertElement(suggestion);
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

        {/* Enhanced Note Compliance Analysis */}
        {enhancedNote && (
          <div className={`${roughNote && roughNote.length >= 30 ? 'mt-3 pt-3 border-t' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-800">Enhanced Note Compliance</span>
                {isAnalyzingEnhanced && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              </div>
              {enhancedComplianceData && (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(enhancedComplianceData.overall_score)}`}>
                    {enhancedComplianceData.overall_score}%
                  </span>
                  {enhancedComplianceData.flagged_issues?.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      {enhancedComplianceData.flagged_issues.length} issues
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Flagged Issues with Clickable Suggestions */}
            {enhancedComplianceData?.flagged_issues?.length > 0 && (
              <div className="space-y-2">
                {enhancedComplianceData.flagged_issues.map((issue, idx) => {
                  const isInserted = insertedIssues.has(idx);
                  return (
                    <div key={idx} className={`rounded border ${isInserted ? 'bg-green-50 border-green-300 opacity-60' : getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start gap-2 p-2">
                        {isInserted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          getIssueTypeIcon(issue.issue_type)
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold">{issue.element}</p>
                            {isInserted ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Added</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs capitalize">{issue.issue_type}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5">{issue.problem}</p>
                        </div>
                        {!isInserted && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 px-2">
                                <Lightbulb className="w-3 h-3 mr-1 text-yellow-600" />
                                <span className="text-xs">Fix</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96" align="end">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">Problem</p>
                                  <p className="text-sm">{issue.problem}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">Suggested Text to Add</p>
                                  <div className="bg-green-50 p-3 rounded border border-green-200">
                                    <p className="text-sm text-green-900 whitespace-pre-wrap">{issue.suggestion || getDefaultSuggestion(issue.element, careType)}</p>
                                  </div>
                                </div>
                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                  <p className="text-xs text-blue-800">
                                    This will be added to your rough notes. Edit as needed, then click "Enhance with AI" to re-check compliance.
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    const suggestion = issue.suggestion || getDefaultSuggestion(issue.element, careType);
                                    insertToRoughNote(suggestion, idx);
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add to Rough Notes
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Fixes */}
            {enhancedComplianceData?.quick_fixes?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-indigo-800 mb-2">Quick Fixes</p>
                <div className="space-y-2">
                  {enhancedComplianceData.quick_fixes.slice(0, 3).map((fix, idx) => (
                    <Popover key={idx}>
                      <PopoverTrigger asChild>
                        <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded cursor-pointer hover:bg-indigo-100 transition-colors">
                          <Lightbulb className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <p className="text-xs text-indigo-800 flex-1 truncate">{fix.reason}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Current Text</p>
                            <p className="text-sm bg-red-50 p-2 rounded text-red-800 line-through">{fix.original_text}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Improved Text</p>
                            <p className="text-sm bg-green-50 p-2 rounded text-green-800">{fix.improved_text}</p>
                          </div>
                          <p className="text-xs text-gray-600">{fix.reason}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => onInsertElement && onInsertElement(fix.improved_text)}
                          >
                            Apply Fix
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            )}

            {/* Compliant Elements */}
            {enhancedComplianceData?.compliant_elements?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {enhancedComplianceData.compliant_elements.map((element, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {element}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ready to Paste Indicator */}
            {enhancedComplianceData && (
              <div className={`flex items-center gap-2 p-3 rounded border ${
                isReadyToPaste || enhancedComplianceData.overall_score >= 85
                  ? 'bg-green-100 border-green-300'
                  : enhancedComplianceData.overall_score >= 70
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-orange-50 border-orange-300'
              }`}>
                {isReadyToPaste || enhancedComplianceData.overall_score >= 85 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Ready to paste into EHR!</p>
                      <p className="text-xs text-green-700">All critical compliance elements are documented.</p>
                    </div>
                  </>
                ) : enhancedComplianceData.overall_score >= 70 ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Almost ready - review suggested fixes above</p>
                      <p className="text-xs text-yellow-700">Add fixes to rough notes, edit, then click "Enhance with AI" again.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Needs improvement before pasting</p>
                      <p className="text-xs text-orange-700">Click "Fix" to add text to rough notes, edit, then re-enhance.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}