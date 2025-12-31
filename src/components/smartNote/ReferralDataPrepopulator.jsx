import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CheckCircle2, FileText, Stethoscope, Pill, AlertTriangle, Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ReferralDataPrepopulator({ referralData, onApplyData, currentNote }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [appliedSections, setAppliedSections] = useState([]);

  useEffect(() => {
    if (referralData?.extracted_data) {
      generateClinicalSuggestions();
    }
  }, [referralData]);

  const generateClinicalSuggestions = async () => {
    if (!referralData?.extracted_data) return;

    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation AI assistant for home health admission notes.

Based on this referral data, generate specific clinical documentation suggestions for an admission note:

REFERRAL DATA:
${JSON.stringify(referralData.extracted_data, null, 2)}

CURRENT NOTE DRAFT:
${currentNote || 'No current note text'}

Generate detailed, Medicare-compliant documentation suggestions for:
1. Assessment findings (vital signs interpretation, physical assessment)
2. Homebound status justification (specific evidence from referral)
3. Skilled need justification (why skilled nursing is medically necessary)
4. Safety concerns and interventions
5. Care coordination needs
6. Patient/caregiver education priorities

Make suggestions specific, evidence-based, and ready to copy into the note.`,
        response_json_schema: {
          type: "object",
          properties: {
            assessment_suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Specific assessment documentation suggestions"
            },
            homebound_justification: {
              type: "string",
              description: "Detailed homebound status documentation"
            },
            skilled_need_justification: {
              type: "string",
              description: "Medical necessity and skilled need documentation"
            },
            safety_concerns: {
              type: "array",
              items: { type: "string" },
              description: "Safety issues to document"
            },
            care_coordination: {
              type: "array",
              items: { type: "string" },
              description: "Coordination needs with physicians, therapies, etc."
            },
            education_priorities: {
              type: "array",
              items: { type: "string" },
              description: "Patient/caregiver education needs"
            },
            clinical_alerts: {
              type: "array",
              items: { type: "string" },
              description: "Important clinical alerts from referral"
            }
          }
        }
      });

      setSuggestions(response);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
    setIsGenerating(false);
  };

  const prepopulateSection = (section, content) => {
    onApplyData(section, content);
    setAppliedSections([...appliedSections, section]);
  };

  if (!referralData?.extracted_data) {
    return null;
  }

  const extractedData = referralData.extracted_data;

  return (
    <div className="space-y-4">
      <Alert className="border-purple-200 bg-purple-50">
        <Brain className="w-4 h-4 text-purple-600" />
        <AlertTitle className="text-purple-900">Referral Data Available</AlertTitle>
        <AlertDescription className="text-purple-800">
          Click sections below to prepopulate your admission note with extracted referral data.
        </AlertDescription>
      </Alert>

      {/* Demographics & Background */}
      {extractedData.demographics && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Patient Demographics & Background
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><strong>Patient:</strong> {extractedData.demographics.full_name || 'N/A'}</p>
              <p><strong>DOB:</strong> {extractedData.demographics.date_of_birth || 'N/A'}</p>
              <p><strong>Address:</strong> {extractedData.demographics.address || 'N/A'}</p>
              <p><strong>Phone:</strong> {extractedData.demographics.phone || 'N/A'}</p>
              <p><strong>Emergency Contact:</strong> {extractedData.demographics.emergency_contact || 'N/A'}</p>
              <p><strong>Referring Physician:</strong> {extractedData.demographics.referring_physician || 'N/A'}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prepopulateSection('demographics', `Patient: ${extractedData.demographics.full_name}, DOB: ${extractedData.demographics.date_of_birth}\nAddress: ${extractedData.demographics.address}\nPhone: ${extractedData.demographics.phone}\nEmergency Contact: ${extractedData.demographics.emergency_contact}\nReferring Physician: ${extractedData.demographics.referring_physician}`)}
              className="w-full"
              disabled={appliedSections.includes('demographics')}
            >
              {appliedSections.includes('demographics') ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
              ) : (
                'Apply to Note'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses */}
      {extractedData.diagnoses && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-red-600" />
              Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><strong>Primary:</strong> {extractedData.diagnoses.primary_diagnosis || 'N/A'}</p>
              {extractedData.diagnoses.secondary_diagnoses?.length > 0 && (
                <>
                  <p><strong>Secondary:</strong></p>
                  <ul className="list-disc ml-5">
                    {extractedData.diagnoses.secondary_diagnoses.map((dx, i) => (
                      <li key={i}>{dx}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prepopulateSection('diagnoses', `Primary Diagnosis: ${extractedData.diagnoses.primary_diagnosis}\n\nSecondary Diagnoses:\n${extractedData.diagnoses.secondary_diagnoses?.map(dx => `- ${dx}`).join('\n') || 'None documented'}`)}
              className="w-full"
              disabled={appliedSections.includes('diagnoses')}
            >
              {appliedSections.includes('diagnoses') ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
              ) : (
                'Apply to Note'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      {extractedData.medications?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-orange-600" />
              Current Medications ({extractedData.medications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-gray-50 p-3 rounded text-sm max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {extractedData.medications.map((med, i) => (
                  <li key={i} className="border-b pb-2 last:border-b-0">
                    <strong>{med.name}</strong>
                    {med.dosage && <span> - {med.dosage}</span>}
                    {med.frequency && <span> - {med.frequency}</span>}
                    {med.indication && <p className="text-xs text-gray-600">For: {med.indication}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prepopulateSection('medications', `Current Medications:\n${extractedData.medications.map(med => `- ${med.name}${med.dosage ? ` ${med.dosage}` : ''}${med.frequency ? ` ${med.frequency}` : ''}${med.indication ? ` (${med.indication})` : ''}`).join('\n')}`)}
              className="w-full"
              disabled={appliedSections.includes('medications')}
            >
              {appliedSections.includes('medications') ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
              ) : (
                'Apply to Note'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Allergies */}
      {extractedData.diagnoses?.allergies && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-yellow-50 p-3 rounded text-sm">
              <p>{extractedData.diagnoses.allergies}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prepopulateSection('allergies', `Allergies: ${extractedData.diagnoses.allergies}`)}
              className="w-full"
              disabled={appliedSections.includes('allergies')}
            >
              {appliedSections.includes('allergies') ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
              ) : (
                'Apply to Note'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Clinical Documentation Suggestions */}
      {suggestions && (
        <Card className="border-purple-300 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI Clinical Documentation Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Homebound Justification */}
            {suggestions.homebound_justification && (
              <div>
                <p className="font-semibold text-sm mb-2">Homebound Status:</p>
                <div className="bg-white p-3 rounded text-sm border">
                  <p className="whitespace-pre-wrap">{suggestions.homebound_justification}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepopulateSection('homebound', suggestions.homebound_justification)}
                  className="mt-2"
                  disabled={appliedSections.includes('homebound')}
                >
                  {appliedSections.includes('homebound') ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
                  ) : (
                    'Apply Homebound Documentation'
                  )}
                </Button>
              </div>
            )}

            {/* Skilled Need */}
            {suggestions.skilled_need_justification && (
              <div>
                <p className="font-semibold text-sm mb-2">Skilled Need Justification:</p>
                <div className="bg-white p-3 rounded text-sm border">
                  <p className="whitespace-pre-wrap">{suggestions.skilled_need_justification}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepopulateSection('skilled_need', suggestions.skilled_need_justification)}
                  className="mt-2"
                  disabled={appliedSections.includes('skilled_need')}
                >
                  {appliedSections.includes('skilled_need') ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
                  ) : (
                    'Apply Skilled Need Documentation'
                  )}
                </Button>
              </div>
            )}

            {/* Safety Concerns */}
            {suggestions.safety_concerns?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Safety Concerns:</p>
                <ul className="bg-white p-3 rounded text-sm border space-y-1">
                  {suggestions.safety_concerns.map((concern, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepopulateSection('safety', suggestions.safety_concerns.map(c => `- ${c}`).join('\n'))}
                  className="mt-2"
                  disabled={appliedSections.includes('safety')}
                >
                  {appliedSections.includes('safety') ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
                  ) : (
                    'Apply Safety Documentation'
                  )}
                </Button>
              </div>
            )}

            {/* Assessment Suggestions */}
            {suggestions.assessment_suggestions?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Assessment Findings:</p>
                <ul className="bg-white p-3 rounded text-sm border space-y-1">
                  {suggestions.assessment_suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepopulateSection('assessment', suggestions.assessment_suggestions.map(s => `- ${s}`).join('\n'))}
                  className="mt-2"
                  disabled={appliedSections.includes('assessment')}
                >
                  {appliedSections.includes('assessment') ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
                  ) : (
                    'Apply Assessment Documentation'
                  )}
                </Button>
              </div>
            )}

            {/* Education Priorities */}
            {suggestions.education_priorities?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Patient/Caregiver Education:</p>
                <ul className="bg-white p-3 rounded text-sm border space-y-1">
                  {suggestions.education_priorities.map((priority, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{priority}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepopulateSection('education', suggestions.education_priorities.map(e => `- ${e}`).join('\n'))}
                  className="mt-2"
                  disabled={appliedSections.includes('education')}
                >
                  {appliedSections.includes('education') ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Applied</>
                  ) : (
                    'Apply Education Documentation'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Alert className="border-blue-200 bg-blue-50">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <AlertDescription className="text-blue-900">
            Generating AI clinical documentation suggestions...
          </AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        onClick={generateClinicalSuggestions}
        disabled={isGenerating}
        className="w-full"
      >
        <Brain className="w-4 h-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Regenerate AI Suggestions'}
      </Button>
    </div>
  );
}