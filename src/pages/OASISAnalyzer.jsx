import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Target,
  Loader2,
  Info,
  TrendingUp,
  ClipboardCheck,
  Lightbulb,
  Download,
  FileDown,
  FolderArchive,
  Workflow,
  Save,
  User,
  History
} from "lucide-react";
import { generateOASISReportPDF } from "@/functions/generateOASISReportPDF";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BatchOASISAnalyzer from "../components/oasis/BatchOASISAnalyzer";
import PDGMRevenueComparison from "../components/oasis/PDGMRevenueComparison";
import PDGMMultiReportComparison from "../components/oasis/PDGMMultiReportComparison";
import EnhancedMultiReportComparison from "../components/oasis/EnhancedMultiReportComparison";
import KeyTakeawaysSummary from "../components/oasis/KeyTakeawaysSummary";
import AuditRiskPredictor from "../components/oasis/AuditRiskPredictor";
import DocumentationQualitySuggestions from "../components/oasis/DocumentationQualitySuggestions";
import OASISScenarioManager from "../components/oasis/OASISScenarioManager";
import OASISActionWorkflow from "../components/oasis/OASISActionWorkflow";
import AIDocumentationQualityAnalyzer from "../components/oasis/AIDocumentationQualityAnalyzer";
import OASISTaskGenerator from "../components/oasis/OASISTaskGenerator";
import SmartNoteDataImport from "../components/oasis/SmartNoteDataImport";

