import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Sparkles, Download, Copy, CheckCircle2 } from "lucide-react";
import { todayEastern } from "../utils/timezone";

export default function ReferralLetterGenerator({ patientId, patient }) {
  const [referralDate, setReferralDate] = useState(todayEastern());
  const [referringTo, setReferringTo] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [reasonForReferral, setReasonForReferral] = useState("");
  const [urgency, setUrgency] = useState("routine");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 5),
    enabled: !!patientId,
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const generateLetter = async () => {
    setIsGenerating(true);
    try {
      const recentVisit = visits[0];
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional medical referral letter.

FROM:
${currentUser?.full_name || 'Home Health Agency'}
Home Health Nursing Services
Date: ${referralDate}

TO:
${referringTo || '[Recipient Name]'}
${specialty ? `Specialty: ${specialty}` : ''}

PATIENT INFORMATION:
Name: ${patient.first_name} ${patient.last_name}
DOB: ${patient.date_of_birth || 'Not recorded'}
MRN: ${patient.medical_record_number || 'Not assigned'}

PRIMARY DIAGNOSIS: ${patient.primary_diagnosis || 'Not specified'}
SECONDARY DIAGNOSES: ${patient.secondary_diagnoses?.join(', ') || 'None'}

CURRENT MEDICATIONS:
${patient.current_medications?.map(med => `- ${med.name} ${med.dosage} ${med.frequency}`).join('\n') || '- See attached medication list'}

ALLERGIES: ${patient.allergies || 'No known allergies'}

REASON FOR REFERRAL:
${reasonForReferral}

CLINICAL BACKGROUND:
- Admission to Home Health: ${patient.admission_date || 'Not recorded'}
- Admission Source: ${patient.admission_source || 'Not specified'}
- Current Status: ${patient.status}

RECENT CLINICAL FINDINGS:
${recentVisit ? `
Most Recent Visit (${recentVisit.visit_date}):
- Vitals: BP ${recentVisit.vital_signs?.blood_pressure_systolic}/${recentVisit.vital_signs?.blood_pressure_diastolic}, HR ${recentVisit.vital_signs?.heart_rate}, O2 ${recentVisit.vital_signs?.oxygen_saturation}%
- Clinical Notes: ${recentVisit.nurse_notes?.substring(0, 300)}
` : 'No recent visit data available'}

FUNCTIONAL STATUS:
- Ambulation: ${patient.functional_status?.ambulation || 'Not assessed'}
- ADL Independence: ${patient.functional_status?.adl_independence || 'Not assessed'}
- Cognitive Status: ${patient.functional_status?.cognitive_status || 'Not assessed'}

URGENCY: ${urgency}

Generate a formal, professional referral letter with:
1. Proper letterhead format
2. Date and recipient information
3. Subject line with patient name
4. Professional salutation
5. Clear reason for referral
6. Relevant clinical history and findings
7. Current treatment plan
8. Specific questions or concerns
9. Request for consultation/treatment
10. Professional closing with contact information

Keep the tone professional and concise. Include all relevant clinical information.`,
        response_json_schema: {
          type: "object",
          properties: {
            letter: { type: "string" }
          }
        }
      });

      setGeneratedLetter(result.letter);
    } catch (error) {
      console.error("Error generating referral letter:", error);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-letter-${patient.last_name}-${referralDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Referral Letter Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Referral Date</Label>
              <Input 
                type="date" 
                value={referralDate} 
                onChange={(e) => setReferralDate(e.target.value)}
                max={todayEastern()}
              />
            </div>
            <div>
              <Label>Urgency</Label>
              <select 
                className="w-full h-10 px-3 border border-gray-300 rounded-md"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Referring To (Name/Facility) *</Label>
              <Input 
                placeholder="Dr. Smith / ABC Medical Center" 
                value={referringTo} 
                onChange={(e) => setReferringTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input 
                placeholder="e.g., Cardiology, Orthopedics" 
                value={specialty} 
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Reason for Referral *</Label>
            <Textarea 
              placeholder="Describe why you are referring this patient..."
              value={reasonForReferral}
              onChange={(e) => setReasonForReferral(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={generateLetter} 
            disabled={isGenerating || !referringTo || !reasonForReferral}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isGenerating ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" /> Generating...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Generate Referral Letter</>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedLetter && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle2 className="w-5 h-5" />
                Generated Referral Letter
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded border border-green-200 whitespace-pre-wrap font-mono text-sm">
              {generatedLetter}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}