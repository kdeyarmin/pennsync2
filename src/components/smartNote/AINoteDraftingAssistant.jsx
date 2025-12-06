import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bot,
  Stethoscope,
  Activity,
  BookOpen,
  Loader2,
  Copy,
  CheckCircle2,
  Plus,
  Sparkles,
  MessageSquare,
  ChevronDown
} from "lucide-react";

export default function AINoteDraftingAssistant({
  vitalSigns,
  diagnosis,
  patientContext,
  symptoms,
  onInsertText
}) {
  const [activeTab, setActiveTab] = useState("assessment");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState({
    assessment: "",
    interventions: "",
    patientResponse: ""
  });
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(null);

  const generateAssessment = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate objective assessment findings for a home health nursing visit note.

VITAL SIGNS:
${vitalSigns?.bp ? `- Blood Pressure: ${vitalSigns.bp}` : ''}
${vitalSigns?.hr ? `- Heart Rate: ${vitalSigns.hr}` : ''}
${vitalSigns?.temp ? `- Temperature: ${vitalSigns.temp}` : ''}
${vitalSigns?.o2 ? `- Oxygen Saturation: ${vitalSigns.o2}` : ''}
${vitalSigns?.pain ? `- Pain Level: ${vitalSigns.pain}` : ''}

DIAGNOSIS: ${diagnosis || 'Not specified'}

PATIENT CONTEXT: ${patientContext || 'Home health patient'}

Write professional, objective clinical assessment findings in narrative format. Include:
1. General appearance and mental status
2. Vital signs interpretation (normal/abnormal findings)
3. System-specific assessments relevant to diagnosis
4. Functional status observations
5. Safety assessment of home environment

Use proper medical terminology. Be concise but thorough.`,
        response_json_schema: {
          type: "object",
          properties: {
            assessment: { type: "string" }
          }
        }
      });
      setGeneratedContent(prev => ({ ...prev, assessment: result.assessment }));

      // Log AI generation
      logActivity(ActivityActions.NOTE_AI_GENERATED, {
        content_type: 'assessment',
        diagnosis: diagnosis,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error("Error generating assessment:", error);
    }
    setIsGenerating(false);
  };

  const generateInterventions = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate appropriate nursing interventions for a home health visit note.

DIAGNOSIS: ${diagnosis || 'Not specified'}
SYMPTOMS/OBSERVATIONS: ${symptoms || 'Standard assessment'}
PATIENT CONTEXT: ${patientContext || 'Home health patient'}

VITAL SIGNS:
${vitalSigns?.bp ? `- Blood Pressure: ${vitalSigns.bp}` : ''}
${vitalSigns?.hr ? `- Heart Rate: ${vitalSigns.hr}` : ''}
${vitalSigns?.o2 ? `- Oxygen Saturation: ${vitalSigns.o2}` : ''}

Generate skilled nursing interventions that:
1. Address the primary diagnosis
2. Are Medicare-compliant (require RN skill/judgment)
3. Include specific actions taken during visit
4. Document any wound care, medication management, or disease teaching
5. Note coordination with other team members if applicable

Format as a narrative paragraph suitable for clinical documentation.`,
        response_json_schema: {
          type: "object",
          properties: {
            interventions: { type: "string" }
          }
        }
      });
      setGeneratedContent(prev => ({ ...prev, interventions: result.interventions }));
    } catch (error) {
      console.error("Error generating interventions:", error);
    }
    setIsGenerating(false);
  };

  const generatePatientResponse = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate patient response and education documentation for a home health nursing note.

DIAGNOSIS: ${diagnosis || 'Not specified'}
PATIENT CONTEXT: ${patientContext || 'Home health patient'}

Generate documentation that includes:

1. PATIENT RESPONSE TO INTERVENTIONS:
   - How patient tolerated procedures/care
   - Patient's reported symptoms/comfort level
   - Any changes from previous visit

2. PATIENT/CAREGIVER EDUCATION:
   - Topics taught during visit
   - Teaching methods used
   - Patient's understanding level (use teach-back documentation)

3. PATIENT RESPONSE TO EDUCATION:
   - Evidence of comprehension
   - Ability to demonstrate skills if applicable
   - Need for reinforcement

