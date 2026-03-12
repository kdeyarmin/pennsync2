import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Save, 
  CheckCircle2, 
  ClipboardList, 
  Stethoscope,
  RotateCcw,
  ArrowRight
} from "lucide-react";

export default function NextStepsPanel({
  copied,
  isSaving,
  savedSuccessfully,
  onCopy,
  onSave,
  onGenerateTasks,
  onGenerateCarePlans,
  onStartNew,
  complianceScore
}) {
  return (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Next Steps
          </CardTitle>
          {complianceScore && (
            <Badge className={`${
              complianceScore >= 90 ? 'bg-green-600' :
              complianceScore >= 70 ? 'bg-yellow-600' :
              'bg-red-600'
            } text-white`}>
              {complianceScore}% Compliant
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <p className="text-sm text-green-800 font-medium mb-3">
            ✓ Your note is ready! Choose what to do next:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={onCopy}
              variant={copied ? "outline" : "default"}
              className={`w-full justify-between ${copied ? '' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <span className="flex items-center gap-2">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy to EHR'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              onClick={onSave}
              disabled={isSaving || savedSuccessfully}
              variant="default"
              className="w-full justify-between bg-blue-600 hover:bg-blue-700"
            >
              <span className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : savedSuccessfully ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save to Chart
                  </>
                )}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2 uppercase font-semibold">Optional Actions</p>
          <div className="space-y-2">
            <Button
              onClick={onGenerateTasks}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Generate Follow-up Tasks
            </Button>
            
            <Button
              onClick={onGenerateCarePlans}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              Generate Care Plans
            </Button>

            <Button
              onClick={onStartNew}
              variant="outline"
              size="sm"
              className="w-full justify-start text-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start New Note
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 rounded p-2 border border-blue-200">
          <p className="text-xs text-blue-800">
            💡 <strong>Tip:</strong> Review the AI Quality Review above for any final improvements before copying to your EHR.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}