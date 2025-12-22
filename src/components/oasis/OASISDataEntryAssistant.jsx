import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit3,
  Eye,
  Send
} from "lucide-react";

export default function OASISDataEntryAssistant({ onDataConfirmed }) {
  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "application/pdf" || 
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
      setEditedData(null);
    } else {
      setError("Please select a valid PDF or DOCX file.");
      setFile(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const uploadedFileUrl = uploadResult.file_url;
      setFileUrl(uploadedFileUrl);

      // Extract OASIS data with comprehensive schema
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFileUrl,
        json_schema: {
          type: "object",
          properties: {
            // Patient Info
            patient_name: { type: "string", description: "Full patient name" },
            patient_first_name: { type: "string" },
            patient_last_name: { type: "string" },
            patient_dob: { type: "string", description: "Date of birth MM/DD/YYYY" },
            patient_gender: { type: "string", description: "M or F" },
            patient_address: { type: "string" },
            patient_phone: { type: "string" },
            medical_record_number: { type: "string" },

            // Assessment Info
            m0090_assessment_date: { type: "string" },
            m0100_assessment_reason: { type: "string" },
            assessment_type: { type: "string", description: "SOC, ROC, Recert, Discharge, etc" },
            
            // Episode Timing
            m0110_episode_timing: { type: "string", description: "1=Early, 2=Late" },
            m0030_soc_date: { type: "string" },
            
            // Primary Diagnosis
            m1021_primary_dx_code: { type: "string", description: "ICD-10 code" },
            m1021_primary_dx_description: { type: "string" },
            
            // Other Diagnoses
            m1023_other_diagnoses: { type: "string", description: "All other ICD-10 codes with descriptions, comma separated" },

            // Functional Status (ADLs)
            m1800_grooming: { type: "string", description: "0-3" },
            m1810_dress_upper: { type: "string", description: "0-3" },
            m1820_dress_lower: { type: "string", description: "0-3" },
            m1830_bathing: { type: "string", description: "0-6" },
            m1840_toilet_transfer: { type: "string", description: "0-4" },
            m1850_transferring: { type: "string", description: "0-5" },
            m1860_ambulation: { type: "string", description: "0-6" },

            // GG Items
            gg0130_eating: { type: "string" },
            gg0130_oral_hygiene: { type: "string" },
            gg0130_toileting: { type: "string" },
            gg0170_sit_to_lying: { type: "string" },
            gg0170_lying_to_sit: { type: "string" },
            gg0170_sit_to_stand: { type: "string" },

            // Clinical Items
            m1242_pain_frequency: { type: "string", description: "0-4" },
            m1306_pressure_ulcer: { type: "string", description: "0=No, 1=Yes" },
            m1307_pressure_ulcer_stage: { type: "string" },
            m1400_dyspnea: { type: "string", description: "0-4" },
            m1620_urinary_incontinence: { type: "string" },
            m1700_cognitive_functioning: { type: "string" },
            m1710_confusion_frequency: { type: "string" },
            m1730_depression_phq2: { type: "string" },

            // Therapy
            therapy_pt: { type: "string", description: "Physical therapy needed yes/no" },
            therapy_ot: { type: "string", description: "Occupational therapy needed yes/no" },
            therapy_slp: { type: "string", description: "Speech therapy needed yes/no" }
          }
        }
      });

      if (extractResult.status === "error") {
        throw new Error(extractResult.details || "Failed to extract data from document");
      }

      setExtractedData(extractResult.output);
      setEditedData({ ...extractResult.output });
    } catch (err) {
      console.error("Extraction error:", err);
      setError(`Failed to extract data: ${err.message}`);
    }

    setIsExtracting(false);
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (onDataConfirmed && editedData && fileUrl) {
      onDataConfirmed({
        extractedData: editedData,
        originalData: extractedData,
        fileUrl,
        file
      });
    }
  };

  const renderField = (label, field, placeholder = "") => {
    const wasExtracted = extractedData?.[field] && extractedData[field] !== "Not found" && extractedData[field] !== "";
    const wasEdited = editedData?.[field] !== extractedData?.[field];

    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-2">
          {label}
          {wasExtracted && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">AI Found</Badge>}
          {wasEdited && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">Edited</Badge>}
        </Label>
        <Input
          value={editedData?.[field] || ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      </div>
    );
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Data Entry Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData ? (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                Upload your OASIS document and AI will automatically extract and pre-fill all data fields for you to review.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-white">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="oasis-assistant-upload"
              />
              <FileText className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                {file ? file.name : "No file selected"}
              </p>
              <p className="text-xs text-gray-400 mb-4">PDF or DOCX format</p>
              <Button 
                variant="outline"
                onClick={() => document.getElementById('oasis-assistant-upload').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            {file && (
              <Button
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI is extracting data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract OASIS Data with AI
                  </>
                )}
              </Button>
            )}

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                <strong>Data extracted successfully!</strong> Review the fields below and make any corrections before confirming.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="patient" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="patient">Patient</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="functional">Functional</TabsTrigger>
                <TabsTrigger value="clinical">Clinical</TabsTrigger>
              </TabsList>

              <TabsContent value="patient" className="space-y-3 mt-4">
                {renderField("Patient Name", "patient_name")}
                {renderField("First Name", "patient_first_name")}
                {renderField("Last Name", "patient_last_name")}
                {renderField("Date of Birth", "patient_dob", "MM/DD/YYYY")}
                {renderField("Gender", "patient_gender", "M or F")}
                {renderField("Address", "patient_address")}
                {renderField("Phone", "patient_phone")}
                {renderField("Medical Record Number", "medical_record_number")}
              </TabsContent>

              <TabsContent value="assessment" className="space-y-3 mt-4">
                {renderField("M0090 Assessment Date", "m0090_assessment_date", "MM/DD/YYYY")}
                {renderField("Assessment Type", "assessment_type", "SOC, ROC, Recert, etc")}
                {renderField("M0100 Assessment Reason", "m0100_assessment_reason")}
                {renderField("M0110 Episode Timing", "m0110_episode_timing", "1=Early, 2=Late")}
                {renderField("M0030 SOC Date", "m0030_soc_date", "MM/DD/YYYY")}
                {renderField("M1021 Primary Dx Code", "m1021_primary_dx_code", "ICD-10")}
                {renderField("M1021 Primary Dx Description", "m1021_primary_dx_description")}
                {renderField("M1023 Other Diagnoses", "m1023_other_diagnoses")}
              </TabsContent>

              <TabsContent value="functional" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {renderField("M1800 Grooming (0-3)", "m1800_grooming")}
                  {renderField("M1810 Upper Dressing (0-3)", "m1810_dress_upper")}
                  {renderField("M1820 Lower Dressing (0-3)", "m1820_dress_lower")}
                  {renderField("M1830 Bathing (0-6)", "m1830_bathing")}
                  {renderField("M1840 Toilet Transfer (0-4)", "m1840_toilet_transfer")}
                  {renderField("M1850 Transferring (0-5)", "m1850_transferring")}
                  {renderField("M1860 Ambulation (0-6)", "m1860_ambulation")}
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">GG Items</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {renderField("GG0130 Eating", "gg0130_eating")}
                    {renderField("GG0130 Oral Hygiene", "gg0130_oral_hygiene")}
                    {renderField("GG0130 Toileting", "gg0130_toileting")}
                    {renderField("GG0170 Sit to Lying", "gg0170_sit_to_lying")}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clinical" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {renderField("M1242 Pain Frequency (0-4)", "m1242_pain_frequency")}
                  {renderField("M1306 Pressure Ulcer (0-1)", "m1306_pressure_ulcer")}
                  {renderField("M1307 Pressure Ulcer Stage", "m1307_pressure_ulcer_stage")}
                  {renderField("M1400 Dyspnea (0-4)", "m1400_dyspnea")}
                  {renderField("M1620 Urinary Incontinence", "m1620_urinary_incontinence")}
                  {renderField("M1700 Cognitive Function", "m1700_cognitive_functioning")}
                  {renderField("M1710 Confusion Frequency", "m1710_confusion_frequency")}
                  {renderField("M1730 Depression PHQ-2", "m1730_depression_phq2")}
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">Therapy Needs</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {renderField("PT Needed", "therapy_pt", "Yes/No")}
                    {renderField("OT Needed", "therapy_ot", "Yes/No")}
                    {renderField("SLP Needed", "therapy_slp", "Yes/No")}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedData(null);
                  setEditedData(null);
                  setFile(null);
                  setFileUrl(null);
                }}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Confirm & Analyze
              </Button>
            </div>

            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <p className="text-xs text-purple-800">
                <strong>Next:</strong> Click "Confirm & Analyze" to run full OASIS analysis with this data. You can edit any fields above before confirming.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}