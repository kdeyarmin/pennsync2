import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList,
  Loader2,
  Printer
} from "lucide-react";
import moment from "moment";

export default function ComplianceSummaryReport({
  patientId,
  patientName,
  visitType,
  diagnosis,
  roughNoteCompliance,
  enhancedNoteCompliance,
  appliedFixes = [],
  dismissedElements = [],
  vitalSigns,
  nurseEmail
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const queryClient = useQueryClient();

  const createAuditMutation = useMutation({
    mutationFn: (auditData) => base44.entities.ComplianceAudit.create(auditData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceAudits'] });
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);
    }
  });

  const generateReport = () => {
    const now = moment();
    const initialScore = roughNoteCompliance?.score || 0;
    const finalScore = enhancedNoteCompliance?.overall_score || initialScore;
    
    const compliantElements = enhancedNoteCompliance?.compliant_elements || [];
    const flaggedIssues = enhancedNoteCompliance?.flagged_issues || [];
    const roughElements = roughNoteCompliance?.elements || [];

    return {
      generatedAt: now.format("MMMM D, YYYY h:mm A"),
      patientName: patientName || "Unknown Patient",
      patientId,
      visitType: visitType?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Routine Visit",
      diagnosis: diagnosis || "Not specified",
      initialScore,
      finalScore,
      scoreImprovement: finalScore - initialScore,
      compliantElements,
      deficiencies: flaggedIssues.filter(i => !appliedFixes.includes(i.element)),
      appliedFixes: appliedFixes,
      dismissedElements: dismissedElements,
      totalElementsChecked: roughElements.length || 8,
      passedElements: compliantElements.length,
      vitalSigns,
      nurseEmail
    };
  };

  const report = generateReport();

  const handleSaveToRecord = async () => {
    setIsSaving(true);
    try {
      const auditData = {
        patient_id: patientId,
        nurse_email: nurseEmail,
        audit_date: new Date().toISOString(),
        compliance_score: report.finalScore,
        status: report.finalScore >= 85 ? 'passed' : report.finalScore >= 70 ? 'flagged' : 'critical',
        issues: report.deficiencies.map(d => ({
          element: d.element,
          severity: d.severity,
          problem: d.problem,
          suggestion: d.suggestion
        })),
        compliant_elements: report.compliantElements,
        audit_type: 'automated'
      };
      
      await createAuditMutation.mutateAsync(auditData);
    } catch (error) {
      console.error("Error saving audit:", error);
    }
    setIsSaving(false);
  };

  const handleDownload = () => {
    const reportText = `
COMPLIANCE SUMMARY REPORT
=========================
Generated: ${report.generatedAt}

PATIENT INFORMATION
-------------------
Patient: ${report.patientName}
Patient ID: ${report.patientId || 'N/A'}
Visit Type: ${report.visitType}
Primary Diagnosis: ${report.diagnosis}
Documented By: ${report.nurseEmail || 'N/A'}

COMPLIANCE SCORES
-----------------
Initial Score (Rough Note): ${report.initialScore}%
Final Score (Enhanced Note): ${report.finalScore}%
Score Improvement: +${report.scoreImprovement}%

VITAL SIGNS DOCUMENTED
----------------------
${report.vitalSigns ? Object.entries(report.vitalSigns)
  .filter(([k, v]) => v && k !== 'o2Source' && k !== 'o2Flow')
  .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
  .join('\n') : 'None documented'}

COMPLIANT ELEMENTS (${report.passedElements}/${report.totalElementsChecked})
---------------------
${report.compliantElements.length > 0 
  ? report.compliantElements.map(e => `✓ ${e}`).join('\n') 
  : 'None identified'}

DEFICIENCIES IDENTIFIED
-----------------------
${report.deficiencies.length > 0 
  ? report.deficiencies.map(d => `✗ ${d.element} [${d.severity?.toUpperCase()}]\n  Problem: ${d.problem}\n  Suggestion: ${d.suggestion || 'N/A'}`).join('\n\n')
  : 'No deficiencies - all elements compliant'}

FIXES APPLIED
-------------
${report.appliedFixes.length > 0 
  ? report.appliedFixes.map(f => `+ ${f}`).join('\n')
  : 'No fixes were applied'}

ELEMENTS MARKED NOT APPLICABLE
------------------------------
${report.dismissedElements.length > 0 
  ? report.dismissedElements.map(e => `- ${e}`).join('\n')
  : 'None dismissed'}

COMPLIANCE STATUS: ${report.finalScore >= 85 ? 'PASSED' : report.finalScore >= 70 ? 'FLAGGED FOR REVIEW' : 'CRITICAL - NEEDS ATTENTION'}

---
This report was automatically generated by the Smart Note Compliance System.
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.patientId || 'unknown'}-${moment().format('YYYY-MM-DD-HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (score) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ClipboardList className="w-4 h-4" />
          Compliance Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto print:max-w-none print:max-h-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Compliance Summary Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4" id="compliance-report">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs text-slate-500">Patient</p>
              <p className="font-medium">{report.patientName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Visit Type</p>
              <p className="font-medium">{report.visitType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Diagnosis</p>
              <p className="font-medium">{report.diagnosis}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Generated</p>
              <p className="font-medium">{report.generatedAt}</p>
            </div>
          </div>

          {/* Score Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Compliance Scores</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Initial</p>
                  <p className={`text-2xl font-bold ${getScoreColor(report.initialScore)}`}>
                    {report.initialScore}%
                  </p>
                </div>
                <div className="text-center text-slate-400">→</div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Final</p>
                  <p className={`text-2xl font-bold ${getScoreColor(report.finalScore)}`}>
                    {report.finalScore}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Improvement</p>
                  <p className="text-2xl font-bold text-blue-600">
                    +{report.scoreImprovement}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  {getStatusBadge(report.finalScore)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliant Elements */}
          <Card>
            <CardHeader className="py-3 bg-green-50">
              <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                Compliant Elements ({report.compliantElements.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {report.compliantElements.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {report.compliantElements.map((el, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {el}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No compliant elements identified yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Deficiencies */}
          {report.deficiencies.length > 0 && (
            <Card>
              <CardHeader className="py-3 bg-red-50">
                <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                  <XCircle className="w-4 h-4" />
                  Remaining Deficiencies ({report.deficiencies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 space-y-2">
                {report.deficiencies.map((def, idx) => (
                  <div key={idx} className="p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-red-800">{def.element}</p>
                      <Badge variant="outline" className="text-xs capitalize">{def.severity}</Badge>
                    </div>
                    <p className="text-xs text-slate-700">{def.problem}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Applied Fixes */}
          {report.appliedFixes.length > 0 && (
            <Card>
              <CardHeader className="py-3 bg-blue-50">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                  <AlertCircle className="w-4 h-4" />
                  Fixes Applied ({report.appliedFixes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="flex flex-wrap gap-2">
                  {report.appliedFixes.map((fix, idx) => (
                    <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      + {fix}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dismissed Elements */}
          {report.dismissedElements.length > 0 && (
            <Card>
              <CardHeader className="py-3 bg-slate-50">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                  Marked Not Applicable ({report.dismissedElements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="flex flex-wrap gap-2">
                  {report.dismissedElements.map((el, idx) => (
                    <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
                      {el}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 print:hidden">
          <Button
            onClick={handleSaveToRecord}
            disabled={isSaving || !patientId}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : savedSuccessfully ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {savedSuccessfully ? 'Saved!' : 'Save to Patient Record'}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}