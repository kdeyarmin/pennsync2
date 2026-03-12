import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CompletionCertificate({ completion, module, userName }) {
  const handleDownload = async () => {
    try {
      const response = await base44.functions.invoke('generateTrainingCertificate', {
        nurse_name: userName,
        module_title: module.title,
        completion_date: completion.completion_date,
        score: completion.score,
        certificate_id: completion.id
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${module.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    }
  };

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10 text-white" />
          </div>
          
          <div className="mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-gray-900">Module Completed!</h3>
            <p className="text-sm text-gray-600 mt-1">{module.title}</p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completion Date:</span>
              <span className="font-medium">
                {new Date(completion.completion_date).toLocaleDateString()}
              </span>
            </div>
            {completion.score && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Score:</span>
                <span className="font-bold text-green-600">{completion.score}%</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Certificate ID:</span>
              <span className="font-mono text-xs">{completion.id.slice(0, 8)}</span>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Certificate
          </Button>
          
          <p className="text-xs text-gray-500 mt-3">
            This certificate can be used for continuing education records
          </p>
        </div>
      </CardContent>
    </Card>
  );
}