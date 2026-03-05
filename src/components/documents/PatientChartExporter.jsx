import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileOutput, Download, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PatientChartExporter({ patient, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [options, setOptions] = useState({
    includeVisits: true,
    includeCare: true,
    includeIncidents: true,
  });

  const handleExport = async () => {
    if (!patient?.id) {
      setError('Patient information not available');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        base44.functions.getEndpoint('generatePatientChartPDF'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${base44.auth.getToken()}`,
          },
          body: JSON.stringify({
            patientId: patient.id,
            ...options,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient_chart_${patient.medical_record_number || patient.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setIsOpen(false);
      setIsGenerating(false);
    } catch (err) {
      console.error('Error exporting chart:', err);
      setError(err.message || 'Failed to export patient chart');
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <FileOutput className="w-4 h-4" />
          Export Chart
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Patient Chart
          </DialogTitle>
          <DialogDescription>
            Generate a professional, HIPAA-compliant PDF of {patient?.first_name} {patient?.last_name}'s medical chart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* HIPAA Compliance Notice */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              This PDF will be marked as confidential and include HIPAA compliance notices. Only share with authorized healthcare providers.
            </AlertDescription>
          </Alert>

          {/* Export Options */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Include in Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="visits"
                  checked={options.includeVisits}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeVisits: checked })
                  }
                />
                <Label
                  htmlFor="visits"
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  Visit History
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="care"
                  checked={options.includeCare}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeCare: checked })
                  }
                />
                <Label
                  htmlFor="care"
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  Care Plans
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="incidents"
                  checked={options.includeIncidents}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeIncidents: checked })
                  }
                />
                <Label
                  htmlFor="incidents"
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  Incident Reports
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-xs text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isGenerating}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}