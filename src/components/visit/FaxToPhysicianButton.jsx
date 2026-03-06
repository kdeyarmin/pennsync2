import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function FaxToPhysicianButton({ visit, patient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPhysician, setSelectedPhysician] = useState('');
  const [customFaxNumber, setCustomFaxNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get list of physicians from patient data
  const physicians = [];
  if (patient?.physician_name && patient?.physician_phone) {
    physicians.push({
      id: 'primary',
      name: patient.physician_name,
      faxNumber: patient.physician_phone
    });
  }

  const handleFaxToPhysician = async () => {
    if (!selectedPhysician && !customFaxNumber) {
      setError('Please select or enter a physician fax number');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Generate PDF from visit note
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const textWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Header
      pdf.setFontSize(16);
      pdf.text('Visit Note', margin, yPosition);
      yPosition += 10;

      // Patient info
      pdf.setFontSize(10);
      pdf.text([
        `Patient: ${patient.first_name} ${patient.last_name}`,
        `DOB: ${patient.date_of_birth || 'N/A'}`,
        `MRN: ${patient.medical_record_number || 'N/A'}`
      ], margin, yPosition);
      yPosition += 20;

      // Visit details
      pdf.setFontSize(12);
      pdf.text('Visit Details', margin, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.text([
        `Date: ${visit.visit_date}`,
        `Type: ${visit.visit_type}`,
        `Status: ${visit.status}`
      ], margin, yPosition);
      yPosition += 20;

      // Visit notes
      if (visit.nurse_notes) {
        pdf.setFontSize(12);
        pdf.text('Clinical Notes', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);

        const splitText = pdf.splitTextToSize(visit.nurse_notes, textWidth);
        pdf.text(splitText, margin, yPosition);
        yPosition += splitText.length * 5;
      }

      // Vital signs if available
      if (visit.vital_signs && Object.keys(visit.vital_signs).length > 0) {
        yPosition += 10;
        pdf.setFontSize(12);
        pdf.text('Vital Signs', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);

        const vitalLines = [];
        if (visit.vital_signs.temperature) vitalLines.push(`Temperature: ${visit.vital_signs.temperature}°F`);
        if (visit.vital_signs.blood_pressure_systolic) vitalLines.push(`BP: ${visit.vital_signs.blood_pressure_systolic}/${visit.vital_signs.blood_pressure_diastolic}`);
        if (visit.vital_signs.heart_rate) vitalLines.push(`HR: ${visit.vital_signs.heart_rate} bpm`);
        if (visit.vital_signs.oxygen_saturation) vitalLines.push(`O2 Sat: ${visit.vital_signs.oxygen_saturation}%`);
        if (visit.vital_signs.weight) vitalLines.push(`Weight: ${visit.vital_signs.weight} lbs`);

        pdf.text(vitalLines, margin, yPosition);
      }

      // Convert PDF to base64
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      // Determine fax number to use
      const faxNumber = customFaxNumber || physicians.find(p => p.id === selectedPhysician)?.faxNumber;

      // Call backend function to send fax
      const response = await base44.functions.invoke('faxVisitToPhysician', {
        visitId: visit.id,
        patientId: patient.id,
        physicianFaxNumber: faxNumber,
        pdfBase64
      });

      if (response.data?.success) {
        toast.success('Visit note faxed to physician successfully');
        setIsOpen(false);
        setSelectedPhysician('');
        setCustomFaxNumber('');
      } else {
        setError(response.data?.error || 'Failed to send fax');
        toast.error('Failed to send fax');
      }
    } catch (err) {
      console.error('Error sending fax:', err);
      setError(err.message || 'An error occurred while sending the fax');
      toast.error('Error sending fax');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        Fax to Physician
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fax Visit Note to Physician</DialogTitle>
            <DialogDescription>
              Send this visit note directly to {patient.physician_name || 'the patient\'s physician'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Physician selection */}
            {physicians.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Select Physician
                </label>
                <Select value={selectedPhysician} onValueChange={setSelectedPhysician}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a physician" />
                  </SelectTrigger>
                  <SelectContent>
                    {physicians.map(phys => (
                      <SelectItem key={phys.id} value={phys.id}>
                        {phys.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Fax: {physicians.find(p => p.id === selectedPhysician)?.faxNumber || 'N/A'}
                </p>
              </div>
            )}

            {/* Custom fax number */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {physicians.length > 0 ? 'Or enter custom fax number' : 'Fax Number'}
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={customFaxNumber}
                onChange={(e) => setCustomFaxNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <strong>Visit:</strong> {visit.visit_date} - {visit.visit_type}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Patient:</strong> {patient.first_name} {patient.last_name}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFaxToPhysician}
                disabled={isLoading || (!selectedPhysician && !customFaxNumber)}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Fax
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}