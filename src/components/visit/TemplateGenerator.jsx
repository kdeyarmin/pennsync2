import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TemplateGenerator({ 
  patient, 
  visit, 
  vitalSigns, 
  previousVisit,
  onTemplateGenerated,
  isGenerating 
}) {
  const getVisitTypeDescription = (type) => {
    const descriptions = {
      skilled_nursing: "Skilled Nursing Visit",
      admission: "Admission/Start of Care",
      recertification: "Recertification Visit",
      discharge: "Discharge Visit",
      routine_visit: "Routine Visit",
      prn: "PRN Visit"
    };
    return descriptions[type] || type;
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">AI Smart Template</h3>
            <Alert className="bg-white border-purple-200 mb-4">
              <AlertDescription className="text-sm text-gray-700">
                Generate a pre-filled Medicare-compliant template based on:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Visit type: {getVisitTypeDescription(visit?.visit_type)}</li>
                  <li>Patient diagnosis: {patient?.primary_diagnosis || 'Not specified'}</li>
                  <li>Care type: {patient?.care_type === 'hospice' ? 'Hospice' : 'Home Health'}</li>
                  {previousVisit && <li>Previous visit trends and comparisons</li>}
                  {Object.keys(vitalSigns).length > 0 && <li>Current vital signs entered</li>}
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button
                onClick={onTemplateGenerated}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Template...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Smart Template
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              💡 Tip: Generate the template first, then add your observations via voice dictation. The AI will merge everything intelligently.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}