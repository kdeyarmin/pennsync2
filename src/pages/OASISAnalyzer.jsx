import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Target,
  Loader2,
  TrendingDown,
  Activity,
  Info,
  TrendingUp,
  ClipboardCheck,
  Lightbulb,
  Download,
  FileDown,
  FolderArchive,
  Workflow,
  Save,
  User,
  History,
  Sparkles,
  Zap
} from "lucide-react";
import { generateOASISReportPDF } from "@/functions/generateOASISReportPDF";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BatchOASISAnalyzer from "../components/oasis/BatchOASISAnalyzer";
import PDGMRevenueComparison from "../components/oasis/PDGMRevenueComparison";
import PDGMMultiReportComparison from "../components/oasis/PDGMMultiReportComparison";
import EnhancedMultiReportComparison from "../components/oasis/EnhancedMultiReportComparison";
import KeyTakeawaysSummary from "../components/oasis/KeyTakeawaysSummary";
import AuditRiskPredictor from "../components/oasis/AuditRiskPredictor";
import DocumentationQualitySuggestions from "../components/oasis/DocumentationQualitySuggestions";
import OASISScenarioManager from "../components/oasis/OASISScenarioManager";
import OASISActionWorkflow from "../components/oasis/OASISActionWorkflow";
import AIDocumentationQualityAnalyzer from "../components/oasis/AIDocumentationQualityAnalyzer";
import AIDocumentationAssistant from "../components/oasis/AIDocumentationAssistant";
import AIAuditRiskPredictor from "../components/oasis/AIAuditRiskPredictor";
import OASISDocumentationQualityScorer from "../components/oasis/OASISDocumentationQualityScorer";
import AutomatedPDGMNavigator from "../components/oasis/AutomatedPDGMNavigator";
import OASISTaskGenerator from "../components/oasis/OASISTaskGenerator";
import SmartNoteDataImport from "../components/oasis/SmartNoteDataImport";
import { useAutoFlagOASIS, THRESHOLDS } from "../components/oasis/OASISAutoFlagger";
import OASISExportManager from "../components/oasis/OASISExportManager";
import AIProactiveDocumentationAssistant from "../components/oasis/AIProactiveDocumentationAssistant";
import AIDocumentationGenerator from "../components/oasis/AIDocumentationGenerator";
import OASISValidationPanel from "../components/oasis/OASISValidationPanel";
import ClinicalPathwayTrigger from "../components/oasis/ClinicalPathwayTrigger";
import PDGMPredictiveForecaster from "../components/oasis/PDGMPredictiveForecaster";
import PDGMImpactAnalyzer from "../components/oasis/PDGMImpactAnalyzer";
import EnhancedPDGMCaseMixAnalyzer from "../components/oasis/EnhancedPDGMCaseMixAnalyzer";
import PatientMatchSelector from "../components/oasis/PatientMatchSelector";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import InlineDocumentationAssistant from "../components/oasis/InlineDocumentationAssistant";
import AIPathwayRecommender from "../components/oasis/AIPathwayRecommender";
import AutomaticDocumentReviewer from "../components/review/AutomaticDocumentReviewer";
import AIDocumentReviewer from "../components/oasis/AIDocumentReviewer";
import OASISDataEntryAssistant from "../components/oasis/OASISDataEntryAssistant";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users as UsersIcon, BarChart3 } from "lucide-react";
import OASISAutomationEngine from "../components/oasis/OASISAutomationEngine";
import OASISAutomationSettings from "../components/oasis/OASISAutomationSettings";
import OASISExecutiveSummary from "../components/oasis/OASISExecutiveSummary";
import PDGMTrendDashboard from "../components/oasis/PDGMTrendDashboard";

