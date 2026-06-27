import { useState } from "react";
import { extractClinicalIndicators } from "./clinicalIndicators";
import { determineClinicalGroup, identifyComorbidities } from "./pdgmClinicalGroup";
import { invokeLLM } from "@/lib/invokeLLM";
import { buildFunctionalPhrases, buildClinicalAlerts, getRiskColor, getImpactBadge } from "./oasisScrubberData";
import { buildOASISScrubberPrompt, oasisScrubberResponseSchema } from "./oasisScrubberPrompt";
import ClinicalAlertsPanel from "./ClinicalAlertsPanel";
import ComorbiditiesSummary from "./ComorbiditiesSummary";
import ClinicalGroupSummary from "./ClinicalGroupSummary";
import ClinicalIndicatorsGrid from "./ClinicalIndicatorsGrid";
import ClinicalIndicatorsDetail from "./ClinicalIndicatorsDetail";
import FunctionalPhrasesPanel from "./FunctionalPhrasesPanel";
import CollapsibleResultHeader from "./CollapsibleResultHeader";
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
  Copy,
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
  Stethoscope,
  ClipboardList
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
import OASISFeedbackPanel from "../oasis/OASISFeedbackPanel";
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
                    <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      PDGM Case-Mix Analysis
                    </h4>

                    {/* Clinical Group with Confidence */}
                    <div className="bg-white p-3 rounded border mb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <p className="text-xs text-slate-500">Clinical Group (MMTA)</p>
                          <p className="font-bold text-slate-900">{oasisResults.pdgm_analysis.clinical_group}</p>
                        </div>
                        <Badge className={`${
                          oasisResults.pdgm_analysis.clinical_group_confidence === 'high' ? 'bg-green-600' :
                          oasisResults.pdgm_analysis.clinical_group_confidence === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          {oasisResults.pdgm_analysis.clinical_group_confidence?.toUpperCase()} Confidence
                        </Badge>
                      </div>
                      {oasisResults.pdgm_analysis.clinical_group_rationale && (
                        <p className="text-xs text-slate-600 mt-1">{oasisResults.pdgm_analysis.clinical_group_rationale}</p>
                      )}
                      {oasisResults.pdgm_analysis.primary_dx_icd10_suggested && (
                        <p className="text-xs text-blue-700 mt-1">
                          <strong>Suggested ICD-10:</strong> {oasisResults.pdgm_analysis.primary_dx_icd10_suggested}
                        </p>
                      )}
                      {oasisResults.pdgm_analysis.alternative_clinical_groups?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-slate-500">Alternatives:</span>
                          {oasisResults.pdgm_analysis.alternative_clinical_groups.map((alt, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{alt}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Functional Level</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.functional_level === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.functional_level === 'medium' ? 'text-yellow-700' : 'text-red-700'
                        }`}>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</p>
                        {oasisResults.pdgm_analysis.functional_points_calculated && (
                          <p className="text-xs text-slate-500 mt-1">{oasisResults.pdgm_analysis.functional_points_calculated} points</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Comorbidity Adj.</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.comorbidity_adjustment === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' ? 'text-yellow-700' : 'text-slate-700'
                        }`}>{oasisResults.pdgm_analysis.comorbidity_adjustment?.toUpperCase()}</p>
                        {oasisResults.pdgm_analysis.comorbidity_count > 0 && (
                          <p className="text-xs text-slate-500 mt-1">{oasisResults.pdgm_analysis.comorbidity_count} qualifying</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Case-Mix Weight</p>
                        <p className="font-bold text-green-700 text-lg">{oasisResults.pdgm_analysis.estimated_case_mix_weight}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <p className="text-xs text-green-700">Optimization</p>
                        <p className="font-semibold text-green-800">{oasisResults.pdgm_analysis.optimization_potential}</p>
                      </div>
                    </div>

                    {/* Qualifying Comorbidities Detail */}
                    {oasisResults.pdgm_analysis.qualifying_comorbidities && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Qualifying Comorbidities:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {oasisResults.pdgm_analysis.qualifying_comorbidities.high_impact?.length > 0 && (
                            <div>
                              <p className="text-xs text-green-700 font-medium">✓ High-Impact (1 = HIGH adj):</p>
                              <ul className="text-xs text-green-900">
                                {oasisResults.pdgm_analysis.qualifying_comorbidities.high_impact.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {oasisResults.pdgm_analysis.qualifying_comorbidities.low_impact?.length > 0 && (
                            <div>
                              <p className="text-xs text-yellow-700 font-medium">○ Low-Impact (2+ = LOW adj):</p>
                              <ul className="text-xs text-yellow-900">
                                {oasisResults.pdgm_analysis.qualifying_comorbidities.low_impact.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions?.length > 0 && (
                          <div className="mt-2 bg-yellow-100 p-2 rounded">
                            <p className="text-xs text-yellow-800 font-medium">💡 Potential Additional Comorbidities (needs documentation):</p>
                            <ul className="text-xs text-yellow-900">
                              {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions.map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Case-Mix Weight Breakdown */}
                    {oasisResults.pdgm_analysis.case_mix_weight_breakdown && (
                      <div className="bg-white p-2 rounded border mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Case-Mix Weight Breakdown:</p>
                        <div className="flex gap-4 text-xs">
                          <span>Clinical: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.clinical_component}</strong></span>
                          <span>Functional: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.functional_component}</strong></span>
                          <span>Comorbidity: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.comorbidity_component}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Optimization Strategies */}
                    {oasisResults.pdgm_analysis.optimization_strategies?.length > 0 && (
                      <Alert className="bg-green-100 border-green-300">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Optimization Strategies:</strong>
                          <ul className="mt-1 text-xs">
                            {oasisResults.pdgm_analysis.optimization_strategies.map((strategy, idx) => (
                              <li key={idx}>• {strategy}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Automated Optimization Suggestions */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-amber-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          Automated Optimization Suggestions
                        </h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOptimizationPanel(!showOptimizationPanel)}
                          className="h-6 text-xs"
                        >
                          {showOptimizationPanel ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {showOptimizationPanel ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                      
                      {showOptimizationPanel && (
                        <div className="space-y-3">
                        {oasisResults.pdgm_analysis.clinical_group_confidence !== 'high' && (
                          <div className="bg-white p-3 rounded border border-amber-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-amber-500 text-white text-xs flex-shrink-0">Clinical Group</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-amber-900">Strengthen Clinical Group Assignment</p>
                                <p className="text-xs text-amber-800 mt-1">
                                  Current confidence is <strong>{oasisResults.pdgm_analysis.clinical_group_confidence}</strong>. 
                                  Document specific ICD-10 codes and clinical conditions that align with {oasisResults.pdgm_analysis.clinical_group?.split(' - ')[0]}.
                                </p>
                                <div className="mt-2 bg-amber-50 p-2 rounded text-xs">
                                  <p className="font-medium text-amber-800">💡 Suggestion:</p>
                                  <p className="text-amber-700">
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Musculoskeletal') && 
                                      'Document specific orthopedic procedure codes, weight-bearing status, and surgical details to strengthen MMTA-01 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Neuro') && 
                                      'Document specific CVA laterality, affected extremities, and cognitive/motor deficits to strengthen MMTA-02 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Wounds') && 
                                      'Document wound etiology, staging, measurements, and treatment plan to strengthen MMTA-03 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Complex') && 
                                      'Document specific complex care interventions, equipment, and skilled nursing requirements.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('MMTA') && 
                                      'Document medication complexity, teaching needs, and disease management requirements.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Behavioral') && 
                                      'Document psychiatric diagnoses, behavioral interventions, and safety concerns.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Functional Score Optimization */}
                        {oasisResults.pdgm_analysis.functional_level !== 'high' && (
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">Functional Level</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">Maximize Functional Score Documentation</p>
                                <p className="text-xs text-blue-800 mt-1">
                                  Current level: <strong>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</strong> 
                                  ({oasisResults.pdgm_analysis.functional_points_calculated || '?'} points). 
                                  {oasisResults.pdgm_analysis.functional_level === 'low' ? ' Need 6+ points for MEDIUM, 12+ for HIGH.' : ' Need 12+ points for HIGH.'}
                                </p>
                                <div className="mt-2 space-y-2">
                                  {/* Specific M-item suggestions based on current scores */}
                                  {oasisResults.functional_score_analysis && (
                                    <>
                                      {(oasisResults.functional_score_analysis.m1830_bathing?.documented_value < 3 || !oasisResults.functional_score_analysis.m1830_bathing?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                              <p className="font-medium text-blue-800">🚿 M1830 Bathing (0-6 scale):</p>
                                              <p className="text-blue-700">Document need for assistance throughout bathing, transfer assistance, or inability to bathe. Include safety concerns, equipment needs, and caregiver involvement.</p>
                                            </div>
                                            {extractedIndicators?.functional?.bathing?.allPhrases?.length > 0 && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyToClipboard(extractedIndicators.functional.bathing.allPhrases[0], 'bathing-suggestion')}
                                                className="h-6 px-2 flex-shrink-0"
                                              >
                                                {copiedText === 'bathing-suggestion' ? (
                                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                ) : (
                                                  <Copy className="w-3 h-3" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {(oasisResults.functional_score_analysis.m1860_ambulation?.documented_value < 3 || !oasisResults.functional_score_analysis.m1860_ambulation?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <p className="font-medium text-blue-800">🚶 M1860 Ambulation (0-6 scale):</p>
                                          <p className="text-blue-700">Document assistive device dependence, distance limitations, surface restrictions, and assistance requirements. Include gait abnormalities and fall risk factors.</p>
                                        </div>
                                      )}
                                      {(oasisResults.functional_score_analysis.m1850_transferring?.documented_value < 2 || !oasisResults.functional_score_analysis.m1850_transferring?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <p className="font-medium text-blue-800">🔄 M1850 Transferring (0-5 scale):</p>
                                          <p className="text-blue-700">Document supervision or physical assistance needed, weight-bearing restrictions, and equipment use (grab bars, transfer boards, mechanical lifts).</p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="bg-green-50 p-2 rounded text-xs border border-green-200">
                                    <p className="font-medium text-green-800">📈 Revenue Impact:</p>
                                    <p className="text-green-700">
                                      Each functional level increase (Low→Medium→High) can add $200-$500 per 30-day episode.
                                      {oasisResults.pdgm_analysis.functional_level === 'low' && ' Moving from LOW to MEDIUM = +$200-300/episode.'}
                                      {oasisResults.pdgm_analysis.functional_level === 'medium' && ' Moving from MEDIUM to HIGH = +$300-500/episode.'}
                                    </p>
                                  </div>
                                  <div className="bg-blue-50 p-2 rounded text-xs border border-blue-200 mt-2">
                                    <p className="font-medium text-blue-800">🎯 Next Steps to Increase Score:</p>
                                    <ol className="text-blue-700 list-decimal list-inside mt-1 space-y-1">
                                      <li>Review narrative for ANY mention of assistance needs not captured in M-items</li>
                                      <li>Document specific level of assist (min/mod/max) with observable details</li>
                                      <li>Cross-check GG scores align with M1800-1860 functional documentation</li>
                                      <li>Consider PT/OT referral for objective functional assessment</li>
                                    </ol>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comorbidity Optimization */}
                        {oasisResults.pdgm_analysis.comorbidity_adjustment !== 'high' && (
                          <div className="bg-white p-3 rounded border border-navy-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-navy-500 text-white text-xs flex-shrink-0">Comorbidity Adj.</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-navy-900">Improve Comorbidity Adjustment</p>
                                <p className="text-xs text-navy-800 mt-1">
                                  Current adjustment: <strong>{oasisResults.pdgm_analysis.comorbidity_adjustment?.toUpperCase() || 'NONE'}</strong>.
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && ' Document qualifying comorbidities to increase reimbursement.'}
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' && ' Document ONE high-impact comorbidity for HIGH adjustment.'}
                                </p>
                                <div className="mt-2 space-y-2">
                                  {/* High-impact comorbidity suggestions */}
                                  <div className="bg-navy-50 p-2 rounded text-xs">
                                    <p className="font-medium text-navy-800 mb-1">🎯 High-Impact Comorbidities (1 = HIGH adjustment):</p>
                                    <ul className="text-navy-700 space-y-1">
                                      <li>• <strong>Diabetes with complications</strong> - neuropathy, nephropathy, retinopathy (E11.2x, E11.4x, E11.5x, E11.6x)</li>
                                      <li>• <strong>Heart Failure</strong> - CHF, HFrEF, HFpEF (I50.x)</li>
                                      <li>• <strong>COPD</strong> - chronic bronchitis, emphysema (J44.x, J43.x)</li>
                                      <li>• <strong>Chronic Kidney Disease</strong> - Stage 3-5 (N18.3-N18.5)</li>
                                      <li>• <strong>Malignancy</strong> - active cancer with treatment (C00-C96)</li>
                                    </ul>
                                  </div>
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && (
                                    <div className="bg-yellow-50 p-2 rounded text-xs border border-yellow-200">
                                      <p className="font-medium text-yellow-800 mb-1">💡 Low-Impact Alternative (need 2+ for LOW adjustment):</p>
                                      <ul className="text-yellow-700">
                                        <li>• Hypertension (I10), Atrial Fibrillation (I48), Uncomplicated Diabetes (E11.9)</li>
                                        <li>• Osteoarthritis (M15-M17), Anxiety/Depression (F41, F32), Obesity (E66)</li>
                                      </ul>
                                    </div>
                                  )}
                                  {oasisResults.pdgm_analysis.qualifying_comorbidities?.potential_additions?.length > 0 && (
                                    <div className="bg-green-50 p-2 rounded text-xs border border-green-200">
                                      <p className="font-medium text-green-800">✓ Identified in Narrative (needs proper coding):</p>
                                      <ul className="text-green-700 space-y-1">
                                        {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions.map((c, i) => (
                                          <li key={i} className="flex items-center gap-1">
                                            <span>• {c}</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => copyToClipboard(c, `comorbid-${i}`)}
                                              className="h-4 w-4 p-0 ml-auto"
                                            >
                                              {copiedText === `comorbid-${i}` ? (
                                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </Button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="bg-indigo-50 p-2 rounded text-xs border border-indigo-200 mt-2">
                                    <p className="font-medium text-indigo-800">💰 Comorbidity Impact:</p>
                                    <p className="text-indigo-700">
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && 'Adding LOW adjustment = +$100-200/episode. Adding HIGH adjustment = +$300-500/episode.'}
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' && 'Upgrading to HIGH adjustment = additional +$200-300/episode.'}
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'high' && 'Currently maximized - excellent work!'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Documentation Gaps */}
                        <div className="bg-white p-3 rounded border border-red-200">
                          <div className="flex items-start gap-2">
                            <Badge className="bg-red-500 text-white text-xs flex-shrink-0">Documentation Gaps</Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900">Key Documentation Gaps Identified</p>
                              <div className="mt-2 space-y-2 text-xs">
                                {/* Check for specific gaps based on analysis */}
                                {(!extractedIndicators?.clinical?.assistDevices?.detected && oasisResults.functional_score_analysis?.m1860_ambulation?.documented_value > 0) && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>🦯 Assistive Device Gap:</strong> Ambulation limitations documented but no assistive device mentioned. 
                                      Document specific devices (walker, cane, wheelchair) if used.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.fallRisk?.detected) && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>⚠️ Fall Risk Gap:</strong> No fall risk documentation found. 
                                      Document fall history, risk factors, environmental hazards, and interventions implemented.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.painMentioned?.detected) && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>💊 Pain Assessment Gap:</strong> No pain documentation found. 
                                      Document pain level (0-10), location, quality, frequency, and management plan.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.cognitiveIssues?.detected && patient?.primary_diagnosis?.toLowerCase().includes('dementia')) && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>🧠 Cognitive Assessment Gap:</strong> Dementia diagnosis but limited cognitive documentation. 
                                      Document orientation status, BIMS score, memory deficits, and safety concerns.
                                    </p>
                                  </div>
                                )}
                                {oasisResults.vague_documentation?.length > 0 && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>📝 Vague Language:</strong> {oasisResults.vague_documentation.length} items have vague documentation 
                                      that could support multiple scores. See "Vague Documentation" section for specific improvements.
                                    </p>
                                  </div>
                                )}
                                {oasisResults.cross_validation_failures?.length > 0 && (
                                  <div className="bg-red-50 p-2 rounded">
                                    <p className="text-red-800">
                                      <strong>🔗 Cross-Validation:</strong> {oasisResults.cross_validation_failures.length} item relationships 
                                      don't align per CMS rules. Fix these to avoid audit flags.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Care Plan Modification Suggestions */}
                        <div className="bg-white p-3 rounded border border-navy-200">
                          <div className="flex items-start gap-2">
                            <Badge className="bg-navy-500 text-white text-xs flex-shrink-0">Care Plan</Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-navy-900">Care Plan Modification Suggestions</p>
                              <div className="mt-2 space-y-2 text-xs">
                                {oasisResults.pdgm_analysis.functional_level !== 'high' && (
                                  <div className="bg-navy-50 p-2 rounded">
                                    <p className="text-navy-800">
                                      <strong>🎯 Therapy Referral:</strong> Consider PT/OT evaluation to document objective functional limitations 
                                      and establish measurable goals. Therapy assessments often capture functional deficits more precisely.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.diabetic?.detected && (
                                  <div className="bg-navy-50 p-2 rounded">
                                    <p className="text-navy-800">
                                      <strong>🩺 Diabetic Care Plan:</strong> Ensure diabetic complications are documented as separate diagnoses 
                                      (neuropathy, nephropathy, retinopathy) with specific ICD-10 codes for comorbidity credit.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.cardiacIssues?.detected && (
                                  <div className="bg-navy-50 p-2 rounded">
                                    <p className="text-navy-800">
                                      <strong>❤️ Cardiac Care Plan:</strong> Document EF% if known, specific CHF type (HFrEF/HFpEF), 
                                      and daily weight monitoring plan for optimal coding and care coordination.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.woundPresent?.detected && (
                                  <div className="bg-navy-50 p-2 rounded">
                                    <p className="text-navy-800">
                                      <strong>🩹 Wound Care Plan:</strong> Ensure weekly wound measurements are documented with healing trajectory. 
                                      Non-healing wounds may indicate need for specialist referral and support higher clinical group assignment.
                                    </p>
                                  </div>
                                )}
                                <div className="bg-green-50 p-2 rounded border border-green-200">
                                  <p className="font-medium text-green-800">💰 Total Optimization Potential:</p>
                                  <p className="text-green-700">
                                    Implementing these suggestions could increase case-mix weight by 
                                    <strong> 0.05-0.15</strong>, translating to approximately 
                                    <strong> $150-$450</strong> additional per 30-day episode.
                                  </p>
                                  <div className="mt-2 pt-2 border-t border-green-200">
                                    <p className="text-green-800 font-medium">Annual Impact (60 episodes/year):</p>
                                    <p className="text-2xl font-bold text-green-900">$9,000 - $27,000</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 mt-2"
                                  onClick={() => {
                                    const allSuggestions = [
                                      ...(oasisResults.underscoring_opportunities || []),
                                      ...(oasisResults.critical_missing || []),
                                      ...(oasisResults.vague_documentation || [])
                                    ];
                                    const topSuggestion = allSuggestions[0];
                                    if (topSuggestion) {
                                      handleSuggestionAccept(topSuggestion, 'optimization');
                                    }
                                  }}
                                  disabled={!oasisResults.underscoring_opportunities?.length && !oasisResults.critical_missing?.length}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Top Suggestion Now
                                </Button>
                                </div>
                                </div>
                                </div>
                                </div>
                                </div>
                                )}

                                {/* Quick Action Buttons */}
                                {!showOptimizationPanel && (
                                <div className="flex flex-wrap gap-2">
                                <Badge className="bg-amber-600 text-white">
                                {[
                                oasisResults.pdgm_analysis.clinical_group_confidence !== 'high' ? 1 : 0,
                                oasisResults.pdgm_analysis.functional_level !== 'high' ? 1 : 0,
                                oasisResults.pdgm_analysis.comorbidity_adjustment !== 'high' ? 1 : 0
                                ].reduce((a, b) => a + b, 0)} optimization areas available
                                </Badge>
                                </div>
                                )}
                                </div>
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

                  {expandedCategories.includes('mismatches') && (
                    <div className="space-y-3">
                      {oasisResults.oasis_narrative_mismatches.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-navy-500 bg-navy-50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-navy-900">{item.oasis_item}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Uploaded OASIS Score</p>
                                <p className="font-semibold text-red-800">{item.uploaded_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-700">Narrative Suggests</p>
                                <p className="font-semibold text-green-800">{item.narrative_suggests}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-500">Discrepancy:</p>
                              <p className="text-slate-900">{item.discrepancy}</p>
                            </div>
                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Recommendation:</strong> {item.recommendation}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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

                  {expandedCategories.includes('crossvalidation') && (
                    <div className="space-y-3">
                      {oasisResults.cross_validation_failures.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-orange-900">{item.rule_violated}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.items_involved?.map((mi, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white text-orange-800 border-orange-300 text-xs">
                                  {mi}
                                </Badge>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700 font-medium">Current Values</p>
                                <p className="text-red-900">{item.current_values}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-700 font-medium">Expected Relationship</p>
                                <p className="text-green-900">{item.expected_relationship}</p>
                              </div>
                            </div>
                            {item.narrative_evidence && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-500">Evidence:</p>
                                <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                              </div>
                            )}
                            {item.pdgm_impact && (
                              <div className="bg-navy-50 p-2 rounded border border-navy-200 text-sm">
                                <p className="text-xs text-navy-700 font-medium">PDGM Impact:</p>
                                <p className="text-navy-900">{item.pdgm_impact}</p>
                              </div>
                            )}
                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Resolution:</strong> {item.resolution}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
                    <div className="space-y-3">
                      {oasisResults.underscoring_opportunities.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-green-500 bg-green-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-green-900">{item.oasis_item}</h5>
                              <div className="flex gap-2">
                                {item.score_difference && (
                                  <Badge className="bg-blue-600">{item.score_difference}</Badge>
                                )}
                                <Badge className="bg-green-600">{item.revenue_impact}</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-slate-500">Current Implied Score</p>
                                <p className="font-semibold text-slate-700">{item.current_implied_score || item.current_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-300">
                                <p className="text-xs text-green-700">Supported Score</p>
                                <p className="font-semibold text-green-800">{item.supported_score}</p>
                              </div>
                            </div>
                            {item.functional_level_change && (
                              <Badge variant="outline" className="bg-navy-50 text-navy-800 border-navy-300">
                                {item.functional_level_change}
                              </Badge>
                            )}
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-500 font-medium">📝 Evidence from Narrative:</p>
                              <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                            </div>
                            {item.cms_scoring_definition && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Scoring Definition:</p>
                                <p className="text-blue-900">{item.cms_scoring_definition}</p>
                                {item.cms_reference && (
                                  <p className="text-xs text-blue-600 mt-1">Ref: {item.cms_reference}</p>
                                )}
                              </div>
                            )}
                            {item.why_higher_score_applies && (
                              <div className="bg-green-100 p-2 rounded border border-green-200 text-sm">
                                <p className="text-xs text-green-700 font-medium">✓ Why Higher Score Applies:</p>
                                <p className="text-green-900">{item.why_higher_score_applies}</p>
                              </div>
                            )}
                            {item.documentation_enhancement && (
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-sm">
                                <p className="text-xs text-yellow-700 font-medium">💡 Documentation Enhancement:</p>
                                <p className="text-yellow-900">{item.documentation_enhancement}</p>
                              </div>
                            )}
                            {item.example_compliant_language && (
                              <div className="bg-emerald-50 p-3 rounded border border-emerald-200 text-sm">
                                <p className="text-xs text-emerald-700 font-medium">✓ Example Compliant Language:</p>
                                <p className="text-emerald-900 italic">"{item.example_compliant_language}"</p>
                              </div>
                            )}
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="underscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'underscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.revenue_impact}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                    <div className="space-y-3">
                      {oasisResults.overscoring_risks.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                              <div className="flex gap-2">
                                {item.score_difference && (
                                  <Badge className="bg-slate-600">{item.score_difference}</Badge>
                                )}
                                <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : 'bg-orange-500'}`}>
                                  {item.audit_risk} audit risk
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Claimed/Implied Score</p>
                                <p className="font-semibold text-red-800">{item.claimed_score}</p>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-slate-500">Actually Supported</p>
                                <p className="font-semibold text-slate-700">{item.supported_score}</p>
                              </div>
                            </div>
                            {item.narrative_evidence && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-500 font-medium">📝 Contradicting Evidence:</p>
                                <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                              </div>
                            )}
                            {item.cms_scoring_definition && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Definition (Supported Score):</p>
                                <p className="text-blue-900">{item.cms_scoring_definition}</p>
                              </div>
                            )}
                            {item.audit_vulnerability && typeof item.audit_vulnerability === 'object' && (
                              <div className="bg-red-100 p-3 rounded border border-red-300 text-sm space-y-2">
                                <p className="text-xs text-red-700 font-bold">⚠️ AUDIT VULNERABILITY:</p>
                                {item.audit_vulnerability.type && (
                                  <Badge variant="outline" className="bg-red-200 text-red-800 border-red-400 text-xs">
                                    {item.audit_vulnerability.type} Review Risk
                                  </Badge>
                                )}
                                {item.audit_vulnerability.specific_risk && (
                                  <p className="text-red-900"><strong>Risk:</strong> {item.audit_vulnerability.specific_risk}</p>
                                )}
                                {item.audit_vulnerability.potential_recoupment && (
                                  <p className="text-red-800 font-semibold">💰 Potential Recoupment: {item.audit_vulnerability.potential_recoupment}</p>
                                )}
                                {item.audit_vulnerability.documentation_that_contradicts && (
                                  <p className="text-red-900"><strong>Auditor Would Cite:</strong> "{item.audit_vulnerability.documentation_that_contradicts}"</p>
                                )}
                              </div>
                            )}
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
                              <p className="text-xs text-yellow-700 font-medium mb-2">🔧 Recommended Action:</p>
                              <p className="text-yellow-900 font-medium">{item.recommended_action || item.recommendation}</p>
                            </div>
                            {(item.if_keeping_score || item.if_lowering_score) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {item.if_keeping_score && (
                                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                    <p className="text-xs text-blue-700 font-medium">If Keeping Score:</p>
                                    <p className="text-blue-900 text-xs">{item.if_keeping_score}</p>
                                  </div>
                                )}
                                {item.if_lowering_score && (
                                  <div className="bg-green-50 p-2 rounded border border-green-200">
                                    <p className="text-xs text-green-700 font-medium">If Lowering Score:</p>
                                    <p className="text-green-900 text-xs">{item.if_lowering_score}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="overscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'overscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                    <div className="space-y-3">
                      {oasisResults.critical_missing.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                                    {item.category}
                                  </Badge>
                                  <Badge className={`${getImpactBadge(item.reimbursement_impact)} text-white text-xs`}>
                                    {item.reimbursement_impact?.toUpperCase()} IMPACT
                                  </Badge>
                                </div>
                                <p className="text-sm text-red-800 mb-2">
                                  <strong>Why Critical:</strong> {item.why_critical}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-red-200">
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                <Info className="w-3 h-3 inline mr-1" />
                                Documentation Guidance:
                              </p>
                              <p className="text-sm text-slate-900">{item.documentation_guidance}</p>
                            </div>

                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-1">
                                ✓ Example of Compliant Documentation:
                              </p>
                              <p className="text-sm text-green-900 italic">"{item.example}"</p>
                            </div>

                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="missing_item"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'missing_item')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.estimated_revenue_impact}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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

                  {expandedCategories.includes('incomplete') && (
                    <div className="space-y-3">
                      {oasisResults.incomplete_assessments.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                          <CardContent className="p-4 space-y-2">
                            <h5 className="font-semibold text-yellow-900">{item.oasis_item}</h5>
                            
                            {item.current_documentation && (
                              <div className="bg-white p-2 rounded border border-yellow-200">
                                <p className="text-xs text-slate-600">Current documentation:</p>
                                <p className="text-sm text-slate-900 italic">"{item.current_documentation}"</p>
                              </div>
                            )}

                            <div className="bg-red-50 p-2 rounded border border-red-200">
                              <p className="text-xs text-red-900">
                                <strong>Issue:</strong> {item.issue}
                              </p>
                            </div>

                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <p className="text-xs text-blue-900">
                                <strong>Guidance:</strong> {item.guidance}
                              </p>
                            </div>

                            {item.example && (
                              <div className="bg-green-50 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-900">
                                  <strong>Better:</strong> "{item.example}"
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
                    <div className="space-y-3">
                      {oasisResults.vague_documentation.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-amber-500 bg-amber-50">
                          <CardContent className="p-4 space-y-3">
                            <h5 className="font-bold text-amber-900">{item.oasis_item}</h5>
                            
                            <div className="bg-red-100 p-2 rounded border border-red-200 text-sm">
                              <p className="text-xs text-red-700 font-medium">❌ Current Vague Language:</p>
                              <p className="text-red-900 italic">"{item.current_language}"</p>
                            </div>

                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-600 font-medium">Problem:</p>
                              <p className="text-slate-900">{item.problem}</p>
                            </div>

                            {item.cms_requirement && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Requirement:</p>
                                <p className="text-blue-900">{item.cms_requirement}</p>
                              </div>
                            )}

                            {item.defensibility_issue && (
                              <div className="bg-orange-100 p-2 rounded border border-orange-200 text-sm">
                                <p className="text-xs text-orange-700 font-medium">⚠️ Defensibility Issue:</p>
                                <p className="text-orange-900">{item.defensibility_issue}</p>
                              </div>
                            )}

                            {item.score_range_ambiguity && (
                              <div className="bg-navy-50 p-2 rounded border border-navy-200 text-sm">
                                <p className="text-xs text-navy-700 font-medium">🎯 Score Ambiguity:</p>
                                <p className="text-navy-900">{item.score_range_ambiguity}</p>
                              </div>
                            )}

                            {item.key_elements_to_add && item.key_elements_to_add.length > 0 && (
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-sm">
                                <p className="text-xs text-yellow-700 font-medium">✚ Key Elements to Add:</p>
                                <ul className="list-disc list-inside text-yellow-900 text-xs mt-1">
                                  {item.key_elements_to_add.map((el, idx) => (
                                    <li key={idx}>{el}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="bg-green-100 p-3 rounded border border-green-200 text-sm">
                              <p className="text-xs text-green-700 font-medium">✓ Improved Language:</p>
                              <p className="text-green-900 italic">"{item.improved_language}"</p>
                            </div>

                            {(item.example_for_higher_score || item.example_for_lower_score) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {item.example_for_higher_score && (
                                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                                    <p className="text-xs text-emerald-700 font-medium">For Higher Score:</p>
                                    <p className="text-emerald-900 text-xs italic">"{item.example_for_higher_score}"</p>
                                  </div>
                                )}
                                {item.example_for_lower_score && (
                                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                    <p className="text-xs text-slate-600 font-medium">For Lower Score:</p>
                                    <p className="text-slate-800 text-xs italic">"{item.example_for_lower_score}"</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleQuickFix(item.cms_requirement || item.problem, item.improved_language)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Insert Improved Language
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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

                  {expandedCategories.includes('inconsistencies') && (
                    <div className="space-y-3">
                      {oasisResults.inconsistencies.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-orange-900">{item.issue}</h5>
                              <div className="flex gap-2">
                                {item.inconsistency_type && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                                    {item.inconsistency_type?.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {item.audit_risk && (
                                  <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                    {item.audit_risk} risk
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {item.location_1 && (
                                <div className="bg-red-100 p-2 rounded border border-red-200">
                                  <p className="text-xs text-red-700 font-medium">Statement 1:</p>
                                  <p className="text-red-900 italic text-xs">"{item.location_1}"</p>
                                </div>
                              )}
                              {item.location_2 && (
                                <div className="bg-red-100 p-2 rounded border border-red-200">
                                  <p className="text-xs text-red-700 font-medium">Statement 2 (Conflicts):</p>
                                  <p className="text-red-900 italic text-xs">"{item.location_2}"</p>
                                </div>
                              )}
                            </div>
                            
                            {item.oasis_items_affected && item.oasis_items_affected.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-slate-600 mr-1">Affects:</span>
                                {item.oasis_items_affected.map((mi, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-white text-orange-800 border-orange-300 text-xs">
                                    {mi}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {item.why_problematic && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-600 font-medium">Why This Is Problematic:</p>
                                <p className="text-slate-900">{item.why_problematic}</p>
                              </div>
                            )}

                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Resolution:</strong> {item.resolution}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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

                  {expandedCategories.includes('compliant') && (
                    <div className="grid grid-cols-2 gap-2">
                      {oasisResults.compliant_items.map((item, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-green-900">{item.oasis_item}</p>
                              <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                              {item.evidence && (
                                <p className="text-xs text-green-700 mt-1 truncate" title={item.evidence}>
                                  "{item.evidence}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {oasisResults.recommendations && oasisResults.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    OASIS Documentation Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="font-bold text-blue-600 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quality Measures Impact */}
              {oasisResults.quality_measures_impact && oasisResults.quality_measures_impact.length > 0 && (
                <div className="bg-navy-50 p-4 rounded-lg border-2 border-navy-200">
                  <h4 className="font-bold text-navy-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quality Measures & Star Rating Impact
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.quality_measures_impact.map((measure, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-navy-900">
                        <span className="font-bold text-navy-600 mt-0.5">★</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                  </div>
                )}

                {/* Audit Defense Summary */}
                {oasisResults.audit_defense_summary && (
                  <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Audit Defense Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {oasisResults.audit_defense_summary.strongest_documentation?.length > 0 && (
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Strongest Documentation
                          </p>
                          <ul className="text-xs text-green-700 space-y-1">
                            {oasisResults.audit_defense_summary.strongest_documentation.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {oasisResults.audit_defense_summary.weakest_documentation?.length > 0 && (
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Weakest Documentation
                          </p>
                          <ul className="text-xs text-red-700 space-y-1">
                            {oasisResults.audit_defense_summary.weakest_documentation.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {oasisResults.audit_defense_summary.recommended_priority_fixes?.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Priority Fixes
                          </p>
                          <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                            {oasisResults.audit_defense_summary.recommended_priority_fixes.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* High-Risk Audit Scenarios */}
                    {oasisResults.audit_defense_summary.weakest_documentation?.length > 0 && (
                      <div className="bg-red-100 p-4 rounded-lg border border-red-300 mb-4">
                        <h5 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          High-Risk Audit Scenarios
                        </h5>
                        <div className="space-y-3">
                          {oasisResults.audit_defense_summary.weakest_documentation.slice(0, 3).map((weakness, idx) => {
                            const auditScenarios = {
                              functional: {
                                interpretation: "Surveyor may determine functional scores are inflated without objective evidence of assistance levels. Terms like 'some help' or 'needs assistance' lack specificity required by CMS.",
                                financialImpact: "$1,500-$3,000 per episode recoupment if functional level downgraded",
                                auditType: "ADR/TPE Review"
                              },
                              bathing: {
                                interpretation: "Without documented shower chair use, grab bar locations, or specific caregiver actions during bathing, surveyor will default to lowest defensible score.",
                                financialImpact: "$200-$500 per episode if M1830 downscored by 2+ points",
                                auditType: "SMRC Targeted Review"
                              },
                              ambulation: {
                                interpretation: "Vague ambulation documentation (e.g., 'walks with difficulty') doesn't specify distance, surface, or device requirements per OASIS definitions.",
                                financialImpact: "$300-$600 per episode for M1860 adjustments",
                                auditType: "RAC Audit"
                              },
                              transfer: {
                                interpretation: "Missing weight-bearing status or transfer technique details make scores indefensible. Surveyor will question any score above 1 without specific assistance documentation.",
                                financialImpact: "$150-$400 per episode recoupment risk",
                                auditType: "ADR Review"
                              },
                              cognitive: {
                                interpretation: "Without BIMS score or specific orientation testing, cognitive impairment claims are unsupported. May affect multiple M-items and care plan justification.",
                                financialImpact: "$500-$1,200 episode impact across affected items",
                                auditType: "Comprehensive Review"
                              },
                              wound: {
                                interpretation: "Incomplete wound measurements or staging documentation violates M1306-M1342 requirements. Surveyor will question clinical group assignment.",
                                financialImpact: "$800-$2,000 clinical group reclassification risk",
                                auditType: "TPE/SMRC Review"
                              },
                              medication: {
                                interpretation: "Missing high-risk drug identification or drug regimen review documentation creates immediate compliance flag.",
                                financialImpact: "$200-$500 per episode + quality measure penalties",
                                auditType: "Quality Review"
                              },
                              homebound: {
                                interpretation: "Insufficient homebound criteria documentation may result in entire episode denial. Must document 2+ criteria with taxing effort details.",
                                financialImpact: "100% episode denial risk ($2,500-$4,000+)",
                                auditType: "Medical Necessity Review"
                              }
                            };
                            
                            const weaknessLower = weakness.toLowerCase();
                            let scenario = auditScenarios.functional;
                            if (weaknessLower.includes('bath') || weaknessLower.includes('shower')) scenario = auditScenarios.bathing;
                            else if (weaknessLower.includes('ambul') || weaknessLower.includes('walk') || weaknessLower.includes('mobil')) scenario = auditScenarios.ambulation;
                            else if (weaknessLower.includes('transfer')) scenario = auditScenarios.transfer;
                            else if (weaknessLower.includes('cogn') || weaknessLower.includes('mental') || weaknessLower.includes('bims')) scenario = auditScenarios.cognitive;
                            else if (weaknessLower.includes('wound') || weaknessLower.includes('ulcer') || weaknessLower.includes('skin')) scenario = auditScenarios.wound;
                            else if (weaknessLower.includes('med') || weaknessLower.includes('drug')) scenario = auditScenarios.medication;
                            else if (weaknessLower.includes('homebound') || weaknessLower.includes('home bound')) scenario = auditScenarios.homebound;

                            return (
                              <div key={idx} className="bg-white p-3 rounded border border-red-200">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-red-900 text-sm">{idx + 1}. {weakness}</p>
                                  <Badge className="bg-red-600 text-white text-xs flex-shrink-0">{scenario.auditType}</Badge>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <p className="text-orange-800">
                                      <strong>🔍 Surveyor Interpretation:</strong> {scenario.interpretation}
                                    </p>
                                  </div>
                                  <div className="bg-red-50 p-2 rounded border border-red-300">
                                    <p className="text-red-900 font-semibold">
                                      <DollarSign className="w-3 h-3 inline mr-1" />
                                      Financial Impact: {scenario.financialImpact}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 bg-red-200 p-2 rounded text-center">
                          <p className="text-red-900 font-bold text-sm">
                            ⚠️ Combined Maximum Risk Exposure: $2,000-$7,000+ per episode
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pre-Audit Checklist */}
                    <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                      <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Pre-Audit Checklist
                        <Badge variant="outline" className="ml-auto bg-blue-200 text-blue-800 text-xs">Complete Before Submission</Badge>
                      </h5>
                      <div className="space-y-2">
                        {(oasisResults.audit_defense_summary.recommended_priority_fixes?.slice(0, 3) || [
                          "Verify all functional scores have specific assistance level documentation",
                          "Confirm homebound status with 2+ documented criteria",
                          "Ensure medication reconciliation and high-risk drug review documented"
                        ]).map((fix, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded border border-blue-200">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-blue-900 font-medium">{fix}</p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    const relatedIssue = oasisResults.critical_missing?.[idx] || 
                                                         oasisResults.vague_documentation?.[idx] ||
                                                         oasisResults.underscoring_opportunities?.[idx];
                                    if (relatedIssue?.example || relatedIssue?.improved_language) {
                                      handleQuickFix(fix, relatedIssue.example || relatedIssue.improved_language);
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Fix
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs text-blue-600"
                                  onClick={() => copyToClipboard(fix, `checklist-${idx}`)}
                                >
                                  {copiedText === `checklist-${idx}` ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 bg-green-100 p-3 rounded border border-green-200">
                        <p className="text-green-800 text-xs">
                          <strong>✓ Audit-Ready Tip:</strong> Completing these 3 items addresses approximately 
                          <strong> 70-80%</strong> of common audit findings. Document changes with timestamps 
                          and clinician signatures for maximum defensibility.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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