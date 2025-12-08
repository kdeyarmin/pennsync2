import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Sparkles, Download, Copy, CheckCircle2 } from "lucide-react";

export default function PatientEducationGenerator({ patientId, patient }) {
  const [topic, setTopic] = useState("");
  const [readingLevel, setReadingLevel] = useState("6th-grade");
  const [includeImages, setIncludeImages] = useState(false);
  const [generatedMaterial, setGeneratedMaterial] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");

  const generateEducationMaterial = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate patient education material tailored for home health patients.

PATIENT CONTEXT:
Name: ${patient.first_name} ${patient.last_name}
Primary Diagnosis: ${patient.primary_diagnosis || 'General home health'}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Cognitive Status: ${patient.functional_status?.cognitive_status || 'Not assessed'}
Primary Language: ${patient.social_history?.primary_language || 'English'}

EDUCATION TOPIC: ${topic || patient.primary_diagnosis || 'General Home Health Care'}

REQUIREMENTS:
- Reading Level: ${readingLevel}
- Language: Simple, easy to understand
- Cultural Sensitivity: Yes
- Include practical examples: Yes
${includeImages ? '- Include image descriptions where helpful' : ''}

Generate comprehensive patient education material with:

1. TITLE (Clear and descriptive)

2. WHAT YOU NEED TO KNOW
   - Simple explanation of the condition/topic
   - Why this is important for you

3. SIGNS AND SYMPTOMS TO WATCH FOR
   - What's normal
   - What's concerning
   - When to call your nurse or doctor

4. DAILY CARE INSTRUCTIONS
   - Step-by-step what to do
   - How often to do it
   - Tips to make it easier

5. MEDICATIONS (if applicable)
   - Why you're taking them
   - How to take them correctly
   - Side effects to watch for

6. LIFESTYLE TIPS
   - Diet recommendations
   - Activity guidelines
   - Things to avoid

7. WHEN TO GET HELP
   - Warning signs (RED FLAGS in bold)
   - Emergency situations
   - Non-emergency concerns

8. QUESTIONS TO ASK YOUR HEALTHCARE TEAM
   - Important questions to remember

9. RESOURCES
   - Who to call for help
   - Support groups or additional information

FORMAT REQUIREMENTS:
- Use bullet points and short paragraphs
- Bold important information
- Use simple words (avoid medical jargon, or explain it simply)
- Include specific examples
- Add "✓" for do's and "✗" for don'ts
- Make it actionable and practical

Keep language at ${readingLevel} reading level. Be encouraging and supportive in tone.`,
        response_json_schema: {
          type: "object",
          properties: {
            material: { type: "string" }
          }
        }
      });

      setGeneratedMaterial(result.material);
    } catch (error) {
      console.error("Error generating education material:", error);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMaterial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedMaterial], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-education-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
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
            <GraduationCap className="w-5 h-5 text-purple-600" />
            Patient Education Material Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Education Topic</Label>
            <Textarea 
              placeholder={`e.g., "Managing CHF at home", "Wound care instructions", "Diabetes management"...`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
            />
            {!topic && patient.primary_diagnosis && (
              <p className="text-sm text-gray-500 mt-1">
                Default: {patient.primary_diagnosis}
              </p>
            )}
          </div>

          <div>
            <Label>Reading Level</Label>
            <select 
              className="w-full h-10 px-3 border border-gray-300 rounded-md"
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value)}
            >
              <option value="5th-grade">5th Grade (Very Simple)</option>
              <option value="6th-grade">6th Grade (Simple)</option>
              <option value="8th-grade">8th Grade (Standard)</option>
              <option value="high-school">High School</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="includeImages"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="includeImages" className="cursor-pointer">
              Include image descriptions
            </Label>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-900">
              <strong>Tailored for:</strong> {patient.first_name} {patient.last_name}
              {patient.functional_status?.cognitive_status && (
                <> • Cognitive Status: {patient.functional_status.cognitive_status}</>
              )}
            </p>
          </div>

          <Button 
            onClick={generateEducationMaterial} 
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" /> Generating...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Generate Education Material</>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedMaterial && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle2 className="w-5 h-5" />
                Patient Education Material
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
            <div className="bg-white p-6 rounded border border-green-200 prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {generatedMaterial}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}