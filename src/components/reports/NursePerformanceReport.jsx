import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Award, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportToPDF } from "../utils/pdfExporter";
import { format } from "date-fns";

export default function NursePerformanceReport({ dateRange }) {
  const { data: noteConversions = [] } = useQuery({
    queryKey: ['allNoteConversions', dateRange.start, dateRange.end],
    queryFn: () => base44.entities.NoteConversion.list(),
    initialData: [],
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['allComplianceAudits', dateRange.start, dateRange.end],
    queryFn: () => base44.entities.ComplianceAudit.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const nurses = users.filter(u => u.role !== 'admin');

  const filteredVisits = noteConversions.filter(nc => {
    const date = new Date(nc.created_date);
    return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
  });

  const filteredAudits = complianceAudits.filter(a => {
    const date = new Date(a.audit_date);
    return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
  });

  // Calculate performance metrics per nurse (visits = enhancements)
  const nurseMetrics = nurses.map(nurse => {
    const nurseVisits = filteredVisits.filter(nc => nc.nurse_email === nurse.email);
    const nurseAudits = filteredAudits.filter(a => a.nurse_email === nurse.email);
    
    const completedVisits = nurseVisits.length; // All enhancements are completed visits
    const avgComplianceScore = nurseAudits.length > 0
      ? (nurseAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / nurseAudits.length)
      : 0;
    
    const passedAudits = nurseAudits.filter(a => a.status === 'passed').length;
    const auditPassRate = nurseAudits.length > 0 ? (passedAudits / nurseAudits.length) * 100 : 0;

    return {
      name: nurse.full_name || nurse.email,
      email: nurse.email,
      completedVisits,
      avgComplianceScore: avgComplianceScore.toFixed(1),
      auditPassRate: auditPassRate.toFixed(1),
      totalAudits: nurseAudits.length
    };
  }).sort((a, b) => b.completedVisits - a.completedVisits);

  const handleExport = () => {
    exportToPDF({
      filename: `nurse-performance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      title: 'Nurse Performance Report',
      subtitle: `Period: ${format(new Date(dateRange.start), 'MMM d, yyyy')} - ${format(new Date(dateRange.end), 'MMM d, yyyy')}`,
      content: [
        { type: 'heading', text: 'Performance Metrics' },
        { type: 'table', data: nurseMetrics, columns: [
          { header: 'Nurse', key: 'name' },
          { header: 'Visits', key: 'completedVisits' },
          { header: 'Compliance', key: 'avgComplianceScore' },
          { header: 'Pass Rate', key: 'auditPassRate' }
        ]}
      ]
    });
  };

  const topPerformer = nurseMetrics[0];
  const totalVisits = nurseMetrics.reduce((sum, n) => sum + n.completedVisits, 0);
  const totalTimeSavedMinutes = totalVisits * 20;
  const totalTimeSavedHours = Math.floor(totalTimeSavedMinutes / 60);
  const remainingMinutes = totalTimeSavedMinutes % 60;
  const timeSavedDisplay = totalTimeSavedHours > 0 
    ? `${totalTimeSavedHours}h ${remainingMinutes}m` 
    : `${totalTimeSavedMinutes}m`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Nurse Performance Analysis</h3>
          <p className="text-sm text-gray-600">
            {format(new Date(dateRange.start), 'MMM d, yyyy')} - {format(new Date(dateRange.end), 'MMM d, yyyy')}
          </p>
        </div>
        <Button onClick={handleExport} className="bg-orange-600 hover:bg-orange-700">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-gray-900">{topPerformer?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{topPerformer?.completedVisits} visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Visits</p>
            <p className="text-3xl font-bold text-gray-900">{totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Time Saved</p>
            <p className="text-3xl font-bold text-gray-900">{timeSavedDisplay}</p>
            <p className="text-xs text-gray-500 mt-1">{totalVisits} visits × 20 min</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Visits Completed by Nurse</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={nurseMetrics.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completedVisits" fill="#f97316" name="Completed Visits" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nurse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Visits</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pass Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nurseMetrics.map((nurse, index) => (
                  <tr key={nurse.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {index === 0 && <Award className="w-4 h-4 text-yellow-500 inline mr-1" />}
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{nurse.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{nurse.completedVisits}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{nurse.avgComplianceScore}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{nurse.auditPassRate}%</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={
                        parseFloat(nurse.avgComplianceScore) >= 90 ? 'bg-green-100 text-green-800' :
                        parseFloat(nurse.avgComplianceScore) >= 80 ? 'bg-blue-100 text-blue-800' :
                        parseFloat(nurse.avgComplianceScore) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {parseFloat(nurse.avgComplianceScore) >= 90 ? 'Excellent' :
                         parseFloat(nurse.avgComplianceScore) >= 80 ? 'Good' :
                         parseFloat(nurse.avgComplianceScore) >= 70 ? 'Fair' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}