import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  Copy,
  Plus,
  AlertCircle,
  Pill,
  Activity,
  Stethoscope,
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIDocumentAnalyzer({
  patientId,
  patientData,
  onApplyToPatient,
  onInsertToNote,
  compact = false
}) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [appliedFields, setAppliedFields] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(!compact);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setExtractedData(null);
    setAppliedFields(new Set());

    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      setUploadedFile({
        name: file.name,
        type: file.type,
        url: fileUrl
      });

      // Analyze document
      setAnalyzing(true);
      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical document analysis AI. Analyze this uploaded clinical document and extract all relevant patient information.

DOCUMENT TYPE: The document may be a physician order, lab report, hospital discharge summary, medication list, or other clinical document.

${patientData ? `
EXISTING PATIENT DATA (for context and comparison):
- Name: ${patientData.first_name} ${patientData.last_name}
- Current Primary Diagnosis: ${patientData.primary_diagnosis || 'Not specified'}
- Current Medications: ${patientData.current_medications?.map(m => m.name).join(', ') || 'None documented'}
- Known Allergies: ${patientData.allergies || 'None documented'}
` : ''}

EXTRACT THE FOLLOWING INFORMATION:

1. DOCUMENT METADATA:
   - Document type (order, lab report, discharge summary, etc.)
   - Document date
   - Ordering physician name and contact

2. PATIENT IDENTIFIERS:
   - Patient name (if visible)
   - DOB (if visible)
   - MRN (if visible)

3. CLINICAL DATA:
   - Primary diagnosis/diagnoses
   - Secondary diagnoses
   - New or changed medications (with dosage, frequency)
   - Allergies mentioned
   - Vital signs (if present)
   - Lab values (if lab report)
   - Physician orders/instructions

4. ACTION ITEMS:
   - What actions are required based on this document?
   - Any time-sensitive orders?
   - Required follow-up?

5. SUGGESTED UPDATES:
   - What fields should be updated in patient profile?
   - What information should be documented in clinical notes?

