import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ClipboardList, User, Sparkles, FileText, Copy, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClinicalTemplateLibrary from "../components/templates/ClinicalTemplateLibrary";
import TemplateEditor from "../components/templates/TemplateEditor";

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const [templateContent, setTemplateContent] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ['templatePatients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
    initialData: [],
  });

  const handleSelectTemplate = (data) => {
    setSelectedTemplateData(data);
    setTemplateContent(data.content?.template_content || '');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(templateContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseInVisit = () => {
    if (selectedPatient && templateContent) {
      // Navigate to document visit with template
      navigate(`${createPageUrl("DocumentVisit")}?patientId=${selectedPatient}&template=${encodeURIComponent(templateContent.substring(0, 1000))}`);
    } else {
      alert('Please select a patient and generate a template first.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("Dashboard"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <ClipboardList className="w-10 h-10 text-blue-600" />
          Clinical Template Library
        </h1>
        <p className="text-slate-600">
          AI-intelligent documentation templates for various visit types and conditions
        </p>
      </div>

      {/* Patient Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Select Patient (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Patient</Label>
              <Select value={selectedPatient || ''} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient for personalized template..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} - {patient.primary_diagnosis || 'No diagnosis'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPatient && (
              <div className="flex items-end">
                <Alert className="flex-1 bg-blue-50 border-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Template will be personalized for this patient's diagnosis and care needs.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Template Library */}
        <div>
          <ClinicalTemplateLibrary onSelectTemplate={handleSelectTemplate} />
        </div>

        {/* Template Editor or Empty State */}
        <div>
          {selectedTemplateData ? (
            <div className="space-y-4">
              <TemplateEditor
                templateData={selectedTemplateData}
                patient={patients.find(p => p.id === selectedPatient)}
                onContentChange={setTemplateContent}
              />
              
              {/* Action Buttons */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleCopyToClipboard}
                      variant="outline"
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleUseInVisit}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Use in Visit Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Select a Template
                </h3>
                <p className="text-slate-500 max-w-sm">
                  Choose a visit type or condition template from the library to generate 
                  AI-powered clinical documentation.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Features Info */}
      <Card className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Template Library Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">📋 Visit Type Templates</h4>
              <p className="text-sm text-slate-600">
                Pre-built templates for Admission, Routine, Recertification, Discharge, PRN, 
                and Supervisory visits with all required Medicare elements.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">💊 Condition-Specific</h4>
              <p className="text-sm text-slate-600">
                Specialized templates for CHF, COPD, Diabetes, Wound Care, Stroke, 
                Orthopedic, Hospice, and Hypertension with condition-specific assessments.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">🤖 AI-Intelligent</h4>
              <p className="text-sm text-slate-600">
                Templates include clinical prompts, dropdown options for structured data, 
                and AI enhancement to complete documentation professionally.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}