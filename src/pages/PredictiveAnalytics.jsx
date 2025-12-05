import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Brain, Activity, DollarSign, Search } from "lucide-react";
import AdvancedPredictiveAnalytics from "../components/predictive/AdvancedPredictiveAnalytics";
import PredictiveRiskScoring from "../components/predictive/PredictiveRiskScoring";
import PDGMCodingGapAnalyzer from "../components/pdgm/PDGMCodingGapAnalyzer";
import PDGMCaseMixForecaster from "../components/pdgm/PDGMCaseMixForecaster";

export default function PredictiveAnalytics() {
  // Fetch all data needed for risk scoring
  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 500),
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['allCarePlans'],
    queryFn: () => base44.entities.CarePlan.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Predictive Analytics</h1>
        <p className="text-gray-600 mt-1">AI-powered risk forecasting and proactive care recommendations</p>
      </div>

      <Tabs defaultValue="risk-scoring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="risk-scoring" className="gap-2">
            <Brain className="w-4 h-4" />
            Risk Scoring
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="gap-2">
            <Activity className="w-4 h-4" />
            Forecasting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk-scoring">
          <PredictiveRiskScoring 
            patients={patients}
            visits={visits}
            carePlans={carePlans}
            incidents={incidents}
          />
        </TabsContent>

        <TabsContent value="forecasting">
          <AdvancedPredictiveAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}