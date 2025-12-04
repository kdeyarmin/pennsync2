import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileCode,
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  Search,
  Plus,
  Info,
  RefreshCw
} from "lucide-react";

export default function ICD10CodeSuggester({
  narrativeText,
  diagnosis,
  patient,
  onCodesSelected
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedCodes, setSuggestedCodes] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);

  // Auto-analyze when narrative changes significantly
  useEffect(() => {
    if (narrativeText && narrativeText.length > 100 && narrativeText.length - lastAnalyzedLength > 200) {
      const timer = setTimeout(() => {
        analyzeCodes();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [narrativeText]);

  const analyzeCodes = async () => {
    if (!narrativeText || narrativeText.length < 50) return;
    
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this clinical nursing note and suggest the most appropriate ICD-10-CM diagnosis codes.

PATIENT CONTEXT:
- Primary Diagnosis: ${diagnosis || patient?.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient?.secondary_diagnoses?.join(', ') || 'None'}

CLINICAL NARRATIVE:
${narrativeText}

Based on the clinical documentation, suggest ICD-10-CM codes that are:
1. Supported by the documented findings
2. Appropriate for home health/hospice billing
3. Specific enough for accurate reimbursement
4. Compliant with coding guidelines

For each suggested code, provide:
- The ICD-10-CM code
- The code description
- The clinical rationale (what in the note supports this code)
- Confidence level (high/medium/low)
- Whether it's primary or secondary

Return up to 8 relevant codes, prioritizing those with strongest documentation support.`,
        response_json_schema: {
          type: "object",
          properties: {
            codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  rationale: { type: "string" },
                  confidence: { type: "string" },
                  type: { type: "string" }
                }
              }
            },
            coding_notes: { type: "string" }
          }
        }
      });

      setSuggestedCodes(result.codes || []);
      setLastAnalyzedLength(narrativeText.length);
    } catch (error) {
      console.error("Error analyzing ICD-10 codes:", error);
    }
    setIsAnalyzing(false);
  };

  const searchICD10 = async () => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    setIsSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for ICD-10-CM codes matching: "${searchTerm}"

Return up to 10 matching codes with their descriptions. Include common codes for home health nursing documentation.`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSearchResults(result.results || []);
    } catch (error) {
      console.error("Error searching ICD-10 codes:", error);
    }
    setIsSearching(false);
  };

  const toggleCodeSelection = (code) => {
    setSelectedCodes(prev => {
      const exists = prev.find(c => c.code === code.code);
      if (exists) {
        return prev.filter(c => c.code !== code.code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleCopySelected = () => {
    const codeText = selectedCodes.map(c => `${c.code} - ${c.description}`).join('\n');
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCodesSelected?.(selectedCodes);
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-600" />
            ICD-10 Code Suggester
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={analyzeCodes}
            disabled={isAnalyzing || !narrativeText || narrativeText.length < 50}
            className="h-7 text-xs"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
            ) : (
              <><RefreshCw className="w-3 h-3 mr-1" /> Analyze Note</>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search ICD-10 codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchICD10()}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={searchICD10}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg p-2 bg-gray-50 max-h-40 overflow-auto">
            <p className="text-xs font-semibold text-gray-500 mb-2">Search Results</p>
            <div className="space-y-1">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-white rounded border hover:bg-purple-50 cursor-pointer"
                  onClick={() => toggleCodeSelection(result)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {result.code}
                    </Badge>
                    <span className="text-xs text-gray-700">{result.description}</span>
                  </div>
                  {selectedCodes.find(c => c.code === result.code) ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggested Codes */}
        {suggestedCodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-semibold text-purple-800">AI-Suggested Codes</p>
            </div>
            <div className="space-y-2 max-h-60 overflow-auto">
              {suggestedCodes.map((code, idx) => {
                const isSelected = selectedCodes.find(c => c.code === code.code);
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected ? 'bg-purple-100 border-purple-300' : 'bg-white hover:bg-purple-50'
                    }`}
                    onClick={() => toggleCodeSelection(code)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs font-semibold">
                            {code.code}
                          </Badge>
                          <Badge className={`text-[10px] ${getConfidenceColor(code.confidence)}`}>
                            {code.confidence}
                          </Badge>
                          {code.type === 'primary' && (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px]">Primary</Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 mt-1">{code.description}</p>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      ) : (
                        <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600 mt-1 p-0">
                          <Info className="w-3 h-3 mr-1" /> View Rationale
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3">
                        <p className="text-xs font-semibold mb-1">Clinical Rationale:</p>
                        <p className="text-xs text-gray-600">{code.rationale}</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No suggestions yet */}
        {!isAnalyzing && suggestedCodes.length === 0 && narrativeText && narrativeText.length >= 50 && (
          <Alert className="bg-purple-50 border-purple-200">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-800 text-xs">
              Click "Analyze Note" to get AI-suggested ICD-10 codes based on your documentation.
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Codes Summary */}
        {selectedCodes.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">
                Selected Codes ({selectedCodes.length})
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySelected}
                className="h-6 text-xs"
              >
                {copied ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3 mr-1" /> Copy All</>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedCodes.map((code, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="font-mono text-xs cursor-pointer hover:bg-red-50"
                  onClick={() => toggleCodeSelection(code)}
                >
                  {code.code} ×
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}