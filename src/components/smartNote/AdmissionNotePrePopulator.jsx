import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCcw
} from "lucide-react";

export default function AdmissionNotePrePopulator({ 
  referralData, 
  intakeAnalysis,
  patientData,
  onNoteGenerated,
  autoGenerate = true
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (autoGenerate && referralData && !generatedNote && !generating) {
      handleGenerate();
    }
  }, [referralData, autoGenerate]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('generateAdmissionNoteFromReferral', {
        referralData,
        intakeAnalysis,
        patientData
      });

      const note = response.data?.admission_note || response.admission_note;
      setGeneratedNote(note);
      onNoteGenerated?.(note);
    } catch (err) {
      console.error('Failed to generate admission note:', err);
      setError('Failed to generate admission note. Please try again.');
    }
    
    setGenerating(false);
  };

  const handleUseNote = () => {
    if (generatedNote) {
      onNoteGenerated?.(generatedNote);
    }
  };

  if (generating) {
    return (
      <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
          <p className="text-blue-900 font-medium">Generating admission note from referral...</p>
          <p className="text-sm text-blue-700 mt-1">Analyzing referral data and patient information</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-300">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          {error}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            className="ml-2"
          >
            <RefreshCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (generatedNote) {
    return (
      <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            AI-Generated Admission Note
            <Badge className="bg-green-600 text-white ml-auto">Pre-Populated</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-blue-50 border-blue-300">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Success!</strong> The admission note has been automatically populated with referral data. 
              You can review and add additional observations below.
            </AlertDescription>
          </Alert>
          
          <div className="bg-white rounded border border-green-300 p-3 max-h-[300px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-700">
              {generatedNote}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleUseNote}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Use This Note
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
            >
              <RefreshCcw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Auto-Generate Admission Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Generate a comprehensive admission note pre-populated with data from the referral analysis.
        </p>
        <Button
          onClick={handleGenerate}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Admission Note
        </Button>
      </CardContent>
    </Card>
  );
}