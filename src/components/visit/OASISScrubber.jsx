import { useState } from "react";
import { extractClinicalIndicators } from "./clinicalIndicators";
import { determineClinicalGroup, identifyComorbidities } from "./pdgmClinicalGroup";
import { invokeLLM } from "@/lib/invokeLLM";
import { buildFunctionalPhrases, buildClinicalAlerts, getRiskColor } from "./oasisScrubberData";
import { buildOASISScrubberPrompt, oasisScrubberResponseSchema } from "./oasisScrubberPrompt";
import ClinicalAlertsPanel from "./ClinicalAlertsPanel";
import ComorbiditiesSummary from "./ComorbiditiesSummary";
import ClinicalGroupSummary from "./ClinicalGroupSummary";
import ClinicalIndicatorsGrid from "./ClinicalIndicatorsGrid";
import ClinicalIndicatorsDetail from "./ClinicalIndicatorsDetail";
import FunctionalPhrasesPanel from "./FunctionalPhrasesPanel";
import CollapsibleResultHeader from "./CollapsibleResultHeader";
import PdgmAnalysisSummary from "./PdgmAnalysisSummary";
import OptimizationSuggestionsPanel from "./OptimizationSuggestionsPanel";
import MismatchesResults from "./MismatchesResults";
import CrossValidationResults from "./CrossValidationResults";
import IncompleteAssessmentsResults from "./IncompleteAssessmentsResults";
import InconsistenciesResults from "./InconsistenciesResults";
import CompliantItemsResults from "./CompliantItemsResults";
import UnderscoringResults from "./UnderscoringResults";
import OverscoringResults from "./OverscoringResults";
import CriticalMissingResults from "./CriticalMissingResults";
import VagueDocumentationResults from "./VagueDocumentationResults";
import RecommendationsSummary from "./RecommendationsSummary";
import QualityMeasuresImpact from "./QualityMeasuresImpact";
import AuditDefenseSummary from "./AuditDefenseSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  DollarSign,
  TrendingUp,
  Sparkles,
  Info,
  BookOpen,
  MessageSquare,
  Upload,
  Download,
  Eye,
  EyeOff,
  Filter,
  BarChart3,
  Activity,
  Heart,
  Wind,
  Pill,
  Brain,
  Footprints,
  Hand,
  Stethoscope
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logSecurityEvent } from "../utils/security";
import CMSComplianceReference from "../oasis/CMSComplianceReference";
import OASISPDFUploader from "../oasis/OASISPDFUploader";

