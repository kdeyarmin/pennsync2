import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  AlertTriangle,
  BookOpen,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Lightbulb,
  GraduationCap,
  ClipboardList
} from "lucide-react";
import debounce from "lodash/debounce";

export default function AIDocumentationSuggester({
  patientId,
  oasisData,
  noteContent,
  discrepancies = [],
  carePlanNeeds = [],
  vitalSigns = {},
  onInsertText
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("clarifications");
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Generate suggestions based on OASIS data and discrepancies
  const generateSuggestions = useCallback(
    debounce(async () => {
      if (!oasisData && discrepancies.length === 0 && carePlanNeeds.length === 0) return;

      setIsLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a home health documentation specialist. Generate real-time documentation suggestions based on the following patient data.

OASIS DATA:
${oasisData ? JSON.stringify(oasisData, null, 2) : 'Not available'}

IDENTIFIED DISCREPANCIES/ISSUES:
${discrepancies.length > 0 ? discrepancies.map(d => `- ${d.item || d.area}: ${d.issue || d.description}`).join('\n') : 'None identified'}

CARE PLAN NEEDS:
${carePlanNeeds.length > 0 ? carePlanNeeds.map(c => `- ${c.problem || c.need}: ${c.goal || c.description || ''}`).join('\n') : 'Standard care'}

CURRENT VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns) : 'Not recorded'}

CURRENT NOTE CONTENT:
${noteContent?.substring(0, 500) || 'Empty'}

Provide:
1. OASIS clarification suggestions for any discrepancies
2. Patient education content relevant to diagnoses
3. Skilled intervention documentation based on risks/needs`,
          response_json_schema: {
            type: "object",
            properties: {
              oasis_clarifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    issue: { type: "string" },
                    suggested_documentation: { type: "string" },
                    priority: { type: "string" }
                  }
                }
              },
              patient_education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    content: { type: "string" },
                    teach_back_prompt: { type: "string" }
                  }
                }
              },
              skilled_interventions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    intervention: { type: "string" },
                    rationale: { type: "string" },
                    documentation_template: { type: "string" }
                  }
                }
              },
              quick_phrases: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        setSuggestions(result);
      } catch (error) {
        console.error("Error generating suggestions:", error);
      }
      setIsLoading(false);
    }, 1000),
    [oasisData, discrepancies, carePlanNeeds, noteContent, vitalSigns]
  );

  useEffect(() => {
    if (oasisData || discrepancies.length > 0 || carePlanNeeds.length > 0) {
      generateSuggestions();
    }
  }, [oasisData, discrepancies, carePlanNeeds]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = (text) => {
    onInsertText?.(text);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader 
        className="pb-2 bg-gradient-to-r from-purple-50 to-pink-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Documentation Assistant
            {suggestions && (
              <Badge variant="outline" className="text-xs bg-white">
                {(suggestions.oasis_clarifications?.length || 0) + 
                 (suggestions.patient_education?.length || 0) + 
                 (suggestions.skilled_interventions?.length || 0)} suggestions
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); generateSuggestions(); }}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-3">
          {!suggestions && !isLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Add OASIS data or start documenting to receive AI suggestions
            </p>
          ) : isLoading && !suggestions ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Analyzing documentation needs...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="clarifications" className="text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  OASIS ({suggestions?.oasis_clarifications?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="education" className="text-xs gap-1">
                  <GraduationCap className="w-3 h-3" />
                  Education ({suggestions?.patient_education?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="interventions" className="text-xs gap-1">
                  <Stethoscope className="w-3 h-3" />
                  Skilled ({suggestions?.skilled_interventions?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* OASIS Clarifications Tab */}
              <TabsContent value="clarifications" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.oasis_clarifications?.length > 0 ? (
                  suggestions.oasis_clarifications.map((item, idx) => (
                    <div key={idx} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{item.item}</Badge>
                          <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(item.suggested_documentation, `oasis-${idx}`)}
                          >
                            {copiedIndex === `oasis-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(item.suggested_documentation)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-orange-800 mb-1">{item.issue}</p>
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                        {item.suggested_documentation}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No OASIS clarifications needed</p>
                )}
              </TabsContent>

              {/* Patient Education Tab */}
              <TabsContent value="education" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.patient_education?.length > 0 ? (
                  suggestions.patient_education.map((edu, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-900">{edu.topic}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(edu.content, `edu-${idx}`)}
                          >
                            {copiedIndex === `edu-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(`PATIENT EDUCATION: ${edu.topic}\n${edu.content}\nTeach-back: ${edu.teach_back_prompt}`)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">{edu.content}</p>
                      <div className="bg-green-50 p-1.5 rounded border border-green-200">
                        <p className="text-xs text-green-800">
                          <strong>Teach-back:</strong> {edu.teach_back_prompt}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No education content generated</p>
                )}
              </TabsContent>

              {/* Skilled Interventions Tab */}
              <TabsContent value="interventions" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.skilled_interventions?.length > 0 ? (
                  suggestions.skilled_interventions.map((int, idx) => (
                    <div key={idx} className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-green-900">{int.intervention}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(int.documentation_template, `int-${idx}`)}
                          >
                            {copiedIndex === `int-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(int.documentation_template)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Rationale:</strong> {int.rationale}
                      </p>
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                        {int.documentation_template}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No skilled interventions suggested</p>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Quick Phrases */}
          {suggestions?.quick_phrases?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-yellow-500" />
                Quick Phrases
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestions.quick_phrases.slice(0, 6).map((phrase, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleInsert(phrase)}
                  >
                    {phrase.length > 30 ? phrase.substring(0, 30) + '...' : phrase}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}