import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Sparkles,
  Download,
  Printer,
  Mail,
  Copy,
  FileText,
  Heart,
  Wind,
  Droplet,
  Pill
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const commonConditions = [
  { value: "CHF", label: "Congestive Heart Failure", icon: Heart },
  { value: "COPD", label: "COPD", icon: Wind },
  { value: "Diabetes", label: "Diabetes", icon: Droplet },
  { value: "Hypertension", label: "Hypertension", icon: Heart },
  { value: "Wound Care", label: "Wound Care", icon: FileText },
  { value: "Post-Surgical", label: "Post-Surgical Care", icon: Pill },
  { value: "Custom", label: "Custom Topic", icon: BookOpen }
];

export default function PatientEducationGenerator() {
  const [selectedCondition, setSelectedCondition] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [readingLevel, setReadingLevel] = useState("5th-6th");
  const [language, setLanguage] = useState("English");
  const [format, setFormat] = useState("comprehensive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMaterial, setGeneratedMaterial] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const generateMaterial = async () => {
    const topic = selectedCondition === "Custom" ? customTopic : selectedCondition;
    if (!topic) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate Medicare-compliant patient education material for Pennsylvania home health patients.

TOPIC: ${topic}
READING LEVEL: ${readingLevel} grade
LANGUAGE: ${language}
FORMAT: ${format}

MEDICARE REQUIREMENTS (42 CFR 484.60):
- Patient/caregiver must receive education appropriate to their needs
- Education must be in language and format patient can understand
- Must cover disease management, medication adherence, safety, when to call MD
- Include teach-back verification questions
- Emergency contact information included

STRUCTURE REQUIRED:
1. TITLE - Clear, simple condition name
2. WHAT IS IT? - Simple explanation (2-3 sentences at ${readingLevel} grade reading level)
3. WARNING SIGNS - When to call doctor immediately (bullet points)
4. DAILY MANAGEMENT:
   - What to do every day
   - Medication reminders
   - Activity guidelines
   - Diet recommendations (if relevant)
5. SAFETY TIPS - Fall prevention, home safety specific to condition
6. MEDICATION ADHERENCE - Why it's important, tips to remember
7. WHEN TO CALL YOUR DOCTOR - Specific symptoms list
8. EMERGENCY - When to call 911 (clear criteria)
9. TEACH-BACK QUESTIONS - 3-5 questions to verify understanding
10. EMERGENCY CONTACTS - Template for patient to fill in

USE:
- Simple words (avoid medical jargon or explain it)
- Short sentences
- Bullet points for easy reading
- Active voice
- Positive, encouraging tone
- Culturally appropriate for Pennsylvania home health patients

Return JSON with: title, what_is_it, warning_signs (array), daily_management (object with subsections), safety_tips (array), medication_section, when_to_call_doctor (array), emergency_criteria (array), teach_back_questions (array), contact_template.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            what_is_it: { type: "string" },
            warning_signs: { type: "array", items: { type: "string" } },
            daily_management: {
              type: "object",
              properties: {
                daily_tasks: { type: "array", items: { type: "string" } },
                medication_reminders: { type: "array", items: { type: "string" } },
                activity_guidelines: { type: "string" },
                diet_recommendations: { type: "string" }
              }
            },
            safety_tips: { type: "array", items: { type: "string" } },
            medication_section: { type: "string" },
            when_to_call_doctor: { type: "array", items: { type: "string" } },
            emergency_criteria: { type: "array", items: { type: "string" } },
            teach_back_questions: { type: "array", items: { type: "string" } },
            contact_template: { type: "string" }
          }
        }
      });

      setGeneratedMaterial(result);
    } catch (error) {
      console.error('Error generating material:', error);
      alert('Failed to generate education material. Please try again.');
    }
    setIsGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!generatedMaterial) return;
    
    const text = `
${generatedMaterial.title}

WHAT IS ${generatedMaterial.title}?
${generatedMaterial.what_is_it}

⚠️ WARNING SIGNS - Call Your Doctor Right Away If:
${generatedMaterial.warning_signs.map(s => `• ${s}`).join('\n')}

DAILY MANAGEMENT

What to Do Every Day:
${generatedMaterial.daily_management.daily_tasks.map(t => `• ${t}`).join('\n')}

Medication Reminders:
${generatedMaterial.daily_management.medication_reminders.map(r => `• ${r}`).join('\n')}

${generatedMaterial.daily_management.activity_guidelines}

${generatedMaterial.daily_management.diet_recommendations}

SAFETY TIPS
${generatedMaterial.safety_tips.map(t => `• ${t}`).join('\n')}

MEDICATION ADHERENCE
${generatedMaterial.medication_section}

WHEN TO CALL YOUR DOCTOR
${generatedMaterial.when_to_call_doctor.map(w => `• ${w}`).join('\n')}

🚨 CALL 911 IMMEDIATELY IF:
${generatedMaterial.emergency_criteria.map(e => `• ${e}`).join('\n')}

QUESTIONS TO CHECK YOUR UNDERSTANDING
${generatedMaterial.teach_back_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

${generatedMaterial.contact_template}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = async () => {
    const recipient = prompt("Enter patient or caregiver email:");
    if (!recipient || !generatedMaterial) return;

    try {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject: `Patient Education: ${generatedMaterial.title}`,
        body: `
Hello,

Please find attached important education material about ${generatedMaterial.title}.

