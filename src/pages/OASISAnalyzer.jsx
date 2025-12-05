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

      // Enhanced multi-pass extraction for OASIS PDFs (handles text-based, scanned, and image PDFs)
      // First pass: Extract comprehensive structured OASIS data
      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            patient_info: {
              type: "object",
              description: "PATIENT DEMOGRAPHICS - Search headers, first page, top sections. Look for labels: 'Patient Name', 'Name:', 'DOB', 'Date of Birth', 'MRN', 'Medical Record #', 'Medicare #', 'HIC#', 'MBI'. Also check for M0010-M0090 section.",
              properties: {
                name: { type: "string", description: "Patient full name - look for 'Patient:', 'Name:', first/last name fields" },
                dob: { type: "string", description: "Date of birth - any format (MM/DD/YYYY, YYYY-MM-DD, etc)" },
                gender: { type: "string", description: "M/F/Male/Female" },
                medicare_number: { type: "string", description: "Medicare Beneficiary Identifier (MBI) 11 chars or HICN - look for 'Medicare #', 'MBI', 'HIC'" },
                medicaid_number: { type: "string", description: "Medicaid ID if present" },
                medical_record_number: { type: "string", description: "MRN, Chart #, Patient ID, Account #" },
                ssn_last4: { type: "string", description: "Last 4 of SSN if visible" },
                address: { type: "string", description: "Full patient address including city, state, zip" },
                phone: { type: "string", description: "Patient phone - home or cell" },
                emergency_contact: { type: "string", description: "Emergency contact name and relationship" },
                emergency_phone: { type: "string", description: "Emergency contact phone" },
                soc_date: { type: "string", description: "M0030 Start of Care date" },
                assessment_date: { type: "string", description: "M0090 Date assessment completed" },
                assessment_reason: { type: "string", description: "M0100 Reason for assessment: 01=SOC, 03=ROC, 04=Recert, 05=Other follow-up, 06=Transfer, 07=Death, 08=Discharge, 09=Discharge from agency" },
                assessment_type: { type: "string", description: "Type: SOC, ROC, Recertification, Follow-up, Transfer, Discharge" },
                info_completed_date: { type: "string", description: "M0104 Date info completed" },
                discharge_date: { type: "string", description: "M0906 Discharge/transfer/death date" },
                agency_name: { type: "string", description: "Home health agency name" },
                agency_npi: { type: "string", description: "Agency NPI number" },
                branch_id: { type: "string", description: "Branch/location ID" },
                physician_name: { type: "string", description: "Attending/certifying physician name" },
                physician_npi: { type: "string", description: "Physician NPI" }
              }
            },
            primary_diagnosis: {
              type: "object",
              description: "M1021 PRIMARY DIAGNOSIS - CRITICAL FOR PDGM GROUPING. Search for: 'M1021', 'Primary Diagnosis', 'Principal Diagnosis', 'Admitting Diagnosis', 'Primary DX'. The ICD-10-CM code format is: 1 letter + 2 digits + optional decimal + up to 4 more digits (e.g., I50.9, J44.1, E11.65, M79.3, S72.001A). Extract BOTH the code AND description.",
              properties: {
                icd10_code: { type: "string", description: "ICD-10-CM code exactly as written - format: A00.000 or A00 (e.g., I50.9, J44.1, M79.3, E11.65)" },
                description: { type: "string", description: "Full diagnosis text/description that accompanies the code" },
                symptom_control_rating: { type: "string", description: "V-code symptom control rating 0-4 (0=asymptomatic, 4=symptoms poorly controlled)" },
                date_of_onset: { type: "string", description: "Date diagnosis began/was diagnosed" },
                raw_text: { type: "string", description: "Copy the EXACT text as it appears in the M1021 field/section verbatim" }
              }
            },
            all_diagnoses_raw: {
              type: "string",
              description: "VERBATIM COPY of ALL diagnosis-related text found anywhere in document. Include: M1021, M1023 (a-f), problem lists, diagnosis lists, ICD-10 codes, comorbidities, PMH (past medical history), active conditions, chronic conditions, resolved conditions. Copy entire sections if needed."
            },
            other_diagnoses: {
              type: "array",
              description: "M1023 OTHER DIAGNOSES - Extract ALL secondary/comorbid diagnoses positions b through f (up to 5 additional). Include ICD-10 codes for: comorbidities, V/E/W/X/Y external cause codes, Z-codes for status/history.",
              items: {
                type: "object",
                properties: {
                  position: { type: "string", description: "Position letter: b, c, d, e, or f" },
                  icd10_code: { type: "string", description: "ICD-10 code (e.g., E11.9, I10, J44.9)" },
                  description: { type: "string", description: "Diagnosis description/name" },
                  symptom_control_rating: { type: "string", description: "V-code rating 0-4" },
                  date_of_onset: { type: "string" }
                }
              }
            },
            functional_status: {
              type: "object",
              description: "M1800-M1860 ADL/IADL FUNCTIONAL STATUS - Extract the NUMERIC score values (0,1,2,3,4,5,6). Look for checkboxes, circled numbers, highlighted selections, or dropdown values. These directly impact PDGM payment.",
              properties: {
                m1800_grooming: { type: "string", description: "M1800 Grooming: 0=Able independently, 1=Able with setup only, 2=Someone must assist, 3=Dependent" },
                m1810_dress_upper: { type: "string", description: "M1810 Upper Body Dressing: 0=Independent, 1=Setup help, 2=Someone assists, 3=Dependent" },
                m1820_dress_lower: { type: "string", description: "M1820 Lower Body Dressing: 0=Independent, 1=Setup help, 2=Someone assists, 3=Dependent" },
                m1830_bathing: { type: "string", description: "M1830 Bathing: 0=Independent, 1=With help setting up, 2=Partial bathing, 3=Only sponge bath, 4=Unable participate, 5=Unable total assist, 6=Unable to bathe" },
                m1840_toilet_transfer: { type: "string", description: "M1840 Toilet Transferring: 0=Independent, 1=Supervision only, 2=Human assist, 3=Human assist required, 4=Unable" },
                m1850_transferring: { type: "string", description: "M1850 Transferring: 0=Independent, 1=Supervision, 2=Minimal assist, 3=Moderate assist, 4=Maximal assist, 5=Dependent" },
                m1860_ambulation: { type: "string", description: "M1860 Ambulation: 0=Independent, 1=Device only, 2=Supervision, 3=Limited assist, 4=Moderate assist, 5=Maximal assist, 6=Bedfast" },
                m1033_risk_hosp: { type: "string", description: "M1033 Risk for Hospitalization - list ALL checked items" },
                m1034_overall_status: { type: "string", description: "M1034 Overall status compared to 30 days ago" },
                m1900_prior_functioning: { type: "string", description: "M1900 Prior functioning ADL" },
                m1910_fall_risk: { type: "string", description: "M1910 Multi-factor fall risk assessment" }
              }
            },
            gg_functional_abilities: {
              type: "object",
              description: "SECTION GG - CRITICAL FOR PDGM. Score scale: 06=Independent, 05=Setup/cleanup, 04=Supervision/touching, 03=Partial/moderate, 02=Substantial/maximal, 01=Dependent. Also: 07=Refused, 09=Not applicable, 88=Not attempted due to safety, ^=Not attempted condition. Column A=Admission is MOST IMPORTANT.",
              properties: {
                gg0130_self_care: {
                  type: "object",
                  description: "GG0130 Self-Care section - prioritize Column A (SOC/ROC Admission) scores",
                  properties: {
                    eating_admission: { type: "string", description: "GG0130A Eating - SOC/ROC admission score" },
                    eating_discharge_goal: { type: "string", description: "GG0130B Eating - Discharge goal" },
                    eating_discharge: { type: "string", description: "GG0130C Eating - Discharge score" },
                    oral_hygiene_admission: { type: "string", description: "GG0130A Oral hygiene admission" },
                    oral_hygiene_discharge: { type: "string", description: "GG0130C Oral hygiene discharge" },
                    toileting_hygiene_admission: { type: "string", description: "GG0130A Toileting hygiene admission" },
                    toileting_hygiene_discharge: { type: "string", description: "GG0130C Toileting hygiene discharge" },
                    shower_bathe_self_admission: { type: "string", description: "GG0130A Shower/bathe self admission" },
                    shower_bathe_self_discharge: { type: "string", description: "GG0130C Shower/bathe self discharge" },
                    upper_body_dressing_admission: { type: "string", description: "GG0130A Upper body dressing admission" },
                    upper_body_dressing_discharge: { type: "string", description: "GG0130C Upper body dressing discharge" },
                    lower_body_dressing_admission: { type: "string", description: "GG0130A Lower body dressing admission" },
                    lower_body_dressing_discharge: { type: "string", description: "GG0130C Lower body dressing discharge" },
                    putting_on_footwear_admission: { type: "string", description: "GG0130A Putting on/taking off footwear admission" },
                    putting_on_footwear_discharge: { type: "string", description: "GG0130C Putting on/taking off footwear discharge" }
                  }
                },
                gg0170_mobility: {
                  type: "object",
                  description: "GG0170 Mobility section - prioritize Column A (SOC/ROC Admission) scores",
                  properties: {
                    roll_left_right_admission: { type: "string", description: "GG0170A Roll left/right admission" },
                    sit_to_lying_admission: { type: "string", description: "GG0170A Sit to lying admission" },
                    lying_to_sitting_admission: { type: "string", description: "GG0170A Lying to sitting on side of bed admission" },
                    sit_to_stand_admission: { type: "string", description: "GG0170A Sit to stand admission" },
                    chair_bed_transfer_admission: { type: "string", description: "GG0170A Chair/bed-to-chair transfer admission" },
                    toilet_transfer_admission: { type: "string", description: "GG0170A Toilet transfer admission" },
                    car_transfer_admission: { type: "string", description: "GG0170A Car transfer admission" },
                    walk_10_feet_admission: { type: "string", description: "GG0170A Walk 10 feet admission" },
                    walk_50_feet_2_turns_admission: { type: "string", description: "GG0170A Walk 50 feet with 2 turns admission" },
                    walk_150_feet_admission: { type: "string", description: "GG0170A Walk 150 feet admission" },
                    walk_10_feet_uneven_admission: { type: "string", description: "GG0170A Walk 10 feet on uneven surfaces admission" },
                    step_curb_admission: { type: "string", description: "GG0170A 1 step/curb admission" },
                    four_steps_admission: { type: "string", description: "GG0170A 4 steps admission" },
                    twelve_steps_admission: { type: "string", description: "GG0170A 12 steps admission" },
                    picking_up_object_admission: { type: "string", description: "GG0170A Picking up object admission" },
                    wheel_50_feet_admission: { type: "string", description: "GG0170A Wheel 50 feet with 2 turns admission" },
                    wheel_150_feet_admission: { type: "string", description: "GG0170A Wheel 150 feet admission" }
                  }
                }
              }
            },
            clinical_items: {
              type: "object",
              description: "CLINICAL STATUS ITEMS - Extract numeric values and descriptive text for clinical conditions",
              properties: {
                m1033_risk_hospitalization: { type: "string", description: "M1033 Risk for hospitalization - list ALL checked: history falls, unintentional weight loss, multiple hospitalizations, mental disorders, etc." },
                m1400_dyspnea: { type: "string", description: "M1400 Dyspnea: 0=Never, 1=Walking >20ft, 2=Moderate exertion, 3=Minimal exertion, 4=At rest" },
                m1242_pain_freq: { type: "string", description: "M1242 Pain frequency: 0=No pain, 1=Less than daily, 2=Daily but not constant, 3=Constant, 4=Severe constant" },
                m1240_pain_assessment: { type: "string", description: "M1240 Pain assessment conducted: 0=No, 1=Yes" },
                m1302_risk_pressure_ulcer: { type: "string", description: "M1302 Pressure ulcer risk assessment: 0=No, 1=Yes" },
                m1306_pressure_ulcer_present: { type: "string", description: "M1306 Unhealed pressure ulcer at Stage 2+: 0=No, 1=Yes" },
                m1307_oldest_pressure_ulcer: { type: "string", description: "M1307 Oldest Stage 2+ pressure ulcer stage: 1=Stage 2, 2=Stage 3, 3=Stage 4, 4=Unstageable non-removable, 5=Unstageable deep tissue" },
                m1311_pressure_ulcer_count: { type: "string", description: "M1311 Number of pressure ulcers at each stage (Stage 2/3/4/Unstageable)" },
                m1322_pressure_ulcer_stage: { type: "string", description: "M1322 Current number of Stage 1 pressure ulcers" },
                m1324_stage2_pressure_ulcer: { type: "string", description: "M1324 Stage 2 pressure ulcer status" },
                m1330_stasis_ulcer: { type: "string", description: "M1330 Stasis ulcer present: 0=No, 1=Yes" },
                m1332_stasis_ulcer_count: { type: "string", description: "M1332 Number of stasis ulcers" },
                m1334_stasis_ulcer_status: { type: "string", description: "M1334 Stasis ulcer status: 1=Fully granulating, 2=Early/partial, 3=Not healing" },
                m1340_surgical_wound: { type: "string", description: "M1340 Surgical wound present: 0=No, 1=Yes" },
                m1342_surgical_wound_status: { type: "string", description: "M1342 Surgical wound status: 1=Fully granulating, 2=Early/partial, 3=Not healing" },
                m1400_sob: { type: "string", description: "M1400 When short of breath (duplicate field for dyspnea)" },
                m1610_urinary_incontinence: { type: "string", description: "M1610 Urinary incontinence frequency: 0-4 scale" },
                m1615_urinary_when: { type: "string", description: "M1615 When urinary incontinence occurs" },
                m1620_bowel_incontinence: { type: "string", description: "M1620 Bowel incontinence frequency: 0-5 scale" },
                m1630_ostomy: { type: "string", description: "M1630 Ostomy for bowel elimination: 0=No, 1=Yes, 2=Not applicable" },
                m2310_ecg_monitoring: { type: "string", description: "M2310 ECG monitoring (if applicable)" }
              }
            },
            medications: {
              type: "object",
              description: "MEDICATION MANAGEMENT - Extract drug regimen review status, intervention needs, and medication lists",
              properties: {
                m2001_drug_regimen_review: { type: "string", description: "M2001 Drug regimen review conducted: 0=No, 1=Yes" },
                m2003_med_followup: { type: "string", description: "M2003 Medication follow-up: 0=No, 1=Yes" },
                m2005_med_intervention: { type: "string", description: "M2005 Medication intervention required: 0=No, 1=Yes" },
                m2010_high_risk_drugs: { type: "string", description: "M2010 Patient taking any high-risk drugs: 0=No, 1=Yes" },
                m2015_high_risk_drug_classes: { type: "string", description: "M2015 High-risk drug classes (anticoagulants, antiplatelets, hypoglycemics, opioids)" },
                m2020_oral_med_mgmt: { type: "string", description: "M2020 Oral medication management: 0=Independent, 1=Setup help, 2=Assist, 3=Dependent" },
                m2030_injectable_med_mgmt: { type: "string", description: "M2030 Injectable medication management: 0=Independent, 1=Assist, 2=Dependent, NA=Not applicable" },
                m2040_prior_med_mgmt: { type: "string", description: "M2040 Prior medication management" },
                total_medications: { type: "string", description: "Total number of medications if listed" },
                medication_list_raw: { type: "string", description: "VERBATIM copy of ALL medications found - include drug names, doses, frequencies, routes" }
              }
            },
            admission_info: {
              type: "object",
              description: "ADMISSION SOURCE AND TIMING - CRITICAL FOR PDGM PAYMENT CALCULATION",
              properties: {
                m1000_from_where_admitted: { type: "string", description: "M1000 From where admitted: 1=Community (no inpatient stay in 14 days), 2=Short-term acute hospital, 3=Long-term hospital, 4=Skilled nursing facility, 5=Skilled nursing transition, 6=Psychiatric hospital, 7=Other" },
                m1005_inpatient_discharge_date: { type: "string", description: "M1005 Inpatient facility discharge date (if admitted from facility)" },
                m1010_14_day_inpatient: { type: "string", description: "M1010 Inpatient stay within 14 days prior to home health" },
                admission_source_category: { type: "string", description: "DETERMINE: 'community' if M1000=1,5,6,7 OR 'institutional' if M1000=2,3,4" },
                episode_timing: { type: "string", description: "DETERMINE: 'early' if days 1-30 of episode OR 'late' if days 31-60" },
                m0110_episode_timing: { type: "string", description: "M0110 Episode timing code: 1=Early, 2=Late, UK=Unknown" },
                m0102_soc_roc_date: { type: "string", description: "M0102 Date of SOC/Resumption of Care" },
                episode_number: { type: "string", description: "Episode number (1st, 2nd, etc.)" },
                certification_period: { type: "string", description: "Certification period dates" },
                lupa_risk: { type: "string", description: "Any LUPA (Low Utilization Payment Adjustment) risk indicators" },
                referral_source: { type: "string", description: "Referring physician, hospital, or facility name" },
                referral_date: { type: "string", description: "Date of referral" }
              }
            },
            therapy_need: {
              type: "object",
              description: "THERAPY SERVICES - Physical therapy, occupational therapy, speech-language pathology",
              properties: {
                m2200_therapy_need: { type: "string", description: "M2200 Therapy need: 0=None, 1=PT only, 2=OT only, 3=PT and OT, 4=SLP only, etc." },
                pt_ordered: { type: "boolean", description: "Physical therapy ordered (true/false)" },
                pt_visits_planned: { type: "string", description: "Number of PT visits planned per week or total" },
                pt_frequency: { type: "string", description: "PT frequency (e.g., 2x/week for 4 weeks)" },
                ot_ordered: { type: "boolean", description: "Occupational therapy ordered (true/false)" },
                ot_visits_planned: { type: "string", description: "Number of OT visits planned" },
                ot_frequency: { type: "string", description: "OT frequency" },
                slp_ordered: { type: "boolean", description: "Speech-language pathology ordered (true/false)" },
                slp_visits_planned: { type: "string", description: "Number of SLP visits planned" },
                slp_frequency: { type: "string", description: "SLP frequency" },
                msw_ordered: { type: "boolean", description: "Medical social worker ordered (true/false)" },
                msw_visits_planned: { type: "string", description: "Number of MSW visits" },
                hha_ordered: { type: "boolean", description: "Home health aide ordered (true/false)" },
                hha_visits_planned: { type: "string", description: "Number of HHA visits" },
                sn_ordered: { type: "boolean", description: "Skilled nursing ordered (true/false)" },
                sn_visits_planned: { type: "string", description: "Number of SN visits planned" },
                sn_frequency: { type: "string", description: "SN frequency" },
                total_visits_60day: { type: "string", description: "Total visits planned for 60-day period" }
              }
            },
            cognitive_status: {
              type: "object",
              description: "COGNITIVE, BEHAVIORAL, AND MENTAL STATUS - Depression screening, cognitive function, behavior",
              properties: {
                m1700_cognitive: { type: "string", description: "M1700 Cognitive functioning: 0=Alert/oriented, 1=Requires prompting, 2=Requires assistance, 3=Requires considerable assistance, 4=Totally dependent" },
                m1710_confusion: { type: "string", description: "M1710 When confused: 0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Always" },
                m1720_anxiety: { type: "string", description: "M1720 When anxious: 0=None, 1=Less than daily, 2=Daily, 3=Constantly" },
                m1730_depression_screening: { type: "string", description: "M1730 Depression screening conducted: 0=No, 1=Yes PHQ-2, 2=Other standardized" },
                m1740_cognitive_function: { type: "string", description: "M1740 Cognitive function detail" },
                m1745_phq2_score: { type: "string", description: "M1745 PHQ-2 total score (0-6)" },
                m1750_phq9_score: { type: "string", description: "M1750 PHQ-9 total score (0-27) if conducted" },
                bims_score: { type: "string", description: "BIMS (Brief Interview for Mental Status) score 0-15 if conducted" },
                cam_result: { type: "string", description: "CAM (Confusion Assessment Method) result: positive/negative" },
                behavioral_symptoms: { type: "string", description: "Any behavioral symptoms noted (wandering, verbal, physical, socially inappropriate)" }
              }
            },
            sensory_status: {
              type: "object",
              description: "SENSORY STATUS - Vision, hearing, speech, communication",
              properties: {
                m1200_vision: { type: "string", description: "M1200 Vision: 0=Normal, 1=Partially impaired, 2=Severely impaired" },
                m1210_hearing: { type: "string", description: "M1210 Hearing ability: 0=Adequate, 1=Mildly impaired, 2=Moderately impaired, 3=Severely impaired" },
                m1220_speech: { type: "string", description: "M1220 Understanding verbal content: 0=Understands, 1=Usually understands, 2=Sometimes understands, 3=Rarely understands, 4=Unable" },
                m1230_speech_clarity: { type: "string", description: "M1230 Speech clarity: 0=Clear, 1=Minimally unclear, 2=Moderately unclear, 3=Severely unclear, 4=Unable" },
                skin_integrity_notes: { type: "string", description: "Skin integrity observations and notes" }
              }
            },
            care_management: {
              type: "object",
              description: "CARE MANAGEMENT AND COORDINATION",
              properties: {
                m2102_care_management: { type: "string", description: "M2102 Types of care management provided - check all that apply" },
                m2250_plan_of_care_synched: { type: "string", description: "M2250 Plan of care synched with physician" },
                fall_risk_assessment: { type: "string", description: "Fall risk assessment conducted and score/result" },
                fall_prevention_discussed: { type: "string", description: "Fall prevention interventions discussed" },
                advance_directives: { type: "string", description: "Advance directive status: DNR, living will, healthcare proxy, etc." },
                emergency_plan: { type: "string", description: "Emergency preparedness plan in place" },
                caregiver_present: { type: "string", description: "Caregiver present and capabilities" },
                homebound_status: { type: "string", description: "Homebound status justification" },
                skilled_need_justification: { type: "string", description: "Skilled care need justification" }
              }
            },
            vital_signs: {
              type: "object",
              description: "VITAL SIGNS recorded during assessment",
              properties: {
                blood_pressure: { type: "string", description: "Blood pressure reading (systolic/diastolic)" },
                heart_rate: { type: "string", description: "Heart rate/pulse" },
                respiratory_rate: { type: "string", description: "Respiratory rate" },
                temperature: { type: "string", description: "Temperature" },
                oxygen_saturation: { type: "string", description: "O2 saturation/SpO2" },
                weight: { type: "string", description: "Weight in lbs or kg" },
                height: { type: "string", description: "Height" },
                pain_level: { type: "string", description: "Pain level (0-10 scale)" }
              }
            },
            narrative_sections: {
              type: "object",
              description: "NARRATIVE AND FREE-TEXT SECTIONS - Important for clinical context",
              properties: {
                clinical_summary: { type: "string", description: "Clinical summary or history narrative" },
                skilled_nursing_needs: { type: "string", description: "Skilled nursing needs and interventions" },
                patient_goals: { type: "string", description: "Patient/caregiver goals" },
                discharge_plan: { type: "string", description: "Discharge plan summary" },
                wound_care_notes: { type: "string", description: "Any wound care notes or descriptions" },
                teaching_needs: { type: "string", description: "Patient/caregiver teaching needs" }
              }
            },
            full_text_content: {
              type: "string",
              description: "IMPORTANT: Copy ALL remaining text from document not captured above - this includes any narratives, notes, assessments, clinical notes, history sections, care plans, etc."
            },
            document_metadata: {
              type: "object",
              description: "DOCUMENT METADATA AND SIGNATURES",
              properties: {
                total_pages: { type: "string", description: "Total number of pages in document" },
                emr_system: { type: "string", description: "EMR/EHR system name (Epic, Cerner, WellSky, Homecare Homebase, Kinnser, etc.)" },
                form_version: { type: "string", description: "OASIS form version (OASIS-E, OASIS-D, etc.)" },
                clinician_name: { type: "string", description: "Assessing clinician name" },
                clinician_credentials: { type: "string", description: "Clinician credentials (RN, PT, OT, SLP, MSW)" },
                clinician_signature: { type: "string", description: "Clinician signature present (yes/no)" },
                signature_date: { type: "string", description: "Date of clinician signature" },
                supervisor_name: { type: "string", description: "Supervising clinician if applicable" },
                supervisor_signature_date: { type: "string", description: "Supervisor signature date" }
              }
            }
          },
          required: ["primary_diagnosis", "functional_status", "all_diagnoses_raw"]
        }
      });

      setUploadProgress(50);

      if (extractedData.status === "error") {
        throw new Error(extractedData.details || "Failed to extract data from PDF. Please ensure it's a readable OASIS document.");
      }

      // Build comprehensive OASIS content from structured extraction
      let oasisTextContent = "";
      const output = extractedData.output;
      
      if (output) {
        // Format structured data for comprehensive analysis
        const sections = [];
        
        // Patient demographics
        if (output.patient_info) {
          const pi = output.patient_info;
          sections.push(`PATIENT DEMOGRAPHICS:
Name: ${pi.name || 'Not extracted'}
DOB: ${pi.dob || '?'}
Medicare #: ${pi.medicare_number || '?'}
MRN: ${pi.medical_record_number || '?'}
Address: ${pi.address || '?'}
SOC Date: ${pi.soc_date || '?'}
Assessment Date: ${pi.assessment_date || '?'}
Assessment Type: ${pi.assessment_type || '?'}
Agency: ${pi.agency_name || '?'}`);
        }
        
        // Primary diagnosis - critical for PDGM
        if (output.primary_diagnosis) {
          const pd = output.primary_diagnosis;
          sections.push(`PRIMARY DIAGNOSIS (M1021) - CRITICAL FOR PDGM:
ICD-10 Code: ${pd.icd10_code || 'NOT FOUND - REQUIRES MANUAL REVIEW'}
Description: ${pd.description || 'Not found'}
Symptom Control Rating: ${pd.symptom_control_rating || '?'}
Date of Onset: ${pd.date_of_onset || '?'}
Raw Text from Document: ${pd.raw_text || 'N/A'}`);
        }
        
        // All diagnoses verbatim
        if (output.all_diagnoses_raw) {
          sections.push(`ALL DIAGNOSES (VERBATIM FROM DOCUMENT):
${output.all_diagnoses_raw}`);
        }
        
        // Other diagnoses structured
        if (output.other_diagnoses?.length > 0) {
          sections.push(`OTHER DIAGNOSES (M1023):
${output.other_diagnoses.map((d, i) => `${d.position || String.fromCharCode(98 + i)}. ${d.icd10_code || 'No code'} - ${d.description || 'No description'} (Control: ${d.symptom_control_rating || '?'})`).join('\n')}`);
        }
        
        // M1800-M1860 Functional Status
        if (output.functional_status) {
          const fs = output.functional_status;
          sections.push(`FUNCTIONAL STATUS (M1800-M1860):
M1800 Grooming: ${fs.m1800_grooming || '?'} (0=Indep, 3=Dependent)
M1810 Upper Body Dressing: ${fs.m1810_dress_upper || '?'} (0-3)
M1820 Lower Body Dressing: ${fs.m1820_dress_lower || '?'} (0-3)
M1830 Bathing: ${fs.m1830_bathing || '?'} (0-6, higher=more dependent)
M1840 Toilet Transferring: ${fs.m1840_toilet_transfer || '?'} (0-4)
M1850 Transferring: ${fs.m1850_transferring || '?'} (0-5)
M1860 Ambulation: ${fs.m1860_ambulation || '?'} (0-6)
M1033 Risk for Hospitalization: ${fs.m1033_risk_hosp || '?'}
M1034 Overall Status: ${fs.m1034_overall_status || '?'}`);
        }
        
        // Section GG - Critical for PDGM
        if (output.gg_functional_abilities) {
          const gg = output.gg_functional_abilities;
          if (gg.gg0130_self_care) {
            sections.push(`SECTION GG0130 SELF-CARE (Admission Scores - CRITICAL FOR PDGM):
Eating: ${gg.gg0130_self_care.eating_admission || '?'}
Oral Hygiene: ${gg.gg0130_self_care.oral_hygiene_admission || '?'}
Toileting Hygiene: ${gg.gg0130_self_care.toileting_hygiene_admission || '?'}
Shower/Bathe Self: ${gg.gg0130_self_care.shower_bathe_self_admission || '?'}
Upper Body Dressing: ${gg.gg0130_self_care.upper_body_dressing_admission || '?'}
Lower Body Dressing: ${gg.gg0130_self_care.lower_body_dressing_admission || '?'}
Putting on Footwear: ${gg.gg0130_self_care.putting_on_footwear_admission || '?'}
(Scores: 06=Independent, 05=Setup, 04=Supervision, 03=Partial, 02=Substantial, 01=Dependent)`);
          }
          if (gg.gg0170_mobility) {
            const m = gg.gg0170_mobility;
            sections.push(`SECTION GG0170 MOBILITY (Admission Scores - CRITICAL FOR PDGM):
Roll Left/Right: ${m.roll_left_right_admission || '?'}
Sit to Lying: ${m.sit_to_lying_admission || '?'}
Lying to Sitting: ${m.lying_to_sitting_admission || '?'}
Sit to Stand: ${m.sit_to_stand_admission || '?'}
Chair/Bed Transfer: ${m.chair_bed_transfer_admission || '?'}
Toilet Transfer: ${m.toilet_transfer_admission || '?'}
Walk 10 Feet: ${m.walk_10_feet_admission || '?'}
Walk 50 Feet w/ 2 Turns: ${m.walk_50_feet_2_turns_admission || '?'}
Walk 150 Feet: ${m.walk_150_feet_admission || '?'}
Walk 10 Feet Uneven: ${m.walk_10_feet_uneven_admission || '?'}
1 Step/Curb: ${m.step_curb_admission || '?'}
4 Steps: ${m.four_steps_admission || '?'}
12 Steps: ${m.twelve_steps_admission || '?'}
Picking Up Object: ${m.picking_up_object_admission || '?'}`);
          }
        }
        
        // Clinical items
        if (output.clinical_items) {
          const ci = output.clinical_items;
          sections.push(`CLINICAL STATUS ITEMS:
M1400 Dyspnea: ${ci.m1400_dyspnea || '?'} (0=None, 4=At rest)
M1242 Pain Frequency: ${ci.m1242_pain_freq || '?'}
M1240 Pain Assessment: ${ci.m1240_pain_assessment || '?'}
M1033 Risk Factors: ${ci.m1033_risk_hospitalization || '?'}

INTEGUMENTARY STATUS:
M1306 Pressure Ulcer Present: ${ci.m1306_pressure_ulcer_present || '?'}
M1307 Oldest Stage 2+: ${ci.m1307_oldest_pressure_ulcer || '?'}
M1311 Pressure Ulcer Count: ${ci.m1311_pressure_ulcer_count || '?'}
M1322 Pressure Ulcer Stage: ${ci.m1322_pressure_ulcer_stage || '?'}
M1330 Stasis Ulcer: ${ci.m1330_stasis_ulcer || '?'}
M1332 Stasis Ulcer Count: ${ci.m1332_stasis_ulcer_count || '?'}
M1334 Stasis Ulcer Status: ${ci.m1334_stasis_ulcer_status || '?'}
M1340 Surgical Wound: ${ci.m1340_surgical_wound || '?'}
M1342 Surgical Wound Status: ${ci.m1342_surgical_wound_status || '?'}

ELIMINATION:
M1610 Urinary Incontinence: ${ci.m1610_urinary_incontinence || '?'}
M1620 Bowel Incontinence: ${ci.m1620_bowel_incontinence || '?'}
M1630 Ostomy: ${ci.m1630_ostomy || '?'}`);
        }
        
        // Medications
        if (output.medications) {
          const med = output.medications;
          sections.push(`MEDICATION MANAGEMENT:
M2001 Drug Regimen Review: ${med.m2001_drug_regimen_review || '?'}
M2003 Medication Follow-up: ${med.m2003_med_followup || '?'}
M2005 Medication Intervention: ${med.m2005_med_intervention || '?'}
M2010 High Risk Drugs: ${med.m2010_high_risk_drugs || '?'}
M2015 High Risk Drug Classes: ${med.m2015_high_risk_drug_classes || '?'}
M2020 Oral Medication Management: ${med.m2020_oral_med_mgmt || '?'}
M2030 Injectable Medication Management: ${med.m2030_injectable_med_mgmt || '?'}

Medication List: ${med.medication_list_raw || 'Not extracted'}`);
        }
        
        // Admission info - Critical for PDGM
        if (output.admission_info) {
          const ai = output.admission_info;
          sections.push(`ADMISSION INFO (CRITICAL FOR PDGM):
M1000 Admitted From: ${ai.m1000_from_where_admitted || '?'}
M1005 Inpatient Discharge Date: ${ai.m1005_inpatient_discharge_date || '?'}
Admission Source Category: ${ai.admission_source_category || 'NEEDS DETERMINATION'} (community vs institutional)
Episode Timing: ${ai.episode_timing || 'NEEDS DETERMINATION'} (early=days 1-30, late=days 31-60)
M0110 Episode Timing: ${ai.m0110_episode_timing || '?'}
M0102 SOC/ROC Date: ${ai.m0102_soc_roc_date || '?'}
LUPA Risk: ${ai.lupa_risk || '?'}
Referral Source: ${ai.referral_source || '?'}`);
        }
        
        // Therapy services
        if (output.therapy_need) {
          const th = output.therapy_need;
          sections.push(`THERAPY SERVICES:
M2200 Therapy Need: ${th.m2200_therapy_need || '?'}
PT Ordered: ${th.pt_ordered ? 'Yes' : 'No'} - Visits: ${th.pt_visits_planned || '?'}
OT Ordered: ${th.ot_ordered ? 'Yes' : 'No'} - Visits: ${th.ot_visits_planned || '?'}
SLP Ordered: ${th.slp_ordered ? 'Yes' : 'No'} - Visits: ${th.slp_visits_planned || '?'}
MSW Ordered: ${th.msw_ordered ? 'Yes' : 'No'}
HHA Ordered: ${th.hha_ordered ? 'Yes' : 'No'}
SN Visits Planned: ${th.sn_visits_planned || '?'}`);
        }
        
        // Cognitive status
        if (output.cognitive_status) {
          const cog = output.cognitive_status;
          sections.push(`COGNITIVE/BEHAVIORAL STATUS:
M1700 Cognitive Functioning: ${cog.m1700_cognitive || '?'}
M1710 When Confused: ${cog.m1710_confusion || '?'}
M1720 When Anxious: ${cog.m1720_anxiety || '?'}
M1730 Depression Screening: ${cog.m1730_depression_screening || '?'}
M1745 PHQ-2 Score: ${cog.m1745_phq2_score || '?'}
M1750 PHQ-9 Score: ${cog.m1750_phq9_score || '?'}
BIMS Score: ${cog.bims_score || '?'}
CAM Result: ${cog.cam_result || '?'}`);
        }

        // Sensory status
        if (output.sensory_status) {
          const ss = output.sensory_status;
          sections.push(`SENSORY STATUS:
M1200 Vision: ${ss.m1200_vision || '?'}
M1210 Hearing: ${ss.m1210_hearing || '?'}
M1220 Speech: ${ss.m1220_speech || '?'}
Skin Integrity Notes: ${ss.skin_integrity_notes || '?'}`);
        }

        // Care management
        if (output.care_management) {
          const cm = output.care_management;
          sections.push(`CARE MANAGEMENT:
M2102 Care Management Types: ${cm.m2102_care_management || '?'}
Fall Risk Assessment: ${cm.fall_risk_assessment || '?'}
Fall Prevention Discussed: ${cm.fall_prevention_discussed || '?'}
Advance Directives: ${cm.advance_directives || '?'}
Emergency Plan: ${cm.emergency_plan || '?'}`);
        }
        
        // Full text content
        if (output.full_text_content) {
          sections.push(`ADDITIONAL DOCUMENT CONTENT:
${output.full_text_content}`);
        }

        // Document metadata
        if (output.document_metadata) {
          const dm = output.document_metadata;
          sections.push(`DOCUMENT METADATA:
Pages: ${dm.total_pages || '?'}
EMR System: ${dm.emr_system || '?'}
Clinician: ${dm.clinician_name || '?'} ${dm.clinician_credentials || ''}
Signature Date: ${dm.signature_date || '?'}`);
        }
        
        oasisTextContent = sections.join('\n\n' + '='.repeat(50) + '\n\n');
        
        // Fallback to raw output if structured parsing failed
        if (!oasisTextContent || oasisTextContent.length < 100) {
          oasisTextContent = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        }
      }

      if (!oasisTextContent || oasisTextContent.trim().length < 20) {
        throw new Error("Could not extract sufficient data from the PDF. The document may be empty, password-protected, or in an unsupported format.");
      }

      console.log("Extracted OASIS content length:", oasisTextContent.length);
      
      // Store structured data for direct use in PDGM calculation
      // Try multiple sources for primary diagnosis to ensure we capture it
      let primaryDiagnosisText = output?.primary_diagnosis?.description || '';
      let primaryDiagnosisCode = output?.primary_diagnosis?.icd10_code || '';
      
      // If not found in structured field, try to extract from raw text
      if (!primaryDiagnosisText && !primaryDiagnosisCode) {
        const rawDiagnoses = output?.all_diagnoses_raw || output?.primary_diagnosis?.raw_text || '';
        // Look for ICD-10 pattern (letter followed by 2 digits, optional decimal and more digits)
        const icd10Match = rawDiagnoses.match(/[A-Z]\d{2}\.?\d{0,4}/i);
        if (icd10Match) {
          primaryDiagnosisCode = icd10Match[0];
        }
        // Take the first line or meaningful text as description
        if (rawDiagnoses) {
          const firstLine = rawDiagnoses.split('\n')[0]?.trim();
          if (firstLine && firstLine.length > 3) {
            primaryDiagnosisText = firstLine;
          }
        }
      }
      
      // Final fallback - check other_diagnoses if primary is still empty
      if (!primaryDiagnosisText && !primaryDiagnosisCode && output?.other_diagnoses?.length > 0) {
        primaryDiagnosisText = output.other_diagnoses[0]?.description || '';
        primaryDiagnosisCode = output.other_diagnoses[0]?.icd10_code || '';
      }
      
      // Build comprehensive structured PDGM data from extraction
      const parseScore = (val) => {
        if (!val) return 0;
        const num = parseInt(String(val).replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // Determine admission source category
      let admissionSource = output?.admission_info?.admission_source_category || '';
      if (!admissionSource && output?.admission_info?.m1000_from_where_admitted) {
        const m1000 = String(output.admission_info.m1000_from_where_admitted).toLowerCase();
        // 1,5,6 = community; 2,3,4 = institutional
        if (m1000.includes('1') || m1000.includes('community') || m1000.includes('5') || m1000.includes('6') || m1000.includes('home')) {
          admissionSource = 'community';
        } else if (m1000.includes('2') || m1000.includes('hospital') || m1000.includes('3') || m1000.includes('snf') || m1000.includes('4') || m1000.includes('rehab') || m1000.includes('institutional')) {
          admissionSource = 'institutional';
        } else {
          admissionSource = 'community'; // default
        }
      }
      
      // Build comorbidities list with ICD-10 codes
      const comorbidities = (output?.other_diagnoses || [])
        .map(d => {
          if (d.icd10_code && d.description) {
            return `${d.description} (${d.icd10_code})`;
          }
          return d.description || d.icd10_code;
        })
        .filter(Boolean);

      // Parse GG scores for PDGM calculation
      const ggSelfCare = output?.gg_functional_abilities?.gg0130_self_care || {};
      const ggMobility = output?.gg_functional_abilities?.gg0170_mobility || {};

      const structuredPdgmData = {
        primary_diagnosis: primaryDiagnosisText || primaryDiagnosisCode || '',
        primary_diagnosis_code: primaryDiagnosisCode,
        comorbidities: comorbidities,
        admission_source: admissionSource || 'community',
        episode_timing: output?.admission_info?.episode_timing || 'early',
        functional_scores: {
          m1800_grooming: parseScore(output?.functional_status?.m1800_grooming),
          m1810_dress_upper: parseScore(output?.functional_status?.m1810_dress_upper),
          m1820_dress_lower: parseScore(output?.functional_status?.m1820_dress_lower),
          m1830_bathing: parseScore(output?.functional_status?.m1830_bathing),
          m1840_toilet_transfer: parseScore(output?.functional_status?.m1840_toilet_transfer),
          m1850_transferring: parseScore(output?.functional_status?.m1850_transferring),
          m1860_ambulation: parseScore(output?.functional_status?.m1860_ambulation)
        },
        gg_scores: {
          self_care: {
            eating: parseScore(ggSelfCare.eating_admission),
            oral_hygiene: parseScore(ggSelfCare.oral_hygiene_admission),
            toileting_hygiene: parseScore(ggSelfCare.toileting_hygiene_admission),
            shower_bathe: parseScore(ggSelfCare.shower_bathe_self_admission),
            upper_body_dressing: parseScore(ggSelfCare.upper_body_dressing_admission),
            lower_body_dressing: parseScore(ggSelfCare.lower_body_dressing_admission),
            footwear: parseScore(ggSelfCare.putting_on_footwear_admission)
          },
          mobility: {
            sit_to_lying: parseScore(ggMobility.sit_to_lying_admission),
            lying_to_sitting: parseScore(ggMobility.lying_to_sitting_admission),
            sit_to_stand: parseScore(ggMobility.sit_to_stand_admission),
            chair_bed_transfer: parseScore(ggMobility.chair_bed_transfer_admission),
            toilet_transfer: parseScore(ggMobility.toilet_transfer_admission),
            walk_10_feet: parseScore(ggMobility.walk_10_feet_admission),
            walk_50_feet_2_turns: parseScore(ggMobility.walk_50_feet_2_turns_admission),
            walk_150_feet: parseScore(ggMobility.walk_150_feet_admission)
          }
        },
        clinical_items: {
          dyspnea: parseScore(output?.clinical_items?.m1400_dyspnea),
          pain_frequency: parseScore(output?.clinical_items?.m1242_pain_freq),
          pressure_ulcer_present: output?.clinical_items?.m1306_pressure_ulcer_present === '1' || String(output?.clinical_items?.m1306_pressure_ulcer_present).toLowerCase() === 'yes',
          surgical_wound: output?.clinical_items?.m1340_surgical_wound === '1' || String(output?.clinical_items?.m1340_surgical_wound).toLowerCase() === 'yes'
        },
        therapy_services: {
          pt: output?.therapy_need?.pt_ordered || false,
          ot: output?.therapy_need?.ot_ordered || false,
          slp: output?.therapy_need?.slp_ordered || false
        },
        patient_info: output?.patient_info || {}
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
        prompt: `You are an expert OASIS-E auditor and PDGM revenue specialist. Analyze this OASIS assessment document thoroughly.

PRE-EXTRACTED STRUCTURED DATA:
${JSON.stringify(structuredPdgmData, null, 2)}

FULL OASIS DOCUMENT CONTENT:
${truncatedContent}

ANALYSIS INSTRUCTIONS:
1. Verify the pre-extracted data against the full document content
2. Identify any missing or incorrectly extracted OASIS items
3. Check for internal consistency (e.g., functional scores should match narrative descriptions)
4. Identify PDGM revenue optimization opportunities
5. Flag compliance concerns and audit risks

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
  "accuracy_issues": [{"item": "M-item code", "issue": "specific issue description", "severity": "high/medium/low", "recommendation": "specific fix", "document_evidence": "quote from document"}],
  "compliance_concerns": [{"area": "area", "issue": "desc", "severity": "high/medium/low", "recommendation": "fix", "cms_reference": "regulation reference"}],
  "revenue_tips": [{"category": "Functional Status/Diagnosis/Therapy/Comorbidity/Other", "current_documentation": "what document shows", "opportunity": "improvement opportunity", "potential_impact": "high/medium/low", "specific_action": "exact action to take", "estimated_revenue_impact": "$X per episode"}],
  "documentation_improvements": [{"item": "item", "current_state": "current", "improved_state": "improved", "rationale": "why"}],
  "audit_risk_areas": [{"area": "area", "risk_level": "high/medium/low", "explanation": "why", "mitigation": "fix"}],
  "strengths": ["list of well-documented areas"],
  "key_recommendations": ["top 5 prioritized recommendations"]
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
            strengths: { type: "array", items: { type: "string" } },
            key_recommendations: { type: "array", items: { type: "string" } }
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
                        <p className="font-semibold text-blue-900 mb-2">{imp.item}</p>
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
                        <p className="text-xs text-gray-600 mt-2 italic">{imp.rationale}</p>
                      </div>
                    ))}
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