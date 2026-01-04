import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  FileText,
  Shield,
  Target,
  Sparkles
} from "lucide-react";

export default function NurseTrainingNeedsAnalyzer() {
  const [selectedNurse, setSelectedNurse] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: trainingRecommendations = [] } = useQuery({
    queryKey: ['trainingRecommendations'],
    queryFn: () => base44.entities.TrainingRecommendation.list('-created_date', 1000),
    initialData: [],
  });

  const nurses = allUsers.filter(u => u.role === 'user');

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = trainingRecommendations;
    
    if (selectedNurse !== 'all') {
      filtered = filtered.filter(r => r.nurse_email === selectedNurse);
    }
    
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(r => r.severity === selectedSeverity);
    }
    
    return filtered;
  }, [trainingRecommendations, selectedNurse, selectedSeverity]);

  // Calculate nurse profiles
  const nurseProfiles = useMemo(() => {
    const profiles = {};
    
    nurses.forEach(nurse => {
      const nurseRecs = trainingRecommendations.filter(r => r.nurse_email === nurse.email);
      
      // Count by type
      const byType = {};
      nurseRecs.forEach(rec => {
        byType[rec.recommendation_type] = (byType[rec.recommendation_type] || 0) + 1;
      });
      
      // Count by severity
      const critical = nurseRecs.filter(r => r.severity === 'critical').length;
      const high = nurseRecs.filter(r => r.severity === 'high').length;
      const medium = nurseRecs.filter(r => r.severity === 'medium').length;
      const low = nurseRecs.filter(r => r.severity === 'low').length;
      
      // Count by source
      const bySource = {};
      nurseRecs.forEach(rec => {
        bySource[rec.source] = (bySource[rec.source] || 0) + 1;
      });
      
      // Unaddressed recommendations
      const unaddressed = nurseRecs.filter(r => !r.addressed).length;
      
      // Top needs (recommendation types with highest counts)
      const topNeeds = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => ({ type, count }));
      
      profiles[nurse.email] = {
        nurse,
        total: nurseRecs.length,
        unaddressed,
        critical,
        high,
        medium,
        low,
        byType,
        bySource,
        topNeeds,
        riskScore: Math.min(100, (critical * 10) + (high * 5) + (medium * 2) + low)
      };
    });
    
    return profiles;
  }, [nurses, trainingRecommendations]);

  // Sort nurses by risk score (highest first)
  const sortedNurses = Object.values(nurseProfiles).sort((a, b) => b.riskScore - a.riskScore);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-600 text-white",
      medium: "bg-yellow-600 text-white",
      low: "bg-blue-600 text-white"
    };
    return colors[severity] || "bg-gray-600 text-white";
  };

  const getTypeColor = (type) => {
    const colors = {
      documentation: "bg-blue-100 text-blue-800",
      clinical: "bg-green-100 text-green-800",
      compliance: "bg-purple-100 text-purple-800",
      safety: "bg-red-100 text-red-800",
      communication: "bg-indigo-100 text-indigo-800",
      technology: "bg-teal-100 text-teal-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getSourceLabel = (source) => {
    const labels = {
      smart_note: "Smart Note",
      compliance_check: "Compliance Check",
      compliance_checker: "Compliance Checker",
      ai_drafting_assistant: "AI Drafting",
      grammar_corrector: "Grammar Correction",
      ai_documentation_suggester: "AI Documentation",
      risk_detector: "Risk Detection",
      clinical_decision_support: "Clinical Support",
      audit: "Audit",
      care_plan: "Care Plan",
      incident: "Incident"
    };
    return labels[source] || source;
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Brain className="w-6 h-6" />
                AI-Tracked Training Needs
              </h2>
              <p className="text-purple-100">
                Automatically identifies learning opportunities from real-time corrections and recommendations
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{trainingRecommendations.length}</p>
              <p className="text-sm text-purple-100">Total Recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Critical</p>
                <p className="text-2xl font-bold">{trainingRecommendations.filter(r => r.severity === 'critical').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">High Priority</p>
                <p className="text-2xl font-bold">{trainingRecommendations.filter(r => r.severity === 'high').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Unaddressed</p>
                <p className="text-2xl font-bold">{trainingRecommendations.filter(r => !r.addressed).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Nurses Tracked</p>
                <p className="text-2xl font-bold">{Object.keys(nurseProfiles).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedNurse} onValueChange={setSelectedNurse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Nurse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nurses</SelectItem>
                  {nurses.map(nurse => (
                    <SelectItem key={nurse.email} value={nurse.email}>
                      {nurse.full_name || nurse.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nurse Training Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Nurse Training Need Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedNurses.map((profile) => (
              <Card key={profile.nurse.email} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {profile.nurse.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{profile.nurse.full_name}</p>
                        <p className="text-sm text-gray-500">{profile.nurse.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                      <p className={`text-2xl font-bold ${
                        profile.riskScore >= 50 ? 'text-red-600' :
                        profile.riskScore >= 25 ? 'text-orange-600' :
                        profile.riskScore >= 10 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {profile.riskScore}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold">{profile.total}</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="text-xs text-red-600">Critical</p>
                      <p className="text-lg font-bold text-red-600">{profile.critical}</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <p className="text-xs text-orange-600">High</p>
                      <p className="text-lg font-bold text-orange-600">{profile.high}</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <p className="text-xs text-yellow-600">Medium</p>
                      <p className="text-lg font-bold text-yellow-600">{profile.medium}</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600">Unaddressed</p>
                      <p className="text-lg font-bold text-blue-600">{profile.unaddressed}</p>
                    </div>
                  </div>

                  {profile.topNeeds.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Top Training Needs:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.topNeeds.map((need, idx) => (
                          <Badge key={idx} className={getTypeColor(need.type)}>
                            {need.type}: {need.count} recommendations
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Recommendation Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.bySource).map(([source, count]) => (
                        <Badge key={source} variant="outline" className="text-xs">
                          {getSourceLabel(source)}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sortedNurses.length === 0 && (
              <Alert>
                <AlertDescription>
                  No training recommendations tracked yet. The system will automatically track recommendations as nurses use AI features.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Detailed Recommendations ({filteredRecommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nurse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.slice(0, 50).map((rec) => {
                  const nurse = nurses.find(n => n.email === rec.nurse_email);
                  return (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">
                        {nurse?.full_name || rec.nurse_email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(rec.recommendation_type)}>
                          {rec.recommendation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(rec.severity)}>
                          {rec.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">{rec.recommendation_text}</p>
                        {rec.context_data?.element && (
                          <p className="text-xs text-gray-500 mt-1">
                            Context: {rec.context_data.element}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-600">
                          {getSourceLabel(rec.source)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rec.addressed ? (
                          <Badge className="bg-green-600">Addressed</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(rec.created_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredRecommendations.length === 0 && (
            <Alert className="mt-4">
              <AlertDescription>
                No recommendations found matching the current filters.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getTypeColor(type) {
  const colors = {
    documentation: "bg-blue-100 text-blue-800",
    clinical: "bg-green-100 text-green-800",
    compliance: "bg-purple-100 text-purple-800",
    safety: "bg-red-100 text-red-800",
    communication: "bg-indigo-100 text-indigo-800",
    technology: "bg-teal-100 text-teal-800"
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

function getSourceLabel(source) {
  const labels = {
    smart_note: "Smart Note",
    compliance_check: "Compliance Check",
    compliance_checker: "Compliance Checker",
    ai_drafting_assistant: "AI Drafting",
    grammar_corrector: "Grammar Correction",
    ai_documentation_suggester: "AI Documentation",
    risk_detector: "Risk Detection",
    clinical_decision_support: "Clinical Support",
    audit: "Audit",
    care_plan: "Care Plan",
    incident: "Incident"
  };
  return labels[source] || source;
}