${generatedMaterial.what_is_it}

For complete information, please review the full material.

This education is provided as part of your home health care.

Best regards,
${currentUser?.full_name || 'Your Home Health Team'}
        `.trim()
      });
      alert('Education material sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <span className="truncate">Patient Education Material Generator</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-2">Create Medicare-compliant, easy-to-understand education materials for home health patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Configure Material</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm font-medium mb-2">Select Condition</p>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger className="h-11 touch-target">
                    <SelectValue placeholder="Choose condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {commonConditions.map(condition => (
                      <SelectItem key={condition.value} value={condition.value}>
                        <div className="flex items-center gap-2">
                          <condition.icon className="w-4 h-4" />
                          {condition.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCondition === "Custom" && (
                <div>
                  <p className="text-sm font-medium mb-2">Custom Topic</p>
                  <Input 
                    placeholder="Enter condition or topic..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Reading Level</p>
                <Select value={readingLevel} onValueChange={setReadingLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3rd-4th">3rd-4th Grade (Very Simple)</SelectItem>
                    <SelectItem value="5th-6th">5th-6th Grade (Simple)</SelectItem>
                    <SelectItem value="7th-8th">7th-8th Grade (Moderate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Format</p>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="quick_reference">Quick Reference</SelectItem>
                    <SelectItem value="caregiver_focused">Caregiver Focused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={generateMaterial}
                disabled={isGenerating || !selectedCondition}
                className="w-full min-h-[44px]"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Material
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedMaterial && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm text-green-900">Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-2">
                <Button onClick={handlePrint} variant="outline" className="w-full min-h-[44px]">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button onClick={handleCopy} variant="outline" className="w-full min-h-[44px]">
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Text'}
                </Button>
                <Button onClick={handleEmail} variant="outline" className="w-full min-h-[44px]">
                  <Mail className="w-4 h-4 mr-2" />
                  Email to Patient
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {!generatedMaterial ? (
            <Card className="h-full flex items-center justify-center border-dashed border-2">
              <CardContent className="text-center py-8 sm:py-12 p-4">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a condition and click Generate to create patient education material</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="print:shadow-none">
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="text-center border-b-2 border-blue-600 pb-3 sm:pb-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900">{generatedMaterial.title}</h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2">Patient Education Material</p>
                </div>

                {/* What Is It */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    What is {generatedMaterial.title}?
                  </h2>
                  <p className="text-gray-700 leading-relaxed">{generatedMaterial.what_is_it}</p>
                </div>

                {/* Warning Signs */}
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-red-900 mb-3">⚠️ Call Your Doctor Right Away If:</h2>
                  <ul className="space-y-2">
                    {generatedMaterial.warning_signs.map((sign, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-800">
                        <span className="font-bold">•</span>
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Daily Management */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Daily Management</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">What to Do Every Day:</h3>
                      <ul className="space-y-1">
                        {generatedMaterial.daily_management.daily_tasks.map((task, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span>✓</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">Medication Reminders:</h3>
                      <ul className="space-y-1">
                        {generatedMaterial.daily_management.medication_reminders.map((reminder, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span>💊</span>
                            <span>{reminder}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {generatedMaterial.daily_management.activity_guidelines && (
                      <div className="bg-blue-50 p-3 rounded">
                        <h3 className="font-semibold text-blue-900 mb-1">Activity Guidelines:</h3>
                        <p className="text-gray-700">{generatedMaterial.daily_management.activity_guidelines}</p>
                      </div>
                    )}

                    {generatedMaterial.daily_management.diet_recommendations && (
                      <div className="bg-green-50 p-3 rounded">
                        <h3 className="font-semibold text-green-900 mb-1">Diet Recommendations:</h3>
                        <p className="text-gray-700">{generatedMaterial.daily_management.diet_recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-yellow-900 mb-3">🛡️ Safety Tips</h2>
                  <ul className="space-y-2">
                    {generatedMaterial.safety_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-yellow-900">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Medication Adherence */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">💊 Taking Your Medications</h2>
                  <p className="text-gray-700 leading-relaxed">{generatedMaterial.medication_section}</p>
                </div>

                {/* When to Call Doctor */}
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-orange-900 mb-3">📞 When to Call Your Doctor</h2>
                  <ul className="space-y-2">
                    {generatedMaterial.when_to_call_doctor.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-orange-900">
                        <span>•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Emergency */}
                <div className="bg-red-100 border-4 border-red-600 rounded-lg p-4">
                  <h2 className="text-xl font-bold text-red-900 mb-3">🚨 CALL 911 IMMEDIATELY IF:</h2>
                  <ul className="space-y-2">
                    {generatedMaterial.emergency_criteria.map((criteria, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-900 font-medium">
                        <span>•</span>
                        <span>{criteria}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Teach-Back Questions */}
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-blue-900 mb-3">❓ Questions to Check Your Understanding</h2>
                  <ol className="space-y-2">
                    {generatedMaterial.teach_back_questions.map((question, idx) => (
                      <li key={idx} className="text-blue-900">
                        <strong>{idx + 1}.</strong> {question}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Contact Template */}
                <div className="border-2 border-gray-300 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">📋 My Important Contacts</h2>
                  <div className="whitespace-pre-line text-gray-700 font-mono text-sm">
                    {generatedMaterial.contact_template}
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 border-t pt-4 print:block">
                  <p>This education material was provided by your home health team.</p>
                  <p>Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}