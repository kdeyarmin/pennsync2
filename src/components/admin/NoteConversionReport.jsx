import React, { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  FileText,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  Calendar
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function NoteConversionReport() {
  const [timeRange, setTimeRange] = useState("7");

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['noteConversions'],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 500),
  });

  // Filter by time range - no filtering, show ALL conversions
  const filteredConversions = conversions;

  // Calculate stats
  const totalConversions = filteredConversions.length;
  const avgQualityScore = filteredConversions.length > 0
    ? Math.round(filteredConversions.reduce((sum, c) => sum + (c.quality_score || 0), 0) / filteredConversions.length)
    : 0;
  const avgConversionTime = filteredConversions.length > 0
    ? Math.round(filteredConversions.reduce((sum, c) => sum + (c.conversion_time_ms || 0), 0) / filteredConversions.length / 60000)
    : 0;
  const uniqueNurses = new Set(filteredConversions.map(c => c.nurse_email)).size;

  // Group by date for trend chart
  const dailyData = {};
  filteredConversions.forEach(c => {
    const date = format(new Date(c.created_date), 'MM/dd');
    if (!dailyData[date]) {
      dailyData[date] = { date, count: 0, totalQuality: 0 };
    }
    dailyData[date].count++;
    dailyData[date].totalQuality += c.quality_score || 0;
  });
  const trendData = Object.values(dailyData).map(d => ({
    ...d,
    avgQuality: d.count > 0 ? Math.round(d.totalQuality / d.count) : 0
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Group by nurse
  const nurseData = {};
  filteredConversions.forEach(c => {
    const nurse = c.nurse_email || 'Unknown';
    if (!nurseData[nurse]) {
      nurseData[nurse] = { nurse, count: 0, totalQuality: 0 };
    }
    nurseData[nurse].count++;
    nurseData[nurse].totalQuality += c.quality_score || 0;
  });
  const nurseStats = Object.values(nurseData)
    .map(d => ({
      ...d,
      avgQuality: d.count > 0 ? Math.round(d.totalQuality / d.count) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group by visit type
  const visitTypeData = {};
  filteredConversions.forEach(c => {
    const type = c.visit_type || 'Unknown';
    if (!visitTypeData[type]) {
      visitTypeData[type] = { name: type.replace(/_/g, ' '), value: 0 };
    }
    visitTypeData[type].value++;
  });
  const visitTypePieData = Object.values(visitTypeData);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading conversion data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Note Enhancement Statistics</h2>
          <p className="text-sm text-gray-600">Track rough notes enhanced to clinical documentation</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConversions}</p>
                <p className="text-xs text-gray-500">Total Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgQualityScore}%</p>
                <p className="text-xs text-gray-500">Avg Quality Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgConversionTime} min</p>
                <p className="text-xs text-gray-500">Avg Conversion Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueNurses}</p>
                <p className="text-xs text-gray-500">Active Nurses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Daily Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Visit Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              By Visit Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visitTypePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {visitTypePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurse Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nurse</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Avg Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nurseStats.map((nurse) => (
                <TableRow key={nurse.nurse}>
                  <TableCell className="font-medium">{nurse.nurse}</TableCell>
                  <TableCell className="text-right">{nurse.count}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={nurse.avgQuality >= 80 ? 'bg-green-100 text-green-800' : nurse.avgQuality >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      {nurse.avgQuality}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {nurseStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}