
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label"; // Added this import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Download,
  RefreshCw,
  Eye,
  ClipboardList,
  TrendingDown,
  Target,
  Sparkles,
  Users,
  FileText,
  Calendar,
  Zap
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SurveyPreparation() {
  const queryClient = useQueryClient();
  const [sampleSize, setSampleSize] = useState("10");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDeficiencyDialog, setShowDeficiencyDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['allCarePlans'],
    queryFn: () => base44.entities.CarePlan.list(),
    initialData: [],
    enabled: isAdmin,
  });

  // Run Random Chart Audit
  const runChartAudit = async () => {
    setIsAuditing(true);
    setAuditResults(null);

    try {
      // Select random active patients
      const activePatients = patients.filter(p => p.status === 'active');
      const shuffled = [...activePatients].sort(() => 0.5 - Math.random());
      const selectedPatients = shuffled.slice(0, parseInt(sampleSize));

      const auditPromises = selectedPatients.map(async (patient) => {
        const patientVisits = visits.filter(v => v.patient_id === patient.id);
        const patientCarePlans = carePlans.filter(cp => cp.patient_id === patient.id);

        // Get most recent 5 visits for review
        const recentVisits = patientVisits
          .filter(v => v.status === 'completed')
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
          .slice(0, 5);

        // Build comprehensive documentation summary
        const documentationSummary = {
          patient: `${patient.first_name} ${patient.last_name}`,
          mrn: patient.medical_record_number,
          diagnosis: patient.primary_diagnosis,
          careType: patient.care_type,
          visitCount: recentVisits.length,
          visits: recentVisits.map(v => ({
            date: v.visit_date,
            type: v.visit_type,
            hasNotes: !!(v.nurse_notes && v.nurse_notes.length > 100),
            hasVitals: !!(v.vital_signs && Object.keys(v.vital_signs).length > 0),
            duration: v.start_time && v.end_time ? `${v.start_time} - ${v.end_time}` : 'Not recorded',
            notes: v.nurse_notes || 'No documentation'
          })),
          carePlansCount: patientCarePlans.length,
          carePlans: patientCarePlans.map(cp => ({
            problem: cp.problem,
            goal: cp.goal,
            status: cp.status
          }))
        };

        // AI-powered compliance audit
        const prompt = `You are a Medicare compliance auditor conducting a mock survey of this home health patient chart. Perform a comprehensive audit against Medicare Conditions of Participation (CoPs).

PATIENT CHART SUMMARY:
${JSON.stringify(documentationSummary, null, 2)}

---

MEDICARE CONDITIONS OF PARTICIPATION TO AUDIT:

**484.55 - Comprehensive Assessment**
- Initial assessment completed within 48 hours
- OASIS data collected appropriately (if home health)
- Assessment identifies patient problems, needs, and goals

**484.60 - Care Planning**
- POC established within required timeframe
- POC addresses all identified problems
- Measurable goals with target dates
- Interventions are specific and skilled
- POC reviewed/updated as patient condition changes

**484.65 - Coordination of Care**
- Physician communication documented
- Orders obtained timely and appropriately
- Coordination with other providers documented

**484.75 - Skilled Nursing Services**
- Documentation justifies skilled need
- Progress notes document patient response
- Teaching/training documented with patient/caregiver comprehension
- Clinical changes reported to physician

**484.80 - Home Health Aide Services** (if applicable)
- Supervision documented every 2 weeks

**Homebound Status Documentation**
- Taxing effort described with objective observations
- Normal inability to leave home documented
- Absences from home justified

**Visit Documentation Quality**
- Complete narrative of visit
- Vital signs documented
- Assessment of all body systems appropriate to diagnosis
- Interventions performed and patient response
- Patient/caregiver education documented
- Signature and credentials present

---

Return a detailed audit finding in this JSON format:

{
  "overall_compliance_score": 0-100,
  "tag_number": "Medicare tag if deficiency found (e.g., 484.55, 484.60)",
  "compliance_level": "compliant" | "minor_deficiency" | "standard_deficiency" | "substandard",
  "deficiencies": [
    {
      "category": "Assessment|Care Planning|Documentation|Coordination|Skilled Need|Homebound",
      "severity": "minor" | "moderate" | "severe",
      "finding": "Specific deficiency identified",
      "evidence": "What was missing or inadequate in the chart",
      "corrective_action": "Specific action needed to correct",
      "citation": "Medicare CoP reference"
    }
  ],
  "strengths": [
    "Areas where documentation was strong"
  ],
  "recommendations": [
    "Specific improvement recommendations"
  ],
  "immediate_priorities": [
    "Issues that need immediate attention before survey"
  ]
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              overall_compliance_score: { type: "number" },
              tag_number: { type: "string" },
              compliance_level: { type: "string" },
              deficiencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    severity: { type: "string" },
                    finding: { type: "string" },
                    evidence: { type: "string" },
                    corrective_action: { type: "string" },
                    citation: { type: "string" }
                  }
                }
              },
              strengths: {
                type: "array",
                items: { type: "string" }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              immediate_priorities: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        return {
          patient,
          audit: result
        };
      });

      const results = await Promise.all(auditPromises);

      // Calculate aggregate statistics
      const avgScore = Math.round(
        results.reduce((sum, r) => sum + r.audit.overall_compliance_score, 0) / results.length
      );

      const totalDeficiencies = results.reduce(
        (sum, r) => sum + (r.audit.deficiencies?.length || 0), 
        0
      );

      const deficienciesByCategory = {};
      const deficienciesBySeverity = { minor: 0, moderate: 0, severe: 0 };

      results.forEach(r => {
        r.audit.deficiencies?.forEach(d => {
          deficienciesByCategory[d.category] = (deficienciesByCategory[d.category] || 0) + 1;
          deficienciesBySeverity[d.severity] = (deficienciesBySeverity[d.severity] || 0) + 1;
        });
      });

      const surveyReady = results.filter(r => r.audit.compliance_level === 'compliant').length;
      const needsImprovement = results.filter(r => 
        r.audit.compliance_level === 'minor_deficiency' || 
        r.audit.compliance_level === 'standard_deficiency'
      ).length;
      const critical = results.filter(r => r.audit.compliance_level === 'substandard').length;

      setAuditResults({
        timestamp: new Date().toISOString(),
        sampleSize: results.length,
        overallScore: avgScore,
        surveyReady,
        needsImprovement,
        critical,
        totalDeficiencies,
        deficienciesByCategory,
        deficienciesBySeverity,
        patientAudits: results
      });

    } catch (error) {
      console.error("Audit error:", error);
      alert("Error running chart audit. Please try again.");
    }

    setIsAuditing(false);
  };

  // Export audit report
  const exportAuditReport = () => {
    if (!auditResults) return;

    let csvContent = `Penn Sync Medicare Survey Preparation Report\n`;
    csvContent += `Generated: ${format(new Date(auditResults.timestamp), 'PPpp')}\n`;
    csvContent += `Sample Size: ${auditResults.sampleSize} patients\n\n`;
    csvContent += `OVERALL RESULTS\n`;
    csvContent += `Average Compliance Score,${auditResults.overallScore}/100\n`;
    csvContent += `Survey Ready,${auditResults.surveyReady}\n`;
    csvContent += `Needs Improvement,${auditResults.needsImprovement}\n`;
    csvContent += `Critical Issues,${auditResults.critical}\n`;
    csvContent += `Total Deficiencies,${auditResults.totalDeficiencies}\n\n`;

    csvContent += `DEFICIENCIES BY SEVERITY\n`;
    csvContent += `Minor,${auditResults.deficienciesBySeverity.minor}\n`;
    csvContent += `Moderate,${auditResults.deficienciesBySeverity.moderate}\n`;
    csvContent += `Severe,${auditResults.deficienciesBySeverity.severe}\n\n`;

    csvContent += `DEFICIENCIES BY CATEGORY\n`;
    Object.entries(auditResults.deficienciesByCategory).forEach(([cat, count]) => {
      csvContent += `${cat},${count}\n`;
    });

    csvContent += `\n\nDETAILED PATIENT AUDITS\n\n`;

    auditResults.patientAudits.forEach(pa => {
      csvContent += `Patient: ${pa.patient.first_name} ${pa.patient.last_name}\n`;
      csvContent += `MRN: ${pa.patient.medical_record_number || 'N/A'}\n`;
      csvContent += `Compliance Score: ${pa.audit.overall_compliance_score}/100\n`;
      csvContent += `Status: ${pa.audit.compliance_level}\n`;
      csvContent += `Tag: ${pa.audit.tag_number || 'N/A'}\n\n`;

      if (pa.audit.deficiencies && pa.audit.deficiencies.length > 0) {
        csvContent += `DEFICIENCIES:\n`;
        pa.audit.deficiencies.forEach((d, idx) => {
          csvContent += `${idx + 1}. [${d.severity.toUpperCase()}] ${d.category}\n`;
          csvContent += `   Finding: ${d.finding}\n`;
          csvContent += `   Evidence: ${d.evidence}\n`;
          csvContent += `   Corrective Action: ${d.corrective_action}\n`;
          csvContent += `   Citation: ${d.citation}\n\n`;
        });
      }

      if (pa.audit.immediate_priorities && pa.audit.immediate_priorities.length > 0) {
        csvContent += `IMMEDIATE PRIORITIES:\n`;
        pa.audit.immediate_priorities.forEach((p, idx) => {
          csvContent += `${idx + 1}. ${p}\n`;
        });
        csvContent += `\n`;
      }

      csvContent += `---\n\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `penn-sync-survey-prep-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceColor = (level) => {
    const colors = {
      compliant: 'bg-green-100 text-green-800 border-green-300',
      minor_deficiency: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      standard_deficiency: 'bg-orange-100 text-orange-800 border-orange-300',
      substandard: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[level] || colors.minor_deficiency;
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      minor: 'bg-yellow-500',
      moderate: 'bg-orange-500',
      severe: 'bg-red-500'
    };
    return colors[severity] || 'bg-gray-500';
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            Access Denied - Administrator privileges required
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicare Survey Preparation</h1>
            <p className="text-gray-600">Mock survey audits and deficiency analysis</p>
          </div>
        </div>
      </div>

      {/* Audit Configuration */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Run Mock Survey Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200 mb-6">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-2">Penn Sync AI Survey Simulation</p>
              <p className="text-sm">
                This tool uses advanced AI to simulate a Medicare compliance survey by randomly selecting patient charts 
                and auditing them against all Medicare Conditions of Participation. It identifies deficiencies, provides 
                specific corrective actions, and generates a comprehensive readiness report.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="mb-2 block">Sample Size</Label>
              <Select value={sampleSize} onValueChange={setSampleSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 patients</SelectItem>
                  <SelectItem value="10">10 patients</SelectItem>
                  <SelectItem value="15">15 patients</SelectItem>
                  <SelectItem value="20">20 patients</SelectItem>
                  <SelectItem value="25">25 patients</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {patients.filter(p => p.status === 'active').length} active patients available
              </p>
            </div>

            <Button
              onClick={runChartAudit}
              disabled={isAuditing || patients.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5 mr-2" />
                  Start Mock Survey
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {auditResults && (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Overall Score</p>
                    <p className="text-4xl font-bold">{auditResults.overallScore}</p>
                    <p className="text-blue-100 text-xs mt-1">out of 100</p>
                  </div>
                  <Target className="w-12 h-12 text-blue-200" />
                </div>
                <Progress value={auditResults.overallScore} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm mb-1">Survey Ready</p>
                    <p className="text-4xl font-bold">{auditResults.surveyReady}</p>
                    <p className="text-green-100 text-xs mt-1">compliant charts</p>
                  </div>
                  <CheckCircle2 className="w-12 h-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm mb-1">Needs Work</p>
                    <p className="text-4xl font-bold">{auditResults.needsImprovement}</p>
                    <p className="text-yellow-100 text-xs mt-1">minor/standard def.</p>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-yellow-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm mb-1">Critical Issues</p>
                    <p className="text-4xl font-bold">{auditResults.critical}</p>
                    <p className="text-red-100 text-xs mt-1">immediate attention</p>
                  </div>
                  <XCircle className="w-12 h-12 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deficiency Analysis */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Deficiencies by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Severe</span>
                      <Badge className="bg-red-500">{auditResults.deficienciesBySeverity.severe}</Badge>
                    </div>
                    <Progress 
                      value={(auditResults.deficienciesBySeverity.severe / auditResults.totalDeficiencies) * 100} 
                      className="h-2 bg-red-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Moderate</span>
                      <Badge className="bg-orange-500">{auditResults.deficienciesBySeverity.moderate}</Badge>
                    </div>
                    <Progress 
                      value={(auditResults.deficienciesBySeverity.moderate / auditResults.totalDeficiencies) * 100} 
                      className="h-2 bg-orange-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Minor</span>
                      <Badge className="bg-yellow-500">{auditResults.deficienciesBySeverity.minor}</Badge>
                    </div>
                    <Progress 
                      value={(auditResults.deficienciesBySeverity.minor / auditResults.totalDeficiencies) * 100} 
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deficiencies by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(auditResults.deficienciesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient-Level Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chart-by-Chart Analysis</CardTitle>
                <Button
                  onClick={exportAuditReport}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Deficiencies</TableHead>
                    <TableHead className="text-center">Tag</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditResults.patientAudits.map((pa, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{pa.patient.first_name} {pa.patient.last_name}</p>
                          <p className="text-xs text-gray-500">
                            MRN: {pa.patient.medical_record_number || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-2xl font-bold ${getScoreColor(pa.audit.overall_compliance_score)}`}>
                          {pa.audit.overall_compliance_score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getComplianceColor(pa.audit.compliance_level)}>
                          {pa.audit.compliance_level.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {pa.audit.deficiencies?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {pa.audit.tag_number || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPatient(pa);
                            setShowDeficiencyDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Deficiency Details Dialog */}
      <Dialog open={showDeficiencyDialog} onOpenChange={setShowDeficiencyDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-purple-600" />
              Chart Audit Details
            </DialogTitle>
            {selectedPatient && (
              <DialogDescription>
                {selectedPatient.patient.first_name} {selectedPatient.patient.last_name} - 
                Score: {selectedPatient.audit.overall_compliance_score}/100
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6 py-4">
              {/* Overall Status */}
              <Alert className={getComplianceColor(selectedPatient.audit.compliance_level)}>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-semibold text-lg mb-1">
                    Status: {selectedPatient.audit.compliance_level.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  {selectedPatient.audit.tag_number && (
                    <p className="text-sm">Medicare Tag: {selectedPatient.audit.tag_number}</p>
                  )}
                </AlertDescription>
              </Alert>

              {/* Deficiencies */}
              {selectedPatient.audit.deficiencies && selectedPatient.audit.deficiencies.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Deficiencies Found ({selectedPatient.audit.deficiencies.length})
                  </h3>
                  <div className="space-y-4">
                    {selectedPatient.audit.deficiencies.map((def, index) => (
                      <Card key={index} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{def.category}</h4>
                            <Badge className={getSeverityBadge(def.severity)}>
                              {def.severity.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="bg-red-50 p-2 rounded">
                              <p className="font-semibold text-red-900">Finding:</p>
                              <p className="text-red-800">{def.finding}</p>
                            </div>
                            
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-semibold text-gray-900">Evidence:</p>
                              <p className="text-gray-700">{def.evidence}</p>
                            </div>
                            
                            <div className="bg-green-50 p-2 rounded">
                              <p className="font-semibold text-green-900">Corrective Action:</p>
                              <p className="text-green-800">{def.corrective_action}</p>
                            </div>
                            
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="font-semibold text-blue-900">Citation:</p>
                              <p className="text-blue-800 font-mono text-xs">{def.citation}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate Priorities */}
              {selectedPatient.audit.immediate_priorities && selectedPatient.audit.immediate_priorities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-600" />
                    Immediate Priorities
                  </h3>
                  <ul className="space-y-2">
                    {selectedPatient.audit.immediate_priorities.map((priority, index) => (
                      <li key={index} className="flex items-start gap-2 p-3 bg-orange-50 rounded border border-orange-200">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-orange-900">{priority}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths */}
              {selectedPatient.audit.strengths && selectedPatient.audit.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {selectedPatient.audit.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-green-900">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {selectedPatient.audit.recommendations && selectedPatient.audit.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {selectedPatient.audit.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <span className="text-blue-600 font-bold">•</span>
                        <span className="text-sm text-blue-900">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Link to={`${createPageUrl("PatientDetails")}?patientId=${selectedPatient?.patient.id}`}>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                View Patient Chart
              </Button>
            </Link>
            <Button onClick={() => setShowDeficiencyDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
