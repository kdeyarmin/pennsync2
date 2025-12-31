import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReferralPDFSummarizer from "../components/referral/ReferralPDFSummarizer";
import ReferralAnalyzer from "../components/referral/ReferralAnalyzer";
import AIAdmissionDocumentationAssistant from "../components/clinical/AIAdmissionDocumentationAssistant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, UserPlus, ArrowRight } from "lucide-react";

export default function ReferralProcessor() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [extractedData, setExtractedData] = useState(null);
  const [referralAnalysis, setReferralAnalysis] = useState(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const createPatientFromReferral = async () => {
    if (!extractedData) return;

    setIsCreatingPatient(true);
    try {
      const patientData = {
        first_name: extractedData.demographics?.full_name?.split(' ')[0] || 'Unknown',
        last_name: extractedData.demographics?.full_name?.split(' ').slice(1).join(' ') || 'Unknown',
        date_of_birth: extractedData.demographics?.date_of_birth || null,
        address: extractedData.demographics?.address || null,
        phone: extractedData.demographics?.phone || null,
        email: null,
        emergency_contact_name: extractedData.demographics?.emergency_contact || null,
        emergency_contact_phone: extractedData.demographics?.emergency_phone || null,
        emergency_contact_relationship: extractedData.demographics?.emergency_relationship || null,
        physician_name: extractedData.demographics?.primary_care_physician || extractedData.demographics?.referring_physician || null,
        physician_phone: extractedData.demographics?.pcp_contact || extractedData.demographics?.referring_physician_contact || null,
        primary_diagnosis: extractedData.diagnoses?.primary_diagnosis || null,
        secondary_diagnoses: extractedData.diagnoses?.secondary_diagnoses || [],
        allergies: extractedData.diagnoses?.allergies || null,
        current_medications: extractedData.medications || [],
        admission_date: extractedData.admission_details?.admission_date || new Date().toISOString().split('T')[0],
        admission_source: extractedData.admission_details?.admission_source || 'home',
        care_type: 'home_health',
        status: 'active'
      };

      const newPatient = await base44.entities.Patient.create(patientData);
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      alert('Patient created successfully! Redirecting to Smart Note Assistant...');
      navigate(createPageUrl(`SmartNoteAssistant`));
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient. Please try again or create manually.');
    }
    setIsCreatingPatient(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Referral Processor</h1>
        <p className="text-sm sm:text-base text-gray-600">Upload and process patient referral PDFs for admission</p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300">
          <FileText className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <p className="font-semibold mb-2">🚀 AI-Powered Referral Processing</p>
            <p className="text-sm mb-1">Upload referrals from any source (PDFs, faxes, scanned documents) to automatically:</p>
            <ul className="text-sm ml-4 space-y-0.5 list-disc">
              <li><strong>Extract & categorize</strong> all patient data with intelligent field mapping</li>
              <li><strong>Flag incomplete information</strong> with actionable prompts for missing data</li>
              <li><strong>Prioritize by urgency</strong> using clinical factors and requested start dates</li>
              <li><strong>Recommend scheduling</strong> and optimal nurse assignments based on skills</li>
            </ul>
          </AlertDescription>
        </Alert>

        <ReferralPDFSummarizer
          onDataExtracted={(data) => setExtractedData(data)}
          onUseForAdmission={(data) => {
            navigate(createPageUrl('SmartNoteAssistant'));
          }}
        />

        {extractedData && (
          <ReferralAnalyzer
            referralData={extractedData}
            onAnalysisComplete={(analysis) => setReferralAnalysis(analysis)}
          />
        )}

        {extractedData && (
          <>
            <AIAdmissionDocumentationAssistant
              referralData={extractedData}
              oasisSuggestions={null}
              patientData={null}
              onSaveSection={(title, content) => {
                console.log(`Saving ${title}:`, content);
              }}
            />

            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-3 sm:mb-4">Next Steps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={createPatientFromReferral}
                    disabled={isCreatingPatient}
                    className="bg-green-600 hover:bg-green-700 w-full min-h-[44px]"
                  >
                    {isCreatingPatient ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Create Patient & Start Admission</span>
                    <span className="sm:hidden">Create & Start</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl('SmartNoteAssistant'))}
                    className="w-full min-h-[44px]"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Go to Smart Note Assistant</span>
                    <span className="sm:hidden">Smart Notes</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}