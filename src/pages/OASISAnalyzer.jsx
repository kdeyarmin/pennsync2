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

export default function OASISAnalyzer() {
  const [activeTab, setActiveTab] = useState("single");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [pdgmData, setPdgmData] = useState(null);
  const [error, setError] = useState(null);

  // Handle viewing batch result in single analysis view
  const handleViewBatchResult = (result) => {
    setAnalysisResults(result);
    if (result?.pdgm_data) {
      setPdgmData(result.pdgm_data);
    }
    setActiveTab("single");
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

      // Extract structured OASIS data from PDF using AI (handles both text-based and scanned/image PDFs)
      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            patient_info: {
              type: "object",
              description: "Patient demographics and identifiers",
              properties: {
                name: { type: "string" },
                dob: { type: "string" },
                medicare_number: { type: "string" },
                address: { type: "string" },
                soc_date: { type: "string", description: "Start of Care date" },
                assessment_date: { type: "string" },
                assessment_type: { type: "string", description: "SOC, ROC, Recert, Discharge, etc." }
              }
            },
            primary_diagnosis: {
              type: "object",
              description: "M1021 Primary Diagnosis",
              properties: {
                icd10_code: { type: "string" },
                description: { type: "string" },
                symptom_control_rating: { type: "string" }
              }
            },
            other_diagnoses: {
              type: "array",
              description: "M1023 Other Diagnoses - all secondary diagnoses with ICD-10 codes",
              items: {
                type: "object",
                properties: {
                  icd10_code: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            functional_status: {
              type: "object",
              description: "M1800-M1860 Functional Status items with exact numeric responses",
              properties: {
                m1800_grooming: { type: "string", description: "Response 0-3" },
                m1810_dress_upper: { type: "string", description: "Response 0-3" },
                m1820_dress_lower: { type: "string", description: "Response 0-3" },
                m1830_bathing: { type: "string", description: "Response 0-6" },
                m1840_toilet_transfer: { type: "string", description: "Response 0-4" },
                m1850_transferring: { type: "string", description: "Response 0-5" },
                m1860_ambulation: { type: "string", description: "Response 0-6" }
              }
            },
            gg_functional_abilities: {
              type: "object",
              description: "Section GG Functional Abilities - GG0130 Self-Care and GG0170 Mobility scores",
              properties: {
                gg0130_self_care: {
                  type: "object",
                  properties: {
                    eating: { type: "string" },
                    oral_hygiene: { type: "string" },
                    toileting_hygiene: { type: "string" },
                    shower_bathe: { type: "string" },
                    upper_body_dressing: { type: "string" },
                    lower_body_dressing: { type: "string" },
                    footwear: { type: "string" }
                  }
                },
                gg0170_mobility: {
                  type: "object",
                  properties: {
                    sit_to_lying: { type: "string" },
                    lying_to_sitting: { type: "string" },
                    sit_to_stand: { type: "string" },
                    chair_bed_transfer: { type: "string" },
                    toilet_transfer: { type: "string" },
                    walk_10_feet: { type: "string" },
                    walk_50_feet_2_turns: { type: "string" },
                    walk_150_feet: { type: "string" },
                    walking_10_feet_uneven: { type: "string" },
                    step_curb: { type: "string" },
                    four_steps: { type: "string" },
                    twelve_steps: { type: "string" },
                    picking_up_object: { type: "string" },
                    wheel_50_feet: { type: "string" },
                    wheel_150_feet: { type: "string" }
                  }
                }
              }
            },
            clinical_items: {
              type: "object",
              description: "Key clinical assessment items",
              properties: {
                m1033_risk_hospitalization: { type: "string" },
                m1400_dyspnea: { type: "string" },
                m1242_pain_freq: { type: "string" },
                m1302_risk_pressure_ulcer: { type: "string" },
                m1306_pressure_ulcer_present: { type: "string" },
                m1311_pressure_ulcer_count: { type: "string" },
                m1322_pressure_ulcer_stage: { type: "string" },
                m1324_stage2_pressure_ulcer: { type: "string" },
                m1330_stasis_ulcer: { type: "string" },
                m1340_surgical_wound: { type: "string" },
                m1342_surgical_wound_status: { type: "string" }
              }
            },
            medications: {
              type: "object",
              description: "Medication management items",
              properties: {
                m2001_drug_regimen_review: { type: "string" },
                m2003_med_followup: { type: "string" },
                m2005_med_intervention: { type: "string" },
                m2010_high_risk_drugs: { type: "string" },
                m2020_oral_med_mgmt: { type: "string" },
                m2030_injectable_med_mgmt: { type: "string" }
              }
            },
            admission_info: {
              type: "object",
              description: "Admission source and episode timing",
              properties: {
                m1000_from_where_admitted: { type: "string", description: "Community, hospital, SNF, etc." },
                admission_source_category: { type: "string", description: "community or institutional" },
                episode_timing: { type: "string", description: "early (first 30 days) or late" },
                m0110_episode_timing: { type: "string" }
              }
            },
            therapy_need: {
              type: "object",
              description: "Therapy requirements",
              properties: {
                m2200_therapy_need: { type: "string" },
                pt_ordered: { type: "boolean" },
                ot_ordered: { type: "boolean" },
                slp_ordered: { type: "boolean" }
              }
            },
            cognitive_status: {
              type: "object",
              description: "Cognitive and mental status",
              properties: {
                m1700_cognitive: { type: "string" },
                m1710_confusion: { type: "string" },
                m1720_anxiety: { type: "string" },
                m1730_depression_screening: { type: "string" },
                m1740_cognitive_function: { type: "string" }
              }
            },
            full_text_content: {
              type: "string",
              description: "Complete raw text from the document for any items not captured above"
            }
          },
          required: ["primary_diagnosis", "functional_status"]
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
        // Format structured data for analysis
        const sections = [];
        
        if (output.patient_info) {
          sections.push(`PATIENT INFO:\n${JSON.stringify(output.patient_info, null, 2)}`);
        }
        
        if (output.primary_diagnosis) {
          sections.push(`PRIMARY DIAGNOSIS (M1021):\nICD-10: ${output.primary_diagnosis.icd10_code || 'Not found'}\nDescription: ${output.primary_diagnosis.description || 'Not found'}`);
        }
        
        if (output.other_diagnoses?.length > 0) {
          sections.push(`OTHER DIAGNOSES (M1023):\n${output.other_diagnoses.map((d, i) => `${i+1}. ${d.icd10_code || ''} - ${d.description || ''}`).join('\n')}`);
        }
        
        if (output.functional_status) {
          sections.push(`FUNCTIONAL STATUS (M1800-M1860):\nM1800 Grooming: ${output.functional_status.m1800_grooming || '?'}\nM1810 Upper Dressing: ${output.functional_status.m1810_dress_upper || '?'}\nM1820 Lower Dressing: ${output.functional_status.m1820_dress_lower || '?'}\nM1830 Bathing: ${output.functional_status.m1830_bathing || '?'}\nM1840 Toilet Transfer: ${output.functional_status.m1840_toilet_transfer || '?'}\nM1850 Transferring: ${output.functional_status.m1850_transferring || '?'}\nM1860 Ambulation: ${output.functional_status.m1860_ambulation || '?'}`);
        }
        
        if (output.gg_functional_abilities) {
          if (output.gg_functional_abilities.gg0130_self_care) {
            sections.push(`GG0130 SELF-CARE:\n${JSON.stringify(output.gg_functional_abilities.gg0130_self_care, null, 2)}`);
          }
          if (output.gg_functional_abilities.gg0170_mobility) {
            sections.push(`GG0170 MOBILITY:\n${JSON.stringify(output.gg_functional_abilities.gg0170_mobility, null, 2)}`);
          }
        }
        
        if (output.clinical_items) {
          sections.push(`CLINICAL ITEMS:\n${JSON.stringify(output.clinical_items, null, 2)}`);
        }
        
        if (output.medications) {
          sections.push(`MEDICATIONS:\n${JSON.stringify(output.medications, null, 2)}`);
        }
        
        if (output.admission_info) {
          sections.push(`ADMISSION INFO:\nFrom: ${output.admission_info.m1000_from_where_admitted || '?'}\nSource Category: ${output.admission_info.admission_source_category || '?'}\nEpisode Timing: ${output.admission_info.episode_timing || '?'}`);
        }
        
        if (output.therapy_need) {
          sections.push(`THERAPY NEED:\n${JSON.stringify(output.therapy_need, null, 2)}`);
        }
        
        if (output.cognitive_status) {
          sections.push(`COGNITIVE STATUS:\n${JSON.stringify(output.cognitive_status, null, 2)}`);
        }
        
        if (output.full_text_content) {
          sections.push(`ADDITIONAL CONTENT:\n${output.full_text_content}`);
        }
        
        oasisTextContent = sections.join('\n\n---\n\n');
        
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
      const structuredPdgmData = {
        primary_diagnosis: output?.primary_diagnosis?.description || output?.primary_diagnosis?.icd10_code || '',
        primary_diagnosis_code: output?.primary_diagnosis?.icd10_code || '',
        comorbidities: (output?.other_diagnoses || []).map(d => d.description || d.icd10_code).filter(Boolean),
        admission_source: output?.admission_info?.admission_source_category || 'community',
        episode_timing: output?.admission_info?.episode_timing || 'early',
        functional_scores: {
          m1800_grooming: parseInt(output?.functional_status?.m1800_grooming) || 0,
          m1810_dress_upper: parseInt(output?.functional_status?.m1810_dress_upper) || 0,
          m1820_dress_lower: parseInt(output?.functional_status?.m1820_dress_lower) || 0,
          m1830_bathing: parseInt(output?.functional_status?.m1830_bathing) || 0,
          m1840_toilet_transfer: parseInt(output?.functional_status?.m1840_toilet_transfer) || 0,
          m1850_transferring: parseInt(output?.functional_status?.m1850_transferring) || 0,
          m1860_ambulation: parseInt(output?.functional_status?.m1860_ambulation) || 0
        },
        gg_scores: output?.gg_functional_abilities || null
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
      
      // Extract PDGM data for revenue calculation
      if (analysisResult.pdgm_data) {
        setPdgmData(analysisResult.pdgm_data);
      }
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
          <BatchOASISAnalyzer onSingleAnalysis={handleViewBatchResult} />
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