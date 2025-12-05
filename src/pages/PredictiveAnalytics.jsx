import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  Users,
  Filter
} from "lucide-react";

import PatientRiskScorecard from "../components/predictive/PatientRiskScorecard";
import RehospitalizationPredictor from "../components/predictive/RehospitalizationPredictor";
import TherapyNeedForecaster from "../components/predictive/TherapyNeedForecaster";
import PopulationRiskOverview from "../components/predictive/PopulationRiskOverview";
import PredictiveInsightsPanel from "../components/predictive/PredictiveInsightsPanel";

export default function PredictiveAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['predictivePatients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
  });

  // Fetch OASIS data
  const { data: oasisData = [] } = useQuery({
    queryKey: ['predictiveOASIS'],
    queryFn: () => base44.entities.OASISUpload.list('-created_date', 200),
  });

  // Fetch visits
  const { data: visits = [] } = useQuery({
    queryKey: ['predictiveVisits'],
    queryFn: () => base44.entities.Visit.list('-created_date', 500),
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['predictiveAlerts'],
    queryFn: () => base44.entities.PatientAlert.filter({ status: 'active' }),
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            Predictive Analytics
          </h1>
          <p className="text-sm text-gray-600">AI-powered patient outcome forecasting and risk assessment</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger className="w-48">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select Patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Patients</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="gap-1">
            <Activity className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="rehospitalization" className="gap-1">
            <AlertTriangle className="w-4 h-4" /> Rehospitalization
          </TabsTrigger>
          <TabsTrigger value="therapy" className="gap-1">
            <TrendingUp className="w-4 h-4" /> Therapy Need
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1">
            <Brain className="w-4 h-4" /> AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <PopulationRiskOverview 
            patients={patients}
            oasisData={oasisData}
            visits={visits}
            alerts={alerts}
            riskFilter={riskFilter}
          />
          {selectedPatientId && (
            <PatientRiskScorecard
              patient={selectedPatient}
              oasisData={oasisData.filter(o => o.patient_id === selectedPatientId)}
              visits={visits.filter(v => v.patient_id === selectedPatientId)}
            />
          )}
        </TabsContent>

        {/* Rehospitalization Tab */}
        <TabsContent value="rehospitalization">
          <RehospitalizationPredictor
            patients={patients}
            oasisData={oasisData}
            visits={visits}
            selectedPatientId={selectedPatientId}
            riskFilter={riskFilter}
          />
        </TabsContent>

        {/* Therapy Need Tab */}
        <TabsContent value="therapy">
          <TherapyNeedForecaster
            patients={patients}
            oasisData={oasisData}
            visits={visits}
            selectedPatientId={selectedPatientId}
          />
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights">
          <PredictiveInsightsPanel
            patients={patients}
            oasisData={oasisData}
            visits={visits}
            alerts={alerts}
            selectedPatientId={selectedPatientId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}