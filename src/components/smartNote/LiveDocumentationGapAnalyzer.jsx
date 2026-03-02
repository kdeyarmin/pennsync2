import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Plus, Loader2, RefreshCw } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-700 bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high:     { color: 'text-orange-700 bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium:   { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
};

function GapItem({ gap, onInsert }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.medium;

  return (
    <div className={`rounded-lg border p-3 ${config.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{gap.element}</p>
            <p className="text-xs opacity-80 mt-0.5">{gap.cop_reference}</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 opacity-70 hover:opacity-100">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs">{gap.reason}</p>
          {gap.suggested_phrases?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Suggested phrases:</p>
              {gap.suggested_phrases.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => onInsert(phrase)}
                  className="w-full text-left text-xs p-2 bg-white/70 hover:bg-white border border-current/20 rounded flex items-start gap-1.5 group"
                >
                  <Plus className="w-3 h-3 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="italic">"{phrase}"</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveDocumentationGapAnalyzer({ roughNote, visitType, diagnosis, patientData, onInsertPhrase }) {
  const [gaps, setGaps] = useState([]);
  const [compliantElements, setCompliantElements] = useState([]);
  const [complianceScore, setComplianceScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState('');
  const debounceRef = useRef(null);

  const shouldAnalyze = roughNote?.length >= 80 && (roughNote !== lastAnalyzed);

  const analyze = async (note) => {
    if (!note || note.length < 80 || !visitType) return;
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Medicare home health compliance specialist. Analyze this rough nursing note for documentation gaps.

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || patientData?.primary_diagnosis || 'Not specified'}
PATIENT AGE: ${patientData?.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}

ROUGH NOTE:
${note}

Check for these MANDATORY Medicare Home Health elements (42 CFR 484):
1. Homebound status (484.55) - specific physical limitations preventing leaving home
2. Skilled nursing need (484.20) - why RN/LPN required vs aide/family
3. Vital signs with clinical interpretation
4. Patient response to treatment (484.60) - objective measurable response
5. Patient/caregiver education with teach-back verification (484.60)
6. Safety assessment - fall risk, home hazards, medication safety (484.80)
7. Functional status / ADL limitations (484.55)
8. Progress toward care plan goals with measurable data
9. Physician/care coordination communication
10. Condition-specific clinical findings for: ${diagnosis || 'the patient diagnosis'}

${visitType === 'admission' ? 'ADMISSION SPECIFIC: baseline assessment, medication reconciliation, patient rights, emergency plan, care plan goals with patient input' : ''}
${visitType === 'recertification' ? 'RECERTIFICATION SPECIFIC: progress toward each goal, continued homebound justification, continued skilled need, discharge planning' : ''}
${visitType === 'discharge' ? 'DISCHARGE SPECIFIC: reason for discharge, goals met/not met with outcomes, written discharge instructions, follow-up appointments, patient verbalized self-care understanding' : ''}

For each gap, provide 2-3 specific example phrases a nurse could write to fill that gap.

Return JSON:
{
  "compliance_score": <0-100>,
  "gaps": [
    {
      "element": "<element name>",
      "reason": "<why missing or insufficient>",
      "cop_reference": "<42 CFR 484.XX>",
      "severity": "<critical|high|medium>",
      "suggested_phrases": ["<example phrase 1>", "<example phrase 2>"]
    }
  ],
  "compliant_elements": ["<element that IS present and adequate>"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_score: { type: "number" },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  reason: { type: "string" },
                  cop_reference: { type: "string" },
                  severity: { type: "string" },
                  suggested_phrases: { type: "array", items: { type: "string" } }
                }
              }
            },
            compliant_elements: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGaps(result.gaps || []);
      setCompliantElements(result.compliant_elements || []);
      setComplianceScore(result.compliance_score || 0);
      setLastAnalyzed(note);
    } catch (err) {
      console.error('Gap analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce analysis - runs 2.5s after user stops typing
  useEffect(() => {
    if (!roughNote || roughNote.length < 80) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      analyze(roughNote);
    }, 2500);
    return () => clearTimeout(debounceRef.current);
  }, [roughNote, visitType, diagnosis]);

  if (!roughNote || roughNote.length < 80) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4 text-center">
          <Sparkles className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">AI gap analysis activates after you type your notes</p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = gaps.filter(g => g.severity === 'critical').length;
  const highCount = gaps.filter(g => g.severity === 'high').length;

  const scoreColor = complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-orange-500' : 'text-red-600';
  const scoreBg = complianceScore >= 80 ? 'bg-green-50 border-green-200' : complianceScore >= 60 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';

  return (
    <Card className="border-2 border-amber-300">
      <CardHeader className="py-3 pb-2 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Live Compliance Check</span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
            {!loading && shouldAnalyze && (
              <button onClick={() => analyze(roughNote)} className="text-amber-600 hover:text-amber-800">
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {loading && gaps.length === 0 && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        )}

        {complianceScore !== null && !loading && (
          <div className={`rounded-lg border p-3 text-center ${scoreBg}`}>
            <p className={`text-2xl font-bold ${scoreColor}`}>{complianceScore}%</p>
            <p className="text-xs text-gray-600 mt-0.5">Current compliance score</p>
            <div className="flex justify-center gap-3 mt-2">
              {criticalCount > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{criticalCount} critical</Badge>}
              {highCount > 0 && <Badge className="bg-orange-100 text-orange-700 text-xs">{highCount} high</Badge>}
              {compliantElements.length > 0 && <Badge className="bg-green-100 text-green-700 text-xs">{compliantElements.length} ✓</Badge>}
            </div>
          </div>
        )}

        {/* Gaps */}
        {gaps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Missing / Incomplete Elements:</p>
            {gaps
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2 };
                return (order[a.severity] || 2) - (order[b.severity] || 2);
              })
              .map((gap, i) => (
                <GapItem key={i} gap={gap} onInsert={(phrase) => onInsertPhrase?.(phrase)} />
              ))}
          </div>
        )}

        {/* Compliant elements */}
        {compliantElements.length > 0 && gaps.length === 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700">All required elements present ✓</p>
            {compliantElements.map((el, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                {el}
              </div>
            ))}
          </div>
        )}

        {compliantElements.length > 0 && gaps.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-green-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {compliantElements.length} elements present
            </summary>
            <div className="mt-2 space-y-1 pl-4">
              {compliantElements.map((el, i) => (
                <div key={i} className="text-green-600">• {el}</div>
              ))}
            </div>
          </details>
        )}

        <p className="text-xs text-gray-400 text-center pt-1">
          Updates automatically as you type
        </p>
      </CardContent>
    </Card>
  );
}