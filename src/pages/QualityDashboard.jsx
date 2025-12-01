import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  Award,
  TrendingUp,
  Target,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Users,
  Heart,
  Home,
  Sparkles,
  FileCheck,
  Calendar,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays, differenceInDays, parseISO } from "date-fns";

import StarRatingsSimulator from "../components/quality/StarRatingsSimulator";
import QualityMetricsDashboard from "../components/admin/QualityMetricsDashboard";

export default function QualityDashboard() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Fetch data for overview metrics
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

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 500),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: securityLogs = [] } = useQuery({
    queryKey: ['securityLogs'],
    queryFn: () => base44.entities.SecurityLog.list('-timestamp', 200),
    initialData: [],
    enabled: isAdmin,
  });

  // Calculate quick stats
  const activePatients = patients.filter(p => p.status === 'active').length;
  const completedVisits = visits.filter(v => v.status === 'completed').length;
  
  const today = new Date();
  const last30Days = format(subDays(today, 30), 'yyyy-MM-dd');
  
  const recentHospitalizations = incidents.filter(i => 
    i.incident_type === 'hospitalized' && 
    i.incident_date >= last30Days
  ).length;
  
  const recentFalls = incidents.filter(i => 
    i.incident_type === 'fall' && 
    i.incident_date >= last30Days
  ).length;

  const recentEDVisits = incidents.filter(i => 
    i.incident_type === 'emergency_visit' && 
    i.incident_date >= last30Days
  ).length;

  // Calculate quality score based on recent incidents
  const hospitalizationRate = activePatients > 0 ? (recentHospitalizations / activePatients) * 100 : 0;
  const fallRate = completedVisits > 0 ? (recentFalls / completedVisits) * 1000 : 0;
  
  let overallQualityScore = 100;
  overallQualityScore -= hospitalizationRate * 2; // Penalize hospitalizations
  overallQualityScore -= Math.min(fallRate, 20); // Penalize falls
  overallQualityScore -= recentEDVisits * 1.5; // Penalize ED visits
  overallQualityScore = Math.max(Math.round(overallQualityScore), 0);

  // Calculate estimated Star Rating (simplified 1-5 scale)
  let estimatedStars = 5;
  if (overallQualityScore < 95) estimatedStars = 4;
  if (overallQualityScore < 85) estimatedStars = 3;
  if (overallQualityScore < 75) estimatedStars = 2;
  if (overallQualityScore < 60) estimatedStars = 1;

  // Check AI usage for quality enhancement
  const aiUsageCount = securityLogs.filter(log => 
    log.action === 'AI_API_CALL' && 
    log.timestamp >= last30Days
  ).length;

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <p className="font-semibold mb-2">Access Denied</p>
            <p>You do not have administrator privileges to view the Quality Dashboard.</p>
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
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality & Star Ratings Dashboard</h1>
            <p className="text-gray-600">Comprehensive quality tracking and Medicare Star Rating optimization</p>
          </div>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Star className="w-10 h-10 text-yellow-200" />
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < estimatedStars ? 'text-white fill-white' : 'text-yellow-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-yellow-100 text-sm font-medium mb-1">Estimated Star Rating</p>
            <p className="text-4xl font-bold">{estimatedStars}.0</p>
            <p className="text-yellow-100 text-xs mt-2">Based on current performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-10 h-10 text-blue-200" />
              <Badge className="bg-white text-blue-600">{overallQualityScore}/100</Badge>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Overall Quality Score</p>
            <p className="text-4xl font-bold">{overallQualityScore}%</p>
            <p className="text-blue-100 text-xs mt-2">
              {overallQualityScore >= 90 ? 'Excellent' : overallQualityScore >= 80 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-10 h-10 text-green-200" />
              <TrendingUp className="w-6 h-6 text-green-200" />
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Active Patients</p>
            <p className="text-4xl font-bold">{activePatients}</p>
            <p className="text-green-100 text-xs mt-2">{completedVisits} completed visits</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Sparkles className="w-10 h-10 text-purple-200" />
              <Badge className="bg-white text-purple-600">{aiUsageCount}</Badge>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">AI Quality Enhancements</p>
            <p className="text-4xl font-bold">{aiUsageCount}</p>
            <p className="text-purple-100 text-xs mt-2">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Quality Indicators */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            Patient Safety & Outcome Indicators (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`p-4 rounded-lg border-2 ${
              recentHospitalizations === 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Heart className={`w-6 h-6 ${recentHospitalizations === 0 ? 'text-green-600' : 'text-red-600'}`} />
                <Badge className={recentHospitalizations === 0 ? 'bg-green-500' : 'bg-red-500'}>
                  {recentHospitalizations}
                </Badge>
              </div>
              <p className="font-semibold text-gray-900">Hospitalizations</p>
              <p className="text-sm text-gray-600 mt-1">
                Rate: {hospitalizationRate.toFixed(1)}% of active patients
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: &lt;10%</p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              recentFalls === 0 ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className={`w-6 h-6 ${recentFalls === 0 ? 'text-green-600' : 'text-orange-600'}`} />
                <Badge className={recentFalls === 0 ? 'bg-green-500' : 'bg-orange-500'}>
                  {recentFalls}
                </Badge>
              </div>
              <p className="font-semibold text-gray-900">Patient Falls</p>
              <p className="text-sm text-gray-600 mt-1">
                Rate: {fallRate.toFixed(1)} per 1000 visits
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: &lt;10 per 1000</p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              recentEDVisits === 0 ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Home className={`w-6 h-6 ${recentEDVisits === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                <Badge className={recentEDVisits === 0 ? 'bg-green-500' : 'bg-yellow-500'}>
                  {recentEDVisits}
                </Badge>
              </div>
              <p className="font-semibold text-gray-900">ED Visits</p>
              <p className="text-sm text-gray-600 mt-1">
                Emergency department visits
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: Minimize</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access to Quality Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Quality Enhancement Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to={createPageUrl("ComplianceCenter")}>
              <Button variant="outline" className="w-full h-auto py-4 justify-start">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Medicare Compliance Center</p>
                    <p className="text-xs text-gray-500">Track critical deadlines & requirements</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl("SurveyPreparation")}>
              <Button variant="outline" className="w-full h-auto py-4 justify-start">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-purple-600 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Survey Preparation</p>
                    <p className="text-xs text-gray-500">Mock surveys & deficiency analysis</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl("AutomaticCarePlans")}>
              <Button variant="outline" className="w-full h-auto py-4 justify-start">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-green-600 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">AI Care Plan Generator</p>
                    <p className="text-xs text-gray-500">Automated evidence-based care plans</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl("AnalyticsDashboard")}>
              <Button variant="outline" className="w-full h-auto py-4 justify-start">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-indigo-600 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Analytics Dashboard</p>
                    <p className="text-xs text-gray-500">Advanced performance insights</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl("ProductivityDashboard")}>
              <Button variant="outline" className="w-full h-auto py-4 justify-start">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-600 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Productivity Metrics</p>
                    <p className="text-xs text-gray-500">Track efficiency & time savings</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Button variant="outline" className="w-full h-auto py-4 justify-start" disabled>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-gray-400 mt-1" />
                <div className="text-left">
                  <p className="font-semibold text-gray-500">OASIS Optimization</p>
                  <p className="text-xs text-gray-400">Coming soon</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="star-ratings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="star-ratings">
            <Star className="w-4 h-4 mr-2" />
            Star Ratings Simulator
          </TabsTrigger>
          <TabsTrigger value="quality-metrics">
            <Award className="w-4 h-4 mr-2" />
            Quality Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="star-ratings">
          <StarRatingsSimulator />
        </TabsContent>

        <TabsContent value="quality-metrics">
          <QualityMetricsDashboard />
        </TabsContent>
      </Tabs>

      {/* Educational Alert */}
      <Alert className="bg-blue-50 border-blue-200 mt-8">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="font-semibold mb-2">💡 Penn Sync Quality Advantage</p>
          <p className="text-sm">
            Penn Sync's AI-powered features are designed to help your agency achieve and maintain 5-star quality ratings by:
          </p>
          <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
            <li>Ensuring complete, compliant documentation every visit</li>
            <li>Proactively identifying patients at risk of adverse outcomes</li>
            <li>Automating quality measure tracking and reporting</li>
            <li>Providing real-time clinical decision support</li>
            <li>Reducing administrative burden so nurses can focus on patient care</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}