export default function OASISAnalyzer() {
  const [activeTab, setActiveTab] = useState("single");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [pdgmData, setPdgmData] = useState(null);
  const [error, setError] = useState(null);
  const [savedBatchResults, setSavedBatchResults] = useState([]);
  const [analysisId, setAnalysisId] = useState(null);
  const [originalPayment, setOriginalPayment] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToPatient, setSavedToPatient] = useState(false);

  const queryClient = useQueryClient();

  // Fetch patients for linking
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Fetch saved OASIS uploads
  const { data: savedOASISUploads = [] } = useQuery({
    queryKey: ['oasisUploads'],
    queryFn: () => base44.entities.OASISUpload.list('-created_date', 50),
  });

  // Save OASIS mutation
  const saveOASISMutation = useMutation({
    mutationFn: (data) => base44.entities.OASISUpload.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oasisUploads'] });
      setSavedToPatient(true);
    },
  });

  // Generate unique analysis ID when new analysis starts
  useEffect(() => {
    if (analysisResults && !analysisId) {
      const newAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setAnalysisId(newAnalysisId);
      const extractedName = analysisResults.pdgm_data?.patient_info?.name || "Unknown Patient";
      setPatientName(extractedName);
      setSavedToPatient(false);
      
      // Try to auto-match patient by name
      if (extractedName && extractedName !== "Unknown Patient" && patients.length > 0) {
        const matchedPatient = patients.find(p => {
          const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
          return fullName.includes(extractedName.toLowerCase()) || 
                 extractedName.toLowerCase().includes(fullName);
        });
        if (matchedPatient) {
          setSelectedPatientId(matchedPatient.id);
        }
      }
    }
  }, [analysisResults, patients]);

  // Handle viewing batch result in single analysis view
  const handleViewBatchResult = (result) => {
    setAnalysisResults(result);
    if (result?.pdgm_data) {
      setPdgmData(result.pdgm_data);
    }
    setActiveTab("single");
  };

  // Handle batch results for comparison
  const handleBatchComplete = (results) => {
    const successfulResults = results.filter(r => r.status === 'success' && r.pdgm_data);
    setSavedBatchResults(prev => [...prev, ...successfulResults]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
      setAnalysisResults(null);
      setAnalysisId(null);
      setSavedToPatient(false);
      setUploadedFileUrl(null);
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  };

  // Save OASIS to patient record
  const handleSaveToPatient = async () => {
    if (!analysisResults || !uploadedFileUrl) return;
    
    setIsSaving(true);
    try {
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      
      await saveOASISMutation.mutateAsync({
        patient_id: selectedPatientId || null,
        patient_name: selectedPatient 
          ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
          : patientName,
        file_url: uploadedFileUrl,
        file_name: file?.name || 'OASIS Document',
        assessment_date: analysisResults.pdgm_data?.patient_info?.assessment_date || new Date().toISOString().split('T')[0],
        assessment_type: analysisResults.pdgm_data?.patient_info?.assessment_type || 'Other',
        analysis_id: analysisId,
        pdgm_data: pdgmData,
        analysis_results: analysisResults,
        scores: {
          overall: analysisResults.overall_score,
          accuracy: analysisResults.accuracy_score,
          compliance: analysisResults.compliance_score,
          revenue_optimization: analysisResults.revenue_optimization_score
        },
        estimated_payment: originalPayment,
        status: 'analyzed'
      });
    } catch (err) {
      console.error("Error saving OASIS:", err);
      setError("Failed to save OASIS to patient record.");
    }
    setIsSaving(false);
  };

  // Load saved OASIS for viewing
  const handleLoadSavedOASIS = (oasisUpload) => {
    setAnalysisResults(oasisUpload.analysis_results);
    setPdgmData(oasisUpload.pdgm_data);
    setAnalysisId(oasisUpload.analysis_id);
    setPatientName(oasisUpload.patient_name);
    setSelectedPatientId(oasisUpload.patient_id || '');
    setOriginalPayment(oasisUpload.estimated_payment);
    setUploadedFileUrl(oasisUpload.file_url);
    setSavedToPatient(true);
    setActiveTab("single");
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFileUrl(file_url);
      setUploadProgress(40);

      // Enhanced extraction schema - comprehensive but flat to avoid API limits
      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            // Patient demographics
            patient_name: { type: "string", description: "Patient full name" },
            patient_dob: { type: "string", description: "Date of birth" },
            patient_gender: { type: "string", description: "M or F" },
            medicare_number: { type: "string", description: "Medicare ID if present" },

            // Assessment info
            assessment_date: { type: "string", description: "M0090 date of assessment" },
            assessment_type: { type: "string", description: "SOC, ROC, Recert, Follow-up, Transfer, Discharge" },
            assessment_reason: { type: "string", description: "M0100 reason for assessment" },

            // Diagnoses - capture all text
            primary_diagnosis_code: { type: "string", description: "M1021 primary ICD-10 code" },
            primary_diagnosis_description: { type: "string", description: "Primary diagnosis name" },
            secondary_diagnoses: { type: "string", description: "All secondary diagnoses codes and names comma separated" },
            comorbidities_text: { type: "string", description: "All comorbidities and conditions mentioned" },

            // Admission source and timing
            m1000_admission_source: { type: "string", description: "M1000 value 1-6 or description" },
            m1005_inpatient_facility: { type: "string", description: "M1005 inpatient facility type" },
            episode_timing: { type: "string", description: "Early (0-29 days) or Late (30+ days)" },

            // Functional status - ADLs
            m1800_grooming: { type: "string", description: "M1800 score 0-3" },
            m1810_dress_upper: { type: "string", description: "M1810 score 0-3" },
            m1820_dress_lower: { type: "string", description: "M1820 score 0-3" },
            m1830_bathing: { type: "string", description: "M1830 score 0-6" },
            m1840_toilet_transfer: { type: "string", description: "M1840 score 0-4" },
            m1850_transferring: { type: "string", description: "M1850 score 0-5" },
            m1860_ambulation: { type: "string", description: "M1860 score 0-6" },

            // GG items if present
            gg0130_self_care: { type: "string", description: "GG0130 self-care score" },
            gg0170_mobility: { type: "string", description: "GG0170 mobility score" },

            // Clinical status
            m1400_dyspnea: { type: "string", description: "M1400 score 0-4" },
            m1242_pain_freq: { type: "string", description: "M1242 pain frequency" },
            m1306_pressure_ulcer: { type: "string", description: "M1306 pressure ulcer present 0-1" },
            m1307_pressure_ulcer_stage: { type: "string", description: "M1307 oldest stage" },
            m1311_pressure_ulcer_count: { type: "string", description: "M1311 number of ulcers" },
            m1322_stasis_ulcer: { type: "string", description: "M1322 stasis ulcer present" },
            m1324_stasis_ulcer_status: { type: "string", description: "M1324 status" },
            m1330_surgical_wound: { type: "string", description: "M1330 surgical wound present" },
            m1340_surgical_wound_status: { type: "string", description: "M1340 status" },

            // Cognitive and behavioral
            m1700_cognitive: { type: "string", description: "M1700 cognitive functioning" },
            m1710_confusion: { type: "string", description: "M1710 when confused" },
            m1720_anxiety: { type: "string", description: "M1720 anxiety level" },
            m1730_depression: { type: "string", description: "M1730 PHQ-2 score" },

            // Therapy needs
            therapy_pt_needed: { type: "string", description: "Physical therapy ordered yes/no" },
            therapy_ot_needed: { type: "string", description: "Occupational therapy ordered yes/no" },
            therapy_slp_needed: { type: "string", description: "Speech therapy ordered yes/no" },

            // Risk factors
            fall_risk_assessment: { type: "string", description: "Fall risk score or level" },
            hospitalization_risk: { type: "string", description: "Hospitalization risk indicators" },

            // Medications
            high_risk_medications: { type: "string", description: "High risk drugs mentioned" },
            medication_count: { type: "string", description: "Number of medications if stated" },

            // Homebound status
            homebound_reason: { type: "string", description: "Reason patient is homebound" },

            // Full text for AI analysis
            clinical_narrative: { type: "string", description: "Any narrative clinical notes or comments" }
          }
        }
      });

      setUploadProgress(50);

      if (extractedData.status === "error") {
        throw new Error(extractedData.details || "Failed to extract data from PDF. Please ensure it's a readable OASIS document.");
      }

      // Build comprehensive OASIS content from enhanced extraction
      const output = extractedData.output;
      let oasisTextContent = "";

      if (output) {
        oasisTextContent = `PATIENT DEMOGRAPHICS:
      Name: ${output.patient_name || 'Unknown'}
      DOB: ${output.patient_dob || '?'}
      Gender: ${output.patient_gender || '?'}
      Medicare #: ${output.medicare_number || 'N/A'}

      ASSESSMENT INFORMATION:
      Date (M0090): ${output.assessment_date || '?'}
      Type: ${output.assessment_type || '?'}
      Reason (M0100): ${output.assessment_reason || '?'}

      DIAGNOSES:
      Primary (M1021): ${output.primary_diagnosis_code || '?'} - ${output.primary_diagnosis_description || 'Not found'}
      Secondary Diagnoses: ${output.secondary_diagnoses || 'None documented'}
      Comorbidities: ${output.comorbidities_text || 'None extracted'}

      ADMISSION/EPISODE:
      M1000 Admission Source: ${output.m1000_admission_source || '?'}
      M1005 Inpatient Facility: ${output.m1005_inpatient_facility || 'N/A'}
      Episode Timing: ${output.episode_timing || 'early'}

      FUNCTIONAL STATUS (ADLs):
      M1800 Grooming: ${output.m1800_grooming || '?'}
      M1810 Upper Body Dressing: ${output.m1810_dress_upper || '?'}
      M1820 Lower Body Dressing: ${output.m1820_dress_lower || '?'}
      M1830 Bathing: ${output.m1830_bathing || '?'}
      M1840 Toilet Transferring: ${output.m1840_toilet_transfer || '?'}
      M1850 Transferring: ${output.m1850_transferring || '?'}
      M1860 Ambulation: ${output.m1860_ambulation || '?'}

      GG FUNCTIONAL ITEMS:
      GG0130 Self-Care: ${output.gg0130_self_care || 'N/A'}
      GG0170 Mobility: ${output.gg0170_mobility || 'N/A'}

      CLINICAL STATUS:
      M1400 Dyspnea: ${output.m1400_dyspnea || '?'}
      M1242 Pain Frequency: ${output.m1242_pain_freq || '?'}

      WOUNDS/SKIN:
      M1306 Pressure Ulcer Present: ${output.m1306_pressure_ulcer || '?'}
      M1307 Pressure Ulcer Stage: ${output.m1307_pressure_ulcer_stage || 'N/A'}
      M1311 Pressure Ulcer Count: ${output.m1311_pressure_ulcer_count || 'N/A'}
      M1322 Stasis Ulcer: ${output.m1322_stasis_ulcer || '?'}
      M1324 Stasis Ulcer Status: ${output.m1324_stasis_ulcer_status || 'N/A'}
      M1330 Surgical Wound: ${output.m1330_surgical_wound || '?'}
      M1340 Surgical Wound Status: ${output.m1340_surgical_wound_status || 'N/A'}

      COGNITIVE/BEHAVIORAL:
      M1700 Cognitive Functioning: ${output.m1700_cognitive || '?'}
      M1710 When Confused: ${output.m1710_confusion || '?'}
      M1720 Anxiety Level: ${output.m1720_anxiety || '?'}
      M1730 Depression (PHQ-2): ${output.m1730_depression || '?'}

      THERAPY SERVICES:
      PT Ordered: ${output.therapy_pt_needed || '?'}
      OT Ordered: ${output.therapy_ot_needed || '?'}
      SLP Ordered: ${output.therapy_slp_needed || '?'}

      RISK FACTORS:
      Fall Risk: ${output.fall_risk_assessment || '?'}
      Hospitalization Risk: ${output.hospitalization_risk || '?'}
      High-Risk Medications: ${output.high_risk_medications || 'None noted'}
      Medication Count: ${output.medication_count || '?'}

      HOMEBOUND STATUS:
      Reason: ${output.homebound_reason || 'Not documented'}

      CLINICAL NARRATIVE:
      ${output.clinical_narrative || 'No narrative extracted'}`;
      }

      if (!oasisTextContent || oasisTextContent.trim().length < 20) {
        // Fallback to raw output
        oasisTextContent = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
      }

      console.log("Extracted OASIS content length:", oasisTextContent.length);
      
      // Parse scores helper
      const parseScore = (val) => {
        if (!val) return 0;
        const num = parseInt(String(val).replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // Determine admission source with improved detection
      let admissionSource = 'community';
      const m1000 = String(output?.m1000_admission_source || '').toLowerCase();
      const m1005 = String(output?.m1005_inpatient_facility || '').toLowerCase();
      if (m1000.includes('2') || m1000.includes('hospital') || m1000.includes('3') || m1000.includes('snf') || 
          m1000.includes('4') || m1000.includes('institutional') || m1000.includes('inpatient') ||
          m1005.includes('hospital') || m1005.includes('snf') || m1005.includes('rehab') || m1005.includes('ltch')) {
        admissionSource = 'institutional';
      }

      // Parse comorbidities from extracted text
      const parseComorbidities = (text) => {
        if (!text) return [];
        const items = text.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
        return items.slice(0, 15); // Limit to 15 comorbidities
      };

      // Determine therapy needs
      const checkTherapy = (val) => {
        if (!val) return false;
        const v = val.toLowerCase();
        return v.includes('yes') || v.includes('ordered') || v.includes('true') || v === '1';
      };

      // Build structured PDGM data with enhanced extraction
      const structuredPdgmData = {
        primary_diagnosis: output?.primary_diagnosis_description || output?.primary_diagnosis_code || '',
        primary_diagnosis_code: output?.primary_diagnosis_code || '',
        comorbidities: parseComorbidities(output?.secondary_diagnoses || output?.comorbidities_text),
        admission_source: admissionSource,
        episode_timing: (output?.episode_timing || '').toLowerCase().includes('late') ? 'late' : 'early',
        functional_scores: {
          m1800_grooming: parseScore(output?.m1800_grooming),
          m1810_dress_upper: parseScore(output?.m1810_dress_upper),
          m1820_dress_lower: parseScore(output?.m1820_dress_lower),
          m1830_bathing: parseScore(output?.m1830_bathing),
          m1840_toilet_transfer: parseScore(output?.m1840_toilet_transfer),
          m1850_transferring: parseScore(output?.m1850_transferring),
          m1860_ambulation: parseScore(output?.m1860_ambulation)
        },
        gg_scores: { 
          self_care: output?.gg0130_self_care || null, 
          mobility: output?.gg0170_mobility || null 
        },
        clinical_items: {
          dyspnea: parseScore(output?.m1400_dyspnea),
          pain_frequency: parseScore(output?.m1242_pain_freq),
          pressure_ulcer_present: output?.m1306_pressure_ulcer === '1' || String(output?.m1306_pressure_ulcer).toLowerCase().includes('yes'),
          pressure_ulcer_stage: output?.m1307_pressure_ulcer_stage || null,
          pressure_ulcer_count: parseScore(output?.m1311_pressure_ulcer_count),
          stasis_ulcer: output?.m1322_stasis_ulcer === '1' || String(output?.m1322_stasis_ulcer).toLowerCase().includes('yes'),
          surgical_wound: output?.m1330_surgical_wound === '1' || String(output?.m1330_surgical_wound).toLowerCase().includes('yes'),
          surgical_wound_status: output?.m1340_surgical_wound_status || null
        },
        cognitive_status: {
          cognitive_functioning: output?.m1700_cognitive || null,
          confusion: output?.m1710_confusion || null,
          anxiety: output?.m1720_anxiety || null,
          depression_phq2: output?.m1730_depression || null
        },
        therapy_services: { 
          pt: checkTherapy(output?.therapy_pt_needed), 
          ot: checkTherapy(output?.therapy_ot_needed), 
          slp: checkTherapy(output?.therapy_slp_needed) 
        },
        risk_factors: {
          fall_risk: output?.fall_risk_assessment || null,
          hospitalization_risk: output?.hospitalization_risk || null,
          high_risk_medications: output?.high_risk_medications || null,
          medication_count: parseScore(output?.medication_count)
        },
        homebound_reason: output?.homebound_reason || null,
        patient_info: { 
          name: output?.patient_name, 
          dob: output?.patient_dob,
          gender: output?.patient_gender,
          medicare_number: output?.medicare_number,
          assessment_date: output?.assessment_date, 
          assessment_type: output?.assessment_type,
          assessment_reason: output?.assessment_reason
        }
      };

      // Increase content limit for better analysis
      const maxContentLength = 15000;
      const truncatedContent = oasisTextContent.length > maxContentLength 
        ? oasisTextContent.substring(0, maxContentLength) + "\n[content truncated for processing]"
        : oasisTextContent;

      setIsUploading(false);
      setIsAnalyzing(true);

      // Combined analysis with pre-extracted structured data
      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert OASIS-E auditor and PDGM revenue specialist. Analyze this OASIS assessment document thoroughly and provide HIGHLY SPECIFIC, ACTIONABLE recommendations.

      PRE-EXTRACTED STRUCTURED DATA:
      ${JSON.stringify(structuredPdgmData, null, 2)}

      FULL OASIS DOCUMENT CONTENT:
      ${truncatedContent}

      ANALYSIS INSTRUCTIONS:
      1. Verify the pre-extracted data against the full document content
      2. Identify any missing or incorrectly extracted OASIS items
      3. Check for internal consistency (e.g., functional scores should match narrative descriptions)
      4. Identify PDGM revenue optimization opportunities with SPECIFIC dollar impacts
      5. Flag compliance concerns and audit risks
      6. Provide EXACT wording suggestions for documentation improvements
      7. Identify SPECIFIC M-items that could be rescored based on clinical evidence

      CRITICAL: Be extremely specific in your recommendations. Instead of "improve functional documentation", say exactly WHAT to document and HOW it would change the score.

      Return JSON:
      {
      "overall_score": 0-100,
      "accuracy_score": 0-100,
      "compliance_score": 0-100,
      "revenue_optimization_score": 0-100,
      "summary": "comprehensive summary of findings",
      "pdgm_data": {
      "primary_diagnosis": "exact diagnosis from document",
      "primary_diagnosis_code": "ICD-10 code if found",
      "comorbidities": ["all secondary diagnoses found"],
      "admission_source": "community or institutional",
      "episode_timing": "early or late",
      "functional_scores": {
      "m1800_grooming": 0-3,
      "m1810_dress_upper": 0-3,
      "m1820_dress_lower": 0-3,
      "m1830_bathing": 0-6,
      "m1840_toilet_transfer": 0-4,
      "m1850_transferring": 0-5,
      "m1860_ambulation": 0-6
      },
      "gg_scores": {
      "self_care_admission": "score or null",
      "mobility_admission": "score or null"
      }
      },
      "extracted_items": {
      "items_found": ["list of M-items successfully extracted"],
      "items_missing": ["list of expected M-items not found"],
      "extraction_confidence": "high/medium/low"
      },
      "accuracy_issues": [{"item": "M-item code", "issue": "specific issue description", "severity": "high/medium/low", "recommendation": "specific fix", "document_evidence": "quote from document", "correct_score": "what score should be based on evidence", "scoring_rationale": "why this score is correct per CMS guidelines"}],
      "compliance_concerns": [{"area": "area", "issue": "desc", "severity": "high/medium/low", "recommendation": "fix", "cms_reference": "regulation reference", "exact_documentation_needed": "specific text to add"}],
      "revenue_tips": [{"category": "Functional Status/Diagnosis/Therapy/Comorbidity/Other", "current_documentation": "what document shows", "opportunity": "improvement opportunity", "potential_impact": "high/medium/low", "specific_action": "exact action to take", "estimated_revenue_impact": "$X per episode", "clinical_justification": "why this change is clinically appropriate", "example_documentation": "exact example text to support the change"}],
      "documentation_improvements": [{"item": "item", "current_state": "current", "improved_state": "improved", "rationale": "why", "exact_text_to_add": "specific documentation text", "m_item_impact": "which M-items this affects"}],
      "audit_risk_areas": [{"area": "area", "risk_level": "high/medium/low", "explanation": "why", "mitigation": "fix", "documentation_to_add": "specific text that would mitigate risk"}],
      "specific_rescore_opportunities": [{"m_item": "M-item code", "current_score": "current", "recommended_score": "recommended", "clinical_evidence": "evidence from document supporting change", "revenue_impact": "estimated $ impact", "action_required": "what clinician needs to document/verify"}],
      "missing_high_value_documentation": [{"area": "what is missing", "why_it_matters": "PDGM/compliance impact", "suggested_text": "exact documentation to add", "potential_value": "$ impact"}],
      "strengths": ["list of well-documented areas"],
      "key_recommendations": ["top 5 prioritized recommendations with specific actions"],
      "quick_wins": [{"action": "immediate action", "effort": "low/medium", "impact": "$ or compliance benefit", "how_to": "step by step"}],
      "clinician_questions": ["specific questions to ask the assessing clinician to clarify scoring"]
      }`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            accuracy_score: { type: "number" },
            compliance_score: { type: "number" },
            revenue_optimization_score: { type: "number" },
            summary: { type: "string" },
            pdgm_data: { type: "object" },
            extracted_items: { type: "object" },
            accuracy_issues: { type: "array", items: { type: "object" } },
            compliance_concerns: { type: "array", items: { type: "object" } },
            revenue_tips: { type: "array", items: { type: "object" } },
            documentation_improvements: { type: "array", items: { type: "object" } },
            audit_risk_areas: { type: "array", items: { type: "object" } },
            specific_rescore_opportunities: { type: "array", items: { type: "object" } },
            missing_high_value_documentation: { type: "array", items: { type: "object" } },
            strengths: { type: "array", items: { type: "string" } },
            key_recommendations: { type: "array", items: { type: "string" } },
            quick_wins: { type: "array", items: { type: "object" } },
            clinician_questions: { type: "array", items: { type: "string" } }
          }
        }
        });

      setUploadProgress(90);

      // Quick validation pass
      const validationResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate OASIS PDGM data. Check: M-item consistency, diagnosis validity, admission source, episode timing.

Data: ${JSON.stringify(analysisResult.pdgm_data || {})}

Return JSON: {"validation_passed": true/false, "critical_issues": [{"type": "string", "severity": "critical/warning", "item": "item", "description": "desc", "suggested_correction": "fix", "pdgm_impact": "impact"}], "warnings": [], "data_quality_score": 0-100, "pdgm_readiness": {"ready_for_grouping": true/false, "missing_critical_elements": [], "optimization_opportunities": []}, "recommendation": "brief"}`,
        response_json_schema: {
          type: "object",
          properties: {
            validation_passed: { type: "boolean" },
            critical_issues: { type: "array", items: { type: "object" } },
            warnings: { type: "array", items: { type: "string" } },
            data_quality_score: { type: "number" },
            pdgm_readiness: { type: "object" },
            recommendation: { type: "string" }
          }
        }
      });

      // Merge validation results into analysis
      analysisResult.validation_summary = {
        data_quality_score: validationResult?.data_quality_score || 75,
        critical_issues_found: validationResult?.critical_issues?.length || 0,
        warnings_found: validationResult?.warnings?.length || 0,
        issues: validationResult?.critical_issues || [],
        warnings: validationResult?.warnings || [],
        recommendation: validationResult?.recommendation || '',
        pdgm_readiness: validationResult?.pdgm_readiness || null
      };

      setUploadProgress(100);
      setAnalysisResults(analysisResult);
      
      // Use pre-extracted structured data merged with AI analysis for PDGM calculation
      const finalPdgmData = {
        ...structuredPdgmData,
        ...(analysisResult.pdgm_data || {}),
        // Prefer AI-analyzed values if they seem more complete
        primary_diagnosis: analysisResult.pdgm_data?.primary_diagnosis || structuredPdgmData.primary_diagnosis,
        comorbidities: (analysisResult.pdgm_data?.comorbidities?.length > structuredPdgmData.comorbidities?.length) 
          ? analysisResult.pdgm_data.comorbidities 
          : structuredPdgmData.comorbidities,
        functional_scores: {
          ...structuredPdgmData.functional_scores,
          ...(analysisResult.pdgm_data?.functional_scores || {})
        }
      };
      
      // Update the analysis result with merged data
      analysisResult.pdgm_data = finalPdgmData;
      setPdgmData(finalPdgmData);
    } catch (err) {
      console.error("Error analyzing OASIS:", err);
      setError(err.message || "Failed to analyze the OASIS document. Please try again.");
    }

    setIsUploading(false);
    setIsAnalyzing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-100 border-green-300";
    if (score >= 60) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300"
    };
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!analysisResults) return;

    setIsDownloading(true);
    try {
      const response = await generateOASISReportPDF({ analysisResults });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OASIS_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF report. Please try again.");
    }
    setIsDownloading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OASIS Analyzer</h1>
        <p className="text-sm text-gray-600">Upload your OASIS assessment PDF for accuracy checking and revenue optimization tips</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="single" className="gap-2">
            <FileText className="w-4 h-4" />
            Single Document
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <FolderArchive className="w-4 h-4" />
            Batch Analysis
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <History className="w-4 h-4" />
            Saved ({savedOASISUploads.length})
          </TabsTrigger>
        </TabsList>

        {/* Saved OASIS Tab */}
        <TabsContent value="saved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Saved OASIS Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedOASISUploads.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No saved OASIS analyses yet. Upload and analyze a document, then save it to a patient.
                </p>
              ) : (
                <div className="space-y-3">
                  {savedOASISUploads.map((oasis) => (
                    <div 
                      key={oasis.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLoadSavedOASIS(oasis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium">{oasis.patient_name || 'Unknown Patient'}</p>
                            <p className="text-sm text-gray-500">
                              {oasis.assessment_type} - {oasis.assessment_date || 'No date'}
                            </p>
                            <p className="text-xs text-gray-400">{oasis.file_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2">
                            <Badge className={oasis.scores?.overall >= 80 ? 'bg-green-100 text-green-800' : oasis.scores?.overall >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              Score: {oasis.scores?.overall || 'N/A'}%
                            </Badge>
                            {oasis.estimated_payment && (
                              <Badge variant="outline">
                                ${oasis.estimated_payment?.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(oasis.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <BatchOASISAnalyzer onSingleAnalysis={handleViewBatchResult} onBatchComplete={handleBatchComplete} />
        </TabsContent>

        <TabsContent value="single" className="mt-4">
          {/* Upload Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload OASIS Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="oasis-upload"
                />
                <label htmlFor="oasis-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-400">PDF files only</p>
                </label>
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button
                    onClick={handleUploadAndAnalyze}
                    disabled={isUploading || isAnalyzing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUploading || isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUploading ? "Uploading..." : "Analyzing..."}
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Analyze OASIS
                      </>
                    )}
                  </Button>
                </div>
              )}

              {(isUploading || isAnalyzing) && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {isUploading ? "Uploading document..." : "AI is analyzing your OASIS document..."}
                  </p>
                </div>
              )}

              {error && (
                <Alert className="mt-4 bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="space-y-6">
          {/* Save to Patient Card */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Link to Patient Record</p>
                    <p className="text-xs text-gray-500">Save this OASIS analysis for future comparison</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Select value={selectedPatientId || "none"} onValueChange={(v) => setSelectedPatientId(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-white">
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No patient (save standalone)</SelectItem>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveToPatient}
                    disabled={isSaving || savedToPatient || !uploadedFileUrl}
                    className={savedToPatient ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : savedToPatient ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save OASIS</>
                    )}
                  </Button>
                </div>
              </div>
              {patientName && patientName !== "Unknown Patient" && (
                <p className="text-xs text-blue-700 mt-2">
                  Detected patient name from document: <strong>{patientName}</strong>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Auto-Generated Tasks Based on Analysis */}
          <OASISTaskGenerator
            analysisResults={analysisResults}
            pdgmData={pdgmData}
            patientId={selectedPatientId}
            patientName={patientName}
            onTasksCreated={(count) => console.log(`${count} tasks created`)}
          />

          {/* Key Takeaways Summary - Most Important */}
          <KeyTakeawaysSummary analysisResults={analysisResults} revenueData={null} />

          {/* Score Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Analysis Results</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.overall_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Overall Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.overall_score)}`}>
                    {analysisResults.overall_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.accuracy_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Accuracy</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.accuracy_score)}`}>
                    {analysisResults.accuracy_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.compliance_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Compliance</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.compliance_score)}`}>
                    {analysisResults.compliance_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.revenue_optimization_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Revenue Optimization</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.revenue_optimization_score)}`}>
                    {analysisResults.revenue_optimization_score}%
                  </p>
                </div>
              </div>

              {/* Summary */}
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {analysisResults.summary}
                </AlertDescription>
              </Alert>

              {/* Validation Summary */}
              {analysisResults.validation_summary && (
                <div className={`p-4 rounded-lg border-2 mb-4 ${
                  analysisResults.validation_summary.critical_issues_found > 0 
                    ? 'bg-red-50 border-red-300' 
                    : analysisResults.validation_summary.warnings_found > 0
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-green-50 border-green-300'
                }`}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    {analysisResults.validation_summary.critical_issues_found > 0 ? (
                      <><AlertTriangle className="w-4 h-4 text-red-600" /> Data Validation Issues Found</>
                    ) : analysisResults.validation_summary.warnings_found > 0 ? (
                      <><AlertTriangle className="w-4 h-4 text-yellow-600" /> Validation Warnings</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 text-green-600" /> Validation Passed</>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      Quality: {analysisResults.validation_summary.data_quality_score}%
                    </Badge>
                  </h3>
                  {analysisResults.validation_summary.recommendation && (
                    <p className="text-sm text-gray-700 mb-2">{analysisResults.validation_summary.recommendation}</p>
                  )}
                  {/* PDGM Readiness Summary */}
                  {analysisResults.validation_summary.pdgm_readiness && (
                    <div className={`mt-3 p-2 rounded border ${
                      analysisResults.validation_summary.pdgm_readiness.ready_for_grouping 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <p className="text-xs font-semibold mb-1">
                        {analysisResults.validation_summary.pdgm_readiness.ready_for_grouping 
                          ? '✓ Ready for PDGM Grouping' 
                          : '⚠ PDGM Data Issues Detected'}
                      </p>
                      {analysisResults.validation_summary.pdgm_readiness.missing_critical_elements?.length > 0 && (
                        <div className="text-xs text-orange-800">
                          <span className="font-medium">Missing: </span>
                          {analysisResults.validation_summary.pdgm_readiness.missing_critical_elements.join(', ')}
                        </div>
                      )}
                      {analysisResults.validation_summary.pdgm_readiness.optimization_opportunities?.length > 0 && (
                        <div className="text-xs text-blue-700 mt-1">
                          <span className="font-medium">Optimize: </span>
                          {analysisResults.validation_summary.pdgm_readiness.optimization_opportunities.slice(0, 2).join('; ')}
                        </div>
                      )}
                    </div>
                  )}

                  {analysisResults.validation_summary.issues?.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {analysisResults.validation_summary.issues.slice(0, 5).map((issue, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border text-sm">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {issue.type?.replace('_', ' ')}
                            </Badge>
                            {issue.item && <span className="font-mono text-xs bg-gray-100 px-1 rounded">{issue.item}</span>}
                          </div>
                          <p className="text-gray-700">{issue.description}</p>
                          {issue.pdgm_impact && (
                            <p className="text-purple-700 text-xs mt-1">
                              <span className="font-medium">PDGM Impact:</span> {issue.pdgm_impact}
                            </p>
                          )}
                          {issue.suggested_correction && (
                            <p className="text-green-700 text-xs mt-1 bg-green-50 p-1 rounded">
                              <span className="font-medium">Fix:</span> {issue.suggested_correction}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Key Recommendations */}
              {analysisResults.key_recommendations?.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 mb-4">
                  <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Key Recommendations
                  </h3>
                  <ol className="space-y-2">
                    {analysisResults.key_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-indigo-800">
                        <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Strengths */}
              {analysisResults.strengths?.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-1">
                    {analysisResults.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDGM Revenue Analysis */}
          <PDGMRevenueComparison 
            analysisResults={analysisResults} 
            pdgmData={pdgmData}
            onPaymentCalculated={(payment) => setOriginalPayment(payment)}
          />

          {/* Scenario Planning & Action Workflow */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <OASISScenarioManager
              analysisId={analysisId}
              originalPdgmData={pdgmData}
              originalPayment={originalPayment || 0}
              patientName={patientName}
              onCreateActions={(scenarios) => {
                // Trigger action creation from scenarios
                console.log("Creating actions from scenarios:", scenarios);
              }}
            />
            <OASISActionWorkflow
              analysisId={analysisId}
              analysisResults={analysisResults}
              pdgmData={pdgmData}
              originalPayment={originalPayment || 0}
              patientName={patientName}
            />
          </div>

          {/* Smart Note Data Import - Bi-directional sync */}
          <SmartNoteDataImport
            patientId={selectedPatientId}
            patientName={patientName}
            onImportData={(importData) => {
              // Apply imported functional observations to PDGM data for comparison
              if (importData.functionalObservations && pdgmData) {
                const obs = importData.functionalObservations;
                const updatedScores = { ...pdgmData.functional_scores };
                if (obs.ambulation?.score !== undefined) {
                  updatedScores.m1860_ambulation = obs.ambulation.score;
                }
                if (obs.transfer?.score !== undefined) {
                  updatedScores.m1850_transferring = obs.transfer.score;
                }
                if (obs.bathing?.score !== undefined) {
                  updatedScores.m1830_bathing = obs.bathing.score;
                }
                setPdgmData(prev => ({
                  ...prev,
                  functional_scores: updatedScores,
                  _importedFromVisit: importData.visitDate
                }));
              }
            }}
          />

          {/* Multi-Report Comparison */}
          <EnhancedMultiReportComparison
            savedReports={savedBatchResults}
            currentReport={analysisResults}
            currentPdgmData={pdgmData}
          />

          {/* AI Documentation Quality Analyzer - Full Width */}
          <AIDocumentationQualityAnalyzer analysisResults={analysisResults} pdgmData={pdgmData} />

          {/* AI-Enhanced Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audit Risk Predictor */}
            <AuditRiskPredictor analysisResults={analysisResults} />
            
            {/* Documentation Quality Suggestions */}
            <DocumentationQualitySuggestions analysisResults={analysisResults} />
          </div>

          {/* Detailed Analysis Accordion */}
          <Accordion type="multiple" className="space-y-2">
            {/* Accuracy Issues */}
            {analysisResults.accuracy_issues?.length > 0 && (
              <AccordionItem value="accuracy" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>Accuracy Issues ({analysisResults.accuracy_issues.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.accuracy_issues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="font-mono">{issue.item}</Badge>
                          <Badge className={getSeverityBadge(issue.severity)}>{issue.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{issue.issue}</p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
                          <p className="text-sm text-green-700">{issue.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Compliance Concerns */}
            {analysisResults.compliance_concerns?.length > 0 && (
              <AccordionItem value="compliance" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Compliance Concerns ({analysisResults.compliance_concerns.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.compliance_concerns.map((concern, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-red-900">{concern.area}</span>
                          <Badge className={getSeverityBadge(concern.severity)}>{concern.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{concern.issue}</p>
                        {concern.cms_reference && (
                          <p className="text-xs text-gray-500 mb-2">CMS Reference: {concern.cms_reference}</p>
                        )}
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
                          <p className="text-sm text-green-700">{concern.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Revenue Tips */}
            {analysisResults.revenue_tips?.length > 0 && (
              <AccordionItem value="revenue" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>Revenue Optimization Tips ({analysisResults.revenue_tips.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.revenue_tips.map((tip, idx) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="bg-white">{tip.category}</Badge>
                          <Badge className={`${tip.potential_impact === 'high' ? 'bg-green-600' : tip.potential_impact === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'} text-white`}>
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {tip.potential_impact} impact
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Current Documentation:</p>
                            <p className="text-gray-700">{tip.current_documentation}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Opportunity:</p>
                            <p className="text-green-700">{tip.opportunity}</p>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3 text-yellow-500" />
                              Specific Action:
                            </p>
                            <p className="text-green-800 font-medium">{tip.specific_action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Audit Risk Areas */}
            {analysisResults.audit_risk_areas?.length > 0 && (
              <AccordionItem value="audit" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Audit Risk Areas ({analysisResults.audit_risk_areas.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.audit_risk_areas.map((risk, idx) => (
                      <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-orange-900">{risk.area}</span>
                          <Badge className={getSeverityBadge(risk.risk_level)}>{risk.risk_level} risk</Badge>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{risk.explanation}</p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Mitigation:</p>
                          <p className="text-sm text-green-700">{risk.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Documentation Improvements */}
            {analysisResults.documentation_improvements?.length > 0 && (
              <AccordionItem value="improvements" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span>Documentation Improvements ({analysisResults.documentation_improvements.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.documentation_improvements.map((imp, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-blue-900">{imp.item}</p>
                          {imp.m_item_impact && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              Affects: {imp.m_item_impact}
                            </Badge>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-red-50 p-2 rounded border border-red-200">
                            <p className="text-xs text-red-600 mb-1">Current:</p>
                            <p className="text-sm text-red-800">{imp.current_state}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <p className="text-xs text-green-600 mb-1">Improved:</p>
                            <p className="text-sm text-green-800">{imp.improved_state}</p>
                          </div>
                        </div>
                        {imp.exact_text_to_add && (
                          <div className="mt-2 p-2 bg-white rounded border border-blue-300">
                            <p className="text-xs text-blue-600 mb-1 font-medium">📝 Exact Text to Add:</p>
                            <p className="text-sm text-blue-900 italic">"{imp.exact_text_to_add}"</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-2 italic">{imp.rationale}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Specific Rescore Opportunities */}
            {analysisResults.specific_rescore_opportunities?.length > 0 && (
              <AccordionItem value="rescore" className="border rounded-lg border-green-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-green-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">Rescore Opportunities ({analysisResults.specific_rescore_opportunities.length})</span>
                    <Badge className="bg-green-600 text-white ml-2">💰 Revenue Impact</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.specific_rescore_opportunities.map((opp, idx) => (
                      <div key={idx} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-green-700 text-white font-mono">{opp.m_item}</Badge>
                          {opp.revenue_impact && (
                            <Badge className="bg-emerald-600 text-white">{opp.revenue_impact}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-red-100 p-2 rounded text-center">
                            <p className="text-xs text-red-600">Current Score</p>
                            <p className="text-xl font-bold text-red-800">{opp.current_score}</p>
                          </div>
                          <div className="bg-green-100 p-2 rounded text-center">
                            <p className="text-xs text-green-600">Recommended Score</p>
                            <p className="text-xl font-bold text-green-800">{opp.recommended_score}</p>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border mb-2">
                          <p className="text-xs text-gray-500 mb-1">Clinical Evidence:</p>
                          <p className="text-sm text-gray-800">{opp.clinical_evidence}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs text-blue-600 mb-1 font-medium">✅ Action Required:</p>
                          <p className="text-sm text-blue-900">{opp.action_required}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Missing High-Value Documentation */}
            {analysisResults.missing_high_value_documentation?.length > 0 && (
              <AccordionItem value="missing-docs" className="border rounded-lg border-amber-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-amber-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">Missing High-Value Documentation ({analysisResults.missing_high_value_documentation.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.missing_high_value_documentation.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-300">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-amber-900">{doc.area}</p>
                          {doc.potential_value && (
                            <Badge className="bg-amber-600 text-white">{doc.potential_value}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{doc.why_it_matters}</p>
                        {doc.suggested_text && (
                          <div className="bg-white p-2 rounded border border-amber-200">
                            <p className="text-xs text-amber-600 mb-1 font-medium">📝 Suggested Documentation:</p>
                            <p className="text-sm text-gray-800 italic">"{doc.suggested_text}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Quick Wins */}
            {analysisResults.quick_wins?.length > 0 && (
              <AccordionItem value="quick-wins" className="border rounded-lg border-purple-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-purple-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-800">Quick Wins ({analysisResults.quick_wins.length})</span>
                    <Badge className="bg-purple-600 text-white ml-2">Easy Improvements</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.quick_wins.map((win, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-purple-900">{win.action}</p>
                          <div className="flex gap-2">
                            <Badge className={win.effort === 'low' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {win.effort} effort
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-green-700 mb-2">💰 Impact: {win.impact}</p>
                        {win.how_to && (
                          <div className="bg-white p-2 rounded border">
                            <p className="text-xs text-purple-600 mb-1 font-medium">How to do it:</p>
                            <p className="text-sm text-gray-800">{win.how_to}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Clinician Questions */}
            {analysisResults.clinician_questions?.length > 0 && (
              <AccordionItem value="questions" className="border rounded-lg border-indigo-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-indigo-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span className="text-indigo-800">Questions for Clinician ({analysisResults.clinician_questions.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-3">Ask the assessing clinician these questions to clarify scoring:</p>
                    <ol className="space-y-2">
                      {analysisResults.clinician_questions.map((question, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900">
                          <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                            {idx + 1}
                          </span>
                          {question}
                        </li>
                      ))}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            </Accordion>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}