import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PDFSignatureCapture from "./PDFSignatureCapture";
import { User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PatientInfoSignatureFlow({ 
  pdfTemplateUrl, 
  documentType = "Admission Consent",
  patientId,
  onComplete 
}) {
  const [step, setStep] = useState('info');
  const [preparedPdfUrl, setPreparedPdfUrl] = useState(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  
  const [patientInfo, setPatientInfo] = useState({
    patient_name: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    physician_name: '',
    physician_phone: '',
    insurance_provider: '',
    insurance_policy: '',
    admission_date: new Date().toISOString().split('T')[0]
  });

  const handleInputChange = (field, value) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePreparePdf = async () => {
    // Validate required fields
    if (!patientInfo.patient_name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (!patientInfo.date_of_birth) {
      toast.error("Date of birth is required");
      return;
    }

    setIsPreparingPdf(true);
    try {
      // Call backend to prepare PDF with patient info
      const response = await base44.functions.invoke('preparePDFWithPatientInfo', {
        pdf_template_url: pdfTemplateUrl,
        patient_info: patientInfo,
        patient_id: patientId,
        document_type: documentType
      });

      setPreparedPdfUrl(response.data.prepared_pdf_url);
      setStep('signature');
      toast.success("Document prepared! Please sign below.");
    } catch (error) {
      console.error("PDF preparation error:", error);
      toast.error(`Failed to prepare document: ${error.message}`);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (step === 'signature' && preparedPdfUrl) {
    return (
      <PDFSignatureCapture
        pdfUrl={preparedPdfUrl}
        patientId={patientId}
        documentType={documentType}
        signatureFields={[
          { name: "patient_signature", label: "Patient Signature", role: "Patient" },
          { name: "witness_signature", label: "Witness Signature", role: "Witness" }
        ]}
        formFields={[]}
        onComplete={(signedUrl) => {
          if (onComplete) {
            onComplete(signedUrl, patientInfo);
          }
        }}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Patient Information - {documentType}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Fill out patient information below. It will be automatically added to the document.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handlePreparePdf(); }} className="space-y-6">
          {/* Patient Demographics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient_name">Full Name *</Label>
                <Input
                  id="patient_name"
                  value={patientInfo.patient_name}
                  onChange={(e) => handleInputChange('patient_name', e.target.value)}
                  placeholder="John Smith"
                  required
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={patientInfo.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  required
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={patientInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={patientInfo.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Philadelphia"
                  className="text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={patientInfo.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="PA"
                    maxLength={2}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP</Label>
                  <Input
                    id="zip_code"
                    value={patientInfo.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    placeholder="19103"
                    className="text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={patientInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(215) 555-0123"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={patientInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="patient@email.com"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={patientInfo.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  placeholder="Jane Smith"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={patientInfo.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  placeholder="(215) 555-0124"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Physician Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Physician</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="physician_name">Physician Name</Label>
                <Input
                  id="physician_name"
                  value={patientInfo.physician_name}
                  onChange={(e) => handleInputChange('physician_name', e.target.value)}
                  placeholder="Dr. Sarah Johnson"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="physician_phone">Physician Phone</Label>
                <Input
                  id="physician_phone"
                  type="tel"
                  value={patientInfo.physician_phone}
                  onChange={(e) => handleInputChange('physician_phone', e.target.value)}
                  placeholder="(215) 555-0125"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Insurance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={patientInfo.insurance_provider}
                  onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                  placeholder="Medicare"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="insurance_policy">Policy Number</Label>
                <Input
                  id="insurance_policy"
                  value={patientInfo.insurance_policy}
                  onChange={(e) => handleInputChange('insurance_policy', e.target.value)}
                  placeholder="123456789A"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Admission Date */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Admission</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admission_date">Admission Date</Label>
                <Input
                  id="admission_date"
                  type="date"
                  value={patientInfo.admission_date}
                  onChange={(e) => handleInputChange('admission_date', e.target.value)}
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isPreparingPdf}
              className="bg-blue-600 hover:bg-blue-700 min-w-[200px]"
              size="lg"
            >
              {isPreparingPdf ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Preparing Document...
                </>
              ) : (
                <>
                  Continue to Signature
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}