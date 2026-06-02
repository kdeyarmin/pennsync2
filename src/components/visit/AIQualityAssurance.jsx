import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function AIQualityAssurance({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onFixIssue 
}) {
  const [qaResults, setQaResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const runQualityCheck = async () => {
    setIsChecking(true);
    
    try {
      const prompt = `You are a Medicare compliance auditor. Review this home health/hospice visit documentation for quality and compliance issues.

PATIENT: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visit.visit_type.replace(/_/g, ' ')}

VISIT NOTE:
${narrativeText || '[No documentation yet]'}

VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'Not documented'}

Check for:
1. Medicare-required elements present (homebound status, skilled need, patient education, patient response)
2. Vital signs documented and clinically reasonable
3. Consistency (conflicting information)
4. Critical values addressed (abnormal vitals, pain > 7, etc.)
5. Safety assessment included
6. Medical necessity clearly justified
7. Professional terminology used
8. Complete sentences and proper formatting

Return a JSON object with this structure:
{
  "score": 0-100,
  "status": "excellent" | "good" | "needs_improvement" | "critical_issues",
  "passed": [{"item": "description", "category": "medicare" | "clinical" | "quality"}],
  "failed": [{"item": "description", "severity": "critical" | "warning", "suggestion": "how to fix"}],
  "warnings": [{"item": "description", "suggestion": "recommendation"}]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            status: { type: "string" },
            passed: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  item: { type: "string" },
                  category: { type: "string" }
                }
              } 
            },
            failed: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  severity: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            warnings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            }
          }
        }
      });

      setQaResults(result);
      
    } catch (error) {
      console.error("Error running QA check:", error);
      toast.error("Error running quality check. Please try again.");
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    // Auto-run QA when documentation changes (debounced)
    if (narrativeText && narrativeText.length > 100) {
      const timer = setTimeout(() => {
        runQualityCheck();
      }, 5000); // Run after 5 seconds of no changes

      return () => clearTimeout(timer);
    }
  }, [narrativeText]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-50 border-green-300';
      case 'good': return 'bg-blue-50 border-blue-300';
      case 'needs_improvement': return 'bg-yellow-50 border-yellow-300';
      case 'critical_issues': return 'bg-red-50 border-red-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'good': return <CheckCircle2 className="w-6 h-6 text-blue-600" />;
      case 'needs_improvement': return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'critical_issues': return <XCircle className="w-6 h-6 text-red-600" />;
      default: return <ShieldCheck className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            AI Quality Assurance Check
          </CardTitle>
          <Button
            onClick={runQualityCheck}
            disabled={isChecking || !narrativeText}
            size="sm"
            variant="outline"
          >
            {isChecking ? 'Checking...' : 'Run QA Check'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {qaResults ? (
          <>
            {/* Overall Score */}
            <Alert className={getStatusColor(qaResults.status)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(qaResults.status)}
                  <div>
                    <p className="font-semibold text-gray-900">
                      Quality Score: {qaResults.score}/100
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {qaResults.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <Badge 
                  className={
                    qaResults.score >= 90 ? 'bg-green-500' :
                    qaResults.score >= 75 ? 'bg-blue-500' :
                    qaResults.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }
                >
                  {qaResults.score >= 90 ? 'Excellent' :
                   qaResults.score >= 75 ? 'Good' :
                   qaResults.score >= 60 ? 'Fair' : 'Needs Work'}
                </Badge>
              </div>
            </Alert>

            {/* Critical Issues */}
            {qaResults.failed && qaResults.failed.filter(f => f.severity === 'critical').length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Critical Issues ({qaResults.failed.filter(f => f.severity === 'critical').length})
                </h4>
                {qaResults.failed.filter(f => f.severity === 'critical').map((issue, index) => (
                  <Alert key={index} className="bg-red-50 border-red-200">
                    <AlertDescription>
                      <p className="font-medium text-red-900 mb-1">❌ {issue.item}</p>
                      <p className="text-sm text-red-700 mb-2">{issue.suggestion}</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onFixIssue(issue.suggestion)}
                        className="text-xs"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto-Fix
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Warnings */}
            {qaResults.warnings && qaResults.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({qaResults.warnings.length})
                </h4>
                {qaResults.warnings.map((warning, index) => (
                  <Alert key={index} className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-sm">
                      <p className="font-medium text-yellow-900">⚠️ {warning.item}</p>
                      <p className="text-yellow-700">{warning.suggestion}</p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Passed Items */}
            {qaResults.passed && qaResults.passed.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Compliant Elements ({qaResults.passed.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {qaResults.passed.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-900">{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Alert className="bg-blue-50 border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              AI Quality Assurance automatically checks your documentation for Medicare compliance, clinical accuracy, and professional quality. Run a check before completing your visit!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}