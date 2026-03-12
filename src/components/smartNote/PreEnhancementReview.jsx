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
  appliedFixes = [],
  onAnalysisStateChange
}) {
  if (!roughNote || roughNote.length < 30) return null;

  return (
    <div className="space-y-3" id="pre-enhancement-review">
      {/* One-Click Fixer - Simplified */}
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

      {/* Compliance Indicator - Collapsed by default */}
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
        appliedFixes={appliedFixes}
      />
    </div>
  );
}