Format as narrative paragraphs suitable for Medicare-compliant clinical documentation. Include specific teach-back responses.`,
        response_json_schema: {
          type: "object",
          properties: {
            patientResponse: { type: "string" }
          }
        }
      });
      setGeneratedContent(prev => ({ ...prev, patientResponse: result.patientResponse }));
    } catch (error) {
      console.error("Error generating patient response:", error);
    }
    setIsGenerating(false);
  };

  const generateCustom = async () => {
    if (!customPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation assistant for home health nursing. 

CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Patient: ${patientContext || 'Home health patient'}
- Vitals: ${JSON.stringify(vitalSigns || {})}

USER REQUEST: ${customPrompt}

Generate professional, Medicare-compliant clinical documentation based on the request. Use proper medical terminology and be specific.`,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string" }
          }
        }
      });
      setGeneratedContent(prev => ({ ...prev, custom: result.content }));
      setActiveTab("custom");
    } catch (error) {
      console.error("Error generating custom content:", error);
    }
    setIsGenerating(false);
  };

  const handleCopy = (type) => {
    const content = generatedContent[type];
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleInsert = (type) => {
    const content = generatedContent[type];
    if (content && onInsertText) {
      onInsertText(content);
    }
  };

  const ContentDisplay = ({ type, title, icon: Icon, onGenerate }) => (
    <div className="space-y-3">
      {!generatedContent[type] ? (
        <div className="text-center py-6">
          <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">Generate {title.toLowerCase()} based on patient data</p>
          <Button onClick={onGenerate} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate {title}</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-white border rounded-lg p-3">
            <p className="text-sm whitespace-pre-wrap">{generatedContent[type]}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(type)}
            >
              {copied === type ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied === type ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleInsert(type)}
            >
              <Plus className="w-3 h-3 mr-1" /> Insert into Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-600" />
          AI Note Drafting Assistant
          <Badge variant="outline" className="text-xs ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 mb-3 h-auto w-full">
            <TabsTrigger value="assessment" className="text-xs px-2 py-1.5 flex-1 min-w-0">
              <Stethoscope className="w-3 h-3 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="interventions" className="text-xs px-2 py-1.5 flex-1 min-w-0">
              <Activity className="w-3 h-3 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="patientResponse" className="text-xs px-2 py-1.5 flex-1 min-w-0">
              <BookOpen className="w-3 h-3 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-2 py-1.5 flex-1 min-w-0">
              <MessageSquare className="w-3 h-3 flex-shrink-0" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessment">
            <ContentDisplay
              type="assessment"
              title="Assessment"
              icon={Stethoscope}
              onGenerate={generateAssessment}
            />
          </TabsContent>

          <TabsContent value="interventions">
            <ContentDisplay
              type="interventions"
              title="Interventions"
              icon={Activity}
              onGenerate={generateInterventions}
            />
          </TabsContent>

          <TabsContent value="patientResponse">
            <ContentDisplay
              type="patientResponse"
              title="Patient Response"
              icon={BookOpen}
              onGenerate={generatePatientResponse}
            />
          </TabsContent>

          <TabsContent value="custom">
            <div className="space-y-3">
              <Textarea
                placeholder="Ask the AI to help with any part of your note... e.g., 'Write a wound assessment for a stage 2 pressure ulcer on the sacrum'"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <Button
                onClick={generateCustom}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Custom Content</>
                )}
              </Button>
              
              {generatedContent.custom && (
                <div className="space-y-2">
                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{generatedContent.custom}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopy('custom')}>
                      {copied === 'custom' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      Copy
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleInsert('custom')}>
                      <Plus className="w-3 h-3 mr-1" /> Insert
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-3 pt-3 border-t">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Generate
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setCustomPrompt("Write homebound status justification"); generateCustom(); }}
                >
                  Homebound Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setCustomPrompt("Write skilled need justification for RN visit"); generateCustom(); }}
                >
                  Skilled Need Justification
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setCustomPrompt("Write medication reconciliation findings"); generateCustom(); }}
                >
                  Medication Reconciliation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setCustomPrompt("Write care coordination notes"); generateCustom(); }}
                >
                  Care Coordination
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setCustomPrompt("Write safety assessment of home environment"); generateCustom(); }}
                >
                  Safety Assessment
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}