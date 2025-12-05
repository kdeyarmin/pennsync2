import React, { useState } from "react";
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
  FolderArchive
} from "lucide-react";
import { generateOASISReportPDF } from "@/functions/generateOASISReportPDF";
import BatchOASISAnalyzer from "../components/oasis/BatchOASISAnalyzer";
import PDGMRevenueComparison from "../components/oasis/PDGMRevenueComparison";
import PDGMMultiReportComparison from "../components/oasis/PDGMMultiReportComparison";

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
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
              description: "Patient demographics - look for name, DOB, MRN, Medicare/Medicaid numbers at top of document or in header sections",
              properties: {
                name: { type: "string", description: "Patient full name" },
                dob: { type: "string", description: "Date of birth in any format" },
                medicare_number: { type: "string", description: "Medicare Beneficiary Identifier (MBI) or Health Insurance Claim Number (HICN)" },
                medicaid_number: { type: "string", description: "Medicaid ID if present" },
                medical_record_number: { type: "string", description: "MRN or chart number" },
                address: { type: "string", description: "Patient address" },
                phone: { type: "string", description: "Patient phone number" },
                soc_date: { type: "string", description: "Start of Care date - M0030" },
                assessment_date: { type: "string", description: "Assessment completion date - M0090" },
                assessment_type: { type: "string", description: "SOC, ROC, Recert, Follow-up, Transfer, Discharge - look for M0100" },
                discharge_date: { type: "string", description: "Discharge date if applicable" },
                agency_name: { type: "string", description: "Home health agency name" }
              }
            },
            primary_diagnosis: {
              type: "object",
              description: "M1021 Primary Diagnosis - CRITICAL for PDGM. Search for: 'M1021', 'Primary Diagnosis', 'Principal Diagnosis', 'Admitting Diagnosis'. Extract the ICD-10-CM code (format: letter + 2 digits + optional decimal + digits, e.g., I50.9, J44.1, E11.65) AND full description.",
              properties: {
                icd10_code: { type: "string", description: "ICD-10-CM code exactly as written (e.g., I50.9, J44.1, M79.3)" },
                description: { type: "string", description: "Full diagnosis text description" },
                symptom_control_rating: { type: "string", description: "Symptom control rating 0-4 if present" },
                date_of_onset: { type: "string", description: "Date diagnosis began if documented" },
                raw_text: { type: "string", description: "Copy exact text as it appears for M1021 field" }
              }
            },
            all_diagnoses_raw: {
              type: "string",
              description: "COPY VERBATIM all diagnosis text you can find: M1021, M1023, problem lists, diagnosis lists, ICD-10 codes anywhere in document, comorbidities, past medical history conditions"
            },
            other_diagnoses: {
              type: "array",
              description: "M1023 Other Diagnoses - ALL secondary/comorbid diagnoses with ICD-10 codes. Include V, E, W, X, Y codes for external causes",
              items: {
                type: "object",
                properties: {
                  position: { type: "string", description: "b, c, d, e, f position" },
                  icd10_code: { type: "string", description: "ICD-10 code" },
                  description: { type: "string", description: "Diagnosis description" },
                  symptom_control_rating: { type: "string" }
                }
              }
            },
            functional_status: {
              type: "object",
              description: "M1800-M1860 ADL/IADL Functional Status - extract NUMERIC responses only (not descriptions). Look for checkboxes, circled numbers, or selected options.",
              properties: {
                m1800_grooming: { type: "string", description: "Current Grooming: 0=Independent, 1=Needs setup, 2=Requires assistance, 3=Dependent" },
                m1810_dress_upper: { type: "string", description: "Current Upper Body Dressing: 0-3 scale" },
                m1820_dress_lower: { type: "string", description: "Current Lower Body Dressing: 0-3 scale" },
                m1830_bathing: { type: "string", description: "Current Bathing: 0-6 scale (0=Independent, 6=Unable to bathe)" },
                m1840_toilet_transfer: { type: "string", description: "Current Toilet Transferring: 0-4 scale" },
                m1850_transferring: { type: "string", description: "Current Transferring: 0-5 scale" },
                m1860_ambulation: { type: "string", description: "Current Ambulation/Locomotion: 0-6 scale" },
                m1033_risk_hosp: { type: "string", description: "Risk for hospitalization - multiple checkboxes, note which are checked" },
                m1034_overall_status: { type: "string", description: "Overall status comparison" }
              }
            },
            gg_functional_abilities: {
              type: "object",
              description: "Section GG - CRITICAL for PDGM. Scores use 06=Independent to 01=Dependent, 07=Refused, 09=Not applicable, 88=Not attempted, ^=Activity not attempted",
              properties: {
                gg0130_self_care: {
                  type: "object",
                  description: "GG0130 Self-Care - Column A (Admission) scores are most important for PDGM",
                  properties: {
                    eating_admission: { type: "string", description: "A. Eating admission score" },
                    eating_discharge_goal: { type: "string" },
                    oral_hygiene_admission: { type: "string" },
                    toileting_hygiene_admission: { type: "string" },
                    shower_bathe_self_admission: { type: "string" },
                    upper_body_dressing_admission: { type: "string" },
                    lower_body_dressing_admission: { type: "string" },
                    putting_on_footwear_admission: { type: "string" }
                  }
                },
                gg0170_mobility: {
                  type: "object",
                  description: "GG0170 Mobility - Column A (Admission) scores",
                  properties: {
                    roll_left_right_admission: { type: "string" },
                    sit_to_lying_admission: { type: "string" },
                    lying_to_sitting_admission: { type: "string" },
                    sit_to_stand_admission: { type: "string" },
                    chair_bed_transfer_admission: { type: "string" },
                    toilet_transfer_admission: { type: "string" },
                    walk_10_feet_admission: { type: "string" },
                    walk_50_feet_2_turns_admission: { type: "string" },
                    walk_150_feet_admission: { type: "string" },
                    walk_10_feet_uneven_admission: { type: "string" },
                    step_curb_admission: { type: "string" },
                    four_steps_admission: { type: "string" },
                    twelve_steps_admission: { type: "string" },
                    picking_up_object_admission: { type: "string" },
                    wheel_50_feet_admission: { type: "string" },
                    wheel_150_feet_admission: { type: "string" }
                  }
                }
              }
            },
            clinical_items: {
              type: "object",
              description: "Key clinical status items - extract numeric values where possible",
              properties: {
                m1033_risk_hospitalization: { type: "string", description: "Risk factors checked - list all" },
                m1400_dyspnea: { type: "string", description: "Dyspnea: 0-4 scale (0=None, 4=At rest)" },
                m1242_pain_freq: { type: "string", description: "Frequency of pain: 0-4 scale" },
                m1240_pain_assessment: { type: "string", description: "Standardized pain assessment conducted" },
                m1302_risk_pressure_ulcer: { type: "string", description: "Risk assessment conducted" },
                m1306_pressure_ulcer_present: { type: "string", description: "Unhealed pressure ulcer present: 0=No, 1=Yes" },
                m1307_oldest_pressure_ulcer: { type: "string", description: "Oldest Stage 2+ pressure ulcer" },
                m1311_pressure_ulcer_count: { type: "string", description: "Number of pressure ulcers at each stage" },
                m1322_pressure_ulcer_stage: { type: "string", description: "Current stage of most problematic ulcer" },
                m1324_stage2_pressure_ulcer: { type: "string" },
                m1330_stasis_ulcer: { type: "string", description: "Stasis ulcer present: 0=No, 1=Yes" },
                m1332_stasis_ulcer_count: { type: "string" },
                m1334_stasis_ulcer_status: { type: "string" },
                m1340_surgical_wound: { type: "string", description: "Surgical wound present: 0=No, 1=Yes" },
                m1342_surgical_wound_status: { type: "string", description: "Status of most problematic surgical wound" },
                m1400_sob: { type: "string", description: "When is patient short of breath" },
                m1610_urinary_incontinence: { type: "string" },
                m1620_bowel_incontinence: { type: "string" },
                m1630_ostomy: { type: "string" }
              }
            },
            medications: {
              type: "object",
              description: "Medication management items",
              properties: {
                m2001_drug_regimen_review: { type: "string", description: "Drug regimen review conducted: 0=No, 1=Yes" },
                m2003_med_followup: { type: "string", description: "Medication follow-up: 0=No, 1=Yes" },
                m2005_med_intervention: { type: "string", description: "Medication intervention: 0=No, 1=Yes" },
                m2010_high_risk_drugs: { type: "string", description: "Patient taking any high-risk drugs" },
                m2015_high_risk_drug_classes: { type: "string", description: "Which high-risk drug classes" },
                m2020_oral_med_mgmt: { type: "string", description: "Oral medication management: 0-3 scale" },
                m2030_injectable_med_mgmt: { type: "string", description: "Injectable medication management: 0-3 scale" },
                m2040_prior_med_mgmt: { type: "string" },
                medication_list_raw: { type: "string", description: "Copy any medication lists found in document" }
              }
            },
            admission_info: {
              type: "object",
              description: "Admission source and timing - CRITICAL for PDGM payment",
              properties: {
                m1000_from_where_admitted: { type: "string", description: "Where admitted from: 1=Community, 2=Hospital, 3=SNF, etc." },
                m1005_inpatient_discharge_date: { type: "string", description: "Date of discharge from inpatient facility" },
                admission_source_category: { type: "string", description: "Determine: 'community' or 'institutional' based on M1000 (1,5,6=community; 2,3,4=institutional)" },
                episode_timing: { type: "string", description: "Determine: 'early' (first 30 days) or 'late' (days 31-60) based on episode timing" },
                m0110_episode_timing: { type: "string", description: "Episode timing indicator" },
                m0102_soc_roc_date: { type: "string" },
                lupa_risk: { type: "string", description: "Any mention of LUPA or low utilization" },
                referral_source: { type: "string", description: "Physician or facility that referred patient" }
              }
            },
            therapy_need: {
              type: "object",
              description: "Therapy services ordered - check for PT, OT, SLP, MSW",
              properties: {
                m2200_therapy_need: { type: "string" },
                pt_ordered: { type: "boolean", description: "Physical therapy ordered" },
                pt_visits_planned: { type: "string" },
                ot_ordered: { type: "boolean", description: "Occupational therapy ordered" },
                ot_visits_planned: { type: "string" },
                slp_ordered: { type: "boolean", description: "Speech-language pathology ordered" },
                slp_visits_planned: { type: "string" },
                msw_ordered: { type: "boolean", description: "Medical social worker ordered" },
                hha_ordered: { type: "boolean", description: "Home health aide ordered" },
                sn_visits_planned: { type: "string", description: "Skilled nursing visits planned" }
              }
            },
            cognitive_status: {
              type: "object",
              description: "Cognitive, behavioral, and mental status items",
              properties: {
                m1700_cognitive: { type: "string", description: "Cognitive functioning: 0-4 scale" },
                m1710_confusion: { type: "string", description: "When confused: 0-4" },
                m1720_anxiety: { type: "string", description: "When anxious: 0-3" },
                m1730_depression_screening: { type: "string", description: "PHQ-2 conducted and score" },
                m1740_cognitive_function: { type: "string" },
                m1745_phq2_score: { type: "string", description: "PHQ-2 total score" },
                m1750_phq9_score: { type: "string", description: "PHQ-9 total score if completed" },
                bims_score: { type: "string", description: "Brief Interview for Mental Status score if present" },
                cam_result: { type: "string", description: "Confusion Assessment Method result if present" }
              }
            },
            sensory_status: {
              type: "object",
              description: "Sensory and integumentary status",
              properties: {
                m1200_vision: { type: "string" },
                m1210_hearing: { type: "string" },
                m1220_speech: { type: "string" },
                skin_integrity_notes: { type: "string", description: "Any skin integrity observations" }
              }
            },
            care_management: {
              type: "object",
              description: "Care planning and coordination items",
              properties: {
                m2102_care_management: { type: "string", description: "Types of care management provided" },
                fall_risk_assessment: { type: "string" },
                fall_prevention_discussed: { type: "string" },
                advance_directives: { type: "string" },
                emergency_plan: { type: "string" }
              }
            },
            full_text_content: {
              type: "string",
              description: "IMPORTANT: Copy ALL remaining text from document not captured above - narratives, notes, assessments, history"
            },
            document_metadata: {
              type: "object",
              description: "Document information",
              properties: {
                total_pages: { type: "string" },
                emr_system: { type: "string", description: "Electronic medical record system name if visible" },
                clinician_name: { type: "string" },
                clinician_credentials: { type: "string" },
                signature_date: { type: "string" }
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single" className="gap-2">
            <FileText className="w-4 h-4" />
            Single Document
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <FolderArchive className="w-4 h-4" />
            Batch Analysis
          </TabsTrigger>
        </TabsList>

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
          />

          {/* Multi-Report Comparison */}
          <PDGMMultiReportComparison
            savedReports={savedBatchResults}
            currentReport={analysisResults}
            currentPdgmData={pdgmData}
          />

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