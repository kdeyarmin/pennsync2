import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Sparkles, 
  ClipboardCheck, 
  Copy, 
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function ReferralBasedDocumentationAssistant({ referralData, onInsertText }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  useEffect(() => {
    if (referralData) {
      generateSuggestions();
    }
  }, [referralData]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation expert specializing in Medicare-compliant admission notes for home health.

Based on the following referral data, generate comprehensive documentation suggestions for an admission visit note:

REFERRAL DATA:
${JSON.stringify(referralData, null, 2)}

Generate structured clinical documentation suggestions for each section of an admission note. Use the referral data to create:
1. Homebound status justification based on patient's condition
2. Assessment findings based on diagnoses and functional status
3. Plan of care interventions based on skilled needs
4. Patient/caregiver education topics
5. Safety concerns and fall risk assessment
6. Medication reconciliation notes
7. Wound assessment (if applicable)
8. Pain management documentation
9. Vital signs interpretation
10. Interdisciplinary coordination needs

Make all documentation Medicare-compliant, objective, and specific. Include clinical reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            homebound_status: {
              type: "string",
              description: "Detailed homebound status justification"
            },
            assessment: {
              type: "string",
              description: "Comprehensive assessment documentation"
            },
            plan_of_care: {
              type: "string",
              description: "Skilled interventions and plan"
            },
            education: {
              type: "string",
              description: "Patient/caregiver education provided"
            },
            safety_assessment: {
              type: "string",
              description: "Safety concerns and fall risk"
            },
            medication_reconciliation: {
              type: "string",
              description: "Medication review and reconciliation"
            },
            wound_care: {
              type: "string",
              description: "Wound assessment if applicable"
            },
            pain_management: {
              type: "string",
              description: "Pain assessment and management"
            },
            vital_signs_interpretation: {
              type: "string",
              description: "Clinical interpretation of vital signs"
            },
            coordination_needs: {
              type: "string",
              description: "Interdisciplinary coordination"
            },
            critical_findings: {
              type: "array",
              items: { type: "string" },
              description: "Critical clinical findings requiring immediate attention"
            },
            documentation_tips: {
              type: "array",
              items: { type: "string" },
              description: "Specific documentation tips for this patient"
            }
          }
        }
      });

      setSuggestions(response);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
    setLoading(false);
  };

  const handleCopy = (section, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleInsert = (text) => {
    if (onInsertText) {
      onInsertText(text);
    }
  };

  const sections = [
    { key: 'homebound_status', title: 'Homebound Status', icon: '🏠' },
    { key: 'assessment', title: 'Assessment', icon: '🔍' },
    { key: 'plan_of_care', title: 'Plan of Care', icon: '📋' },
    { key: 'education', title: 'Patient Education', icon: '📚' },
    { key: 'safety_assessment', title: 'Safety Assessment', icon: '🛡️' },
    { key: 'medication_reconciliation', title: 'Medication Reconciliation', icon: '💊' },
    { key: 'wound_care', title: 'Wound Care', icon: '🩹' },
    { key: 'pain_management', title: 'Pain Management', icon: '⚕️' },
    { key: 'vital_signs_interpretation', title: 'Vital Signs', icon: '📊' },
    { key: 'coordination_needs', title: 'Care Coordination', icon: '🤝' }
  ];

  if (!referralData) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Referral-Based AI Documentation Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <FileText className="w-4 h-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Referral Data Loaded</AlertTitle>
          <AlertDescription className="text-blue-800 text-sm">
            Documentation suggestions are being generated based on the referral data for{' '}
            <strong>{referralData.demographics?.full_name}</strong>
          </AlertDescription>
        </Alert>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing referral data and generating documentation suggestions...</p>
          </div>
        )}

        {suggestions && !loading && (
          <div className="space-y-3">
            {/* Critical Findings */}
            {suggestions.critical_findings?.length > 0 && (
              <Alert className="bg-red-50 border-red-300">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertTitle className="text-red-900">Critical Findings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-red-800 text-sm space-y-1 mt-2">
                    {suggestions.critical_findings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Documentation Tips */}
            {suggestions.documentation_tips?.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-300">
                <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                <AlertTitle className="text-yellow-900">Documentation Tips</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1 mt-2">
                    {suggestions.documentation_tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Documentation Sections */}
            <div className="space-y-2">
              {sections.map(section => {
                const content = suggestions[section.key];
                if (!content || content === 'N/A') return null;

                const isExpanded = expandedSection === section.key;
                const isCopied = copiedSection === section.key;

                return (
                  <Card key={section.key} className="border-gray-200">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{section.icon}</span>
                          <span className="font-semibold text-gray-900">{section.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(section.key, content)}
                            className="flex-1"
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInsert(content)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                          >
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Insert into Note
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            <Button
              onClick={generateSuggestions}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}