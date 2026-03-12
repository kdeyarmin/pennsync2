import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Loader2, 
  BookOpen,
  Lightbulb,
  Plus,
  Globe
} from "lucide-react";

export default function ExternalKnowledge({ 
  diagnosis, 
  onInsertInformation 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchKnowledge = async (query) => {
    const searchTerm = query || diagnosis;
    if (!searchTerm) {
      alert("Please enter a search query or select a diagnosis.");
      return;
    }

    setIsSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical knowledge AI assistant with access to current medical literature and clinical guidelines. Search for relevant, evidence-based information about:

QUERY: ${searchTerm}

Provide practical clinical information useful for home health/hospice nursing documentation, including:
1. Key clinical considerations
2. Evidence-based nursing interventions
3. Patient education points
4. Monitoring parameters
5. Red flags to watch for

Return JSON:
{
  "topic": "Main topic",
  "summary": "Brief 2-3 sentence overview",
  "clinical_considerations": [
    {
      "title": "Consideration title",
      "detail": "Clinical detail",
      "source_type": "guideline" | "evidence" | "best_practice"
    }
  ],
  "nursing_interventions": [
    {
      "intervention": "Intervention description",
      "rationale": "Why this matters"
    }
  ],
  "patient_education": [
    "Education point 1",
    "Education point 2"
  ],
  "monitoring_parameters": [
    "Parameter 1",
    "Parameter 2"
  ],
  "red_flags": [
    {
      "sign": "Warning sign",
      "action": "Recommended action"
    }
  ],
  "documentation_tips": [
    "Tip for documenting this condition"
  ]
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            topic: { type: "string" },
            summary: { type: "string" },
            clinical_considerations: { type: "array", items: { type: "object" } },
            nursing_interventions: { type: "array", items: { type: "object" } },
            patient_education: { type: "array", items: { type: "string" } },
            monitoring_parameters: { type: "array", items: { type: "string" } },
            red_flags: { type: "array", items: { type: "object" } },
            documentation_tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setResults(result);
    } catch (error) {
      console.error("Error searching knowledge:", error);
      alert("Error searching. Please try again.");
    }
    setIsSearching(false);
  };

  const insertAsText = (content, type) => {
    let text = "";
    if (type === "education") {
      text = `\n\n**PATIENT EDUCATION PROVIDED:**\n${content.map(e => `- ${e}`).join('\n')}\nPatient verbalized understanding via teach-back method.\n`;
    } else if (type === "monitoring") {
      text = `\n\n**MONITORING PARAMETERS:**\n${content.map(p => `- ${p}`).join('\n')}\n`;
    } else if (type === "intervention") {
      text = `\n\n**NURSING INTERVENTION:**\n${content.intervention}\nRationale: ${content.rationale}\n`;
    }
    onInsertInformation(text);
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="py-3 bg-gradient-to-r from-emerald-50 to-green-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          Clinical Knowledge Search
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Search condition, medication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm h-8"
            onKeyPress={(e) => e.key === 'Enter' && searchKnowledge(searchQuery)}
          />
          <Button
            onClick={() => searchKnowledge(searchQuery)}
            disabled={isSearching}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {diagnosis && !results && !isSearching && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mb-2"
            onClick={() => searchKnowledge(diagnosis)}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Search: {diagnosis}
          </Button>
        )}

        {results && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {/* Topic Header */}
            <div className="bg-emerald-50 p-2 rounded">
              <p className="font-semibold text-sm text-emerald-900">{results.topic}</p>
              <p className="text-xs text-gray-600">{results.summary}</p>
            </div>

            {/* Nursing Interventions */}
            {results.nursing_interventions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Evidence-Based Interventions</p>
                {results.nursing_interventions.map((int, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border mb-1 group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{int.intervention}</p>
                        <p className="text-xs text-gray-500">{int.rationale}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => insertAsText(int, "intervention")}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Patient Education */}
            {results.patient_education?.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold text-gray-600">Patient Education Points</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => insertAsText(results.patient_education, "education")}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Insert All
                  </Button>
                </div>
                <div className="space-y-1">
                  {results.patient_education.map((edu, idx) => (
                    <div key={idx} className="text-xs bg-blue-50 p-1 rounded flex items-start gap-1">
                      <Lightbulb className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{edu}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {results.red_flags?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">⚠️ Red Flags</p>
                <div className="space-y-1">
                  {results.red_flags.map((flag, idx) => (
                    <div key={idx} className="text-xs bg-red-50 p-1 rounded border border-red-200">
                      <strong>{flag.sign}:</strong> {flag.action}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation Tips */}
            {results.documentation_tips?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">📝 Documentation Tips</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  {results.documentation_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span>•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setResults(null)}
            >
              New Search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}