export default function OASISScrubber({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onFixSuggestion,
  uploadedOasisData // New prop for uploaded OASIS PDF data
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [oasisResults, setOasisResults] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("results");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ accepted: 0, rejected: 0, modified: 0 });
  const [extractedOasisData, setExtractedOasisData] = useState(uploadedOasisData || null);
  const [showUploader, setShowUploader] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState('all');
  const [showExtractedIndicators, setShowExtractedIndicators] = useState(false);
  const [extractedIndicators, setExtractedIndicators] = useState(null);
  const [copiedText, setCopiedText] = useState(null);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(true);
  const [clinicalAlerts, setClinicalAlerts] = useState([]);

  const isHomeHealth = patient?.care_type === 'home_health';
  const isOASISVisit = ['admission', 'recertification', 'discharge'].includes(visit?.visit_type);

  // Handle data from OASISPDFUploader
  const handleOasisDataExtracted = (data) => {
    setExtractedOasisData(data);
    setShowUploader(false);
  };


  const runOASISScrubber = async () => {
    setIsScrubbing(true);
    setShowDialog(true);
    setExpandedCategories(['underscoring', 'overscoring', 'critical']); // Auto-expand important sections
    
    try {
      await logSecurityEvent('OASIS_SCRUBBER_STARTED', { visit_id: visit?.id });

      const visitType = visit?.visit_type?.replace(/_/g, ' ').toUpperCase() || 'VISIT';

      // extractPhrases / getSentencesContaining are imported from the shared
      // factExtraction module (single source of truth).

      // Deterministic clinical-indicator extraction (see clinicalIndicators.js).
      const clinicalIndicators = extractClinicalIndicators(narrativeText);

      // Enhanced ADL/IADL phrase extraction (see oasisScrubberData.js).
      const functionalPhrases = buildFunctionalPhrases(narrativeText);

      // Run clinical group and comorbidity analysis
      const clinicalGroupAnalysis = determineClinicalGroup(
        patient.primary_diagnosis,
        patient.secondary_diagnoses
      );

      const comorbidityAnalysis = identifyComorbidities(
        patient.primary_diagnosis,
        patient.secondary_diagnoses,
        narrativeText
      );

      // Store extracted indicators for UI display
      setExtractedIndicators({
        clinical: clinicalIndicators,
        functional: functionalPhrases,
        clinicalGroup: clinicalGroupAnalysis,
        comorbidities: comorbidityAnalysis
      });

      // Generate clinical decision support alerts (see oasisScrubberData.js).
      const alerts = buildClinicalAlerts(clinicalIndicators);
      setClinicalAlerts(alerts);

      const prompt = buildOASISScrubberPrompt({
        visitTypeLabel: visitType,
        visitTypeRaw: visit.visit_type,
        patient,
        visit,
        clinicalGroupAnalysis,
        comorbidityAnalysis,
        clinicalIndicators,
        functionalPhrases,
        vitalSigns,
        narrativeText,
        extractedOasisData,
      });

      const result = await invokeLLM({
        prompt,
        response_json_schema: oasisScrubberResponseSchema,
      });

      setOasisResults(result);
      
      await logSecurityEvent('OASIS_SCRUBBER_COMPLETED', { 
        visit_id: visit.id,
        score: result.overall_score,
        ready_for_submission: result.ready_for_submission,
        reimbursement_risk: result.reimbursement_risk_level
      });

    } catch (error) {
      console.error("Error running OASIS scrubber:", error);
      setOasisResults({
        overall_score: 0,
        completeness_percentage: 0,
        ready_for_submission: false,
        reimbursement_risk_level: 'critical',
        error_message: error.message || 'Failed to analyze documentation. Please try again.',
        recommendations: ['Ensure documentation is complete before running analysis', 'Check network connection and try again']
      });
      await logSecurityEvent('OASIS_SCRUBBER_ERROR', { 
        visit_id: visit?.id,
        error: error.message 
      });
    }
    
    setIsScrubbing(false);
  };

  const toggleCategory = (category) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const handleQuickFix = (guidance, example) => {
    const fixText = `\n\n${guidance}\n\nExample: ${example}`;
    if (onFixSuggestion) {
      onFixSuggestion(fixText);
    }
  };

  const handleSuggestionAccept = (suggestion, suggestionType) => {
    setAcceptedSuggestions(prev => [...prev, { ...suggestion, type: suggestionType }]);
    setFeedbackStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
    if (suggestion.example || suggestion.documentation_guidance) {
      handleQuickFix(suggestion.documentation_guidance || '', suggestion.example || '');
    }
  };

  const handleSuggestionReject = (_reason) => {
    setFeedbackStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
  };

  const handleSuggestionModify = (modifiedText) => {
    setFeedbackStats(prev => ({ ...prev, modified: prev.modified + 1 }));
    if (onFixSuggestion) {
      onFixSuggestion(`\n\n${modifiedText}`);
    }
  };

  const handleInsertGuidance = (itemKey, item) => {
    if (onFixSuggestion && item) {
      let guidance = `\n\n[${itemKey}: ${item.name}]\n`;
      if (item.description) guidance += `${item.description}\n`;
      if (item.scoringScale) {
        guidance += "Scoring: ";
        guidance += Object.entries(item.scoringScale).map(([k, v]) => `${k}=${v}`).join(', ');
      }
      onFixSuggestion(guidance);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const exportResults = () => {
    if (!oasisResults) return;
    const dataStr = JSON.stringify(oasisResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oasis-analysis-${visit?.id || 'report'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const _getFilteredResults = () => {
    if (!oasisResults || analysisFilter === 'all') return oasisResults;
    
    const filtered = { ...oasisResults };
    switch (analysisFilter) {
      case 'revenue':
        filtered.critical_missing = filtered.critical_missing?.filter(i => i.reimbursement_impact === 'high');
        filtered.overscoring_risks = [];
        filtered.inconsistencies = [];
        filtered.vague_documentation = [];
        break;
      case 'audit':
        filtered.underscoring_opportunities = [];
        filtered.critical_missing = filtered.critical_missing?.filter(i => i.reimbursement_impact !== 'low');
        break;
      case 'functional':
        filtered.oasis_narrative_mismatches = [];
        filtered.inconsistencies = [];
        break;
      case 'clinical':
        filtered.underscoring_opportunities = [];
        filtered.overscoring_risks = [];
        break;
    }
    return filtered;
  };

  const _getCategoryIcon = (category) => {
    const icons = {
      'Functional': Footprints,
      'Clinical': Stethoscope,
      'Medications': Pill,
      'Wounds': Activity,
      'GG': Hand,
      'Cognitive': Brain,
      'Safety': AlertTriangle,
      'Cardiac': Heart,
      'Respiratory': Wind
    };
    return icons[category] || FileCheck;
  };

  // Don't show for hospice patients
  if (!isHomeHealth) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  OASIS Compliance Scrubber
                  {isOASISVisit && (
                    <Badge className="bg-blue-600">OASIS Visit</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-600">
                  Check for missing OASIS data elements and reimbursement risks
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* OASIS PDF Upload Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowUploader(!showUploader)}
                className={extractedOasisData ? 'border-green-500 bg-green-50' : ''}
              >
                {extractedOasisData ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                    OASIS Loaded
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload OASIS PDFs
                  </>
                )}
              </Button>
              
              <Button
                onClick={runOASISScrubber}
                disabled={isScrubbing || (!narrativeText && !extractedOasisData)}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isScrubbing ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing OASIS...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Run OASIS Check
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* OASIS PDF Uploader Component */}
          {showUploader && (
            <div className="mt-4">
              <OASISPDFUploader
                visitId={visit?.id}
                patientId={patient?.id}
                onDataExtracted={handleOasisDataExtracted}
                initialData={extractedOasisData}
              />
            </div>
          )}

          {/* Show extracted OASIS data summary (compact view when uploader is hidden) */}
          {extractedOasisData && !showUploader && (
            <OASISPDFUploader
              visitId={visit?.id}
              patientId={patient?.id}
              onDataExtracted={handleOasisDataExtracted}
              initialData={extractedOasisData}
              compact={true}
            />
          )}

          {!isOASISVisit && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                This is a {visit?.visit_type?.replace(/_/g, ' ')} visit. OASIS comprehensive assessment is required for Start of Care, Recertification, and Discharge visits only. However, this scrubber can still help ensure complete clinical documentation.
              </AlertDescription>
            </Alert>
          )}

          {/* Extracted Indicators Preview */}
          {extractedIndicators && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExtractedIndicators(!showExtractedIndicators)}
                className="text-slate-600 hover:text-slate-900"
              >
                {showExtractedIndicators ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showExtractedIndicators ? 'Hide' : 'Show'} Extracted Clinical Indicators
              </Button>
              
              {showExtractedIndicators && (
                <div className="mt-3 bg-white rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Pre-Analysis Extraction Results
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Auto-extracted from narrative
                    </Badge>
                  </div>

                  {/* Clinical Group Preview */}
                  <ClinicalGroupSummary
                    clinicalGroup={extractedIndicators.clinicalGroup}
                    variant="compact"
                  />

                  {/* Clinical Indicators Grid */}
                  <ClinicalIndicatorsGrid clinical={extractedIndicators.clinical} />

                  {/* Clinical Decision Support Alerts */}
                  <ClinicalAlertsPanel
                    alerts={clinicalAlerts}
                    variant="compact"
                    onViewReference={() => setActiveTab('reference')}
                  />

                  {/* Comorbidities Summary */}
                  <ComorbiditiesSummary
                    comorbidities={extractedIndicators.comorbidities}
                    variant="compact"
                  />

                  {/* Functional Phrases Summary */}
                  <FunctionalPhrasesPanel
                    functional={extractedIndicators.functional}
                    variant="compact"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <FileCheck className="w-7 h-7 text-green-600" />
              OASIS Compliance Report
            </DialogTitle>
            <DialogDescription>
              Comprehensive OASIS data completeness check for Medicare home health reimbursement
            </DialogDescription>
          </DialogHeader>

          {isScrubbing ? (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-green-600 animate-pulse" />
              <div>
                <p className="text-lg font-semibold text-slate-900">Analyzing OASIS Compliance...</p>
                <p className="text-sm text-slate-600 mt-2">
                  Checking against CMS OASIS-E 2024 requirements for {visit?.visit_type?.replace(/_/g, ' ')} visits
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Badge variant="outline">Functional Scores</Badge>
                  <Badge variant="outline">GG Items</Badge>
                  <Badge variant="outline">PDGM Impact</Badge>
                </div>
              </div>
            </div>
          ) : oasisResults?.error_message ? (
            <div className="py-8">
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Analysis Error:</strong> {oasisResults.error_message}
                </AlertDescription>
              </Alert>
              <Button onClick={runOASISScrubber} className="mt-4 w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Retry Analysis
              </Button>
            </div>
          ) : oasisResults ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="results" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="indicators" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Indicators
                </TabsTrigger>
                <TabsTrigger value="reference" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  CMS Reference
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback ({feedbackStats.accepted + feedbackStats.rejected + feedbackStats.modified})
                </TabsTrigger>
              </TabsList>

              {/* Filter and Export Controls */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Filter results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Findings</SelectItem>
                      <SelectItem value="revenue">Revenue Focus</SelectItem>
                      <SelectItem value="audit">Audit Risk</SelectItem>
                      <SelectItem value="functional">Functional Scores</SelectItem>
                      <SelectItem value="clinical">Clinical Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportResults} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>

              <TabsContent value="indicators">
                <ScrollArea className="h-[60vh]">
                  {extractedIndicators ? (
                    <div className="space-y-6 p-1">
                      {/* Clinical Decision Support Alerts - Expanded View */}
                      <ClinicalAlertsPanel
                        alerts={clinicalAlerts}
                        variant="expanded"
                        onViewReference={() => setActiveTab('reference')}
                      />

                      {/* Clinical Group Determination */}
                      <ClinicalGroupSummary
                        clinicalGroup={extractedIndicators.clinicalGroup}
                        variant="expanded"
                      />

                      {/* Comorbidities */}
                      <ComorbiditiesSummary
                        comorbidities={extractedIndicators.comorbidities}
                        variant="expanded"
                      />

                      {/* Clinical Indicators Detail */}
                      <ClinicalIndicatorsDetail
                        clinical={extractedIndicators.clinical}
                        copiedText={copiedText}
                        onCopy={copyToClipboard}
                      />

                      {/* Functional Phrases Detail */}
                      <FunctionalPhrasesPanel
                        functional={extractedIndicators.functional}
                        variant="expanded"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Run the OASIS analysis to see extracted indicators</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="reference">
                <CMSComplianceReference onInsertGuidance={handleInsertGuidance} />
              </TabsContent>

              <TabsContent value="feedback">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Feedback Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                        <p className="text-3xl font-bold text-green-700">{feedbackStats.accepted}</p>
                        <p className="text-sm text-green-600">Accepted</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                        <p className="text-3xl font-bold text-blue-700">{feedbackStats.modified}</p>
                        <p className="text-sm text-blue-600">Modified</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                        <p className="text-3xl font-bold text-red-700">{feedbackStats.rejected}</p>
                        <p className="text-sm text-red-600">Rejected</p>
                      </div>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        Your feedback helps improve AI accuracy for reimbursement impact assessments and documentation suggestions. All feedback is used to enhance future recommendations.
                      </AlertDescription>
                    </Alert>
                    {acceptedSuggestions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-slate-900 mb-2">Applied Suggestions:</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {acceptedSuggestions.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-900">{s.oasis_item || s.type}: Applied</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <ScrollArea className="h-[60vh]">
                <div className="space-y-6 py-4 pr-2">
              {/* Quick Summary Banner */}
              <div className={`p-4 rounded-lg border-2 ${
                oasisResults.ready_for_submission 
                  ? 'bg-green-50 border-green-300' 
                  : oasisResults.reimbursement_risk_level === 'critical' 
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {oasisResults.ready_for_submission ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-bold text-lg">
                        {oasisResults.ready_for_submission ? 'Ready for Submission' : 'Action Required'}
                      </p>
                      <p className="text-sm text-slate-600">
                        {oasisResults.critical_missing?.length || 0} missing items • 
                        {oasisResults.underscoring_opportunities?.length || 0} revenue opportunities • 
                        {oasisResults.overscoring_risks?.length || 0} audit risks
                      </p>
                    </div>
                  </div>
                  {oasisResults.pdgm_analysis?.optimization_potential && (
                    <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {oasisResults.pdgm_analysis.optimization_potential}
                    </Badge>
                  )}
                </div>
                {/* Quick Actions for Top Optimization */}
                {(oasisResults.underscoring_opportunities?.length > 0 || oasisResults.critical_missing?.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab('results');
                        setExpandedCategories(['underscoring', 'critical']);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      View {oasisResults.underscoring_opportunities?.length || 0} Revenue Opportunities
                    </Button>
                    {oasisResults.critical_missing?.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab('results');
                          setExpandedCategories(['critical']);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Fix {oasisResults.critical_missing.length} Critical Items
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Overall Score Card */}
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      Completeness: {oasisResults.completeness_percentage}%
                    </h3>
                    <p className="text-sm text-slate-600">OASIS data elements documented</p>
                    <Progress value={oasisResults.completeness_percentage} className="h-3 mt-2" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      Quality Score: {oasisResults.overall_score}/100
                    </h3>
                    <p className="text-sm text-slate-600">Documentation quality rating</p>
                    <Progress value={oasisResults.overall_score} className="h-3 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Reimbursement Risk</p>
                    <Badge className={getRiskColor(oasisResults.reimbursement_risk_level)}>
                      {oasisResults.reimbursement_risk_level?.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Submission Status</p>
                    {oasisResults.ready_for_submission ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        READY
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        NOT READY
                      </Badge>
                    )}
                  </div>
                </div>

                {/* PDGM Analysis Section */}
                {oasisResults.pdgm_analysis && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                    <PdgmAnalysisSummary pdgmAnalysis={oasisResults.pdgm_analysis} />

                    {/* Automated Optimization Suggestions */}
                    <OptimizationSuggestionsPanel
                      oasisResults={oasisResults}
                      extractedIndicators={extractedIndicators}
                      patient={patient}
                      showOptimizationPanel={showOptimizationPanel}
                      setShowOptimizationPanel={setShowOptimizationPanel}
                      copiedText={copiedText}
                      copyToClipboard={copyToClipboard}
                      handleSuggestionAccept={handleSuggestionAccept}
                    />
                  </div>
                )}

                {/* Functional Score Analysis */}
                {oasisResults.functional_score_analysis && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3">Functional Score Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {['m1800_grooming', 'm1810_dress_upper', 'm1820_dress_lower', 'm1830_bathing', 'm1840_toilet_transfer', 'm1850_transferring', 'm1860_ambulation'].map(key => {
                        const item = oasisResults.functional_score_analysis[key];
                        if (!item) return null;
                        return (
                          <div key={key} className={`p-2 rounded border ${
                            item.accuracy === 'underscored' ? 'bg-yellow-100 border-yellow-300' :
                            item.accuracy === 'overscored' ? 'bg-red-100 border-red-300' :
                            'bg-white border-slate-200'
                          }`}>
                            <p className="font-medium text-slate-700">{key.replace('m', 'M').replace(/_/g, ' ')}</p>
                            <p className="text-lg font-bold">{item.documented_value ?? '?'}</p>
                            {item.accuracy !== 'accurate' && (
                              <Badge className={`text-xs ${item.accuracy === 'underscored' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                {item.accuracy}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      <div className="p-2 rounded border bg-indigo-100 border-indigo-300">
                        <p className="font-medium text-indigo-700">Total Points</p>
                        <p className="text-lg font-bold text-indigo-900">{oasisResults.functional_score_analysis.total_functional_points ?? '?'}</p>
                        <Badge className="bg-indigo-600 text-xs">{oasisResults.functional_score_analysis.functional_level_result}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* OASIS-Narrative Mismatches (from uploaded OASIS) */}
              {oasisResults.oasis_narrative_mismatches && oasisResults.oasis_narrative_mismatches.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="mismatches"
                    icon={AlertTriangle}
                    color="navy"
                    title="🔍 OASIS vs Narrative Mismatches"
                    count={oasisResults.oasis_narrative_mismatches.length}
                    subtitle="Uploaded OASIS scores don't match clinical documentation"
                    isExpanded={expandedCategories.includes('mismatches')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('mismatches') && <MismatchesResults items={oasisResults.oasis_narrative_mismatches} />}
                </div>
              )}

              {/* Cross-Validation Failures */}
              {oasisResults.cross_validation_failures && oasisResults.cross_validation_failures.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="crossvalidation"
                    icon={AlertTriangle}
                    color="orange"
                    title="🔗 Cross-Validation Issues"
                    count={oasisResults.cross_validation_failures.length}
                    subtitle="Related OASIS items don't align per CMS rules"
                    isExpanded={expandedCategories.includes('crossvalidation')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('crossvalidation') && <CrossValidationResults items={oasisResults.cross_validation_failures} />}
                </div>
              )}

              {/* GG Section Analysis */}
              {oasisResults.gg_section_analysis && (
                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Section GG Functional Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {oasisResults.gg_section_analysis.gg0130_self_care_summary && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">GG0130 Self-Care</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.gg0130_self_care_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.gg0170_mobility_summary && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">GG0170 Mobility</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.gg0170_mobility_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.goal_appropriateness && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Discharge Goal Assessment</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.goal_appropriateness}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.functional_improvement_potential && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Improvement Potential</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.functional_improvement_potential}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Underscoring Opportunities */}
              {oasisResults.underscoring_opportunities && oasisResults.underscoring_opportunities.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="underscoring"
                    icon={TrendingUp}
                    color="green"
                    title="💰 Underscoring Opportunities"
                    count={oasisResults.underscoring_opportunities.length}
                    subtitle="Documentation supports higher scores - potential revenue increase"
                    isExpanded={expandedCategories.includes('underscoring')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('underscoring') && (
                    <UnderscoringResults
                      items={oasisResults.underscoring_opportunities}
                      visit={visit}
                      patient={patient}
                      onAccept={(item) => handleSuggestionAccept(item, 'underscoring')}
                      onReject={handleSuggestionReject}
                      onModify={handleSuggestionModify}
                    />
                  )}
                </div>
              )}

              {/* Overscoring Risks */}
              {oasisResults.overscoring_risks && oasisResults.overscoring_risks.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="overscoring"
                    icon={AlertTriangle}
                    color="red"
                    title="⚠️ Overscoring Risks"
                    count={oasisResults.overscoring_risks.length}
                    subtitle="Claimed scores not fully supported - audit risk"
                    isExpanded={expandedCategories.includes('overscoring')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('overscoring') && (
                    <OverscoringResults
                      items={oasisResults.overscoring_risks}
                      visit={visit}
                      patient={patient}
                      onAccept={(item) => handleSuggestionAccept(item, 'overscoring')}
                      onReject={handleSuggestionReject}
                      onModify={handleSuggestionModify}
                    />
                  )}
                </div>
              )}

              {/* Critical Missing Items */}
              {oasisResults.critical_missing && oasisResults.critical_missing.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="critical"
                    icon={XCircle}
                    color="red"
                    title="Critical Missing OASIS Items"
                    count={oasisResults.critical_missing.length}
                    subtitle="These items are REQUIRED for submission and reimbursement"
                    isExpanded={expandedCategories.includes('critical')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('critical') && (
                    <CriticalMissingResults
                      items={oasisResults.critical_missing}
                      visit={visit}
                      patient={patient}
                      onAccept={(item) => handleSuggestionAccept(item, 'missing_item')}
                      onReject={handleSuggestionReject}
                      onModify={handleSuggestionModify}
                    />
                  )}
                </div>
              )}

              {/* Incomplete Assessments */}
              {oasisResults.incomplete_assessments && oasisResults.incomplete_assessments.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="incomplete"
                    icon={AlertTriangle}
                    color="yellow"
                    title="Incomplete Assessments"
                    count={oasisResults.incomplete_assessments.length}
                    subtitle="These items need more specific detail"
                    isExpanded={expandedCategories.includes('incomplete')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('incomplete') && <IncompleteAssessmentsResults items={oasisResults.incomplete_assessments} />}
                </div>
              )}

              {/* Vague Documentation */}
              {oasisResults.vague_documentation && oasisResults.vague_documentation.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="vague"
                    icon={AlertTriangle}
                    color="amber"
                    title="📝 Vague Documentation"
                    count={oasisResults.vague_documentation.length}
                    subtitle="Language not specific enough for defensible OASIS scoring"
                    isExpanded={expandedCategories.includes('vague')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('vague') && (
                    <VagueDocumentationResults
                      items={oasisResults.vague_documentation}
                      onQuickFix={handleQuickFix}
                    />
                  )}
                </div>
              )}

              {/* Inconsistencies */}
              {oasisResults.inconsistencies && oasisResults.inconsistencies.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="inconsistencies"
                    icon={AlertTriangle}
                    color="orange"
                    title="Inconsistencies Found"
                    count={oasisResults.inconsistencies.length}
                    subtitle="Conflicting information that needs resolution"
                    isExpanded={expandedCategories.includes('inconsistencies')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('inconsistencies') && <InconsistenciesResults items={oasisResults.inconsistencies} />}
                </div>
              )}

              {/* Compliant Items */}
              {oasisResults.compliant_items && oasisResults.compliant_items.length > 0 && (
                <div className="space-y-3">
                  <CollapsibleResultHeader
                    name="compliant"
                    icon={CheckCircle2}
                    color="green"
                    title="Compliant OASIS Items"
                    count={oasisResults.compliant_items.length}
                    subtitle="These items are properly documented"
                    isExpanded={expandedCategories.includes('compliant')}
                    onToggle={toggleCategory}
                  />

                  {expandedCategories.includes('compliant') && <CompliantItemsResults items={oasisResults.compliant_items} />}
                </div>
              )}

              {/* Recommendations */}
              <RecommendationsSummary recommendations={oasisResults.recommendations} />

              {/* Quality Measures Impact */}
              <QualityMeasuresImpact measures={oasisResults.quality_measures_impact} />

              {/* Audit Defense Summary */}
              <AuditDefenseSummary
                summary={oasisResults.audit_defense_summary}
                copiedText={copiedText}
                criticalMissing={oasisResults.critical_missing}
                vagueDocumentation={oasisResults.vague_documentation}
                underscoringOpportunities={oasisResults.underscoring_opportunities}
                onQuickFix={handleQuickFix}
                onCopy={copyToClipboard}
              />

                {/* Documentation Quality Score */}
                {oasisResults.documentation_quality && (
                  <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      Documentation Quality Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Specificity Score</p>
                        <p className="text-2xl font-bold text-slate-900">{oasisResults.documentation_quality.specificity_score || 'N/A'}</p>
                        <Progress value={oasisResults.documentation_quality.specificity_score || 0} className="h-2 mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Defensibility Score</p>
                        <p className="text-2xl font-bold text-slate-900">{oasisResults.documentation_quality.defensibility_score || 'N/A'}</p>
                        <Progress value={oasisResults.documentation_quality.defensibility_score || 0} className="h-2 mt-1" />
                      </div>
                    </div>
                    {oasisResults.documentation_quality.key_weaknesses?.length > 0 && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Key Weaknesses:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {oasisResults.documentation_quality.key_weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : null}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
            {oasisResults && !oasisResults.ready_for_submission && (
              <Button
                onClick={() => {
                  setShowDialog(false);
                  document.querySelector('textarea')?.focus();
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Fix Issues in Documentation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}