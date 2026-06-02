import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Lightbulb,
  ClipboardCheck,
  Plus
} from "lucide-react";
import { debounce } from "lodash";

export default function ProactiveComplianceChecker({
  noteText,
  careType,
  visitType,
  diagnosis,
  nurseEmail,
  onInsertElement,
  onTrainingRecommended
}) {
  const [checklist, setChecklist] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [manualChecks, setManualChecks] = useState({});

  // Fetch nurse skills to identify gaps
  const { data: nurseSkills = [] } = useQuery({
    queryKey: ['nurseSkills', nurseEmail],
    queryFn: () => base44.entities.NurseSkill.filter({ nurse_email: nurseEmail }).catch(() => []),
    enabled: !!nurseEmail
  });

  // Debounced analysis
  useEffect(() => {
    const analyze = debounce(async () => {
      if (!noteText || noteText.length < 30) {
        setChecklist(null);
        return;
      }
      
      setIsAnalyzing(true);
      try {
        const skillsList = nurseSkills.map(s => s.skill_name).join(', ');
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a Medicare compliance expert for ${careType === 'hospice' ? 'hospice' : 'home health'} documentation. Analyze this note in real-time and create a compliance checklist.

VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
NURSE'S DOCUMENTED SKILLS: ${skillsList || 'Not available'}

CURRENT NOTE:
${noteText}

Create a real-time compliance checklist that shows:
1. What critical elements are PRESENT in the note
2. What critical elements are MISSING and need to be added
3. What elements are PARTIAL (mentioned but need more detail)
4. Any SKILL GAPS where training might help documentation quality

For ${careType === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'}, critical elements include:
${careType === 'hospice' ? `
- Terminal prognosis indicators
- Symptom management (pain, dyspnea, nausea, anxiety)
- Comfort measures provided
- Patient/family coping and emotional support
- Goals of care discussion
- Spiritual/psychosocial needs
` : `
- Homebound status justification
- Skilled nursing need
- Patient response to teaching
- Functional status/ADLs
- Safety assessment
- Care coordination
- Progress toward goals
`}

Return JSON:
{
  "overall_score": 0-100,
  "critical_items": [
    {
      "element": "Element name",
      "status": "present" | "missing" | "partial",
      "description": "What's needed",
      "suggested_text": "Text to insert if missing/partial",
      "priority": "critical" | "important" | "recommended"
    }
  ],
  "skill_gap_alerts": [
    {
      "gap": "Documentation skill that seems weak",
      "evidence": "Why this appears to be a gap",
      "recommended_training": "Suggested training topic"
    }
  ],
  "quick_fixes": ["Immediate improvements to make"],
  "compliant_elements": ["Elements already well-documented"]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              critical_items: { type: "array", items: { type: "object" } },
              skill_gap_alerts: { type: "array", items: { type: "object" } },
              quick_fixes: { type: "array", items: { type: "string" } },
              compliant_elements: { type: "array", items: { type: "string" } }
            }
          }
        });

        setChecklist(result);
      } catch (error) {
        console.error("Error analyzing:", error);
      }
      setIsAnalyzing(false);
    }, 2000);

    analyze();
    return () => analyze.cancel();
  }, [noteText, careType, visitType, diagnosis, nurseSkills]);

  const toggleManualCheck = (idx) => {
    setManualChecks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'missing': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'partial': return <Lightbulb className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-50 border-green-200';
      case 'missing': return 'bg-red-50 border-red-200';
      case 'partial': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-red-100 text-red-800 text-xs">Critical</Badge>;
      case 'important': return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Important</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-800 text-xs">Recommended</Badge>;
    }
  };

  const missingCount = checklist?.critical_items?.filter(i => i.status === 'missing').length || 0;
  const partialCount = checklist?.critical_items?.filter(i => i.status === 'partial').length || 0;

  if (!noteText || noteText.length < 30) return null;

  return (
    <Card className={`border-2 ${missingCount > 0 ? 'border-red-300' : partialCount > 0 ? 'border-yellow-300' : 'border-green-300'}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${missingCount > 0 ? 'bg-red-50' : partialCount > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className={`w-4 h-4 ${missingCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
            Compliance Checklist
            {isAnalyzing && <span className="text-xs text-slate-500">(analyzing...)</span>}
          </div>
          <div className="flex items-center gap-2">
            {checklist && (
              <>
                <Badge className={checklist.overall_score >= 80 ? 'bg-green-100 text-green-800' : checklist.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                  {checklist.overall_score}%
                </Badge>
                {missingCount > 0 && <Badge className="bg-red-600 text-white">{missingCount} missing</Badge>}
              </>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && checklist && (
        <CardContent className="p-3 space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Documentation Completeness</span>
              <span>{checklist.overall_score}%</span>
            </div>
            <Progress value={checklist.overall_score} className="h-2" />
          </div>

          {/* Critical Items Checklist */}
          <div className="space-y-2">
            {checklist.critical_items?.filter(i => i.status !== 'present').map((item, idx) => (
              <div key={idx} className={`p-2 rounded border ${getStatusColor(item.status)}`}>
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={manualChecks[idx] || false}
                    onCheckedChange={() => toggleManualCheck(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <span className="text-sm font-medium">{item.element}</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-xs text-slate-600">{item.description}</p>
                    {item.suggested_text && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-6 text-xs"
                        onClick={() => onInsertElement && onInsertElement(item.suggested_text)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Insert Suggested Text
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliant Elements */}
          {checklist.compliant_elements?.length > 0 && (
            <div className="p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-1">✓ Well Documented:</p>
              <p className="text-xs text-green-700">{checklist.compliant_elements.join(', ')}</p>
            </div>
          )}

          {/* Skill Gap Alerts */}
          {checklist.skill_gap_alerts?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Training Recommendations
              </p>
              {checklist.skill_gap_alerts.map((gap, idx) => (
                <Alert key={idx} className="py-2 bg-purple-50 border-purple-200">
                  <AlertDescription className="text-xs">
                    <p className="font-medium text-purple-900">{gap.gap}</p>
                    <p className="text-purple-700">{gap.evidence}</p>
                    <Button
                      size="sm"
                      variant="link"
                      className="h-5 p-0 text-xs text-purple-600"
                      onClick={() => onTrainingRecommended && onTrainingRecommended(gap.recommended_training)}
                    >
                      <GraduationCap className="w-3 h-3 mr-1" /> View Training: {gap.recommended_training}
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Quick Fixes */}
          {checklist.quick_fixes?.length > 0 && (
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-1">💡 Quick Fixes:</p>
              <ul className="text-xs text-blue-700 space-y-0.5">
                {checklist.quick_fixes.map((fix, idx) => (
                  <li key={idx}>• {fix}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}