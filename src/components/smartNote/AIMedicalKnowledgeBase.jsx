import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  BookOpen,
  Stethoscope,
  FileText,
  ExternalLink,
  Copy,
  Plus,
  Brain,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Heart,
  Wind,
  Activity,
  Shield,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIMedicalKnowledgeBase({
  patientData,
  diagnosis,
  currentMedications = [],
  onInsertToNote,
  compact = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [recentSearches, setRecentSearches] = useState([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const searchInputRef = useRef(null);

  // Quick reference topics
  const quickTopics = [
    { label: "CHF Management", query: "congestive heart failure management guidelines", icon: Heart },
    { label: "COPD Treatment", query: "COPD treatment protocols and monitoring", icon: Wind },
    { label: "Diabetes Care", query: "diabetes management in home health", icon: Activity },
    { label: "Wound Care", query: "pressure ulcer staging and treatment", icon: Shield },
    { label: "Fall Prevention", query: "fall risk assessment and prevention strategies", icon: AlertTriangle }
  ];

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setActiveTab("results");

    try {
      // Build patient context for more relevant results
      const patientContext = patientData ? {
        age: patientData.date_of_birth ? 
          Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        primary_diagnosis: patientData.primary_diagnosis || diagnosis,
        secondary_diagnoses: patientData.secondary_diagnoses || [],
        current_medications: currentMedications.map(m => m.name || m).join(', '),
        allergies: patientData.allergies,
        comorbidities: patientData.secondary_diagnoses?.slice(0, 5).join(', ') || 'None'
      } : null;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical medical knowledge assistant for home health nurses. Provide accurate, evidence-based information on the following query.

CLINICAL QUERY: "${query}"

${patientContext ? `
PATIENT CONTEXT (if relevant):
- Age: ${patientContext.age || 'Unknown'}
- Primary Diagnosis: ${patientContext.primary_diagnosis || 'Not specified'}
- Comorbidities: ${patientContext.comorbidities}
- Current Medications: ${patientContext.current_medications || 'Not documented'}
- Known Allergies: ${patientContext.allergies || 'None documented'}
` : ''}

Provide a comprehensive yet concise response including:

1. OVERVIEW: Brief summary of the topic (2-3 sentences)
2. KEY CLINICAL POINTS: 4-5 essential points nurses need to know
3. PATIENT-SPECIFIC CONSIDERATIONS: If patient context provided, specific considerations for this patient
4. MONITORING & ASSESSMENT: What to monitor, how often, red flags
5. DOCUMENTATION TIPS: What should be documented in clinical notes
6. SOURCES: Cite 2-3 authoritative sources (CDC, CMS, medical journals, clinical guidelines)

Format the response to be practical and actionable for home health nurses. Use clear, professional medical terminology.

Return JSON with structured information.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            patient_considerations: { type: "string" },
            monitoring: { type: "array", items: { type: "string" } },
            documentation_tips: { type: "array", items: { type: "string" } },
            red_flags: { type: "array", items: { type: "string" } },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  organization: { type: "string" },
                  url: { type: "string" }
                }
              }
            },
            related_topics: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSearchResults({
        query,
        ...response,
        timestamp: new Date().toISOString()
      });

      // Add to recent searches
      setRecentSearches(prev => [
        { query, timestamp: new Date() },
        ...prev.filter(s => s.query !== query).slice(0, 4)
      ]);

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        error: 'Failed to retrieve information. Please try again.'
      });
    }

    setIsSearching(false);
  };

  const handleQuickTopic = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleInsert = (text) => {
    onInsertToNote?.(text);
  };

  const generateDocumentationTemplate = () => {
    if (!searchResults) return '';

    const template = `
${searchResults.query.toUpperCase()}:

${searchResults.overview}

Key Findings:
${searchResults.key_points?.map((point, idx) => `${idx + 1}. ${point}`).join('\n') || ''}

${searchResults.patient_considerations ? `Patient-Specific Considerations:\n${searchResults.patient_considerations}\n` : ''}

Monitoring Plan:
${searchResults.monitoring?.map((item, idx) => `- ${item}`).join('\n') || ''}

${searchResults.red_flags?.length > 0 ? `Red Flags to Watch:\n${searchResults.red_flags.map(flag => `⚠️ ${flag}`).join('\n')}` : ''}
`.trim();

    return template;
  };

  return (
    <Card className={`border-2 ${isExpanded ? 'border-purple-300' : 'border-slate-200'} bg-gradient-to-br from-purple-50 to-pink-50`}>
      <CardHeader 
        className="pb-3 cursor-pointer bg-gradient-to-r from-purple-100 to-pink-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>AI Medical Knowledge Base</span>
            {recentSearches.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {recentSearches.length} recent
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">
                <Search className="w-4 h-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!searchResults}>
                <FileText className="w-4 h-4 mr-2" />
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ask anything: diagnoses, medications, protocols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={!searchQuery.trim() || isSearching}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Quick Topics */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Quick Topics:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickTopics.map((topic, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handleQuickTopic(topic.query)}
                    >
                      <BookOpen className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="text-xs">{topic.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recent Searches:</p>
                  <div className="space-y-1">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left p-2 rounded hover:bg-purple-100 transition-colors flex items-center gap-2"
                        onClick={() => {
                          setSearchQuery(search.query);
                          handleSearch(search.query);
                        }}
                      >
                        <Search className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-700 flex-1 truncate">{search.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Context Indicator */}
              {patientData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-900">Patient Context Active</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Searches will be tailored to {patientData.first_name}'s diagnosis and medications.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-4">
              {searchResults && !searchResults.error && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Query Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-purple-900">{searchResults.query}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Retrieved {new Date(searchResults.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveTab("search");
                        }}
                      >
                        New Search
                      </Button>
                    </div>

                    {/* Overview */}
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-purple-900 mb-1">Overview</p>
                          <p className="text-sm text-slate-700">{searchResults.overview}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Points */}
                    {searchResults.key_points?.length > 0 && (
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-blue-900">Key Clinical Points</p>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {searchResults.key_points.map((point, idx) => (
                            <li key={idx} className="text-sm text-slate-700 list-disc">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Patient-Specific */}
                    {searchResults.patient_considerations && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <Stethoscope className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-900 mb-1">
                              Patient-Specific Considerations
                            </p>
                            <p className="text-sm text-amber-800">{searchResults.patient_considerations}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Monitoring */}
                    {searchResults.monitoring?.length > 0 && (
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex items-start gap-2 mb-2">
                          <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-green-900">Monitoring & Assessment</p>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {searchResults.monitoring.map((item, idx) => (
                            <li key={idx} className="text-sm text-slate-700 list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Red Flags */}
                    {searchResults.red_flags?.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-red-900">Red Flags / Warning Signs</p>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {searchResults.red_flags.map((flag, idx) => (
                            <li key={idx} className="text-sm text-red-700 list-disc font-medium">
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Documentation Tips */}
                    {searchResults.documentation_tips?.length > 0 && (
                      <div className="p-3 bg-white rounded-lg border border-indigo-200">
                        <div className="flex items-start gap-2 mb-2">
                          <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-indigo-900">Documentation Tips</p>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {searchResults.documentation_tips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-slate-700 list-disc">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sources */}
                    {searchResults.sources?.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-lg border">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Sources & References:</p>
                        <div className="space-y-2">
                          {searchResults.sources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{source.title}</span>
                                {source.organization && (
                                  <span className="text-slate-500"> - {source.organization}</span>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const template = generateDocumentationTemplate();
                          handleInsert(template);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Insert Full Summary
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const template = generateDocumentationTemplate();
                          navigator.clipboard.writeText(template);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>

                    {/* Related Topics */}
                    {searchResults.related_topics?.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Related Topics:</p>
                        <div className="flex flex-wrap gap-1">
                          {searchResults.related_topics.map((topic, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer hover:bg-purple-100 text-xs"
                              onClick={() => {
                                setSearchQuery(topic);
                                handleSearch(topic);
                              }}
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {searchResults?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{searchResults.error}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}