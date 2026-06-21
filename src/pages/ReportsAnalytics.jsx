import { lazy, Suspense, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import AccessDeniedState from "@/components/ui/AccessDeniedState";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Activity, Brain, RefreshCw, Building2, Loader2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import PageContainer from "@/components/ui/PageContainer";
import EmbeddedPage from "@/components/ui/embeddedPage";
import ReferralVolumeReport from "@/components/reports/ReferralVolumeReport";
import PatientOutcomesReport from "@/components/reports/PatientOutcomesReport";
import NursePerformanceReport from "@/components/reports/NursePerformanceReport";
import OASISComplianceReport from "@/components/reports/OASISComplianceReport";
import PDGMReimbursementReport from "@/components/reports/PDGMReimbursementReport";
import KPIDashboard from "@/components/reports/KPIDashboard";

const AdminReportsCenter = lazy(() => import("@/components/hub-tabs/AdminReportsCenter"));

// Tab keys, kept in sync with the TabsTrigger values below. Used to validate the
// ?tab= deep-link so the retired Reports Center page redirects to the right tab.
const TAB_KEYS = ["kpi", "referrals", "outcomes", "performance", "oasis", "pdgm", "population", "reports-center"];

const tabLoader = (
  <div className="flex justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
  </div>
);

export default function ReportsAnalytics() {
  const [dateRange, _setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [populationData, setPopulationData] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 500),
    initialData: [],
  });

  const isAdmin = currentUser?.role === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TAB_KEYS.includes(requestedTab) ? requestedTab : "kpi";
  // Reflect the active tab in the URL so tabs are shareable/bookmarkable and the
  // retired Reports Center page deep-links correctly. "kpi" is the default, so it
  // stays a clean /ReportsAnalytics with no query string.
  const handleTabChange = (value) => {
    setSearchParams(value === "kpi" ? {} : { tab: value });
  };

  // Converge on the canonical URL: strip a redundant or unknown ?tab= so the
  // default tab is plain /ReportsAnalytics. Only fires when the param resolved to
  // the default tab, so a valid deep-link like ?tab=reports-center is untouched.
  useEffect(() => {
    if (requestedTab !== null && activeTab === "kpi") {
      setSearchParams({}, { replace: true });
    }
  }, [requestedTab, activeTab, setSearchParams]);

  const runPopulationAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await invokeLLM({
        prompt: `Analyze population health data: ${patients.length} patients, ${visits.length} visits, ${incidents.length} incidents.
Identify infection clusters, readmission patterns, clinical deterioration trends, and predictive risk factors.
Return JSON with: executive_summary, infection_clusters, readmission_patterns, quality_indicators, urgent_actions.`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "object" },
            infection_clusters: { type: "array", items: { type: "object" } },
            readmission_patterns: { type: "object" },
            quality_indicators: { type: "object" },
            urgent_actions: { type: "array", items: { type: "object" } }
          }
        }
      });
      setPopulationData(result);
    } catch (error) {
      console.error(error);
    }
    setAnalyzing(false);
  };

  if (!isAdmin) {
    return <AccessDeniedState description="Reports & Analytics are available to administrators only." />;
  }

  return (
    <PageContainer>
      <PageHeader
        icon={BarChart3}
        eyebrow="Analytics"
        title="Reports & Analytics"
        description="KPIs, outcomes, performance metrics, and AI-powered population health insights"
        favoritePage="ReportsAnalytics"
      />

      <EmbeddedPage>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="kpi" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <BarChart3 className="w-4 h-4 mr-2" />
              KPI Dashboard
            </TabsTrigger>
            <TabsTrigger value="referrals" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              Referral Volume
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <TrendingUp className="w-4 h-4 mr-2" />
              Patient Outcomes
            </TabsTrigger>
            <TabsTrigger value="performance" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              Nurse Performance
            </TabsTrigger>
            <TabsTrigger value="oasis" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              OASIS
            </TabsTrigger>
            <TabsTrigger value="pdgm" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              PDGM
            </TabsTrigger>
            <TabsTrigger value="population" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Brain className="w-4 h-4 mr-2" />
              Population Health
            </TabsTrigger>
            <TabsTrigger value="reports-center" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Building2 className="w-4 h-4 mr-2" />
              Reports Center
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kpi">
          <KPIDashboard dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralVolumeReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="outcomes">
          <PatientOutcomesReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="performance">
          <NursePerformanceReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="oasis">
          <OASISComplianceReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="pdgm">
          <PDGMReimbursementReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="population">
          {!populationData && !analyzing && (
            <EmptyState
              icon={Activity}
              title="Population Health Intelligence"
              description="AI-powered analytics to identify infection clusters, readmission patterns, and emerging clinical trends across your entire patient population."
              action={
                <Button onClick={runPopulationAnalysis} size="lg">
                  <Brain className="w-5 h-5 mr-2" />
                  Run Population Analysis
                </Button>
              }
            />
          )}

          {analyzing && (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Analyzing Population Data...</h3>
                <p className="text-slate-600">
                  Processing {patients.length} patients, {visits.length} visits, {incidents.length} incidents
                </p>
              </CardContent>
            </Card>
          )}

          {populationData && (
            <div className="space-y-6">
              <Card className="modern-card border-l-4 border-l-blue-600 bg-white shadow-md">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Overall Risk</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {populationData.executive_summary?.overall_risk_level?.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Key Findings</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {populationData.executive_summary?.key_findings_count}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Urgent Actions</p>
                      <p className="text-2xl font-bold text-red-600">
                        {populationData.executive_summary?.urgent_actions_needed}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Trend</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {populationData.executive_summary?.trend_direction}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {populationData.urgent_actions?.length > 0 && (
                <Card className="modern-card border-l-4 border-l-red-500 bg-white shadow-md">
                  <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
                    <CardTitle className="text-red-900">Urgent Actions Required</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {populationData.urgent_actions.map((action, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border-l-4 border-l-red-500">
                          <p className="font-semibold text-slate-900">{action.action_needed}</p>
                          <p className="text-sm text-slate-600">Area: {action.affected_area}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports-center">
          <Suspense fallback={tabLoader}>
            <AdminReportsCenter />
          </Suspense>
        </TabsContent>
      </Tabs>
      </EmbeddedPage>
    </PageContainer>
  );
}