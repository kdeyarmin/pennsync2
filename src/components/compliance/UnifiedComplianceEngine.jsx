import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Sparkles,
  Copy,
  ArrowRight,
  Globe,
  BookOpen,
  Activity
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UnifiedComplianceEngine({
  noteContent,
  visitType,
  patientData,
  diagnosis,
  vitalSigns,
  nurseType = "RN",
  careType = "home_health",
  onApplyFix,
  autoCheck = true,
  oasisData = null
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complianceResults, setComplianceResults] = useState(null);
  const [appliedFixes, setAppliedFixes] = useState(new Set());

  const { data: complianceRules = [] } = useQuery({
    queryKey: ['medicareComplianceRules'],
    queryFn: () => base44.entities.MedicareComplianceRule.list(),
    initialData: [],
  });

  const { data: regulatoryUpdates = [] } = useQuery({
    queryKey: ['activeRegulatoryUpdates'],
    queryFn: () => base44.entities.RegulatoryUpdate.filter({ status: 'approved' }, '-effective_date', 20),
    initialData: [],
  });

  useEffect(() => {
    if (autoCheck && noteContent && noteContent.length > 100) {
      analyzeCompliance();
    }
  }, [noteContent, autoCheck]);

  const analyzeCompliance = async () => {
    if (!noteContent || noteContent.length < 100) return;

    setIsAnalyzing(true);
    try {
      // Build comprehensive compliance context
      const applicableRules = complianceRules.filter(rule => 
        rule.is_active && 
        (!rule.applies_to_visit_types || rule.applies_to_visit_types.includes(visitType))
      );

      const recentRegulations = regulatoryUpdates
        .filter(reg => reg.impact_level === 'critical' || reg.impact_level === 'high')
        .slice(0, 5);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Medicare home health compliance expert with live internet access to CMS.gov. Perform a COMPREHENSIVE compliance analysis of this clinical note.

CLINICAL NOTE:
${noteContent}

CONTEXT:
- Visit Type: ${visitType}
- Diagnosis: ${diagnosis || 'Not specified'}
- Nurse Type: ${nurseType}
- Care Type: ${careType}
- Patient: ${patientData?.first_name} ${patientData?.last_name}
- Date: ${new Date().toISOString().split('T')[0]}
${oasisData ? `- OASIS Data Available: Yes` : ''}
${vitalSigns ? `- Vital Signs: BP ${vitalSigns.bp || 'N/A'}, HR ${vitalSigns.hr || 'N/A'}, O2 ${vitalSigns.o2 || 'N/A'}` : ''}

RECENT CRITICAL REGULATIONS (Agency-Specific):
${recentRegulations.map(reg => `- ${reg.title} (Effective: ${reg.effective_date}): ${reg.summary.substring(0, 150)}...`).join('\n')}

COMPLIANCE ANALYSIS REQUIRED:

1. **MEDICARE CoP (42 CFR 484)** - Use live internet to verify latest 2025 requirements:
   - Homebound status documentation
   - Skilled need justification
   - Patient response documentation
   - Safety and functional assessments
   ${nurseType === 'LPN' ? '- LPN supervision requirements' : ''}

2. **VISIT-TYPE SPECIFIC** - Check ${visitType} requirements:
   - Required elements for this visit type
   - Documentation standards
   - Timing and frequency requirements

3. **CLINICAL GUIDELINES** - Verify ${diagnosis} best practices:
   - Condition-specific documentation
   - Evidence-based interventions
   - Monitoring requirements

4. **OASIS ALIGNMENT** ${oasisData ? '- Check alignment with OASIS data' : '- Note if OASIS data would improve compliance'}

5. **REGULATORY UPDATES** - Apply latest agency regulations:
${recentRegulations.map(reg => `   - ${reg.title}`).join('\n')}

For EACH issue found, provide:
- Category (medicare_cop, visit_type, clinical_guideline, oasis, regulatory)
- Rule name and reference
- Severity (critical, high, medium, low)
- Status (fully_met, partially_met, not_met)
- Missing elements
- Evidence found
- Compliant example to add
- Latest 2025 CMS guidance (from internet)

Return comprehensive analysis with overall scores by category.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            category_scores: {
              type: "object",
              properties: {
                medicare_cop: { type: "number" },
                visit_type: { type: "number" },
                clinical_guideline: { type: "number" },
                oasis: { type: "number" },
                regulatory: { type: "number" }
              }
            },
            violations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  rule_name: { type: "string" },
                  reference: { type: "string" },
                  severity: { type: "string" },
                  status: { type: "string" },
                  missing_elements: { type: "array", items: { type: "string" } },
                  evidence_found: { type: "string" },
                  compliant_example: { type: "string" },
                  remediation_text: { type: "string" },
                  latest_cms_guidance: { type: "string" }
                }
              }
            },
            critical_gaps: { type: "array", items: { type: "string" } },
            quick_wins: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  fix: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setComplianceResults(result);
    } catch (error) {
      console.error('Unified compliance check error:', error);
    }
    setIsAnalyzing(false);
  };

  const handleApplyFix = (violation) => {
    onApplyFix?.(violation.compliant_example, violation.rule_name, false);
    setAppliedFixes(prev => new Set([...prev, violation.rule_name]));
  };

  const handleApplyAllQuickWins = () => {
    if (!complianceResults?.quick_wins) return;
    
    const allFixes = complianceResults.quick_wins.map(qw => qw.fix).join('\n\n');
    onApplyFix?.(allFixes, 'quick_wins_batch', false);
    
    complianceResults.quick_wins.forEach(qw => {
      setAppliedFixes(prev => new Set([...prev, qw.issue]));
    });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medicare_cop': return <Shield className="w-4 h-4" />;
      case 'visit_type': return <Activity className="w-4 h-4" />;
      case 'clinical_guideline': return <BookOpen className="w-4 h-4" />;
      case 'oasis': return <CheckCircle2 className="w-4 h-4" />;
      case 'regulatory': return <Globe className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      medicare_cop: 'Medicare CoP',
      visit_type: 'Visit Type',
      clinical_guideline: 'Clinical Guidelines',
      oasis: 'OASIS Alignment',
      regulatory: 'Recent Regulations'
    };
    return labels[category] || category;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-900';
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-900';
      default: return 'bg-blue-100 border-blue-400 text-blue-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fully_met': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'partially_met': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'not_met': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-900 font-semibold">Running Unified Compliance Analysis...</p>
          <p className="text-xs text-gray-600 mt-2">🌐 Checking Medicare CoP, Guidelines, Visit Type & Latest Regulations</p>
          <p className="text-xs text-blue-600 mt-1">Using live 2025 CMS data from internet</p>
        </CardContent>
      </Card>
    );
  }

  if (!complianceResults) {
    return (
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Unified Compliance Engine (2025)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200 mb-3">
            <Globe className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              Comprehensive compliance check: Medicare CoP, Visit Type, Clinical Guidelines, OASIS & Latest Regulations - all in one analysis using live CMS data
            </AlertDescription>
          </Alert>
          <Button onClick={analyzeCompliance} disabled={!noteContent || noteContent.length < 100}>
            <Sparkles className="w-4 h-4 mr-2" />
            Run Compliance Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalViolations = complianceResults.violations?.filter(v => 
    v.severity === 'critical' && v.status !== 'fully_met'
  ) || [];

  const violationsByCategory = complianceResults.violations?.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-4">
      {/* Overall Score Dashboard */}
      <Card className={`border-2 ${
        complianceResults.overall_compliance_score >= 90 ? 'border-green-400 bg-green-50' :
        complianceResults.overall_compliance_score >= 75 ? 'border-yellow-400 bg-yellow-50' :
        'border-red-400 bg-red-50'
      }`}>
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Overall Compliance Score
            </span>
            <Badge className={`text-lg ${
              complianceResults.overall_compliance_score >= 90 ? 'bg-green-600' :
              complianceResults.overall_compliance_score >= 75 ? 'bg-yellow-600' :
              'bg-red-600'
            }`}>
              {complianceResults.overall_compliance_score}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={complianceResults.overall_compliance_score} className="h-3" />
          
          {/* Category Scores */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(complianceResults.category_scores || {}).map(([category, score]) => (
              <div key={category} className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {getCategoryIcon(category)}
                  <p className="text-xs font-semibold text-gray-700">{getCategoryLabel(category)}</p>
                </div>
                <p className={`text-xl font-bold ${score >= 90 ? 'text-green-600' : score >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {score}%
                </p>
              </div>
            ))}
          </div>

          {/* Critical Summary */}
          {criticalViolations.length > 0 && (
            <Alert className="border-red-400 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                <strong>{criticalViolations.length} Critical Issues</strong> - Must be addressed before submission
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Wins */}
          {complianceResults.quick_wins?.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-900">⚡ Quick Wins ({complianceResults.quick_wins.length})</p>
                <Button size="sm" onClick={handleApplyAllQuickWins} className="bg-blue-600 hover:bg-blue-700">
                  Apply All
                </Button>
              </div>
              <p className="text-xs text-blue-800">Easy fixes that boost compliance instantly</p>
            </div>
          )}

          {complianceResults.summary && (
            <p className="text-sm text-gray-700 bg-white p-3 rounded border">{complianceResults.summary}</p>
          )}
        </CardContent>
      </Card>

      {/* Violations by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Compliance Issues by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={Object.keys(violationsByCategory)[0] || 'all'}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(violationsByCategory).length, 5)}, 1fr)` }}>
              {Object.keys(violationsByCategory).map(category => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  <span className="flex items-center gap-1">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                    <Badge variant="outline" className="ml-1 text-xs">{violationsByCategory[category].length}</Badge>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(violationsByCategory).map(([category, violations]) => (
              <TabsContent key={category} value={category} className="space-y-2 mt-4">
                <Accordion type="multiple">
                  {violations.map((violation, idx) => {
                    const isApplied = appliedFixes.has(violation.rule_name);
                    
                    return (
                      <AccordionItem 
                        key={idx} 
                        value={`${category}-${idx}`}
                        className={`border-2 rounded-lg ${getSeverityColor(violation.severity)} ${isApplied ? 'opacity-60' : ''}`}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3 text-left">
                              {getStatusIcon(violation.status)}
                              <div>
                                <p className="font-semibold text-sm">{violation.rule_name}</p>
                                <p className="text-xs text-gray-600">{violation.reference}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={violation.severity === 'critical' ? 'bg-red-600' : violation.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-600'}>
                                {violation.severity}
                              </Badge>
                              <Badge variant="outline">
                                {violation.status === 'fully_met' ? '✓' : violation.status === 'partially_met' ? '⚠' : '✗'}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-3">
                          {violation.evidence_found && (
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-1">✓ Evidence:</p>
                              <p className="text-xs text-gray-600 italic">"{violation.evidence_found}"</p>
                            </div>
                          )}

                          {violation.missing_elements?.length > 0 && (
                            <div className="bg-red-50 p-3 rounded border border-red-200">
                              <p className="text-xs font-semibold text-red-900 mb-2">⚠ Missing:</p>
                              <ul className="space-y-1">
                                {violation.missing_elements.map((element, i) => (
                                  <li key={i} className="text-xs text-red-800">• {element}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {violation.latest_cms_guidance && (
                            <div className="bg-purple-50 p-3 rounded border border-purple-200">
                              <p className="text-xs font-semibold text-purple-900 mb-1">🌐 2025 CMS Guidance:</p>
                              <p className="text-xs text-purple-800">{violation.latest_cms_guidance}</p>
                            </div>
                          )}

                          {violation.remediation_text && (
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Fix:</p>
                              <p className="text-xs text-blue-800">{violation.remediation_text}</p>
                            </div>
                          )}

                          {violation.compliant_example && (
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-green-900">✓ Compliant Example:</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigator.clipboard.writeText(violation.compliant_example)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-green-800 italic">"{violation.compliant_example}"</p>
                            </div>
                          )}

                          {violation.status !== 'fully_met' && !isApplied && (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleApplyFix(violation)}
                            >
                              <ArrowRight className="w-4 h-4 mr-1" />
                              Add to Note
                            </Button>
                          )}

                          {isApplied && (
                            <div className="text-center py-2 text-sm text-green-700 font-medium">
                              ✓ Applied to Note
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}