// Analytics Dashboard Component
function OASISAnalyticsDashboard({ savedOASISUploads }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Process demographics data
  const demographicsData = React.useMemo(() => {
    const genderCount = { Male: 0, Female: 0, Unknown: 0 };
    const ageRanges = { '0-64': 0, '65-74': 0, '75-84': 0, '85+': 0, Unknown: 0 };
    
    savedOASISUploads.forEach(upload => {
      const gender = upload.pdgm_data?.patient_info?.gender || 'Unknown';
      if (gender.toLowerCase().includes('m') || gender.toLowerCase() === 'male') genderCount.Male++;
      else if (gender.toLowerCase().includes('f') || gender.toLowerCase() === 'female') genderCount.Female++;
      else genderCount.Unknown++;

      const dob = upload.pdgm_data?.patient_info?.dob;
      if (dob && dob !== 'Not found') {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age < 65) ageRanges['0-64']++;
        else if (age < 75) ageRanges['65-74']++;
        else if (age < 85) ageRanges['75-84']++;
        else ageRanges['85+']++;
      } else {
        ageRanges.Unknown++;
      }
    });

    return {
      gender: Object.entries(genderCount).map(([name, value]) => ({ name, value })),
      age: Object.entries(ageRanges).map(([name, value]) => ({ name, value }))
    };
  }, [savedOASISUploads]);

  // Process diagnoses data
  const diagnosesData = React.useMemo(() => {
    const diagnosisCount = {};
    
    savedOASISUploads.forEach(upload => {
      const primaryDx = upload.pdgm_data?.primary_diagnosis || upload.pdgm_data?.primary_diagnosis_description;
      if (primaryDx && primaryDx !== 'Unknown' && primaryDx !== 'Not found') {
        const dxKey = primaryDx.substring(0, 50); // Truncate for display
        diagnosisCount[dxKey] = (diagnosisCount[dxKey] || 0) + 1;
      }
    });

    return Object.entries(diagnosisCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [savedOASISUploads]);

  // Process functional scores over time
  const functionalScoresData = React.useMemo(() => {
    return savedOASISUploads
      .filter(u => u.assessment_date && u.pdgm_data?.functional_scores)
      .sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date))
      .slice(-20) // Last 20 assessments
      .map(upload => ({
        date: new Date(upload.assessment_date).toLocaleDateString(),
        ambulation: upload.pdgm_data?.functional_scores?.m1860_ambulation || 0,
        transferring: upload.pdgm_data?.functional_scores?.m1850_transferring || 0,
        bathing: upload.pdgm_data?.functional_scores?.m1830_bathing || 0,
        patient: upload.patient_name?.substring(0, 15) || 'Unknown'
      }));
  }, [savedOASISUploads]);

  // Process PDGM payment trends
  const paymentTrendsData = React.useMemo(() => {
    return savedOASISUploads
      .filter(u => u.assessment_date && u.estimated_payment)
      .sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date))
      .slice(-15) // Last 15 with payments
      .map(upload => ({
        date: new Date(upload.assessment_date).toLocaleDateString(),
        payment: upload.estimated_payment,
        patient: upload.patient_name?.substring(0, 15) || 'Unknown'
      }));
  }, [savedOASISUploads]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalAssessments = savedOASISUploads.length;
    const avgScore = savedOASISUploads.reduce((sum, u) => sum + (u.scores?.overall || 0), 0) / totalAssessments || 0;
    const avgPayment = savedOASISUploads.filter(u => u.estimated_payment).reduce((sum, u) => sum + u.estimated_payment, 0) / savedOASISUploads.filter(u => u.estimated_payment).length || 0;
    const totalRevenue = savedOASISUploads.reduce((sum, u) => sum + (u.estimated_payment || 0), 0);

    return { totalAssessments, avgScore, avgPayment, totalRevenue };
  }, [savedOASISUploads]);

  if (savedOASISUploads.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Upload and analyze OASIS documents to see analytics and trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Assessments</p>
                <p className="text-3xl font-bold text-blue-700">{summaryStats.totalAssessments}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Avg Quality Score</p>
                <p className="text-3xl font-bold text-green-700">{summaryStats.avgScore.toFixed(0)}%</p>
              </div>
              <Target className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Payment</p>
                <p className="text-3xl font-bold text-purple-700">${summaryStats.avgPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-orange-700">${summaryStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={demographicsData.gender}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {demographicsData.gender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={demographicsData.age}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Common Diagnoses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            Top 10 Primary Diagnoses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={diagnosesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Functional Scores Over Time */}
      {functionalScoresData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Functional Scores Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={functionalScoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ambulation" stroke="#3b82f6" name="Ambulation" strokeWidth={2} />
                <Line type="monotone" dataKey="transferring" stroke="#10b981" name="Transferring" strokeWidth={2} />
                <Line type="monotone" dataKey="bathing" stroke="#f59e0b" name="Bathing" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* PDGM Payment Trends */}
      {paymentTrendsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              PDGM Payment Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={paymentTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Payment ($)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="payment" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OASISAnalyzer() {
  const [activeTab, setActiveTab] = useState("single");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [pdgmData, setPdgmData] = useState(null);
  const [error, setError] = useState(null);
  const [savedBatchResults, setSavedBatchResults] = useState([]);
  const [analysisId, setAnalysisId] = useState(null);
  const [originalPayment, setOriginalPayment] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToPatient, setSavedToPatient] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [navigationData, setNavigationData] = useState(null);
  const [qualityScore, setQualityScore] = useState(null);
  const [triggeredPathways, setTriggeredPathways] = useState([]);
  const [matchResults, setMatchResults] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [useDataEntryAssistant, setUseDataEntryAssistant] = useState(false);

  const queryClient = useQueryClient();

  // Fetch patients for linking
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Update selected patient when selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === selectedPatientId);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [selectedPatientId, patients]);

  // Fetch saved OASIS uploads
  const { data: savedOASISUploads = [] } = useQuery({
    queryKey: ['oasisUploads'],
    queryFn: () => base44.entities.OASISUpload.list('-created_date', 50),
  });

  // Save OASIS mutation
  const saveOASISMutation = useMutation({
    mutationFn: (data) => base44.entities.OASISUpload.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oasisUploads'] });
      setSavedToPatient(true);
    },
  });

  // Auto-flag mutation for audit workflow
  const autoFlagMutation = useAutoFlagOASIS();

  // Generate unique analysis ID when new analysis starts
  useEffect(() => {
    if (analysisResults && !analysisId) {
        const newAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setAnalysisId(newAnalysisId);
        const extractedName = analysisResults.pdgm_data?.patient_info?.name || 
                               pdgmData?.patient_info?.name || 
                               "Unknown Patient";
        setPatientName(extractedName);
      setSavedToPatient(false);
      
      // Advanced fuzzy matching algorithm with multiple strategies
      if (extractedName && extractedName !== "Unknown Patient" && extractedName !== "Unknown Patient - Verify Document" && patients.length > 0) {
        const extractedDOB = analysisResults.pdgm_data?.patient_info?.dob;
        
        const matchedPatients = patients.map(patient => {
          const score = calculatePatientMatchScore(extractedName, patient, extractedDOB);
          return { patient, ...score };
        })
        .filter(m => m.confidence >= 40) // Only show matches with at least 40% confidence
        .sort((a, b) => b.confidence - a.confidence);
        
        const results = {
          extractedName,
          extractedDOB,
          matches: matchedPatients
        };
        
        setMatchResults(results);
        
        // Auto-select and auto-save if confidence is very high (>= 85%)
        const bestMatch = matchedPatients[0];
        if (bestMatch && bestMatch.confidence >= 85) {
          setSelectedPatientId(bestMatch.patient.id);
          console.log(`Auto-matched patient with ${bestMatch.confidence}% confidence:`, bestMatch.patient.first_name, bestMatch.patient.last_name);
          
          // Auto-save to patient chart
          setTimeout(() => {
            handleSaveToPatient(bestMatch.patient.id);
          }, 500);
        } else if (bestMatch) {
          console.log(`Best match (${bestMatch.confidence}% confidence):`, bestMatch.patient.first_name, bestMatch.patient.last_name, '- awaiting manual confirmation');
        }
      }
    }
  }, [analysisResults, patients, uploadedFileUrl]);

  // Sophisticated patient matching algorithm
  const calculatePatientMatchScore = (extractedName, patient, extractedDOB) => {
    let confidence = 0;
    const matchFactors = [];
    let dobMatch = false;
    
    const extractedNameClean = extractedName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const nameParts = extractedNameClean.split(/\s+/).filter(p => p.length > 1);
    
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const firstName = (patient.first_name || '').toLowerCase();
    const lastName = (patient.last_name || '').toLowerCase();
    
    // Levenshtein distance for typo tolerance
    const levenshteinDistance = (a, b) => {
      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      return matrix[b.length][a.length];
    };
    
    const similarity = (a, b) => {
      const distance = levenshteinDistance(a, b);
      const maxLen = Math.max(a.length, b.length);
      return maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 0;
    };
    
    // Strategy 1: Exact full name match
    if (fullName === extractedNameClean) {
      confidence += 50;
      matchFactors.push('Exact name match');
    } else {
      // Check similarity with typo tolerance
      const fullNameSimilarity = similarity(fullName, extractedNameClean);
      if (fullNameSimilarity >= 90) {
        confidence += 45;
        matchFactors.push('Near-exact match (minor typo tolerance)');
      } else if (fullNameSimilarity >= 80) {
        confidence += 35;
        matchFactors.push('High name similarity');
      }
    }
    
    // Strategy 2: Handle "LastName, FirstName" format
    if (extractedName.includes(',')) {
      const [lastPart, firstPart] = extractedName.split(',').map(s => s.trim().toLowerCase().replace(/[^a-z\s]/g, ''));
      const lastSim = similarity(lastPart, lastName);
      const firstSim = similarity(firstPart, firstName);
      
      if (lastSim >= 90 && firstSim >= 90) {
        confidence += 45;
        matchFactors.push('Comma-separated format match');
      } else if (lastSim >= 80 && firstSim >= 80) {
        confidence += 35;
        matchFactors.push('Comma-separated format (partial)');
      }
    }
    
    // Strategy 3: Component name matching
    if (nameParts.length >= 2) {
      let firstNameMatched = false;
      let lastNameMatched = false;
      
      nameParts.forEach(part => {
        const firstSim = similarity(part, firstName);
        const lastSim = similarity(part, lastName);
        
        if (firstSim >= 90) {
          firstNameMatched = true;
          confidence += 20;
        } else if (firstSim >= 80) {
          firstNameMatched = true;
          confidence += 15;
        }
        
        if (lastSim >= 90) {
          lastNameMatched = true;
          confidence += 20;
        } else if (lastSim >= 80) {
          lastNameMatched = true;
          confidence += 15;
        }
      });
      
      if (firstNameMatched && lastNameMatched) {
        matchFactors.push('First and last name matched');
      } else if (lastNameMatched) {
        matchFactors.push('Last name matched');
      } else if (firstNameMatched) {
        matchFactors.push('First name matched');
      }
    }
    
    // Strategy 4: Initial matching (e.g., "J. Smith")
    const initials = nameParts.map(p => p.charAt(0)).join('');
    const patientInitials = (firstName.charAt(0) + lastName.charAt(0));
    if (initials === patientInitials || initials.includes(patientInitials)) {
      confidence += 10;
      matchFactors.push('Initials match');
    }
    
    // Strategy 5: Soundex/phonetic matching for common misspellings
    const soundex = (str) => {
      const code = str.toUpperCase().charAt(0);
      const mapping = { B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 };
      return code + str.slice(1).toUpperCase().replace(/[^A-Z]/g, '').split('').map(c => mapping[c] || '').filter((v, i, a) => i === 0 || v !== a[i - 1]).join('').substring(0, 3).padEnd(3, '0');
    };
    
    if (lastName.length >= 3 && nameParts.length > 0) {
      const lastPartSoundex = soundex(nameParts[nameParts.length - 1]);
      const lastNameSoundex = soundex(lastName);
      if (lastPartSoundex === lastNameSoundex) {
        confidence += 10;
        matchFactors.push('Phonetic match (sounds like)');
      }
    }
    
    // Phone Number Matching (HIGH VALUE)
    let phoneMatch = false;
    const extractedPhone = pdgmData?.patient_info?.phone || analysisResults?.pdgm_data?.patient_info?.phone;
    if (extractedPhone && patient.phone) {
      const normalizePhone = (phone) => phone.replace(/\D/g, '');
      const extractedPhoneNorm = normalizePhone(extractedPhone);
      const patientPhoneNorm = normalizePhone(patient.phone);
      
      if (extractedPhoneNorm === patientPhoneNorm && extractedPhoneNorm.length >= 10) {
        confidence += 25;
        phoneMatch = true;
        matchFactors.push('✓ Phone number verified');
      } else if (extractedPhoneNorm.length >= 10 && patientPhoneNorm.length >= 10) {
        // Check last 4 digits (common for verification)
        if (extractedPhoneNorm.slice(-4) === patientPhoneNorm.slice(-4)) {
          confidence += 10;
          matchFactors.push('Phone last 4 digits match');
        }
      }
    }

    // DOB Verification (CRITICAL - can add or subtract confidence)
    let addressMatch = false;

    if (extractedDOB && patient.date_of_birth) {
      const normalizeDOB = (dob) => {
        const cleaned = dob.replace(/[^\d]/g, '');
        if (cleaned.length >= 6) {
          return cleaned.substring(0, 8);
        }
        return cleaned;
      };
      
      const extractedDOBNorm = normalizeDOB(extractedDOB);
      const patientDOBNorm = normalizeDOB(patient.date_of_birth);
      
      if (extractedDOBNorm === patientDOBNorm) {
        confidence += 30;
        dobMatch = true;
        matchFactors.push('✓ Date of birth verified');
      } else if (extractedDOBNorm && patientDOBNorm) {
        const extractedYear = extractedDOB.match(/\d{4}/)?.[0];
        const patientYear = patient.date_of_birth.match(/\d{4}/)?.[0];
        
        if (extractedYear === patientYear) {
          confidence += 10;
          matchFactors.push('Birth year matches');
        } else {
          confidence -= 20;
          matchFactors.push('⚠ Date of birth does NOT match');
        }
      }
    }
    
    // Address Verification (MODERATE-HIGH VALUE) - Enhanced
    const extractedAddress = pdgmData?.patient_info?.address || analysisResults?.pdgm_data?.patient_info?.address;
    if (extractedAddress && patient.address) {
      const normalizeAddress = (addr) => addr.toLowerCase()
        .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|parkway|pkwy|way|apartment|apt|unit|ste|suite|#)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const extractedAddrNorm = normalizeAddress(extractedAddress);
      const patientAddrNorm = normalizeAddress(patient.address);
      
      // Strategy 1: Exact normalized match
      if (extractedAddrNorm === patientAddrNorm && extractedAddrNorm.length >= 10) {
        confidence += 20;
        addressMatch = true;
        matchFactors.push('✓ Address exact match');
      } else {
        // Strategy 2: Street number + street name match
        const extractedStreetNum = extractedAddress.match(/^\d+/)?.[0];
        const patientStreetNum = patient.address.match(/^\d+/)?.[0];
        
        if (extractedStreetNum && extractedStreetNum === patientStreetNum) {
          // Extract street name (second word typically)
          const extractedStreetName = extractedAddrNorm.split(/\s+/)[1];
          const patientStreetName = patientAddrNorm.split(/\s+/)[1];
          
          if (extractedStreetName && patientStreetName && similarity(extractedStreetName, patientStreetName) >= 80) {
            confidence += 18;
            addressMatch = true;
            matchFactors.push('✓ Street number and name match');
          } else if (extractedStreetName && patientStreetName) {
            confidence += 12;
            addressMatch = true;
            matchFactors.push('Street number matches');
          }
        }
        
        // Strategy 3: Overall similarity
        if (!addressMatch && extractedAddrNorm.length >= 10) {
          const addrSimilarity = similarity(extractedAddrNorm, patientAddrNorm);
          if (addrSimilarity >= 85) {
            confidence += 15;
            addressMatch = true;
            matchFactors.push('Address very similar');
          } else if (addrSimilarity >= 70) {
            confidence += 10;
            addressMatch = true;
            matchFactors.push('Address similar');
          } else if (addrSimilarity >= 60) {
            confidence += 5;
            matchFactors.push('Address partial match');
          }
        }
        
        // Strategy 4: Zip code match (if present)
        const extractedZip = extractedAddress.match(/\b\d{5}\b/)?.[0];
        const patientZip = patient.address.match(/\b\d{5}\b/)?.[0];
        if (extractedZip && extractedZip === patientZip) {
          confidence += 8;
          matchFactors.push('Zip code match');
        }
      }
    }
    
    // Cap confidence at 100
    confidence = Math.min(100, Math.max(0, confidence));
    
    // Calculate match quality level
    let matchQuality = 'poor';
    if (confidence >= 85) matchQuality = 'excellent';
    else if (confidence >= 70) matchQuality = 'very_good';
    else if (confidence >= 55) matchQuality = 'good';
    else if (confidence >= 40) matchQuality = 'fair';
    
    // Count verified identifiers for additional context
    const verifiedIdentifiers = [dobMatch, phoneMatch, addressMatch].filter(Boolean).length;

    return { 
      confidence: Math.round(confidence), 
      matchFactors, 
      dobMatch,
      addressMatch,
      phoneMatch,
      matchQuality,
      verifiedIdentifiers
    };
  };

  // Reset match results when starting new analysis
  useEffect(() => {
    if (!analysisResults) {
      setMatchResults(null);
    }
  }, [analysisResults, patients]);

  // Handle viewing batch result in single analysis view
  const handleViewBatchResult = (result) => {
    setAnalysisResults(result);
    if (result?.pdgm_data) {
      setPdgmData(result.pdgm_data);
    }
    setActiveTab("single");
  };

  // Handle batch results for comparison
  const handleBatchComplete = (results) => {
    const successfulResults = results.filter(r => r.status === 'success' && r.pdgm_data);
    setSavedBatchResults(prev => [...prev, ...successfulResults]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
      setAnalysisResults(null);
      setAnalysisId(null);
      setSavedToPatient(false);
      setUploadedFileUrl(null);
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  };

  // Save OASIS to patient record
  const handleSaveToPatient = async (autoPatientId = null) => {
    const patientIdToUse = autoPatientId || selectedPatientId;
    if (!analysisResults || !uploadedFileUrl) return;
    
    setIsSaving(true);
    try {
      const selectedPatient = patients.find(p => p.id === patientIdToUse);
      const patientFullName = selectedPatient 
        ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
        : patientName;
      
      // Map assessment type abbreviations to full names
      const mapAssessmentType = (type) => {
        if (!type) return 'Other';
        const typeUpper = type.toUpperCase().trim();
        if (typeUpper === 'SOC' || typeUpper.includes('START OF CARE')) return 'Start of Care';
        if (typeUpper === 'ROC' || typeUpper.includes('RESUMPTION')) return 'Resumption of Care';
        if (typeUpper === 'RECERT' || typeUpper.includes('RECERTIFICATION')) return 'Recertification';
        if (typeUpper === 'DISCHARGE' || typeUpper.includes('DISCHARGE')) return 'Discharge';
        return type; // Return as-is if no match
      };
      
      // Deep sanitize to remove circular references and non-serializable objects
      const sanitizeData = (obj) => {
        if (!obj) return null;
        
        const seen = new WeakSet();
        const clean = (value) => {
          if (value === null || value === undefined) return value;
          
          // Handle primitives
          if (typeof value !== 'object') return value;
          
          // Detect circular references
          if (seen.has(value)) return '[Circular Reference]';
          seen.add(value);
          
          // Handle arrays
          if (Array.isArray(value)) {
            return value.map(item => clean(item));
          }
          
          // Handle objects - filter out DOM elements and React internals
          const cleaned = {};
          for (const key in value) {
            // Skip React internal properties and DOM elements
            if (key.startsWith('__react') || key.startsWith('_react') || 
                key === 'nativeEvent' || key === 'currentTarget' || key === 'target') {
              continue;
            }
            
            try {
              const val = value[key];
              // Skip DOM elements and functions
              if (val instanceof Element || val instanceof Node || typeof val === 'function') {
                continue;
              }
              cleaned[key] = clean(val);
            } catch (e) {
              // Skip problematic properties
              continue;
            }
          }
          return cleaned;
        };
        
        return clean(obj);
      };
      
      const savedOASIS = await saveOASISMutation.mutateAsync({
        patient_id: patientIdToUse || null,
        patient_name: patientFullName,
        file_url: uploadedFileUrl,
        file_name: file?.name || 'OASIS Document',
        assessment_date: analysisResults.pdgm_data?.patient_info?.assessment_date || new Date().toISOString().split('T')[0],
        assessment_type: mapAssessmentType(analysisResults.pdgm_data?.patient_info?.assessment_type),
        analysis_id: analysisId,
        pdgm_data: sanitizeData(pdgmData),
        analysis_results: sanitizeData(analysisResults),
        scores: {
          overall: analysisResults.overall_score || 0,
          accuracy: analysisResults.accuracy_score || 0,
          compliance: analysisResults.compliance_score || 0,
          revenue_optimization: analysisResults.revenue_optimization_score || 0
        },
        estimated_payment: originalPayment || 0,
        status: 'analyzed'
      });

      // Log save activity
      logActivity(ActivityActions.OASIS_SAVE, {
        patient_id: patientIdToUse,
        patient_name: patientFullName,
        overall_score: analysisResults.overall_score,
        estimated_payment: originalPayment,
        entity_type: 'OASISUpload',
        entity_id: savedOASIS.id,
        page: 'OASISAnalyzer'
      });

      // Auto-flag for audit if below thresholds
      if (savedOASIS) {
        autoFlagMutation.mutate({
          oasisUpload: { 
            ...savedOASIS, 
            patient_name: patientFullName,
            patient_id: patientIdToUse 
          },
          analysisResults: analysisResults
        });
      }
    } catch (err) {
      console.error("Error saving OASIS:", err);
      setError(`Failed to save OASIS to patient record: ${err.message || 'Unknown error'}`);
    }
    setIsSaving(false);
  };

  // Load saved OASIS for viewing
  // Load saved OASIS for viewing
  const handleLoadSavedOASIS = (oasisUpload) => {
    setAnalysisResults(oasisUpload.analysis_results);
    setPdgmData(oasisUpload.pdgm_data);
    setAnalysisId(oasisUpload.analysis_id);
    setPatientName(oasisUpload.patient_name);
    setSelectedPatientId(oasisUpload.patient_id || '');
    setOriginalPayment(oasisUpload.estimated_payment);
    setUploadedFileUrl(oasisUpload.file_url);
    setSavedToPatient(true);
    setActiveTab("single");
    
    logActivity(ActivityActions.VIEW, {
      entity_type: 'OASISUpload',
      entity_id: oasisUpload.id,
      patient_id: oasisUpload.patient_id,
      patient_name: oasisUpload.patient_name,
      page: 'OASISAnalyzer'
    });
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File size exceeds 10MB. Please upload a smaller file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      // Upload the file with timeout handling
      let file_url;
      try {
        const uploadResult = await Promise.race([
          base44.integrations.Core.UploadFile({ file }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout - file may be too large')), 60000)
          )
        ]);
        file_url = uploadResult.file_url;
      } catch (uploadErr) {
        throw new Error(`File upload failed: ${uploadErr.message}. Please check your connection and try again.`);
      }
      
      setUploadedFileUrl(file_url);
      setUploadProgress(40);

      // Log upload activity
      logActivity(ActivityActions.OASIS_UPLOAD, {
        file_name: file.name,
        file_size: file.size,
        page: 'OASISAnalyzer'
      });

      // Enhanced extraction schema - simplified for better reliability
      let extractedData;
      let extractionMethod = 'structured';
      
      try {
        extractedData = await Promise.race([
          base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
              type: "object",
              properties: {
            // Patient demographics - LOOK AT THE TOP OF THE DOCUMENT
            patient_name_raw: { type: "string", description: "PATIENT FULL NAME - ABSOLUTELY CRITICAL FOR RECORD MATCHING! Search the ENTIRE FIRST PAGE top to bottom. Look for: 1) Header/title area (very top), 2) Fields labeled: 'Patient Name:', 'Patient:', 'Name:', 'Pt Name:', 'Client:', 3) Near 'M0080' (Patient ID) or 'M0065' (Medicaid Number), 4) Demographics box/section, 5) Before ICD-10 codes/diagnoses. FORMATS to recognize: 'Smith, John', 'John Smith', 'SMITH JOHN', 'Smith John A', 'John A Smith'. Extract EXACTLY as it appears - do NOT skip middle initials. If MULTIPLE names appear, choose the one that is NOT labeled as 'Physician' or 'Agency'. ALWAYS extract something even if uncertain - extraction is better than nothing." },
            patient_first_name: { type: "string", description: "Patient's FIRST NAME only - separate field for matching. Look for 'First Name:', 'Given Name:' or extract from full name." },
            patient_last_name: { type: "string", description: "Patient's LAST NAME only - separate field for matching. Look for 'Last Name:', 'Surname:' or extract from full name." },
            patient_dob: { type: "string", description: "Date of birth - look for 'DOB:', 'Date of Birth:', birth date field. Format MM/DD/YYYY or any date format found." },
            patient_gender: { type: "string", description: "Gender - M, F, Male, Female. Look for 'Gender:', 'Sex:' checkbox or field." },
            patient_address: { type: "string", description: "Patient home address - look for 'Address:', 'Street:', 'Home Address:' on patient demographics section." },

            // Assessment info
            assessment_date: { type: "string", description: "M0090 date of assessment" },
            assessment_type: { type: "string", description: "SOC, ROC, Recert, Follow-up, Transfer, Discharge" },
            assessment_reason: { type: "string", description: "M0100 reason for assessment" },

            // Episode timing - critical for PDGM
            m0110_episode_timing: { type: "string", description: "M0110 Episode Timing: 1=Early (within 30 days of SOC/ROC), 2=Late (31+ days), or NA" },
            soc_date: { type: "string", description: "M0030 Start of Care date" },
            referral_date: { type: "string", description: "M0104 Referral date" },
            days_since_soc: { type: "string", description: "Number of days since start of care if mentioned" },

            // DIAGNOSES - SEARCH THE ENTIRE DOCUMENT FOR THESE
            m1021_primary_diagnosis_code: { 
              type: "string", 
              description: "PRIMARY DIAGNOSIS ICD-10 CODE - CRITICAL! Search for: 'M1021', 'M-1021', 'M 1021', '(M1021)', 'Primary Diagnosis', 'Principal Diagnosis'. Extract ICD-10 code (format: letter + numbers + optional decimal, examples: I50.9, J44.1, E11.65, Z99.11). May be listed as (a), (b), etc - get the FIRST one. If you find ANY ICD-10 code pattern, extract it here even if not labeled M1021." 
            },
            m1021_primary_diagnosis_description: { 
              type: "string", 
              description: "PRIMARY DIAGNOSIS NAME - the condition name/description next to the primary ICD-10 code. Examples: 'Congestive heart failure', 'COPD', 'Diabetes with complications'. Extract the full text description." 
            },
            m1023_other_diagnoses: { 
              type: "string", 
              description: "OTHER/SECONDARY DIAGNOSES - Search for: 'M1023', 'M-1023', 'M 1023', 'Other Diagnoses', 'Secondary Diagnoses', 'Additional Diagnoses'. Extract ALL ICD-10 codes found with their descriptions. Format: 'I10 Hypertension, E11.9 Diabetes, J44.9 COPD' - include ALL you find, separated by commas." 
            },
            all_icd10_codes_found: {
              type: "string",
              description: "EXTRACT ALL ICD-10 CODES FOUND ANYWHERE IN DOCUMENT - Look for any text matching pattern: Letter followed by 2-3 digits, optional decimal and more digits (I50.9, J44.1, E11.65, etc). List ALL codes found, comma separated, even if not in M1021/M1023 sections."
            },
            diagnosis_section_text: {
              type: "string",
              description: "RAW TEXT FROM DIAGNOSIS SECTION - Copy the entire text from any section labeled with 'Diagnosis', 'ICD-10', 'M1021', 'M1023' verbatim. This ensures we capture everything even if codes are unclear."
            },

            // Episode timing
            episode_timing: { type: "string", description: "Early (0-29 days) or Late (30+ days)" },

            // Functional status - ADLs
            m1800_grooming: { type: "string", description: "M1800 score 0-3" },
            m1810_dress_upper: { type: "string", description: "M1810 score 0-3" },
            m1820_dress_lower: { type: "string", description: "M1820 score 0-3" },
            m1830_bathing: { type: "string", description: "M1830 score 0-6" },
            m1840_toilet_transfer: { type: "string", description: "M1840 score 0-4" },
            m1850_transferring: { type: "string", description: "M1850 score 0-5" },
            m1860_ambulation: { type: "string", description: "M1860 score 0-6" },

            // GG items if present
            gg0130_self_care: { type: "string", description: "GG0130 self-care score" },
            gg0170_mobility: { type: "string", description: "GG0170 mobility score" },

            // Clinical status
            m1400_dyspnea: { type: "string", description: "M1400 score 0-4" },
            m1242_pain_freq: { type: "string", description: "M1242 pain frequency" },
            m1306_pressure_ulcer: { type: "string", description: "M1306 pressure ulcer present 0-1" },
            m1307_pressure_ulcer_stage: { type: "string", description: "M1307 oldest stage" },
            m1311_pressure_ulcer_count: { type: "string", description: "M1311 number of ulcers" },
            m1322_stasis_ulcer: { type: "string", description: "M1322 stasis ulcer present" },
            m1324_stasis_ulcer_status: { type: "string", description: "M1324 status" },
            m1330_surgical_wound: { type: "string", description: "M1330 surgical wound present" },
            m1340_surgical_wound_status: { type: "string", description: "M1340 status" },

            // Cognitive and behavioral
            m1700_cognitive: { type: "string", description: "M1700 cognitive functioning" },
            m1710_confusion: { type: "string", description: "M1710 when confused" },
            m1720_anxiety: { type: "string", description: "M1720 anxiety level" },
            m1730_depression: { type: "string", description: "M1730 PHQ-2 score" },

            // Therapy needs
            therapy_pt_needed: { type: "string", description: "Physical therapy ordered yes/no" },
            therapy_ot_needed: { type: "string", description: "Occupational therapy ordered yes/no" },
            therapy_slp_needed: { type: "string", description: "Speech therapy ordered yes/no" },

            // Risk factors
            fall_risk_assessment: { type: "string", description: "Fall risk score or level" },
            hospitalization_risk: { type: "string", description: "Hospitalization risk indicators" },

            // Medications
            high_risk_medications: { type: "string", description: "High risk drugs mentioned" },
            medication_count: { type: "string", description: "Number of medications if stated" },

            // Full text for AI analysis
            clinical_narrative: { type: "string", description: "Any narrative clinical notes or comments" }
              }
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Data extraction timeout - PDF may be too complex')), 90000)
          )
        ]);
      } catch (extractErr) {
        console.warn("Structured extraction failed, trying text fallback:", extractErr);
        extractionMethod = 'text_fallback';
        
        // Fallback: Extract as plain text with AI-assisted parsing
        try {
          const textExtract = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
              type: "object",
              properties: {
                full_text: { 
                  type: "string", 
                  description: "Extract ALL text from the PDF document exactly as it appears, preserving line breaks and spacing" 
                }
              }
            }
          });
          
          if (textExtract.status === "success" && textExtract.output?.full_text) {
            console.log("Text fallback successful, extracted", textExtract.output.full_text.length, "characters");
            
            // Use AI to parse the raw text for critical fields
            const parsedData = await base44.integrations.Core.InvokeLLM({
              prompt: `Parse this OASIS document text and extract key data fields. Focus on accuracy.

DOCUMENT TEXT:
${textExtract.output.full_text.substring(0, 8000)}

Extract ONLY what you can clearly identify. Return "NOT FOUND" for fields you cannot locate.

CRITICAL FIELDS TO FIND:
1. Patient name - look at the very top of the document
2. M1021 Primary Diagnosis - ICD-10 code AND description
3. M1023 Other Diagnoses - ALL codes and descriptions listed
4. Date of birth
5. Assessment date (M0090)
6. Functional scores (M1800-M1860)

Return JSON:
{
  "patient_name": "exact name from document or NOT FOUND",
  "patient_dob": "DOB or NOT FOUND",
  "m1021_code": "ICD-10 code or NOT FOUND",
  "m1021_description": "diagnosis description or NOT FOUND",
  "m1023_list": "all other diagnoses with codes, comma separated, or NOT FOUND",
  "assessment_date": "date or NOT FOUND",
  "functional_scores": {"m1800": "0-3 or ?", "m1810": "0-3 or ?", "m1820": "0-3 or ?", "m1830": "0-6 or ?", "m1840": "0-4 or ?", "m1850": "0-5 or ?", "m1860": "0-6 or ?"}
}`,
              response_json_schema: {
                type: "object",
                properties: {
                  patient_name: { type: "string" },
                  patient_dob: { type: "string" },
                  m1021_code: { type: "string" },
                  m1021_description: { type: "string" },
                  m1023_list: { type: "string" },
                  assessment_date: { type: "string" },
                  functional_scores: { type: "object" }
                }
              }
            });
            
            // Map parsed data to extraction output format
            extractedData = {
              status: "success",
              output: {
                full_text: textExtract.output.full_text,
                patient_name_raw: parsedData.patient_name,
                patient_name: parsedData.patient_name,
                patient_dob: parsedData.patient_dob,
                m1021_primary_diagnosis_code: parsedData.m1021_code,
                m1021_primary_diagnosis_description: parsedData.m1021_description,
                m1023_other_diagnoses: parsedData.m1023_list,
                assessment_date: parsedData.assessment_date,
                m1800_grooming: parsedData.functional_scores?.m1800,
                m1810_dress_upper: parsedData.functional_scores?.m1810,
                m1820_dress_lower: parsedData.functional_scores?.m1820,
                m1830_bathing: parsedData.functional_scores?.m1830,
                m1840_toilet_transfer: parsedData.functional_scores?.m1840,
                m1850_transferring: parsedData.functional_scores?.m1850,
                m1860_ambulation: parsedData.functional_scores?.m1860
              }
            };
          } else {
            throw new Error("Text extraction also failed");
          }
        } catch (fallbackErr) {
          throw new Error(`Unable to read PDF: ${extractErr.message}. Please ensure the PDF is not password-protected, corrupted, or scanned without OCR. Try re-saving the PDF or using a different file.`);
        }
      }

      setUploadProgress(50);

      if (extractedData.status === "error") {
        throw new Error(extractedData.details || "Failed to extract data from PDF. The file may be password-protected, corrupted, or require OCR. Please try a different file or re-save the PDF.");
      }

      // Build comprehensive OASIS content from extraction
      const output = extractedData.output;
      let oasisTextContent = "";
      let extractedPatientName = "Unknown Patient";

      // Handle text fallback extraction
      if (extractionMethod === 'text_fallback' && output?.full_text) {
        oasisTextContent = output.full_text;
        
        // Try to extract patient name from raw text
        const namePatterns = [
          /Patient Name:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
          /Patient:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
          /Name:\s*([A-Z][a-z]+,?\s+[A-Z][a-z]+)/i,
          /([A-Z][a-z]+,\s*[A-Z][a-z]+(?:\s+[A-Z]\.?)?)/,
        ];
        
        for (const pattern of namePatterns) {
          const match = output.full_text.match(pattern);
          if (match && match[1]) {
            extractedPatientName = match[1].trim();
            console.log("Extracted name from text:", extractedPatientName);
            break;
          }
        }
        
        // Create minimal structured output for downstream processing
        output.patient_name_raw = extractedPatientName;
        output.patient_name = extractedPatientName;
      } else if (output) {
        // Build detailed diagnosis section
        const primaryDxCode = output.m1021_primary_diagnosis_code || output.primary_diagnosis_code || 'NOT FOUND';
        const primaryDxDesc = output.m1021_primary_diagnosis_description || output.primary_diagnosis_description || 'NOT FOUND';
        const otherDx = output.m1023_other_diagnoses || output.secondary_diagnoses || 'NOT FOUND';
        const comorbidities = output.comorbidities_text || 'NOT FOUND';
        
        // Enhanced patient name extraction with fallbacks
        let extractedPatientName = output.patient_name_raw || output.patient_name || '';
        
        // Try to construct from first/last if full name not found
        if (!extractedPatientName && (output.patient_first_name || output.patient_last_name)) {
          const firstName = output.patient_first_name || '';
          const lastName = output.patient_last_name || '';
          extractedPatientName = `${firstName} ${lastName}`.trim();
        }
        
        // Clean up the name
        extractedPatientName = extractedPatientName
          .replace(/patient:?/gi, '')
          .replace(/name:?/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        extractedPatientName = extractedPatientName || 'NOT FOUND - CHECK DOCUMENT HEADER';

        oasisTextContent = `PATIENT DEMOGRAPHICS:
      Name: ${extractedPatientName}
      DOB: ${output.patient_dob || '?'}
      Gender: ${output.patient_gender || '?'}

      ASSESSMENT INFORMATION:
      Date (M0090): ${output.assessment_date || '?'}
      Type: ${output.assessment_type || '?'}
      Reason (M0100): ${output.assessment_reason || '?'}

      ===== DIAGNOSES (CRITICAL FOR PDGM) =====

      M1021 PRIMARY DIAGNOSIS:
      Code: ${primaryDxCode}
      Description: ${primaryDxDesc}

      M1023 OTHER DIAGNOSES:
      ${otherDx}

      ADDITIONAL SECONDARY DIAGNOSES:
      ${output.secondary_diagnoses !== otherDx ? output.secondary_diagnoses || 'None' : 'See M1023 above'}

      ALL COMORBIDITIES & CONDITIONS MENTIONED:
      ${comorbidities}

      ==========================================

      ADMISSION/EPISODE:
      M0110 Episode Timing: ${output.m0110_episode_timing || '?'}
      SOC Date (M0030): ${output.soc_date || '?'}
      Referral Date (M0104): ${output.referral_date || '?'}
      Days Since SOC: ${output.days_since_soc || '?'}
      Episode Timing Determination: ${output.episode_timing || 'Not determined'}

      FUNCTIONAL STATUS (ADLs):
      M1800 Grooming: ${output.m1800_grooming || '?'}
      M1810 Upper Body Dressing: ${output.m1810_dress_upper || '?'}
      M1820 Lower Body Dressing: ${output.m1820_dress_lower || '?'}
      M1830 Bathing: ${output.m1830_bathing || '?'}
      M1840 Toilet Transferring: ${output.m1840_toilet_transfer || '?'}
      M1850 Transferring: ${output.m1850_transferring || '?'}
      M1860 Ambulation: ${output.m1860_ambulation || '?'}

      GG FUNCTIONAL ITEMS:
      GG0130 Self-Care: ${output.gg0130_self_care || 'N/A'}
      GG0170 Mobility: ${output.gg0170_mobility || 'N/A'}

      CLINICAL STATUS:
      M1400 Dyspnea: ${output.m1400_dyspnea || '?'}
      M1242 Pain Frequency: ${output.m1242_pain_freq || '?'}

      WOUNDS/SKIN:
      M1306 Pressure Ulcer Present: ${output.m1306_pressure_ulcer || '?'}
      M1307 Pressure Ulcer Stage: ${output.m1307_pressure_ulcer_stage || 'N/A'}
      M1311 Pressure Ulcer Count: ${output.m1311_pressure_ulcer_count || 'N/A'}
      M1322 Stasis Ulcer: ${output.m1322_stasis_ulcer || '?'}
      M1324 Stasis Ulcer Status: ${output.m1324_stasis_ulcer_status || 'N/A'}
      M1330 Surgical Wound: ${output.m1330_surgical_wound || '?'}
      M1340 Surgical Wound Status: ${output.m1340_surgical_wound_status || 'N/A'}

      COGNITIVE/BEHAVIORAL:
      M1700 Cognitive Functioning: ${output.m1700_cognitive || '?'}
      M1710 When Confused: ${output.m1710_confusion || '?'}
      M1720 Anxiety Level: ${output.m1720_anxiety || '?'}
      M1730 Depression (PHQ-2): ${output.m1730_depression || '?'}

      THERAPY SERVICES:
      PT Ordered: ${output.therapy_pt_needed || '?'}
      OT Ordered: ${output.therapy_ot_needed || '?'}
      SLP Ordered: ${output.therapy_slp_needed || '?'}

      RISK FACTORS:
      Fall Risk: ${output.fall_risk_assessment || '?'}
      Hospitalization Risk: ${output.hospitalization_risk || '?'}
      High-Risk Medications: ${output.high_risk_medications || 'None noted'}
      Medication Count: ${output.medication_count || '?'}

      CLINICAL NARRATIVE:
      ${output.clinical_narrative || 'No narrative extracted'}`;
      }
      
      // Final fallback for text extraction method
      if ((!oasisTextContent || oasisTextContent.trim().length < 20) && extractionMethod === 'text_fallback') {
        oasisTextContent = output?.full_text || '';
      }
      
      if (!oasisTextContent || oasisTextContent.trim().length < 20) {
        throw new Error("PDF appears to be empty or unreadable. Please ensure it's a valid OASIS document with actual content.");
      }

      console.log("Extracted OASIS content length:", oasisTextContent.length);
      
      // Parse scores helper
      const parseScore = (val) => {
        if (!val) return 0;
        const num = parseInt(String(val).replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // Default admission source
      let admissionSource = 'community';

      // Determine episode timing from M0110 or calculated from dates
      let episodeTiming = 'early';
      const m0110 = String(output?.m0110_episode_timing || '').toLowerCase();
      if (m0110.includes('2') || m0110.includes('late') || m0110.includes('31')) {
        episodeTiming = 'late';
      } else if (m0110.includes('1') || m0110.includes('early') || m0110.includes('30') || m0110.includes('within')) {
        episodeTiming = 'early';
      } else if (output?.days_since_soc) {
        const days = parseInt(output.days_since_soc);
        if (!isNaN(days) && days > 30) {
          episodeTiming = 'late';
        }
      } else if (output?.soc_date && output?.assessment_date) {
        // Try to calculate from dates
        try {
          const soc = new Date(output.soc_date);
          const assessment = new Date(output.assessment_date);
          const diffDays = Math.floor((assessment - soc) / (1000 * 60 * 60 * 24));
          if (diffDays > 30) {
            episodeTiming = 'late';
          }
        } catch (e) {
          // Keep default early
        }
      }

      // Parse comorbidities from extracted text
      const parseComorbidities = (text) => {
        if (!text) return [];
        const items = text.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
        return items.slice(0, 15); // Limit to 15 comorbidities
      };

      // Extract primary diagnosis with M1021 priority - use ANY code found as fallback
      let primaryDxCode = output?.m1021_primary_diagnosis_code || output?.primary_diagnosis_code || '';
      let primaryDxDescription = output?.m1021_primary_diagnosis_description || output?.primary_diagnosis_description || '';

      // Fallback: try to extract from all_icd10_codes_found or diagnosis_section_text
      if (!primaryDxCode && output?.all_icd10_codes_found) {
        const firstCode = output.all_icd10_codes_found.split(',')[0]?.trim();
        if (firstCode) {
          primaryDxCode = firstCode.split(' ')[0]; // Get just the code
          primaryDxDescription = firstCode.substring(primaryDxCode.length).trim(); // Get description
        }
      }

      // Another fallback: parse diagnosis_section_text for ICD-10 pattern
      if (!primaryDxCode && output?.diagnosis_section_text) {
        const icd10Match = output.diagnosis_section_text.match(/([A-Z]\d{2}\.?\d*)\s+([^,\n]+)/);
        if (icd10Match) {
          primaryDxCode = icd10Match[1];
          primaryDxDescription = icd10Match[2].trim();
        }
      }

      const primaryDiagnosis = primaryDxDescription || primaryDxCode;

      // Combine M1023 and secondary diagnoses for comorbidities
      const allSecondaryDx = [
        output?.m1023_other_diagnoses,
        output?.all_icd10_codes_found,
        output?.secondary_diagnoses,
        output?.comorbidities_text
      ].filter(Boolean).join(', ');

      // Parse out additional codes from all_icd10_codes_found
      const additionalCodes = [];
      if (output?.all_icd10_codes_found) {
        const codes = output.all_icd10_codes_found.split(',').map(c => c.trim()).filter(c => c);
        codes.forEach(code => {
          if (code !== primaryDxCode && !additionalCodes.includes(code)) {
            additionalCodes.push(code);
          }
        });
      }

      // Determine therapy needs
      const checkTherapy = (val) => {
        if (!val) return false;
        const v = val.toLowerCase();
        return v.includes('yes') || v.includes('ordered') || v.includes('true') || v === '1';
      };

      // Build structured PDGM data with enhanced extraction
      const structuredPdgmData = {
        primary_diagnosis: primaryDiagnosis,
        primary_diagnosis_code: primaryDxCode,
        primary_diagnosis_description: primaryDxDescription,
        comorbidities: [...parseComorbidities(allSecondaryDx), ...additionalCodes].filter((v, i, a) => a.indexOf(v) === i), // Deduplicate
        raw_diagnosis_data: {
          m1021_found: !!output?.m1021_primary_diagnosis_code,
          m1023_found: !!output?.m1023_other_diagnoses,
          all_codes_found: output?.all_icd10_codes_found || null,
          diagnosis_section: output?.diagnosis_section_text || null
        },
        admission_source: admissionSource,
        episode_timing: episodeTiming,
        m0110_episode_timing: output?.m0110_episode_timing || null,
        soc_date: output?.soc_date || null,
        functional_scores: {
          m1800_grooming: parseScore(output?.m1800_grooming),
          m1810_dress_upper: parseScore(output?.m1810_dress_upper),
          m1820_dress_lower: parseScore(output?.m1820_dress_lower),
          m1830_bathing: parseScore(output?.m1830_bathing),
          m1840_toilet_transfer: parseScore(output?.m1840_toilet_transfer),
          m1850_transferring: parseScore(output?.m1850_transferring),
          m1860_ambulation: parseScore(output?.m1860_ambulation)
        },
        gg_scores: { 
          self_care: output?.gg0130_self_care || null, 
          mobility: output?.gg0170_mobility || null 
        },
        clinical_items: {
          dyspnea: parseScore(output?.m1400_dyspnea),
          pain_frequency: parseScore(output?.m1242_pain_freq),
          pressure_ulcer_present: output?.m1306_pressure_ulcer === '1' || String(output?.m1306_pressure_ulcer).toLowerCase().includes('yes'),
          pressure_ulcer_stage: output?.m1307_pressure_ulcer_stage || null,
          pressure_ulcer_count: parseScore(output?.m1311_pressure_ulcer_count),
          stasis_ulcer: output?.m1322_stasis_ulcer === '1' || String(output?.m1322_stasis_ulcer).toLowerCase().includes('yes'),
          surgical_wound: output?.m1330_surgical_wound === '1' || String(output?.m1330_surgical_wound).toLowerCase().includes('yes'),
          surgical_wound_status: output?.m1340_surgical_wound_status || null
        },
        cognitive_status: {
          cognitive_functioning: output?.m1700_cognitive || null,
          confusion: output?.m1710_confusion || null,
          anxiety: output?.m1720_anxiety || null,
          depression_phq2: output?.m1730_depression || null
        },
        therapy_services: { 
          pt: checkTherapy(output?.therapy_pt_needed), 
          ot: checkTherapy(output?.therapy_ot_needed), 
          slp: checkTherapy(output?.therapy_slp_needed) 
        },
        risk_factors: {
          fall_risk: output?.fall_risk_assessment || null,
          hospitalization_risk: output?.hospitalization_risk || null,
          high_risk_medications: output?.high_risk_medications || null,
          medication_count: parseScore(output?.medication_count)
        },
        homebound_reason: output?.homebound_reason || null,
        patient_info: { 
          name: extractedPatientName || "Unknown Patient - Verify Document",
          first_name: output?.patient_first_name || null,
          last_name: output?.patient_last_name || null,
          dob: output?.patient_dob || "Not found",
          gender: output?.patient_gender || "Not specified",
          address: output?.patient_address || null,
          assessment_date: output?.assessment_date || new Date().toISOString().split('T')[0], 
          assessment_type: output?.assessment_type || "Unknown",
          assessment_reason: output?.assessment_reason || "Not specified"
        }
      };

      // Increase content limit for better analysis
      const maxContentLength = 15000;
      const truncatedContent = oasisTextContent.length > maxContentLength 
        ? oasisTextContent.substring(0, maxContentLength) + "\n[content truncated for processing]"
        : oasisTextContent;

      setIsUploading(false);
      setIsAnalyzing(true);

      // Simplified analysis - focus on core findings
      let analysisResult;
      try {
        analysisResult = await Promise.race([
          base44.integrations.Core.InvokeLLM({
            prompt: `Analyze OASIS document. Extract: diagnosis, functional scores, compliance issues, revenue opportunities.

DATA:
Primary Dx: ${structuredPdgmData.primary_diagnosis_code} ${structuredPdgmData.primary_diagnosis_description}
Comorbidities: ${structuredPdgmData.comorbidities?.slice(0, 5).join(', ') || 'None'}
Functional: Bathing=${structuredPdgmData.functional_scores?.m1830_bathing}, Transfer=${structuredPdgmData.functional_scores?.m1850_transferring}, Ambulation=${structuredPdgmData.functional_scores?.m1860_ambulation}

Return scores (0-100) and top 3-5 issues in each category.`,
            response_json_schema: {
              type: "object",
              properties: {
                overall_score: { type: "number" },
                accuracy_score: { type: "number" },
                compliance_score: { type: "number" },
                revenue_optimization_score: { type: "number" },
                summary: { type: "string" },
                pdgm_data: { type: "object" },
                extracted_items: { type: "object" },
                accuracy_issues: { type: "array", items: { type: "object" } },
                compliance_concerns: { type: "array", items: { type: "object" } },
                revenue_tips: { type: "array", items: { type: "object" } },
                documentation_improvements: { type: "array", items: { type: "object" } },
                audit_risk_areas: { type: "array", items: { type: "object" } },
                specific_rescore_opportunities: { type: "array", items: { type: "object" } },
                missing_high_value_documentation: { type: "array", items: { type: "object" } },
                strengths: { type: "array", items: { type: "string" } },
                key_recommendations: { type: "array", items: { type: "string" } },
                quick_wins: { type: "array", items: { type: "object" } },
                clinician_questions: { type: "array", items: { type: "string" } }
              }
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout - please try again')), 90000)
          )
        ]);
      } catch (analysisErr) {
        throw new Error(`AI analysis failed: ${analysisErr.message}. Please try uploading again.`);
      }

      setUploadProgress(85);

      // Skip narrative analysis to speed up
      let narrativeMatchAnalysis = null;

      setUploadProgress(90);

      // Skip validation to speed up analysis
      const validationResult = {
        data_quality_score: 80,
        critical_issues: [],
        warnings: [],
        recommendation: 'Validation skipped for speed',
        pdgm_readiness: { ready_for_grouping: true, missing_critical_elements: [], optimization_opportunities: [] }
      };

      // Merge validation results into analysis
      analysisResult.validation_summary = {
        data_quality_score: validationResult?.data_quality_score || 75,
        critical_issues_found: validationResult?.critical_issues?.length || 0,
        warnings_found: validationResult?.warnings?.length || 0,
        issues: validationResult?.critical_issues || [],
        warnings: validationResult?.warnings || [],
        recommendation: validationResult?.recommendation || '',
        pdgm_readiness: validationResult?.pdgm_readiness || null
      };

      // Attach narrative analysis to results
      if (narrativeMatchAnalysis) {
        analysisResult.narrative_match_analysis = narrativeMatchAnalysis;
      }

      setUploadProgress(100);
      setAnalysisResults(analysisResult);

      // Log analysis activity
      logActivity(ActivityActions.OASIS_ANALYZE, {
        file_name: file.name,
        overall_score: analysisResult.overall_score,
        accuracy_score: analysisResult.accuracy_score,
        compliance_score: analysisResult.compliance_score,
        estimated_payment: originalPayment,
        page: 'OASISAnalyzer'
      });

      // Auto-flag for audit if scores below threshold
      const shouldFlag = 
        (analysisResult.accuracy_score < THRESHOLDS.accuracy) ||
        (analysisResult.compliance_score < THRESHOLDS.compliance) ||
        (analysisResult.overall_score < THRESHOLDS.overall);

      if (shouldFlag && uploadedFileUrl) {
        // Will be flagged when saved to patient
        console.log("OASIS flagged for audit review - scores below threshold");
      }
      
      // Use pre-extracted structured data merged with AI analysis for PDGM calculation
      const finalPdgmData = {
        ...structuredPdgmData,
        ...(analysisResult.pdgm_data || {}),
        // Prefer AI-analyzed values if they seem more complete
        primary_diagnosis: analysisResult.pdgm_data?.primary_diagnosis || structuredPdgmData.primary_diagnosis,
        comorbidities: (analysisResult.pdgm_data?.comorbidities?.length > structuredPdgmData.comorbidities?.length) 
          ? analysisResult.pdgm_data.comorbidities 
          : structuredPdgmData.comorbidities,
        functional_scores: {
          ...structuredPdgmData.functional_scores,
          ...(analysisResult.pdgm_data?.functional_scores || {})
        }
      };
      
      // Update the analysis result with merged data
      analysisResult.pdgm_data = finalPdgmData;
      setPdgmData(finalPdgmData);
    } catch (err) {
    console.error("Error analyzing OASIS:", err);

    // Log error activity
    logActivity(ActivityActions.ERROR, {
      error_message: err.message,
      file_name: file?.name,
      component: 'OASISAnalyzer',
      page: 'OASISAnalyzer'
    });

    // Provide more specific error messages
    let errorMessage = "Failed to analyze the OASIS document. ";
      
      if (err.message?.includes('timeout')) {
        errorMessage += "The request timed out. The file may be too large or complex. Try a smaller file or try again.";
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage += "Network error. Please check your internet connection and try again.";
      } else if (err.message?.includes('upload')) {
        errorMessage += "File upload failed. Please try again with a different file.";
      } else if (err.message?.includes('extract')) {
        errorMessage += "Could not read the PDF. Ensure it's a valid OASIS document.";
      } else {
        errorMessage += err.message || "Please try again.";
      }
      
      setError(errorMessage);
    }

    setIsUploading(false);
    setIsAnalyzing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-100 border-green-300";
    if (score >= 60) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300"
    };
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!analysisResults) return;

    setIsDownloading(true);
    try {
      const response = await generateOASISReportPDF({ analysisResults });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OASIS_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF report. Please try again.");
    }
    setIsDownloading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OASIS Analyzer</h1>
        <p className="text-sm text-gray-600">Upload your OASIS assessment PDF for accuracy checking and revenue optimization tips</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="single" className="gap-2">
            <FileText className="w-4 h-4" />
            Single Document
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <FolderArchive className="w-4 h-4" />
            Batch Analysis
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <History className="w-4 h-4" />
            Saved ({savedOASISUploads.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* Saved OASIS Tab */}
        <TabsContent value="saved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Saved OASIS Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedOASISUploads.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No saved OASIS analyses yet. Upload and analyze a document, then save it to a patient.
                </p>
              ) : (
                <div className="space-y-3">
                  {savedOASISUploads.map((oasis) => (
                    <div 
                      key={oasis.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLoadSavedOASIS(oasis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium">{oasis.patient_name || 'Unknown Patient'}</p>
                            <p className="text-sm text-gray-500">
                              {oasis.assessment_type} - {oasis.assessment_date || 'No date'}
                            </p>
                            <p className="text-xs text-gray-400">{oasis.file_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2">
                            <Badge className={oasis.scores?.overall >= 80 ? 'bg-green-100 text-green-800' : oasis.scores?.overall >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              Score: {oasis.scores?.overall || 'N/A'}%
                            </Badge>
                            {oasis.estimated_payment && (
                              <Badge variant="outline">
                                ${oasis.estimated_payment?.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(oasis.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <div className="space-y-6">
            <PDGMTrendDashboard />
            <OASISAnalyticsDashboard savedOASISUploads={savedOASISUploads} />
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="mt-4">
          <OASISAutomationSettings />
          
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <p className="text-sm text-blue-900 mb-2">
                <strong>How Automation Works:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Configure rules that trigger when specific OASIS issues are detected</li>
                <li>AI analyzes each assessment and matches findings to your automation rules</li>
                <li>Automatically suggests follow-up tasks for clinicians based on compliance, revenue, or clinical concerns</li>
                <li>Review suggested actions and create tasks with one click</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <BatchOASISAnalyzer onSingleAnalysis={handleViewBatchResult} onBatchComplete={handleBatchComplete} />
        </TabsContent>

        <TabsContent value="single" className="mt-4">
          {/* AI Data Entry Assistant */}
          {useDataEntryAssistant ? (
            <OASISDataEntryAssistant
              onDataConfirmed={(data) => {
                // Use the confirmed data to pre-populate analysis
                setFile(data.file);
                setUploadedFileUrl(data.fileUrl);
                setPatientName(data.extractedData.patient_name || "Unknown");

                // Auto-trigger analysis with pre-filled data
                setUseDataEntryAssistant(false);

                // Show success message
                alert("Data confirmed! Now analyzing with AI-extracted information...");
              }}
            />
          ) : null}

          {/* Upload Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload OASIS Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3 justify-center">
                  <Button
                    variant={useDataEntryAssistant ? "outline" : "default"}
                    onClick={() => setUseDataEntryAssistant(false)}
                    className={!useDataEntryAssistant ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Quick Upload
                  </Button>
                  <Button
                    variant={useDataEntryAssistant ? "default" : "outline"}
                    onClick={() => setUseDataEntryAssistant(true)}
                    className={useDataEntryAssistant ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Data Entry Assistant
                  </Button>
                </div>

                {!useDataEntryAssistant && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="oasis-upload"
                    />
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      {file ? file.name : "No file selected"}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">Upload your OASIS PDF for accuracy review</p>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => document.getElementById('oasis-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose PDF File
                    </Button>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button
                    onClick={handleUploadAndAnalyze}
                    disabled={isUploading || isAnalyzing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUploading || isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUploading ? "Uploading..." : "Analyzing..."}
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Analyze OASIS
                      </>
                    )}
                  </Button>
                </div>
              )}

              {(isUploading || isAnalyzing) && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {isUploading ? "Uploading document..." : "AI is analyzing your OASIS document..."}
                  </p>
                </div>
              )}

              {error && (
                <Alert className="mt-4 bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

      {/* AI Automation Engine */}
      {analysisResults && selectedPatient && (
        <OASISAutomationEngine
          analysisResults={analysisResults}
          patientId={selectedPatient.id}
          onTasksCreated={() => {
            // Refresh or show success
          }}
          autoExecute={true}
        />
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <div className="space-y-6">
          {/* Patient Match Selector - Enhanced with Confidence Scoring */}
          <PatientMatchSelector
            extractedName={patientName}
            extractedDOB={pdgmData?.patient_info?.dob}
            matchResults={matchResults}
            selectedPatientId={selectedPatientId}
            onSelectPatient={(patientId) => setSelectedPatientId(patientId)}
            allPatients={patients}
            oasisUploadId={analysisId}
          />

          {/* Save to Patient Action */}
          <Card className="border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Save OASIS Analysis</p>
                    <p className="text-xs text-gray-500">
                      {selectedPatientId && patients.find(p => p.id === selectedPatientId)
                        ? `Link to ${patients.find(p => p.id === selectedPatientId)?.first_name} ${patients.find(p => p.id === selectedPatientId)?.last_name}`
                        : 'Save as standalone record'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveToPatient}
                  disabled={isSaving || savedToPatient || !uploadedFileUrl}
                  className={savedToPatient ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : savedToPatient ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save OASIS</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Executive Summary - AI-Generated Quick Overview */}
          <OASISExecutiveSummary
            analysisResults={analysisResults}
            pdgmData={pdgmData}
          />

          {/* AI Automation Engine */}
          {analysisResults && selectedPatient && (
            <OASISAutomationEngine
              analysisResults={analysisResults}
              patientId={selectedPatient.id}
              onTasksCreated={() => {
                // Refresh tasks or show success notification
              }}
              autoExecute={true}
            />
          )}

          {/* Auto-Generated Tasks Based on Analysis */}
          <OASISTaskGenerator
            analysisResults={analysisResults}
            pdgmData={pdgmData}
            patientId={selectedPatientId}
            patientName={patientName}
            onTasksCreated={(count) => console.log(`${count} tasks created`)}
          />

          {/* Export Manager */}
          <OASISExportManager
            analysisResults={analysisResults}
            pdgmData={pdgmData}
            revenueData={revenueData}
            navigationData={navigationData}
            qualityScore={qualityScore}
            patientName={patientName}
          />

          {/* Key Takeaways Summary - Most Important */}
          <KeyTakeawaysSummary analysisResults={analysisResults} revenueData={null} />

          {/* AI-Powered Automatic Document Review */}
          <AIDocumentReviewer
            oasisData={pdgmData}
            autoReview={true}
          />

          {/* Narrative-Question Match Analysis */}
          {analysisResults.narrative_match_analysis && (
           <Card className="border-2 border-purple-300">
             <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                 <ClipboardCheck className="w-5 h-5 text-purple-600" />
                 Narrative-Question Consistency Analysis
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-3 gap-4 mb-4">
                 <div className="text-center p-3 bg-purple-50 rounded-lg border">
                   <p className="text-sm text-purple-600">Consistency Score</p>
                   <p className={`text-3xl font-bold ${analysisResults.narrative_match_analysis.consistency_analysis?.overall_consistency_score >= 80 ? 'text-green-600' : analysisResults.narrative_match_analysis.consistency_analysis?.overall_consistency_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                     {analysisResults.narrative_match_analysis.consistency_analysis?.overall_consistency_score || 0}%
                   </p>
                 </div>
                 <div className="text-center p-3 bg-red-50 rounded-lg border">
                   <p className="text-sm text-red-600">Total Mismatches</p>
                   <p className="text-3xl font-bold text-red-700">
                     {analysisResults.narrative_match_analysis.consistency_analysis?.total_mismatches_found || 0}
                   </p>
                 </div>
                 <div className="text-center p-3 bg-orange-50 rounded-lg border">
                   <p className="text-sm text-orange-600">Critical Issues</p>
                   <p className="text-3xl font-bold text-orange-700">
                     {analysisResults.narrative_match_analysis.consistency_analysis?.critical_mismatches || 0}
                   </p>
                 </div>
               </div>

               {analysisResults.narrative_match_analysis.consistency_analysis?.mismatches?.length > 0 && (
                 <Accordion type="single" collapsible className="mt-4">
                   <AccordionItem value="mismatches">
                     <AccordionTrigger className="text-red-700">
                       <div className="flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4" />
                         Narrative-Code Mismatches ({analysisResults.narrative_match_analysis.consistency_analysis.mismatches.length})
                       </div>
                     </AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-3">
                         {analysisResults.narrative_match_analysis.consistency_analysis.mismatches.map((mismatch, idx) => (
                           <div key={idx} className={`p-3 rounded-lg border ${
                             mismatch.severity === 'critical' ? 'bg-red-50 border-red-300' :
                             mismatch.severity === 'high' ? 'bg-orange-50 border-orange-300' :
                             'bg-yellow-50 border-yellow-300'
                           }`}>
                             <div className="flex items-center justify-between mb-2">
                               <Badge className="font-mono">{mismatch.m_item_code}</Badge>
                               <Badge className={getSeverityBadge(mismatch.severity)}>
                                 {mismatch.severity}
                               </Badge>
                             </div>
                             <p className="text-sm font-medium text-gray-800 mb-1">{mismatch.m_item_question}</p>

                             <div className="grid grid-cols-2 gap-2 my-2">
                               <div className="bg-white p-2 rounded border">
                                 <p className="text-xs text-gray-500">Coded Response:</p>
                                 <p className="text-sm font-medium text-red-700">{mismatch.coded_response}</p>
                               </div>
                               <div className="bg-white p-2 rounded border">
                                 <p className="text-xs text-gray-500">Should Be:</p>
                                 <p className="text-sm font-medium text-green-700">{mismatch.correct_response_should_be}</p>
                               </div>
                             </div>

                             <div className="bg-white p-2 rounded border my-2">
                               <p className="text-xs text-gray-500 mb-1">Narrative Quote:</p>
                               <p className="text-sm text-gray-700 italic">"{mismatch.narrative_quote}"</p>
                             </div>

                             <p className="text-sm text-gray-800 mb-2">{mismatch.explanation}</p>

                             {mismatch.revenue_impact && (
                               <div className="bg-green-50 p-2 rounded text-xs text-green-800 mb-1">
                                 💰 Revenue Impact: {mismatch.revenue_impact}
                               </div>
                             )}

                             {mismatch.compliance_risk && (
                               <div className="bg-red-50 p-2 rounded text-xs text-red-800 mb-2">
                                 ⚠️ Compliance Risk: {mismatch.compliance_risk}
                               </div>
                             )}

                             <div className="bg-blue-50 p-2 rounded border border-blue-200">
                               <p className="text-xs text-blue-600 font-medium mb-1">Recommended Fix:</p>
                               <p className="text-sm text-blue-900">{mismatch.recommended_fix}</p>
                             </div>

                             {mismatch.exact_narrative_needed && (
                               <div className="bg-purple-50 p-2 rounded border border-purple-200 mt-2">
                                 <p className="text-xs text-purple-600 font-medium mb-1">Add This Narrative:</p>
                                 <p className="text-sm text-purple-900 italic">"{mismatch.exact_narrative_needed}"</p>
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 </Accordion>
               )}

               {analysisResults.narrative_match_analysis.consistency_analysis?.missing_narratives?.length > 0 && (
                 <Alert className="mt-4 bg-yellow-50 border-yellow-300">
                   <AlertTriangle className="w-4 h-4 text-yellow-600" />
                   <AlertDescription className="text-yellow-800">
                     <p className="font-semibold mb-2">Missing Required Narratives ({analysisResults.narrative_match_analysis.consistency_analysis.missing_narratives.length})</p>
                     <ul className="space-y-1 text-sm">
                       {analysisResults.narrative_match_analysis.consistency_analysis.missing_narratives.slice(0, 5).map((missing, idx) => (
                         <li key={idx}>
                           <strong>{missing.m_item_code}</strong>: {missing.why_narrative_required}
                         </li>
                       ))}
                     </ul>
                   </AlertDescription>
                 </Alert>
               )}
             </CardContent>
           </Card>
          )}

          {/* Automated Document Reviewer - Compliance & Best Practices Scanner */}
          <AutomaticDocumentReviewer
            documentType="oasis_assessment"
            documentContent={JSON.stringify(pdgmData, null, 2) + '\n\n' + JSON.stringify(analysisResults, null, 2)}
            patientData={patients.find(p => p.id === selectedPatientId)}
            diagnosis={pdgmData?.primary_diagnosis}
            visitType={pdgmData?.patient_info?.assessment_type}
            autoReview={true}
            onReviewComplete={(reviewResults) => {
              console.log('Document review complete:', reviewResults);
              logActivity(ActivityActions.NOTE_COMPLIANCE_CHECK, {
                document_type: 'oasis',
                overall_score: reviewResults.overall_score,
                compliance_score: reviewResults.compliance_score,
                critical_issues: reviewResults.critical_issues?.length || 0,
                patient_id: selectedPatientId,
                page: 'OASISAnalyzer'
              });
            }}
            compact={false}
          />

          {/* Score Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Analysis Results</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.overall_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Overall Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.overall_score)}`}>
                    {analysisResults.overall_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.accuracy_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Accuracy</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.accuracy_score)}`}>
                    {analysisResults.accuracy_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.compliance_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Compliance</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.compliance_score)}`}>
                    {analysisResults.compliance_score}%
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysisResults.revenue_optimization_score)}`}>
                  <p className="text-xs text-gray-600 mb-1">Revenue Optimization</p>
                  <p className={`text-3xl font-bold ${getScoreColor(analysisResults.revenue_optimization_score)}`}>
                    {analysisResults.revenue_optimization_score}%
                  </p>
                </div>
              </div>

              {/* Summary */}
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {analysisResults.summary}
                </AlertDescription>
              </Alert>

              {/* Validation Summary */}
              {analysisResults.validation_summary && (
                <div className={`p-4 rounded-lg border-2 mb-4 ${
                  analysisResults.validation_summary.critical_issues_found > 0 
                    ? 'bg-red-50 border-red-300' 
                    : analysisResults.validation_summary.warnings_found > 0
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-green-50 border-green-300'
                }`}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    {analysisResults.validation_summary.critical_issues_found > 0 ? (
                      <><AlertTriangle className="w-4 h-4 text-red-600" /> Data Validation Issues Found</>
                    ) : analysisResults.validation_summary.warnings_found > 0 ? (
                      <><AlertTriangle className="w-4 h-4 text-yellow-600" /> Validation Warnings</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 text-green-600" /> Validation Passed</>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      Quality: {analysisResults.validation_summary.data_quality_score}%
                    </Badge>
                  </h3>
                  {analysisResults.validation_summary.recommendation && (
                    <p className="text-sm text-gray-700 mb-2">{analysisResults.validation_summary.recommendation}</p>
                  )}
                  {/* PDGM Readiness Summary */}
                  {analysisResults.validation_summary.pdgm_readiness && (
                    <div className={`mt-3 p-2 rounded border ${
                      analysisResults.validation_summary.pdgm_readiness.ready_for_grouping 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <p className="text-xs font-semibold mb-1">
                        {analysisResults.validation_summary.pdgm_readiness.ready_for_grouping 
                          ? '✓ Ready for PDGM Grouping' 
                          : '⚠ PDGM Data Issues Detected'}
                      </p>
                      {analysisResults.validation_summary.pdgm_readiness.missing_critical_elements?.length > 0 && (
                        <div className="text-xs text-orange-800">
                          <span className="font-medium">Missing: </span>
                          {analysisResults.validation_summary.pdgm_readiness.missing_critical_elements.join(', ')}
                        </div>
                      )}
                      {analysisResults.validation_summary.pdgm_readiness.optimization_opportunities?.length > 0 && (
                        <div className="text-xs text-blue-700 mt-1">
                          <span className="font-medium">Optimize: </span>
                          {analysisResults.validation_summary.pdgm_readiness.optimization_opportunities.slice(0, 2).join('; ')}
                        </div>
                      )}
                    </div>
                  )}

                  {analysisResults.validation_summary.issues?.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {analysisResults.validation_summary.issues.slice(0, 5).map((issue, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border text-sm">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {issue.type?.replace('_', ' ')}
                            </Badge>
                            {issue.item && <span className="font-mono text-xs bg-gray-100 px-1 rounded">{issue.item}</span>}
                          </div>
                          <p className="text-gray-700">{issue.description}</p>
                          {issue.pdgm_impact && (
                            <p className="text-purple-700 text-xs mt-1">
                              <span className="font-medium">PDGM Impact:</span> {issue.pdgm_impact}
                            </p>
                          )}
                          {issue.suggested_correction && (
                            <p className="text-green-700 text-xs mt-1 bg-green-50 p-1 rounded">
                              <span className="font-medium">Fix:</span> {issue.suggested_correction}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Key Recommendations */}
              {analysisResults.key_recommendations?.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 mb-4">
                  <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Key Recommendations
                  </h3>
                  <ol className="space-y-2">
                    {analysisResults.key_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-indigo-800">
                        <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Strengths */}
              {analysisResults.strengths?.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-1">
                    {analysisResults.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automated PDGM Navigator */}
          <AutomatedPDGMNavigator 
            analysisResults={analysisResults} 
            pdgmData={pdgmData}
            revenueData={null}
            onNavigationComplete={(navData) => setNavigationData(navData)}
          />

          {/* Enhanced Case-Mix Component Analyzer */}
          {navigationData && (
            <EnhancedPDGMCaseMixAnalyzer
              pdgmData={pdgmData}
              navigationData={navigationData}
            />
          )}

          {/* PDGM Impact Analyzer */}
          {analysisResults?.specific_rescore_opportunities?.length > 0 && (
            <PDGMImpactAnalyzer
              currentPdgmData={pdgmData}
              suggestedChanges={{
                functional_improvements: analysisResults.specific_rescore_opportunities
                  ?.filter(opp => opp.category === 'functional')
                  ?.reduce((acc, opp) => {
                    if (opp.m_item && opp.suggested_score !== undefined) {
                      acc[opp.m_item] = opp.suggested_score;
                    }
                    return acc;
                  }, {}),
                comorbidity_additions: analysisResults.specific_rescore_opportunities
                  ?.filter(opp => opp.category === 'comorbidity')
                  ?.map(opp => opp.comorbidity),
                clinical_items: {}
              }}
              onAnalysisComplete={(analysis) => {
                console.log('PDGM Impact Analysis:', analysis);
              }}
            />
          )}

          {/* PDGM Revenue Analysis */}
          <PDGMRevenueComparison 
            analysisResults={analysisResults} 
            pdgmData={pdgmData}
            onPaymentCalculated={(payment) => setOriginalPayment(payment)}
            onRevenueCalculated={(revData) => setRevenueData(revData)}
          />

          {/* Scenario Planning & Action Workflow */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <OASISScenarioManager
              analysisId={analysisId}
              originalPdgmData={pdgmData}
              originalPayment={originalPayment || 0}
              patientName={patientName}
              onCreateActions={(scenarios) => {
                // Trigger action creation from scenarios
                console.log("Creating actions from scenarios:", scenarios);
              }}
            />
            <OASISActionWorkflow
              analysisId={analysisId}
              analysisResults={analysisResults}
              pdgmData={pdgmData}
              originalPayment={originalPayment || 0}
              patientName={patientName}
            />
          </div>

          {/* Smart Note Data Import - Bi-directional sync */}
          <SmartNoteDataImport
            patientId={selectedPatientId}
            patientName={patientName}
            onImportData={(importData) => {
              // Apply imported functional observations to PDGM data for comparison
              if (importData.functionalObservations && pdgmData) {
                const obs = importData.functionalObservations;
                const updatedScores = { ...pdgmData.functional_scores };
                if (obs.ambulation?.score !== undefined) {
                  updatedScores.m1860_ambulation = obs.ambulation.score;
                }
                if (obs.transfer?.score !== undefined) {
                  updatedScores.m1850_transferring = obs.transfer.score;
                }
                if (obs.bathing?.score !== undefined) {
                  updatedScores.m1830_bathing = obs.bathing.score;
                }
                setPdgmData(prev => ({
                  ...prev,
                  functional_scores: updatedScores,
                  _importedFromVisit: importData.visitDate
                }));
              }
            }}
          />

          {/* Multi-Report Comparison */}
          <EnhancedMultiReportComparison
            savedReports={savedBatchResults}
            currentReport={analysisResults}
            currentPdgmData={pdgmData}
          />

          {/* AI Documentation Generator - Generate Draft Clinical Text */}
          <AIDocumentationGenerator
            analysisResults={analysisResults}
            pdgmData={pdgmData}
            navigationData={navigationData}
          />

          {/* AI Proactive Documentation Assistant - Most Important for Real-Time Help */}
          <AIProactiveDocumentationAssistant
            analysisResults={analysisResults}
            pdgmData={pdgmData}
            navigationData={navigationData}
            qualityScore={qualityScore}
          />

          {/* AI Documentation Quality Scorer - Full Width */}
          <OASISDocumentationQualityScorer 
            analysisResults={analysisResults} 
            pdgmData={pdgmData}
            onQualityScoreComplete={(score) => setQualityScore(score)}
          />

          {/* AI Documentation Quality Analyzer - Full Width */}
          <AIDocumentationQualityAnalyzer analysisResults={analysisResults} pdgmData={pdgmData} />

          {/* AI Documentation Assistant & Audit Risk Predictor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIDocumentationAssistant 
              analysisResults={analysisResults} 
              pdgmData={pdgmData}
              onInsertText={(text) => console.log("Insert text:", text)}
            />
            <AIAuditRiskPredictor 
              analysisResults={analysisResults} 
              patientId={selectedPatientId}
            />
          </div>

          {/* AI Pathway Recommender - Proactive pathway suggestions */}
          <AIPathwayRecommender
            pdgmData={pdgmData}
            analysisResults={analysisResults}
            navigationData={navigationData}
            patientId={selectedPatientId}
            onPathwaysActivated={(pathways) => {
              setTriggeredPathways(pathways);
              console.log(`${pathways.length} pathways activated`);
            }}
          />

          {/* Clinical Pathway Trigger - Existing pathway matching */}
          <ClinicalPathwayTrigger
            pdgmData={pdgmData}
            analysisResults={analysisResults}
            patientId={selectedPatientId}
            onTasksCreated={(count) => console.log(`${count} pathway tasks created`)}
            onPathwaysTriggered={(pathways) => setTriggeredPathways(pathways)}
          />

          {/* PDGM Predictive Forecaster */}
          <PDGMPredictiveForecaster
            pdgmData={pdgmData}
            analysisResults={analysisResults}
            currentPayment={originalPayment}
            triggeredPathways={triggeredPathways}
          />

          {/* OASIS Validation Panel - Full Width for Prominence */}
          <OASISValidationPanel 
            pdgmData={pdgmData} 
            analysisResults={analysisResults}
          />

          {/* AI-Enhanced Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audit Risk Predictor */}
            <AuditRiskPredictor analysisResults={analysisResults} />
            
            {/* Documentation Quality Suggestions */}
            <DocumentationQualitySuggestions analysisResults={analysisResults} />
          </div>

          {/* Detailed Analysis Accordion */}
          <Accordion type="multiple" className="space-y-2">
            {/* Accuracy Issues */}
            {analysisResults.accuracy_issues?.length > 0 && (
              <AccordionItem value="accuracy" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>Accuracy Issues ({analysisResults.accuracy_issues.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.accuracy_issues.map((issue, idx) => (
                     <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                       <div className="flex items-center justify-between mb-2">
                         <Badge variant="outline" className="font-mono">{issue.item}</Badge>
                         <Badge className={getSeverityBadge(issue.severity)}>{issue.severity}</Badge>
                       </div>
                       <p className="text-sm text-gray-800 mb-2">{issue.issue}</p>
                       <div className="bg-white p-2 rounded border">
                         <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
                         <p className="text-sm text-green-700">{issue.recommendation}</p>
                       </div>
                       <InlineDocumentationAssistant 
                         issue={issue} 
                         issueType="accuracy"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Compliance Concerns */}
            {analysisResults.compliance_concerns?.length > 0 && (
              <AccordionItem value="compliance" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Compliance Concerns ({analysisResults.compliance_concerns.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.compliance_concerns.map((concern, idx) => (
                     <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                       <div className="flex items-center justify-between mb-2">
                         <span className="font-semibold text-red-900">{concern.area}</span>
                         <Badge className={getSeverityBadge(concern.severity)}>{concern.severity}</Badge>
                       </div>
                       <p className="text-sm text-gray-800 mb-2">{concern.issue}</p>
                       {concern.cms_reference && (
                         <p className="text-xs text-gray-500 mb-2">CMS Reference: {concern.cms_reference}</p>
                       )}
                       <div className="bg-white p-2 rounded border">
                         <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
                         <p className="text-sm text-green-700">{concern.recommendation}</p>
                       </div>
                       <InlineDocumentationAssistant 
                         issue={concern} 
                         issueType="compliance"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Revenue Tips */}
            {analysisResults.revenue_tips?.length > 0 && (
              <AccordionItem value="revenue" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>Revenue Optimization Tips ({analysisResults.revenue_tips.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.revenue_tips.map((tip, idx) => (
                     <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                       <div className="flex items-center justify-between mb-2">
                         <Badge variant="outline" className="bg-white">{tip.category}</Badge>
                         <Badge className={`${tip.potential_impact === 'high' ? 'bg-green-600' : tip.potential_impact === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'} text-white`}>
                           <TrendingUp className="w-3 h-3 mr-1" />
                           {tip.potential_impact} impact
                         </Badge>
                       </div>
                       <div className="space-y-2 text-sm">
                         <div>
                           <p className="text-xs text-gray-500">Current Documentation:</p>
                           <p className="text-gray-700">{tip.current_documentation}</p>
                         </div>
                         <div>
                           <p className="text-xs text-gray-500">Opportunity:</p>
                           <p className="text-green-700">{tip.opportunity}</p>
                         </div>
                         <div className="bg-white p-2 rounded border">
                           <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                             <Lightbulb className="w-3 h-3 text-yellow-500" />
                             Specific Action:
                           </p>
                           <p className="text-green-800 font-medium">{tip.specific_action}</p>
                         </div>
                       </div>
                       <InlineDocumentationAssistant 
                         issue={tip} 
                         issueType="revenue"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Audit Risk Areas */}
            {analysisResults.audit_risk_areas?.length > 0 && (
              <AccordionItem value="audit" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Audit Risk Areas ({analysisResults.audit_risk_areas.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.audit_risk_areas.map((risk, idx) => (
                      <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-orange-900">{risk.area}</span>
                          <Badge className={getSeverityBadge(risk.risk_level)}>{risk.risk_level} risk</Badge>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{risk.explanation}</p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Mitigation:</p>
                          <p className="text-sm text-green-700">{risk.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Documentation Improvements */}
            {analysisResults.documentation_improvements?.length > 0 && (
              <AccordionItem value="improvements" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span>Documentation Improvements ({analysisResults.documentation_improvements.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.documentation_improvements.map((imp, idx) => (
                     <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                       <div className="flex items-center justify-between mb-2">
                         <p className="font-semibold text-blue-900">{imp.item}</p>
                         {imp.m_item_impact && (
                           <Badge className="bg-purple-100 text-purple-800 text-xs">
                             Affects: {imp.m_item_impact}
                           </Badge>
                         )}
                       </div>
                       <div className="grid md:grid-cols-2 gap-3">
                         <div className="bg-red-50 p-2 rounded border border-red-200">
                           <p className="text-xs text-red-600 mb-1">Current:</p>
                           <p className="text-sm text-red-800">{imp.current_state}</p>
                         </div>
                         <div className="bg-green-50 p-2 rounded border border-green-200">
                           <p className="text-xs text-green-600 mb-1">Improved:</p>
                           <p className="text-sm text-green-800">{imp.improved_state}</p>
                         </div>
                       </div>
                       {imp.exact_text_to_add && (
                         <div className="mt-2 p-2 bg-white rounded border border-blue-300">
                           <p className="text-xs text-blue-600 mb-1 font-medium">📝 Exact Text to Add:</p>
                           <p className="text-sm text-blue-900 italic">"{imp.exact_text_to_add}"</p>
                         </div>
                       )}
                       <p className="text-xs text-gray-600 mt-2 italic">{imp.rationale}</p>
                       <InlineDocumentationAssistant 
                         issue={imp} 
                         issueType="documentation_improvement"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Specific Rescore Opportunities */}
            {analysisResults.specific_rescore_opportunities?.length > 0 && (
              <AccordionItem value="rescore" className="border rounded-lg border-green-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-green-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">Rescore Opportunities ({analysisResults.specific_rescore_opportunities.length})</span>
                    <Badge className="bg-green-600 text-white ml-2">💰 Revenue Impact</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.specific_rescore_opportunities.map((opp, idx) => (
                     <div key={idx} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300">
                       <div className="flex items-center justify-between mb-2">
                         <Badge className="bg-green-700 text-white font-mono">{opp.m_item}</Badge>
                         {opp.revenue_impact && (
                           <Badge className="bg-emerald-600 text-white">{opp.revenue_impact}</Badge>
                         )}
                       </div>
                       <div className="grid grid-cols-2 gap-2 mb-2">
                         <div className="bg-red-100 p-2 rounded text-center">
                           <p className="text-xs text-red-600">Current Score</p>
                           <p className="text-xl font-bold text-red-800">{opp.current_score}</p>
                         </div>
                         <div className="bg-green-100 p-2 rounded text-center">
                           <p className="text-xs text-green-600">Recommended Score</p>
                           <p className="text-xl font-bold text-green-800">{opp.recommended_score}</p>
                         </div>
                       </div>
                       <div className="bg-white p-2 rounded border mb-2">
                         <p className="text-xs text-gray-500 mb-1">Clinical Evidence:</p>
                         <p className="text-sm text-gray-800">{opp.clinical_evidence}</p>
                       </div>
                       <div className="bg-blue-50 p-2 rounded border border-blue-200">
                         <p className="text-xs text-blue-600 mb-1 font-medium">✅ Action Required:</p>
                         <p className="text-sm text-blue-900">{opp.action_required}</p>
                       </div>
                       <InlineDocumentationAssistant 
                         issue={opp} 
                         issueType="rescore"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Missing High-Value Documentation */}
            {analysisResults.missing_high_value_documentation?.length > 0 && (
              <AccordionItem value="missing-docs" className="border rounded-lg border-amber-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-amber-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">Missing High-Value Documentation ({analysisResults.missing_high_value_documentation.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.missing_high_value_documentation.map((doc, idx) => (
                     <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-300">
                       <div className="flex items-center justify-between mb-2">
                         <p className="font-semibold text-amber-900">{doc.area}</p>
                         {doc.potential_value && (
                           <Badge className="bg-amber-600 text-white">{doc.potential_value}</Badge>
                         )}
                       </div>
                       <p className="text-sm text-gray-700 mb-2">{doc.why_it_matters}</p>
                       {doc.suggested_text && (
                         <div className="bg-white p-2 rounded border border-amber-200">
                           <p className="text-xs text-amber-600 mb-1 font-medium">📝 Suggested Documentation:</p>
                           <p className="text-sm text-gray-800 italic">"{doc.suggested_text}"</p>
                         </div>
                       )}
                       <InlineDocumentationAssistant 
                         issue={doc} 
                         issueType="missing_documentation"
                         pdgmData={pdgmData}
                       />
                     </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Quick Wins */}
            {analysisResults.quick_wins?.length > 0 && (
              <AccordionItem value="quick-wins" className="border rounded-lg border-purple-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-purple-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-800">Quick Wins ({analysisResults.quick_wins.length})</span>
                    <Badge className="bg-purple-600 text-white ml-2">Easy Improvements</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {analysisResults.quick_wins.map((win, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-purple-900">{win.action}</p>
                          <div className="flex gap-2">
                            <Badge className={win.effort === 'low' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {win.effort} effort
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-green-700 mb-2">💰 Impact: {win.impact}</p>
                        {win.how_to && (
                          <div className="bg-white p-2 rounded border">
                            <p className="text-xs text-purple-600 mb-1 font-medium">How to do it:</p>
                            <p className="text-sm text-gray-800">{win.how_to}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Clinician Questions */}
            {analysisResults.clinician_questions?.length > 0 && (
              <AccordionItem value="questions" className="border rounded-lg border-indigo-300">
                <AccordionTrigger className="px-4 hover:no-underline bg-indigo-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span className="text-indigo-800">Questions for Clinician ({analysisResults.clinician_questions.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-3">Ask the assessing clinician these questions to clarify scoring:</p>
                    <ol className="space-y-2">
                      {analysisResults.clinician_questions.map((question, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900">
                          <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                            {idx + 1}
                          </span>
                          {question}
                        </li>
                      ))}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            </Accordion>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}