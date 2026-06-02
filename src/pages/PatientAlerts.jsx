import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Brain,
  Activity,
  Zap
} from "lucide-react";

import PatientAlertsDashboard from "../components/alerts/PatientAlertsDashboard";
import PatientAlertAnalyzer from "../components/alerts/PatientAlertAnalyzer";

export default function PatientAlerts() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [analysisResults, setAnalysisResults] = useState(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' })
  });

  const { data: _currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleAlertsGenerated = (alerts, results) => {
    setAnalysisResults(results);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
          <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
          <span className="truncate">Patient Alerts</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          AI-powered proactive identification of critical events and potential deteriorations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Alerts Dashboard */}
        <div className="lg:col-span-2">
          <PatientAlertsDashboard showAllPatients={true} />
        </div>

        {/* Sidebar - Analyzer & Quick Actions */}
        <div className="space-y-4 sm:space-y-6">
          {/* Patient Selector for Analysis */}
          <Card className="border-blue-200">
            <CardHeader className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                Analyze Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <Select value={selectedPatientId || "none"} onValueChange={(val) => setSelectedPatientId(val === "none" ? "" : val)}>
                <SelectTrigger className="h-11 touch-target">
                  <SelectValue placeholder="Select patient to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="py-3">Select a patient</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="py-3">
                      {p.first_name} {p.last_name} - {p.primary_diagnosis || 'No diagnosis'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPatientId && (
                <div className="mt-4">
                  <PatientAlertAnalyzer
                    patientId={selectedPatientId}
                    onAlertsGenerated={handleAlertsGenerated}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results Summary */}
          {analysisResults && (
            <Card className="border-green-200">
              <CardHeader className="py-3 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{analysisResults.analysis_summary}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Overall Risk:</span>
                  <Badge className={
                    analysisResults.overall_risk_level === 'critical' ? 'bg-red-600 text-white' :
                    analysisResults.overall_risk_level === 'high' ? 'bg-orange-500 text-white' :
                    analysisResults.overall_risk_level === 'moderate' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }>
                    {analysisResults.overall_risk_level}
                  </Badge>
                </div>

                {analysisResults.positive_indicators?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Positive Indicators:</p>
                    <ul className="text-xs text-green-600 space-y-0.5">
                      {analysisResults.positive_indicators.map((indicator, idx) => (
                        <li key={idx}>✓ {indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResults.monitoring_recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-1">Monitor:</p>
                    <ul className="text-xs text-blue-600 space-y-0.5">
                      {analysisResults.monitoring_recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-bold text-sm sm:text-base text-orange-900 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span>Alert Response Guide</span>
              </h3>
              <ul className="text-xs sm:text-sm text-orange-800 space-y-2">
                <li className="flex items-start gap-2">
                  <Badge className="bg-red-600 text-white text-xs shrink-0 min-w-[60px] justify-center">Critical</Badge>
                  <span className="flex-1">Immediate action within 1 hour</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge className="bg-orange-500 text-white text-xs shrink-0 min-w-[60px] justify-center">High</Badge>
                  <span className="flex-1">Address within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge className="bg-yellow-500 text-white text-xs shrink-0 min-w-[60px] justify-center">Medium</Badge>
                  <span className="flex-1">Address within 48-72 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge className="bg-blue-500 text-white text-xs shrink-0 min-w-[60px] justify-center">Low</Badge>
                  <span className="flex-1">Monitor at next visit</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}