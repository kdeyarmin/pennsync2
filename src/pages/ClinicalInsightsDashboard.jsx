import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, TrendingUp, AlertTriangle } from "lucide-react";
import PopulationTrendAnalyzer from "../components/analytics/PopulationTrendAnalyzer";
import DiseaseProgressionPredictor from "../components/analytics/DiseaseProgressionPredictor";

export default function ClinicalInsightsDashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['myPatients'],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list();
      // For nurses, filter to their assigned patients (simplification - all active for now)
      return allPatients.filter(p => p.status === "active");
    },
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['myVisits'],
    queryFn: async () => {
      return await base44.entities.Visit.list('-visit_date', 500);
    },
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['recentIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
    initialData: [],
  });

  // Quick stats for clinician view
  const myVisitsCount = visits.filter(v => v.created_by === currentUser?.email).length;
  const myCompletedVisits = visits.filter(v => v.created_by === currentUser?.email && v.status === "completed").length;
  const completionRate = myVisitsCount > 0 ? Math.round((myCompletedVisits / myVisitsCount) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clinical Insights</h1>
            <p className="text-gray-600">Population health trends and patient monitoring</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Active Patients</p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold">{myVisitsCount}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Incidents</p>
                <p className="text-2xl font-bold">
                  {incidents.filter(i => i.created_by === currentUser?.email).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Population Trends */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Population Health Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PopulationTrendAnalyzer
              patients={patients}
              visits={visits}
              incidents={incidents}
            />
          </CardContent>
        </Card>
      </div>

      {/* Disease Progression Monitoring */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Patient Progression Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiseaseProgressionPredictor
              patients={patients}
              visits={visits}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}