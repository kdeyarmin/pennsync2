import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, Filter, Download, Calendar, DollarSign, Users, Activity, Loader2 } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function PDGMTrendDashboard() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('all');
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [driverAnalysis, setDriverAnalysis] = useState(null);
  const [isAnalyzingDrivers, setIsAnalyzingDrivers] = useState(false);

  // Fetch all OASIS uploads with PDGM data
  const { data: oasisUploads = [], isLoading } = useQuery({
    queryKey: ['oasisUploads'],
    queryFn: () => base44.entities.OASISUpload.list('-created_date', 500),
  });

  // Process and filter data
  const { filteredData, stats, chartData } = useMemo(() => {
    let filtered = oasisUploads.filter(upload => 
      upload.pdgm_data && 
      upload.analysis_results &&
      upload.status === 'analyzed'
    );

    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(u => 
        new Date(u.created_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(u => 
        new Date(u.created_date) <= new Date(dateRange.end)
      );
    }

    // Apply clinical group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(u => 
        u.pdgm_data.clinical_group === selectedGroup
      );
    }

    // Apply diagnosis filter
    if (selectedDiagnosis !== 'all') {
      filtered = filtered.filter(u => 
        u.pdgm_data.primary_diagnosis?.toLowerCase().includes(selectedDiagnosis.toLowerCase())
      );
    }

    // Calculate statistics
    const totalAssessments = filtered.length;
    const avgPayment = filtered.reduce((sum, u) => 
      sum + (parseFloat(u.pdgm_data.estimated_payment) || 0), 0
    ) / (totalAssessments || 1);
    
    const avgCaseMix = filtered.reduce((sum, u) => 
      sum + (parseFloat(u.pdgm_data.case_mix_weight) || 0), 0
    ) / (totalAssessments || 1);

    const totalRevenue = filtered.reduce((sum, u) => 
      sum + (parseFloat(u.pdgm_data.estimated_payment) || 0), 0
    );

    // Payment trend over time
    const paymentTrend = {};
    filtered.forEach(u => {
      const month = new Date(u.created_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!paymentTrend[month]) {
        paymentTrend[month] = { month, total: 0, count: 0, avgPayment: 0, avgCaseMix: 0 };
      }
      paymentTrend[month].total += parseFloat(u.pdgm_data.estimated_payment) || 0;
      paymentTrend[month].count += 1;
      paymentTrend[month].avgCaseMix += parseFloat(u.pdgm_data.case_mix_weight) || 0;
    });

    const paymentTrendData = Object.values(paymentTrend)
      .map(d => ({
        ...d,
        avgPayment: Math.round(d.total / d.count),
        avgCaseMix: (d.avgCaseMix / d.count).toFixed(4)
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-12); // Last 12 months

    // Clinical group distribution
    const groupDist = {};
    filtered.forEach(u => {
      const group = u.pdgm_data.clinical_group || 'Unknown';
      groupDist[group] = (groupDist[group] || 0) + 1;
    });
    const groupDistData = Object.entries(groupDist).map(([name, value]) => ({ name, value }));

    // Functional level distribution
    const funcDist = {};
    filtered.forEach(u => {
      const level = u.pdgm_data.functional_level || 'Unknown';
      funcDist[level] = (funcDist[level] || 0) + 1;
    });
    const funcDistData = Object.entries(funcDist).map(([name, value]) => ({ name, value }));

    // Top diagnoses
    const diagDist = {};
    filtered.forEach(u => {
      const diag = u.pdgm_data.primary_diagnosis || 'Unknown';
      diagDist[diag] = (diagDist[diag] || 0) + 1;
    });
    const topDiagnoses = Object.entries(diagDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Case mix trend
    const caseMixTrend = paymentTrendData.map(d => ({
      month: d.month,
      caseMix: parseFloat(d.avgCaseMix)
    }));

    // Compliance rates over time
    const complianceTrend = {};
    filtered.forEach(u => {
      const month = new Date(u.created_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!complianceTrend[month]) {
        complianceTrend[month] = { month, totalScore: 0, count: 0, avgCompliance: 0 };
      }
      const compScore = u.analysis_results?.compliance_score || u.scores?.compliance || 0;
      complianceTrend[month].totalScore += compScore;
      complianceTrend[month].count += 1;
    });

    const complianceTrendData = Object.values(complianceTrend)
      .map(d => ({
        month: d.month,
        avgCompliance: Math.round(d.totalScore / d.count),
        count: d.count
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-12);

    return {
      filteredData: filtered,
      stats: {
        totalAssessments,
        avgPayment: Math.round(avgPayment),
        avgCaseMix: avgCaseMix.toFixed(4),
        totalRevenue: Math.round(totalRevenue)
      },
      chartData: {
        paymentTrend: paymentTrendData,
        groupDist: groupDistData,
        funcDist: funcDistData,
        topDiagnoses,
        caseMixTrend,
        complianceTrend: complianceTrendData
      }
    };
  }, [oasisUploads, dateRange, selectedGroup, selectedDiagnosis]);

  // Get unique clinical groups and diagnoses for filters
  const clinicalGroups = useMemo(() => {
    const groups = new Set();
    oasisUploads.forEach(u => {
      if (u.pdgm_data?.clinical_group) {
        groups.add(u.pdgm_data.clinical_group);
      }
    });
    return Array.from(groups).sort();
  }, [oasisUploads]);

  const diagnoses = useMemo(() => {
    const diags = new Set();
    oasisUploads.forEach(u => {
      if (u.pdgm_data?.primary_diagnosis) {
        diags.add(u.pdgm_data.primary_diagnosis);
      }
    });
    return Array.from(diags).sort();
  }, [oasisUploads]);

  const generatePredictions = async () => {
    if (chartData.paymentTrend.length < 3) return;

    setIsPredicting(true);
    try {
      const last3 = chartData.paymentTrend.slice(-3);
      const avg = Math.round(last3.reduce((s, d) => s + d.avgPayment, 0) / 3);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Last 3 months avg payment: $${avg}. Predict next 3 months.`,
        response_json_schema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  predicted_payment: { type: "number" },
                  predicted_count: { type: "number" },
                  confidence: { type: "string" }
                }
              }
            },
            trend_direction: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } }
          }
        }
      });
      setPredictions(result);
    } catch (error) {
      console.error("Prediction error:", error);
      setPredictions({ error: "Failed to generate predictions. Please try again." });
    }
    setIsPredicting(false);
  };

  const analyzeDrivers = async () => {
    if (filteredData.length < 5) return;

    setIsAnalyzingDrivers(true);
    try {
      const topGroup = chartData.groupDist[0]?.name || 'N/A';
      const topFunc = chartData.funcDist[0]?.name || 'N/A';
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Top PDGM drivers for $${stats.avgPayment} avg. Top group: ${topGroup}. Top func: ${topFunc}. List 3 key drivers.`,
        response_json_schema: {
          type: "object",
          properties: {
            key_drivers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  driver: { type: "string" },
                  impact: { type: "string" },
                  correlation: { type: "string" },
                  average_effect: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });
      setDriverAnalysis(result);
    } catch (error) {
      console.error("Driver analysis error:", error);
      setDriverAnalysis({ error: "Failed to analyze drivers. Please try again." });
    }
    setIsAnalyzingDrivers(false);
  };

  const exportData = () => {
    const csv = [
      ['Month', 'Assessments', 'Avg Payment', 'Avg Case Mix', 'Total Revenue', 'Compliance Rate'].join(','),
      ...chartData.paymentTrend.map((d, idx) => {
        const compliance = chartData.complianceTrend[idx]?.avgCompliance || 0;
        return [d.month, d.count, d.avgPayment, d.avgCaseMix, d.total, compliance].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PDGM_Trends_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Loading trend data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              PDGM Trend Analysis
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generatePredictions}
                disabled={isPredicting || chartData.paymentTrend.length < 3}
              >
                {isPredicting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Predict
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={analyzeDrivers}
                disabled={isAnalyzingDrivers || filteredData.length < 5}
              >
                {isAnalyzingDrivers ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                Analyze Drivers
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {filtersVisible && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Clinical Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {clinicalGroups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Diagnosis</Label>
                <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Diagnoses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Diagnoses</SelectItem>
                    {diagnoses.slice(0, 20).map(diag => (
                      <SelectItem key={diag} value={diag}>{diag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Payment</p>
                <p className="text-2xl font-bold text-green-600">${stats.avgPayment.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Case Mix</p>
                <p className="text-2xl font-bold text-purple-600">{stats.avgCaseMix}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-indigo-600">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Predictions */}
      {predictions && (
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              AI Payment Predictions - Next 3 Months
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.error ? (
              <p className="text-sm text-red-600">{predictions.error}</p>
            ) : (
              <>
                <Badge className="bg-purple-600 text-white mb-2">
                  Trend: {predictions.trend_direction}
                </Badge>
                <div className="grid grid-cols-3 gap-3">
                  {predictions.predictions?.map((pred, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-gray-500">{pred.month}</p>
                      <p className="text-xl font-bold text-purple-700">${Math.round(pred.predicted_payment).toLocaleString()}</p>
                      <p className="text-xs text-gray-600">~{pred.predicted_count} cases</p>
                      <Badge variant="outline" className="text-xs mt-1">{pred.confidence}</Badge>
                    </div>
                  ))}
                </div>
                {predictions.key_insights?.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-semibold text-purple-900 mb-2">Key Insights:</p>
                    <ul className="space-y-1">
                      {predictions.key_insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-purple-800">• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Trend with Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Trend & Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...chartData.paymentTrend, ...(predictions?.predictions?.map(p => ({
              month: p.month,
              avgPayment: p.predicted_payment,
              count: p.predicted_count,
              isPrediction: true
            })) || [])]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name, props) => {
                if (name === "avgPayment") return `$${value.toLocaleString()}${props.payload.isPrediction ? ' (predicted)' : ''}`;
                return value;
              }} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgPayment" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Avg Payment"
                strokeDasharray={(entry) => entry.isPrediction ? "5 5" : "0"}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Assessments"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compliance Rate Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PDGM Compliance Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.complianceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgCompliance" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Avg Compliance Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Drivers Analysis */}
      {driverAnalysis && (
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Key Payment Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driverAnalysis.error ? (
              <p className="text-sm text-red-600">{driverAnalysis.error}</p>
            ) : (
              <div className="space-y-3">
                {driverAnalysis.key_drivers?.map((driver, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{driver.driver}</p>
                      <Badge className={
                        driver.impact === 'high' ? 'bg-red-100 text-red-800' :
                        driver.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {driver.impact} impact
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Correlation:</span>
                        <span className="ml-2 font-medium">{driver.correlation}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Avg Effect:</span>
                        <span className="ml-2 font-medium">{driver.average_effect}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded text-sm">
                      <p className="text-blue-900">{driver.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Mix Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Case Mix Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.caseMixTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="caseMix" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Case Mix Weight"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clinical Group Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clinical Group Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.groupDist}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.groupDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Functional Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Functional Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.funcDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Diagnoses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Primary Diagnoses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData.topDiagnoses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}