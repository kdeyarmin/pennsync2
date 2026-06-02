import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Wand2, CheckCircle2 } from "lucide-react";

export default function AIDraftGenerator({ 
  visitType, 
  diagnosis, 
  patientData, 
  vitalSigns,
  recentVisits,
  carePlans,
  onDraftGenerated 
}) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const prompt = `Generate a preliminary rough note for a home health nurse based on the following information:

VISIT DETAILS:
- Visit Type: ${visitType}
- Primary Diagnosis: ${diagnosis}
- Visit Date: Today

PATIENT INFO:
- Name: ${patientData.first_name} ${patientData.last_name}
- Age: ${patientData.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
- Allergies: ${patientData.allergies || 'None documented'}
- Current Medications: ${patientData.current_medications?.map(m => m.name).join(', ') || 'None documented'}
- Living Situation: ${patientData.social_history?.living_situation || 'Not documented'}

VITAL SIGNS:
${vitalSigns.bp ? `- Blood Pressure: ${vitalSigns.bp}` : ''}
${vitalSigns.hr ? `- Heart Rate: ${vitalSigns.hr}` : ''}
${vitalSigns.temp ? `- Temperature: ${vitalSigns.temp}` : ''}
${vitalSigns.o2 ? `- O2 Saturation: ${vitalSigns.o2}${vitalSigns.o2Source === 'on_oxygen' ? ' on O2' : ' on room air'}` : ''}
${vitalSigns.pain ? `- Pain Level: ${vitalSigns.pain}/10` : ''}

RECENT VISIT CONTEXT:
${recentVisits?.[0] ? `Last visit (${recentVisits[0].visit_date}): ${recentVisits[0].nurse_notes?.substring(0, 150)}...` : 'No previous visits'}

ACTIVE CARE PLANS:
${carePlans?.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None active'}

Generate a ROUGH, BRIEF clinical note (150-250 words) that includes:
- Patient arrival/greeting
- Vital signs observations
- Brief assessment relevant to diagnosis
- Key interventions or observations
- Patient response

Keep it conversational and rough - the nurse will expand it later. Use natural language, not formal medical documentation yet.

Return ONLY the rough note text, no JSON wrapper.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      onDraftGenerated(result);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (error) {
      console.error('Draft generation error:', error);
      alert('Failed to generate draft. Please try again.');
    }
    setGenerating(false);
  };

  if (!diagnosis || !visitType) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" />
          AI Draft Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-white border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-xs text-slate-700">
            Let AI create a preliminary rough note based on your visit context, patient data, and vitals.
            You can then edit and expand it as needed.
          </AlertDescription>
        </Alert>

        <Button
          onClick={generateDraft}
          disabled={generating || generated}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Draft...
            </>
          ) : generated ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Draft Generated!
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Initial Draft
            </>
          )}
        </Button>

        {generated && (
          <p className="text-xs text-center text-green-600 font-medium">
            ✓ Draft added to your notes - review and edit as needed
          </p>
        )}
      </CardContent>
    </Card>
  );
}