Return structured JSON with all extracted information. Be thorough and accurate.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            document_date: { type: "string" },
            ordering_physician: {
              type: "object",
              properties: {
                name: { type: "string" },
                phone: { type: "string" },
                specialty: { type: "string" }
              }
            },
            patient_identifiers: {
              type: "object",
              properties: {
                name: { type: "string" },
                dob: { type: "string" },
                mrn: { type: "string" }
              }
            },
            diagnoses: {
              type: "object",
              properties: {
                primary: { type: "string" },
                secondary: { type: "array", items: { type: "string" } }
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
                  indication: { type: "string" },
                  is_new: { type: "boolean" }
                }
              }
            },
            allergies: { type: "array", items: { type: "string" } },
            vital_signs: {
              type: "object",
              properties: {
                blood_pressure: { type: "string" },
                heart_rate: { type: "string" },
                temperature: { type: "string" },
                respiratory_rate: { type: "string" },
                oxygen_saturation: { type: "string" },
                weight: { type: "string" }
              }
            },
            lab_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test_name: { type: "string" },
                  value: { type: "string" },
                  unit: { type: "string" },
                  reference_range: { type: "string" },
                  abnormal: { type: "boolean" }
                }
              }
            },
            orders: { type: "array", items: { type: "string" } },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string" },
                  timeframe: { type: "string" }
                }
              }
            },
            suggested_profile_updates: { type: "array", items: { type: "string" } },
            suggested_note_content: { type: "string" }
          }
        }
      });

      setExtractedData(analysisResult);
    } catch (error) {
      console.error('Document analysis error:', error);
      setExtractedData({ error: 'Failed to analyze document. Please try again.' });
    }

    setUploading(false);
    setAnalyzing(false);
  };

  const handleApplyToPatient = async (field, value) => {
    if (!patientId || !onApplyToPatient) return;

    try {
      await onApplyToPatient(field, value);
      setAppliedFields(prev => new Set([...prev, field]));
    } catch (error) {
      console.error('Error applying to patient:', error);
    }
  };

  const handleInsertAll = () => {
    if (!extractedData?.suggested_note_content) return;

    const fullNote = `
DOCUMENT ANALYSIS - ${extractedData.document_type?.toUpperCase() || 'CLINICAL DOCUMENT'}
Date: ${extractedData.document_date || 'Not specified'}
${extractedData.ordering_physician?.name ? `Ordering Provider: ${extractedData.ordering_physician.name}` : ''}

${extractedData.suggested_note_content}

${extractedData.orders?.length > 0 ? `\nPhysician Orders:\n${extractedData.orders.map(o => `- ${o}`).join('\n')}` : ''}

${extractedData.action_items?.length > 0 ? `\nAction Items:\n${extractedData.action_items.map(a => `- [${a.priority}] ${a.action} (${a.timeframe})`).join('\n')}` : ''}
`.trim();

    onInsertToNote?.(fullNote);
  };

  return (
    <Card className={`border-2 ${isExpanded ? 'border-blue-300' : 'border-gray-200'} bg-gradient-to-br from-blue-50 to-cyan-50`}>
      <CardHeader 
        className="pb-3 cursor-pointer bg-gradient-to-r from-blue-100 to-cyan-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>AI Document Analyzer</span>
            {uploadedFile && (
              <Badge variant="outline" className="text-xs">
                {uploadedFile.name}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-white">
            <input
              type="file"
              id="document-upload"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading || analyzing}
            />
            <label htmlFor="document-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {uploading ? 'Uploading...' : analyzing ? 'Analyzing document...' : 'Upload Clinical Document'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Physician orders, lab reports, discharge summaries, etc.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, PNG, JPG, DOC (max 10MB)
              </p>
            </label>
          </div>

          {/* Analysis Results */}
          {extractedData && !extractedData.error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Document Info */}
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-900">Document Information</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>Type:</strong> {extractedData.document_type || 'Unknown'}</p>
                    {extractedData.document_date && <p><strong>Date:</strong> {extractedData.document_date}</p>}
                    {extractedData.ordering_physician?.name && (
                      <p><strong>Provider:</strong> {extractedData.ordering_physician.name}</p>
                    )}
                  </div>
                </div>

                {/* Patient Identity Verification */}
                {extractedData.patient_identifiers && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-900">Verify Patient Identity</p>
                    </div>
                    <div className="text-sm space-y-1">
                      {extractedData.patient_identifiers.name && (
                        <p><strong>Name on document:</strong> {extractedData.patient_identifiers.name}</p>
                      )}
                      {patientData && (
                        <p className="text-amber-700">
                          <strong>Current patient:</strong> {patientData.first_name} {patientData.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Diagnoses */}
                {(extractedData.diagnoses?.primary || extractedData.diagnoses?.secondary?.length > 0) && (
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-purple-600" />
                        <p className="text-xs font-semibold text-purple-900">Diagnoses</p>
                      </div>
                      {patientId && extractedData.diagnoses?.primary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToPatient('primary_diagnosis', extractedData.diagnoses.primary)}
                          disabled={appliedFields.has('primary_diagnosis')}
                          className="h-6 text-xs"
                        >
                          {appliedFields.has('primary_diagnosis') ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Applied</>
                          ) : (
                            <><Plus className="w-3 h-3 mr-1" /> Update Profile</>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {extractedData.diagnoses.primary && (
                        <p><strong>Primary:</strong> {extractedData.diagnoses.primary}</p>
                      )}
                      {extractedData.diagnoses.secondary?.length > 0 && (
                        <div>
                          <strong>Secondary:</strong>
                          <ul className="ml-4 list-disc">
                            {extractedData.diagnoses.secondary.map((dx, idx) => (
                              <li key={idx}>{dx}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {extractedData.medications?.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-900">
                          Medications ({extractedData.medications.length})
                        </p>
                      </div>
                      {patientId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToPatient('medications', extractedData.medications)}
                          disabled={appliedFields.has('medications')}
                          className="h-6 text-xs"
                        >
                          {appliedFields.has('medications') ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Applied</>
                          ) : (
                            <><Plus className="w-3 h-3 mr-1" /> Update Profile</>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {extractedData.medications.map((med, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-green-300 pl-2">
                          <p className="font-medium">
                            {med.name}
                            {med.is_new && <Badge className="ml-2 text-xs bg-green-500">New</Badge>}
                          </p>
                          {med.dosage && <p className="text-gray-600">{med.dosage} - {med.frequency}</p>}
                          {med.indication && <p className="text-gray-500 text-xs">For: {med.indication}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vital Signs */}
                {extractedData.vital_signs && Object.keys(extractedData.vital_signs).length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-red-600" />
                      <p className="text-xs font-semibold text-red-900">Vital Signs</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {extractedData.vital_signs.blood_pressure && (
                        <p><strong>BP:</strong> {extractedData.vital_signs.blood_pressure}</p>
                      )}
                      {extractedData.vital_signs.heart_rate && (
                        <p><strong>HR:</strong> {extractedData.vital_signs.heart_rate}</p>
                      )}
                      {extractedData.vital_signs.temperature && (
                        <p><strong>Temp:</strong> {extractedData.vital_signs.temperature}</p>
                      )}
                      {extractedData.vital_signs.oxygen_saturation && (
                        <p><strong>O2:</strong> {extractedData.vital_signs.oxygen_saturation}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Lab Results */}
                {extractedData.lab_results?.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-indigo-900">Lab Results</p>
                    </div>
                    <div className="space-y-1">
                      {extractedData.lab_results.map((lab, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{lab.test_name}:</span>
                          <span className={lab.abnormal ? 'text-red-600 font-medium' : ''}>
                            {lab.value} {lab.unit}
                            {lab.abnormal && <AlertCircle className="w-3 h-3 inline ml-1" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Physician Orders */}
                {extractedData.orders?.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-900">Physician Orders</p>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {extractedData.orders.map((order, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{order}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {extractedData.action_items?.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <p className="text-xs font-semibold text-orange-900">Required Actions</p>
                    </div>
                    <div className="space-y-2">
                      {extractedData.action_items.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <Badge className={
                            item.priority === 'URGENT' ? 'bg-red-500' :
                            item.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                          }>
                            {item.priority}
                          </Badge>
                          <p className="mt-1">{item.action}</p>
                          <p className="text-xs text-gray-600">{item.timeframe}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={handleInsertAll}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Insert All to Note
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const content = JSON.stringify(extractedData, null, 2);
                      navigator.clipboard.writeText(content);
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {extractedData?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{extractedData.error}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}