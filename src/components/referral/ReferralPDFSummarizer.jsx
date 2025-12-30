import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Upload,
  CheckCircle2,
  Copy,
  ArrowRight,
  User,
  Pill,
  Activity,
  Stethoscope,
  AlertCircle,
  Download,
  Brain
} from "lucide-react";
import AISmartOASISAssistant from "../oasis/AISmartOASISAssistant";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ReferralPDFSummarizer({ 
  onDataExtracted,
  onUseForAdmission,
  patientId = null
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
      await processReferral(result.file_url);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
    setIsUploading(false);
  };

  const processReferral = async (url) => {
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health intake coordinator. Analyze this patient referral document and extract ALL relevant information needed for:
1. Admission nursing assessment
2. OASIS-E completion
3. Care planning

Extract comprehensive details organized by category. Be thorough and specific.

CRITICAL EXTRACTION REQUIREMENTS:

DEMOGRAPHICS:
- Full name, DOB, age, gender
- Address, phone numbers
- Emergency contacts with relationships
- Insurance information (primary, secondary, policy numbers)
- Referring physician and contact info
- Primary care physician if different

ADMISSION DETAILS:
- Admission source (hospital, SNF, home, etc.)
- Admission date or requested start date
- Referral date and reason for referral
- Prior living situation
- Current living situation and support system

DIAGNOSES & MEDICAL HISTORY:
- Primary diagnosis (ICD-10 if available)
- All secondary diagnoses
- Relevant past medical history
- Surgical history
- Recent hospitalizations with dates and reasons
- Allergies and reactions

MEDICATIONS:
- Complete medication list with:
  * Medication name
  * Dosage and frequency
  * Route
  * Prescribing physician
  * Start date if available
- Recent medication changes
- High-risk medications noted

FUNCTIONAL STATUS & OASIS NEEDS:
- Ambulation status (independent, walker, wheelchair, etc.)
- ADL independence levels (bathing, dressing, toileting, etc.)
- Fall risk factors
- Cognitive status
- Vision/hearing impairments
- Skin integrity and wounds
- Pain level and location
- Bowel/bladder continence

CLINICAL INFORMATION:
- Recent vital signs
- Weight
- Laboratory values mentioned
- Diagnostic test results
- Procedures performed
- Wound descriptions (location, size, stage, treatment)

SKILLED NEEDS & SERVICES:
- What skilled services are ordered (SN, PT, OT, ST, MSW)
- Frequency and duration ordered
- Specific interventions needed
- DME/supplies needed
- Goals of care

PSYCHOSOCIAL:
- Mental health history
- Caregiver availability and capability
- Language barriers
- Cultural considerations
- Advance directives status

ORDERS & TREATMENTS:
- Physician orders for home health
- Specific treatments ordered
- Monitoring parameters
- Diet orders
- Activity restrictions

SAFETY CONCERNS:
- Environmental hazards mentioned
- Safety equipment needed
- High-risk conditions requiring monitoring

Extract everything mentioned, even if partial. If information is missing, note it as "Not documented in referral."`,
        file_urls: [url],
        response_json_schema: {
          type: "object",
          properties: {
            demographics: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                date_of_birth: { type: "string" },
                age: { type: "string" },
                gender: { type: "string" },
                address: { type: "string" },
                phone: { type: "string" },
                emergency_contact: { type: "string" },
                emergency_phone: { type: "string" },
                emergency_relationship: { type: "string" },
                insurance_primary: { type: "string" },
                insurance_secondary: { type: "string" },
                policy_numbers: { type: "string" },
                referring_physician: { type: "string" },
                referring_physician_contact: { type: "string" },
                primary_care_physician: { type: "string" },
                pcp_contact: { type: "string" }
              }
            },
            admission_details: {
              type: "object",
              properties: {
                admission_source: { type: "string" },
                admission_date: { type: "string" },
                referral_date: { type: "string" },
                referral_reason: { type: "string" },
                prior_living_situation: { type: "string" },
                current_living_situation: { type: "string" },
                support_system: { type: "string" }
              }
            },
            diagnoses: {
              type: "object",
              properties: {
                primary_diagnosis: { type: "string" },
                primary_icd10: { type: "string" },
                secondary_diagnoses: { type: "array", items: { type: "string" } },
                past_medical_history: { type: "array", items: { type: "string" } },
                surgical_history: { type: "array", items: { type: "string" } },
                recent_hospitalizations: { type: "string" },
                allergies: { type: "string" }
              }
            },
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  route: { type: "string" },
                  prescriber: { type: "string" },
                  notes: { type: "string" }
                }
              }
            },
            functional_status: {
              type: "object",
              properties: {
                ambulation: { type: "string" },
                adl_status: { type: "string" },
                fall_risk: { type: "string" },
                cognitive_status: { type: "string" },
                vision: { type: "string" },
                hearing: { type: "string" },
                skin_integrity: { type: "string" },
                wounds: { type: "string" },
                pain: { type: "string" },
                continence: { type: "string" }
              }
            },
            clinical_info: {
              type: "object",
              properties: {
                vital_signs: { type: "string" },
                weight: { type: "string" },
                lab_values: { type: "string" },
                diagnostic_results: { type: "string" },
                procedures: { type: "string" }
              }
            },
            skilled_needs: {
              type: "object",
              properties: {
                services_ordered: { type: "array", items: { type: "string" } },
                frequency_duration: { type: "string" },
                specific_interventions: { type: "array", items: { type: "string" } },
                dme_supplies: { type: "array", items: { type: "string" } },
                goals_of_care: { type: "string" }
              }
            },
            psychosocial: {
              type: "object",
              properties: {
                mental_health: { type: "string" },
                caregiver_info: { type: "string" },
                language: { type: "string" },
                cultural_needs: { type: "string" },
                advance_directives: { type: "string" }
              }
            },
            orders_treatments: {
              type: "object",
              properties: {
                physician_orders: { type: "array", items: { type: "string" } },
                treatments: { type: "array", items: { type: "string" } },
                monitoring_parameters: { type: "array", items: { type: "string" } },
                diet: { type: "string" },
                activity_restrictions: { type: "string" }
              }
            },
            safety_concerns: {
              type: "object",
              properties: {
                environmental_hazards: { type: "string" },
                safety_equipment_needed: { type: "array", items: { type: "string" } },
                high_risk_conditions: { type: "array", items: { type: "string" } }
              }
            },
            oasis_relevant_notes: {
              type: "string"
            },
            admission_note_template: {
              type: "string"
            }
          }
        }
      });

      setExtractedData(result);
      onDataExtracted?.(result);
    } catch (error) {
      console.error('Error processing referral:', error);
      alert('Failed to process referral. Please try again.');
    }
    setIsProcessing(false);
  };

  const copySection = (text) => {
    navigator.clipboard.writeText(text);
  };

  const copyAll = () => {
    const allText = JSON.stringify(extractedData, null, 2);
    navigator.clipboard.writeText(allText);
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);

  const generateAdmissionPacket = async () => {
    if (!extractedData) return;
    
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateReferralOASISPacket', {
        referralData: extractedData
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admission_packet_${extractedData.demographics?.full_name?.replace(/\s+/g, '_') || 'patient'}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate admission packet. Please try again.');
    }
    setGeneratingPDF(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Patient Referral PDF Summarizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a patient referral PDF to automatically extract all relevant information for admission assessment and OASIS completion.
          </p>

          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessing}
              className="flex-1"
            />
            <Button disabled={isUploading || isProcessing}>
              {isUploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload
            </Button>
          </div>

          {isProcessing && (
            <Alert className="bg-blue-50 border-blue-200">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <AlertDescription className="ml-2">
                Processing referral document... This may take 30-60 seconds.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {extractedData && (
        <div className="space-y-4">
          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-900">Referral Processed Successfully</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copyAll}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={generateAdmissionPacket}
                    disabled={generatingPDF}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {generatingPDF ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Admission Packet PDF
                  </Button>
                  {onUseForAdmission && (
                    <Button size="sm" onClick={() => onUseForAdmission(extractedData)} className="bg-green-600 hover:bg-green-700">
                      <ArrowRight className="w-4 h-4 mr-1" />
                      Use for Admission
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="space-y-2">
            {/* Demographics */}
            <AccordionItem value="demographics">
              <AccordionTrigger className="bg-blue-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Demographics & Contact Information</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(extractedData.demographics || {}).map(([key, value]) => (
                    value && value !== "Not documented in referral." && (
                      <div key={key} className="bg-gray-50 p-2 rounded">
                        <p className="text-xs font-semibold text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-900">{value}</p>
                      </div>
                    )
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.demographics, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Admission Details */}
            <AccordionItem value="admission">
              <AccordionTrigger className="bg-purple-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold">Admission Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="space-y-2">
                  {Object.entries(extractedData.admission_details || {}).map(([key, value]) => (
                    value && value !== "Not documented in referral." && (
                      <div key={key} className="bg-purple-50 p-2 rounded">
                        <p className="text-xs font-semibold text-purple-900 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-900">{value}</p>
                      </div>
                    )
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.admission_details, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Diagnoses */}
            <AccordionItem value="diagnoses">
              <AccordionTrigger className="bg-red-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-red-600" />
                  <span className="font-semibold">Diagnoses & Medical History</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                    <p className="text-xs font-semibold text-red-900">Primary Diagnosis</p>
                    <p className="text-sm font-bold text-gray-900">{extractedData.diagnoses?.primary_diagnosis}</p>
                    {extractedData.diagnoses?.primary_icd10 && (
                      <Badge className="mt-1">{extractedData.diagnoses.primary_icd10}</Badge>
                    )}
                  </div>
                  {extractedData.diagnoses?.secondary_diagnoses?.length > 0 && (
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-xs font-semibold text-orange-900 mb-1">Secondary Diagnoses</p>
                      <ul className="list-disc list-inside text-sm text-gray-900">
                        {extractedData.diagnoses.secondary_diagnoses.map((dx, i) => (
                          <li key={i}>{dx}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extractedData.diagnoses?.allergies && extractedData.diagnoses.allergies !== "Not documented in referral." && (
                    <Alert className="bg-yellow-50 border-yellow-300">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900">
                        <strong>Allergies:</strong> {extractedData.diagnoses.allergies}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.diagnoses, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Medications */}
            <AccordionItem value="medications">
              <AccordionTrigger className="bg-green-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">Medications ({extractedData.medications?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="space-y-2">
                  {extractedData.medications?.map((med, i) => (
                    <div key={i} className="bg-green-50 p-3 rounded border-l-2 border-green-500">
                      <p className="font-semibold text-sm text-gray-900">{med.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-gray-700">
                        {med.dosage && <p><strong>Dosage:</strong> {med.dosage}</p>}
                        {med.frequency && <p><strong>Frequency:</strong> {med.frequency}</p>}
                        {med.route && <p><strong>Route:</strong> {med.route}</p>}
                        {med.prescriber && <p><strong>Prescriber:</strong> {med.prescriber}</p>}
                      </div>
                      {med.notes && <p className="text-xs text-gray-600 mt-1 italic">{med.notes}</p>}
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.medications, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Functional Status */}
            <AccordionItem value="functional">
              <AccordionTrigger className="bg-indigo-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold">Functional Status (OASIS Relevant)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(extractedData.functional_status || {}).map(([key, value]) => (
                    value && value !== "Not documented in referral." && (
                      <div key={key} className="bg-indigo-50 p-2 rounded">
                        <p className="text-xs font-semibold text-indigo-900 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-900">{value}</p>
                      </div>
                    )
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.functional_status, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Skilled Needs */}
            <AccordionItem value="skilled">
              <AccordionTrigger className="bg-yellow-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold">Skilled Needs & Services</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                <div className="space-y-3">
                  {extractedData.skilled_needs?.services_ordered?.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">Services Ordered</p>
                      <div className="flex flex-wrap gap-1">
                        {extractedData.skilled_needs.services_ordered.map((service, i) => (
                          <Badge key={i} className="bg-yellow-600">{service}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedData.skilled_needs?.specific_interventions?.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs font-semibold text-blue-900 mb-1">Specific Interventions</p>
                      <ul className="list-disc list-inside text-sm text-gray-900">
                        {extractedData.skilled_needs.specific_interventions.map((int, i) => (
                          <li key={i}>{int}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.skilled_needs, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Section
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Admission Note Template */}
            {extractedData.admission_note_template && (
              <AccordionItem value="template">
                <AccordionTrigger className="bg-purple-50 px-4 py-3 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold">AI-Generated Admission Note Template</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                  <div className="bg-purple-50 p-4 rounded border">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.admission_note_template}</pre>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(extractedData.admission_note_template)}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Template
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* AI OASIS Assistant */}
          <Card className="border-2 border-purple-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI OASIS Pre-Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Based on the extracted referral data, our AI has analyzed and pre-populated relevant OASIS items with confidence scores and verification flags.
              </p>
              <AISmartOASISAssistant
                patientData={extractedData}
                referralData={extractedData}
                autoAnalyze={true}
                onApplySuggestion={(item) => {
                  console.log('Applied OASIS suggestion:', item);
                  // You can add custom logic here to populate OASIS forms
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}