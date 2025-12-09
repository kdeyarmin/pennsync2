import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import OneClickComplianceFixer from "./OneClickComplianceFixer";
import ComplianceScoreIndicator from "./ComplianceScoreIndicator";

export default function PreEnhancementReview({
  roughNote,
  complianceIssues = [],
  patientData,
  vitalSigns,
  diagnosis,
  careType = "home_health",
  visitType,
  patientContext,
  onApplyFix,
  onFixAll,
  onInsertElement,
  onUpdateEnhancedNote,
  onRoughNoteCompliance,
  onEnhancedNoteCompliance,
  onDismissedElements,
  onFixAllAndReEnhance,
  appliedFixes = []
}) {
  if (!roughNote || roughNote.length < 30) return null;

  return (
    <div className="space-y-4" id="pre-enhancement-review">
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {complianceIssues.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                Pre-Enhancement Compliance Check
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Compliance Review
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {complianceIssues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-yellow-800">
                {complianceIssues.length} compliance issue{complianceIssues.length !== 1 ? 's' : ''} detected. 
                Fix them now for better AI enhancement results.
              </p>
              <Badge variant="outline" className="text-xs">
                Recommended: Fix before enhancing
              </Badge>
            </div>
          ) : (
            <p className="text-xs text-green-700">
              Your rough notes look good! Ready to enhance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* One-Click Fixer */}
      {complianceIssues.length > 0 && (
        <OneClickComplianceFixer
          complianceIssues={complianceIssues}
          currentNote={roughNote}
          onApplyFix={onApplyFix}
          onFixAll={onFixAll}
          patientData={patientData}
          vitalSigns={vitalSigns}
          diagnosis={diagnosis}
          appliedFixes={appliedFixes}
        />
      )}

      {/* Detailed Compliance Indicator */}
      <ComplianceScoreIndicator
        roughNote={roughNote}
        enhancedNote=""
        careType={careType}
        visitType={visitType}
        diagnosis={diagnosis}
        vitalSigns={vitalSigns}
        patientContext={patientContext}
        onInsertElement={onInsertElement}
        onUpdateEnhancedNote={onUpdateEnhancedNote}
        onRoughNoteCompliance={onRoughNoteCompliance}
        onEnhancedNoteCompliance={onEnhancedNoteCompliance}
        onDismissedElements={onDismissedElements}
        onFixAllAndReEnhance={onFixAllAndReEnhance}
      />
    </div>
  );
}