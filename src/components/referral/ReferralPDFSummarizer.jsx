import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AIFieldIndicator from "@/components/ui/ai-field-indicator";
import ProgressFeedback from "@/components/ui/progress-feedback";
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
import AIAdmissionDocumentationAssistant from "../clinical/AIAdmissionDocumentationAssistant";
import AIAdmissionNoteGenerator from "./AIAdmissionNoteGenerator";
import AICarePlanSuggestionEngine from "./AICarePlanSuggestionEngine";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ReferralPDFSummarizer({ 
  onDataExtracted,
  onUseForAdmission,
  patientId = null,
  fileUrl: externalFileUrl = null,
  onExtractionComplete = null
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [fileUrl, setFileUrl] = useState(externalFileUrl);
  const [extractedData, setExtractedData] = useState(null);

  const processingStages = [
    "Analyzing document structure...",
    "Extracting patient demographics...",
    "Identifying diagnoses and medications...",
    "Analyzing functional status...",
    "Generating OASIS assessment...",
    "Finalizing extraction..."
  ];

  // Check if current user is admin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Auto-process if fileUrl is provided externally
  React.useEffect(() => {
    if (externalFileUrl && !extractedData && !isProcessing) {
      setFileUrl(externalFileUrl);
      processReferral(externalFileUrl);
    }
  }, [externalFileUrl]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Support multiple formats
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, PNG, JPG, or TIFF file (common for faxes)');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
      await processReferral(result.file_url, file.type);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
    setIsUploading(false);
  };

  const processReferral = async (url, fileType = 'application/pdf') => {
    setIsProcessing(true);
    setProcessingStage(0);
    
    const progressInterval = setInterval(() => {
      setProcessingStage(prev => Math.min(prev + 1, processingStages.length - 1));
    }, 3000);

    try {
      // Add context about file type for better extraction
      const fileTypeContext = fileType && fileType.includes('image') 
        ? 'This is a scanned/faxed document image. Extract text carefully, accounting for potential OCR errors or handwriting.' 
        : 'This is a PDF document.';
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health intake coordinator with advanced document reading capabilities. ${fileTypeContext}

CRITICAL DOCUMENT READING INSTRUCTIONS:
- This document may contain BOTH typed text and HANDWRITTEN notes
- Read ALL text carefully, including handwritten annotations, checkboxes, signatures, and margin notes
- For handwritten content: interpret cursive, print, or mixed writing styles
- If handwriting is unclear, provide your best interpretation and flag with "[unclear handwriting]"
- Extract information from checkboxes, form fields, AND any written notes in margins or blank spaces
- Look for physician signatures, date stamps, and hand-marked priority indicators
- Pay special attention to:
  * Handwritten vital signs or assessment notes
  * Physician's handwritten orders or special instructions
  * Care notes written by hospital staff or case managers
  * Date/time stamps that may be handwritten
  * Contact information that may be partially handwritten

When you encounter handwritten text:
1. Transcribe it as accurately as possible
2. Include context about WHERE it appeared (e.g., "handwritten in margins", "noted in physician section")
3. If uncertain about legibility, include "[possibly X or Y]" notation

Analyze this patient referral document and extract ALL relevant information needed for:
1. **Complete OASIS-E assessment** (generate as many OASIS items as possible with confidence scores)
2. Admission nursing assessment
3. Care planning
4. **PDGM reimbursement optimization**

**YOUR PRIMARY GOAL: Generate a complete, Medicare-compliant OASIS assessment from the referral data. For each OASIS item, use the exact scoring scales and provide your confidence level (high/medium/low) and reasoning.**

**CRITICAL - PDGM DIAGNOSIS SELECTION:**
When determining primary and secondary diagnoses, you MUST optimize for maximum PDGM reimbursement by:
- Identifying the PDGM Clinical Group (MS-Rehab, Neuro/Rehab, Complex Nursing, etc.)
- Selecting the primary diagnosis that provides the highest case-mix weight
- Ensuring comorbidities are properly captured to increase case-mix adjustment
- Considering how functional impairment scores (OASIS M1800-M1860) interact with diagnosis selection
- If multiple diagnoses are present, prioritize those in higher-paying clinical groups
- Flag if additional clinical information is needed to optimize the PDGM group assignment

**PDGM Clinical Groups (highest to lowest reimbursement generally):**
1. MS-Rehab (Multiple Sclerosis, ALS, Parkinson's with rehab needs)
2. Neuro/Rehab (CVA, traumatic brain injury, spinal cord disorders)
3. Wounds/Surgical Aftercare (pressure ulcers, post-surgical wounds)
4. MMTA-NT-Surgical Rehab (joint replacement, fractures)
5. Behavioral Health (depression, anxiety as primary with ADL impact)
6. Complex Nursing (cancer care, diabetes with complications, heart failure)
7. MMTA - Cardiac/Circulatory (cardiac conditions, COPD)

**For each diagnosis extraction:**
- Note the ICD-10 code AND its PDGM clinical group
- If diagnosis could qualify for multiple groups, specify which is optimal
- Identify missing clinical details that could upgrade the PDGM group
- Flag if additional documentation is needed to support higher reimbursement

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

FUNCTIONAL STATUS & DETAILED OASIS ASSESSMENT:

**CRITICAL: For each functional area, provide OASIS-compliant scoring (0-6 scale where applicable):**

**Vision (M1200):**
- 0 = Normal
- 1 = Partially impaired
- 2 = Severely impaired

**ADL/IADL Assessment (M1800-M1870) - Use this scale:**
- 0 = Able to perform independently
- 1 = With use of assistive device
- 2 = With minimal assistance from person
- 3 = With moderate assistance from person
- 4 = With substantial/maximal assistance from person
- 5 = Dependent, does not participate
- 6 = Unable to perform

Assess each ADL:
- M1800: Grooming (hair, nails, teeth)
- M1810: Dressing upper body
- M1820: Dressing lower body
- M1830: Bathing
- M1840: Toilet transferring
- M1845: Toilet hygiene
- M1850: Transferring (bed, chair, wheelchair)
- M1860: Ambulation/locomotion
- M1870: Feeding/eating

**Cognitive Function (M1700):**
- 0 = Alert/oriented, processes info
- 1 = Memory deficit, decisions okay
- 2 = Difficulty some decisions
- 3 = Difficulty all decisions
- 4 = Never/rarely makes decisions

**Pain (M1242):**
- 0 = No pain
- 1 = Less often than daily
- 2 = Daily, not constantly
- 3 = All the time

**Continence:**
- Urinary (M1610): 0=continent to 5=catheter
- Bowel (M1620): 0=continent to 5=incontinent

**Wounds & Pressure Ulcers:**
- Current pressure ulcers by stage
- Stasis ulcers
- Surgical wounds
- Descriptions with measurements

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

Extract everything mentioned, even if partial. If information is missing, note it as "Not documented in referral."

HANDWRITTEN NOTES HANDLING:
- If you find handwritten notes, include them in the appropriate section with context
- Create a special "handwritten_notes" field to capture any additional handwritten information that doesn't fit standard categories
- For illegible handwriting, note "[illegible handwriting - appears to be about X]"
- Cross-reference handwritten information with typed data to resolve conflicts or fill gaps`,
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
                primary_diagnosis: { 
                  type: "string",
                  description: "Primary diagnosis selected for OPTIMAL PDGM reimbursement"
                },
                primary_icd10: { type: "string" },
                pdgm_clinical_group: { 
                  type: "string",
                  description: "PDGM Clinical Group (e.g., MS-Rehab, Neuro/Rehab, Complex Nursing)"
                },
                pdgm_optimization_notes: { 
                  type: "string",
                  description: "Why this primary diagnosis was selected for PDGM optimization, alternatives considered, missing info needed"
                },
                secondary_diagnoses: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Secondary diagnoses that increase case-mix through comorbidity adjustments"
                },
                comorbidity_adjustments: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Specific comorbidities that will increase PDGM case-mix weight"
                },
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
            oasis_assessment: {
              type: "object",
              properties: {
                m1021_primary_diagnosis: { type: "string" },
                m1023_other_diagnoses: { type: "array", items: { type: "string" } },
                m1033_risk_hospitalization: { type: "string" },
                m1200_vision: { type: "string" },
                m1242_pain_frequency: { type: "string" },
                m1306_pressure_ulcer_risk: { type: "string" },
                m1307_oldest_stage2: { type: "string" },
                m1311_current_pressure_ulcers: { type: "object" },
                m1322_current_stasis_ulcers: { type: "string" },
                m1324_surgical_wounds: { type: "string" },
                m1610_urinary_incontinence: { type: "string" },
                m1620_bowel_incontinence: { type: "string" },
                m1700_cognitive_functioning: { type: "string" },
                m1710_confusion_frequency: { type: "string" },
                m1720_anxiety_frequency: { type: "string" },
                m1730_depression_screening: { type: "string" },
                m1740_cognitive_behavioral: { type: "string" },
                m1800_grooming: { type: "string" },
                m1810_dress_upper: { type: "string" },
                m1820_dress_lower: { type: "string" },
                m1830_bathing: { type: "string" },
                m1840_toilet_transfer: { type: "string" },
                m1845_toilet_hygiene: { type: "string" },
                m1850_transferring: { type: "string" },
                m1860_ambulation: { type: "string" },
                m1870_feeding: { type: "string" },
                m2001_drug_regimen_review: { type: "string" },
                m2003_medication_followup: { type: "string" },
                m2010_high_risk_drugs: { type: "array", items: { type: "string" } },
                m2020_management_oral_meds: { type: "string" },
                m2030_management_injectable_meds: { type: "string" },
                confidence_notes: { type: "string" },
                items_needing_verification: { type: "array", items: { type: "string" } }
              }
            },
            oasis_relevant_notes: {
              type: "string"
            },
            admission_note_template: {
              type: "string"
            },
            handwritten_notes: {
              type: "object",
              properties: {
                clinical_notes: { type: "string" },
                physician_instructions: { type: "string" },
                margin_annotations: { type: "string" },
                priority_indicators: { type: "string" },
                other_handwritten: { type: "string" }
              }
            },
            document_quality_notes: {
              type: "object",
              properties: {
                legibility_assessment: { type: "string" },
                unclear_sections: { type: "array", items: { type: "string" } },
                mixed_content_noted: { type: "boolean" }
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setProcessingStage(processingStages.length - 1);
      
      setExtractedData(result);
      onDataExtracted?.(result);
      
      // Auto-generate PDF after extraction
      const pdfUrl = await generateAdmissionPacket();
      
      // Callback for external workflows (referral intake)
      if (onExtractionComplete) {
        onExtractionComplete(result, result, pdfUrl);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error processing referral:', error);
      alert('Failed to process referral. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStage(0);
    }
  };

  const copySection = (text) => {
    navigator.clipboard.writeText(text);
  };

  const copyAll = () => {
    const allText = JSON.stringify(extractedData, null, 2);
    navigator.clipboard.writeText(allText);
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [oasisResults, setOasisResults] = useState(null);

  const generateAdmissionPacket = async () => {
    if (!extractedData) return;
    
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateReferralOASISPacket', {
        referralData: extractedData
      });
      
      // Convert blob to file and upload to get permanent URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const file = new File([blob], `admission_packet_${extractedData.demographics?.full_name?.replace(/\s+/g, '_') || 'patient'}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      // Upload to get permanent URL
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setGeneratedPdfUrl(file_url);
      
      // Also trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      return file_url;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate admission packet. Please try again.');
      return null;
    } finally {
      setGeneratingPDF(false);
    }
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
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
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
          <p className="text-xs text-gray-500">
            Supports PDFs, faxed images (PNG, JPG, TIFF), and scanned documents
          </p>

          {isProcessing && (
            <ProgressFeedback
              stages={processingStages}
              currentStage={processingStage}
              message="Analyzing referral with AI"
            />
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
                  <AIFieldIndicator confidence={95} source="AI" />
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
                  <AIFieldIndicator confidence={92} source="AI" />
                  {isAdmin && extractedData.diagnoses?.pdgm_clinical_group && (
                    <Badge className="bg-green-600 text-white">PDGM: {extractedData.diagnoses.pdgm_clinical_group}</Badge>
                  )}
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
                    {isAdmin && extractedData.diagnoses?.pdgm_clinical_group && (
                      <p className="text-xs text-green-700 font-semibold mt-1">PDGM Group: {extractedData.diagnoses.pdgm_clinical_group}</p>
                    )}
                  </div>
                  
                  {isAdmin && extractedData.diagnoses?.pdgm_optimization_notes && (
                    <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                      <p className="text-xs font-semibold text-green-900 mb-1">💰 PDGM Optimization Notes</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.diagnoses.pdgm_optimization_notes}</p>
                    </div>
                  )}
                  
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
                  
                  {isAdmin && extractedData.diagnoses?.comorbidity_adjustments?.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                      <p className="text-xs font-semibold text-blue-900 mb-1">💵 Case-Mix Comorbidities</p>
                      <p className="text-xs text-blue-800 mb-2">These comorbidities increase PDGM reimbursement:</p>
                      <ul className="list-disc list-inside text-sm text-gray-900">
                        {extractedData.diagnoses.comorbidity_adjustments.map((comorb, i) => (
                          <li key={i}>{comorb}</li>
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
                  <AIFieldIndicator confidence={88} source="AI" needsVerification={true} tooltip="Verify all medications with patient/caregiver" />
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

            {/* Handwritten Notes */}
            {extractedData.handwritten_notes && Object.values(extractedData.handwritten_notes).some(v => v) && (
              <AccordionItem value="handwritten">
                <AccordionTrigger className="bg-amber-50 px-4 py-3 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold">Handwritten Notes & Annotations</span>
                    <Badge className="bg-amber-500 text-white">Extracted</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                  <div className="space-y-3">
                    {extractedData.handwritten_notes.clinical_notes && (
                      <div className="bg-amber-50 p-3 rounded border-l-4 border-amber-500">
                        <p className="text-xs font-semibold text-amber-900 mb-1">Clinical Notes (Handwritten)</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.handwritten_notes.clinical_notes}</p>
                      </div>
                    )}
                    {extractedData.handwritten_notes.physician_instructions && (
                      <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Physician Instructions (Handwritten)</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.handwritten_notes.physician_instructions}</p>
                      </div>
                    )}
                    {extractedData.handwritten_notes.margin_annotations && (
                      <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Margin Annotations</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.handwritten_notes.margin_annotations}</p>
                      </div>
                    )}
                    {extractedData.handwritten_notes.priority_indicators && (
                      <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                        <p className="text-xs font-semibold text-red-900 mb-1">Priority Indicators</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.handwritten_notes.priority_indicators}</p>
                      </div>
                    )}
                    {extractedData.handwritten_notes.other_handwritten && (
                      <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-500">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Other Handwritten Content</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{extractedData.handwritten_notes.other_handwritten}</p>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => copySection(JSON.stringify(extractedData.handwritten_notes, null, 2))}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Handwritten Notes
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Document Quality Notes */}
            {extractedData.document_quality_notes && (
              <AccordionItem value="quality">
                <AccordionTrigger className="bg-gray-50 px-4 py-3 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold">Document Quality Assessment</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg">
                  <div className="space-y-2">
                    {extractedData.document_quality_notes.legibility_assessment && (
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-xs font-semibold text-blue-900">Legibility Assessment</p>
                        <p className="text-sm text-gray-900">{extractedData.document_quality_notes.legibility_assessment}</p>
                      </div>
                    )}
                    {extractedData.document_quality_notes.unclear_sections?.length > 0 && (
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-xs font-semibold text-yellow-900 mb-1">Unclear Sections</p>
                        <ul className="text-sm text-gray-900 list-disc list-inside">
                          {extractedData.document_quality_notes.unclear_sections.map((section, i) => (
                            <li key={i}>{section}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

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

          {/* AI Admission Note Generator */}
          <AIAdmissionNoteGenerator
            referralData={extractedData}
            autoGenerate={true}
            onNoteGenerated={(noteData) => {
              console.log('Admission note generated:', noteData);
            }}
          />

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
                  setOasisResults(item);
                }}
              />
            </CardContent>
          </Card>

          {/* AI Care Plan Suggestions */}
          <AICarePlanSuggestionEngine
            referralData={extractedData}
            oasisData={oasisResults || extractedData.oasis_assessment}
            patientId={patientId}
            autoGenerate={true}
            onCarePlansGenerated={(plans, summary) => {
              console.log('Care plans generated:', plans, summary);
            }}
          />

          {/* Admission Packet Customizer */}
          <AdmissionPacketCustomizer 
            referralData={extractedData} 
            referralId={null}
          />
        </div>
      )}
    </div>
  );
}