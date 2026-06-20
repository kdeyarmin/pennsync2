import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function NursePerformanceMetrics({ 
  oasisData = [], 
  noteData = [], 
  auditData = [],
  users = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('overall');

  // Aggregate metrics by nurse
  const nurseMetrics = useMemo(() => {
    const metrics = {};

    // Initialize with users
    users.forEach(user => {
      if (user.role !== 'admin') {
        metrics[user.email] = {
          email: user.email,
          name: user.full_name || user.email.split('@')[0],
          oasisCount: 0,
          oasisScoreSum: 0,
          noteCount: 0,
          noteQualitySum: 0,
          auditCount: 0,
          auditScoreSum: 0,
          passedAudits: 0
        };
      }
    });

    // Aggregate OASIS data
    oasisData.forEach(item => {
      const email = item.created_by;
      if (!metrics[email]) {
        metrics[email] = {
          email,
          name: email?.split('@')[0] || 'Unknown',
          oasisCount: 0, oasisScoreSum: 0,
          noteCount: 0, noteQualitySum: 0,
          auditCount: 0, auditScoreSum: 0, passedAudits: 0
        };
      }
      metrics[email].oasisCount++;
      metrics[email].oasisScoreSum += item.scores?.overall || 0;
    });

    // Aggregate note data
    noteData.forEach(note => {
      const email = note.nurse_email;
      if (!metrics[email]) {
        metrics[email] = {
          email,
          name: email?.split('@')[0] || 'Unknown',
          oasisCount: 0, oasisScoreSum: 0,
          noteCount: 0, noteQualitySum: 0,
          auditCount: 0, auditScoreSum: 0, passedAudits: 0
        };
      }
      metrics[email].noteCount++;
      metrics[email].noteQualitySum += note.quality_score || 0;
    });

    // Aggregate audit data
    auditData.forEach(audit => {
      const email = audit.nurse_email;
      if (!metrics[email]) {
        metrics[email] = {
          email,
          name: email?.split('@')[0] || 'Unknown',
          oasisCount: 0, oasisScoreSum: 0,
          noteCount: 0, noteQualitySum: 0,
          auditCount: 0, auditScoreSum: 0, passedAudits: 0
        };
      }
      metrics[email].auditCount++;
      metrics[email].auditScoreSum += audit.compliance_score || 0;
      if (audit.status === 'passed') metrics[email].passedAudits++;
    });

    // Calculate averages
    return Object.values(metrics)
      .map(m => ({
        ...m,
        avgOASIS: m.oasisCount > 0 ? Math.round(m.oasisScoreSum / m.oasisCount) : null,
        avgNote: m.noteCount > 0 ? Math.round(m.noteQualitySum / m.noteCount) : null,
        avgAudit: m.auditCount > 0 ? Math.round(m.auditScoreSum / m.auditCount) : null,
        passRate: m.auditCount > 0 ? Math.round(m.passedAudits / m.auditCount * 100) : null,
        totalActivity: m.oasisCount + m.noteCount,
        // Average only the categories that actually have data — dividing by a
        // fixed 3 made a specialist with one strong category (e.g. 95 OASIS only)
        // score 32, ranking them below mediocre all-rounders and skewing the
        // default sort + "top performer".
        overall: (() => {
          const parts = [];
          if (m.oasisCount > 0) parts.push(m.oasisScoreSum / m.oasisCount);
          if (m.noteCount > 0) parts.push(m.noteQualitySum / m.noteCount);
          if (m.auditCount > 0) parts.push(m.auditScoreSum / m.auditCount);
          return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
        })()
      }))
      .filter(m => m.totalActivity > 0)
      .sort((a, b) => {
        if (sortBy === 'overall') return b.overall - a.overall;
        if (sortBy === 'oasis') return (b.avgOASIS || 0) - (a.avgOASIS || 0);
        if (sortBy === 'notes') return (b.avgNote || 0) - (a.avgNote || 0);
        if (sortBy === 'activity') return b.totalActivity - a.totalActivity;
        return 0;
      });
  }, [oasisData, noteData, auditData, users, sortBy]);

  // Chart data
  const chartData = nurseMetrics.slice(0, 10).map(m => ({
    name: m.name.length > 12 ? m.name.substring(0, 12) + '...' : m.name,
    OASIS: m.avgOASIS || 0,
    Notes: m.avgNote || 0,
    Compliance: m.avgAudit || 0
  }));

  const topPerformer = nurseMetrics[0];

  return (
    <Card>
      <CardHeader 
        className="pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Nurse Performance Metrics
            <Badge variant="outline">{nurseMetrics.length} nurses</Badge>
          </div>
          <div className="flex items-center gap-2">
            {topPerformer && (
              <Badge className="bg-amber-100 text-amber-800">
                <Award className="w-3 h-3 mr-1" />
                Top: {topPerformer.name}
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {nurseMetrics.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No nurse performance data available</p>
          ) : (
            <>
              {/* Sort controls */}
              <div className="flex gap-2">
                <span className="text-sm text-slate-600">Sort by:</span>
                {['overall', 'oasis', 'notes', 'activity'].map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={sortBy === s ? 'default' : 'outline'}
                    className="h-7 text-xs capitalize"
                    onClick={() => setSortBy(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              {/* Performance chart */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="OASIS" fill="#3b82f6" />
                    <Bar dataKey="Notes" fill="#22c55e" />
                    <Bar dataKey="Compliance" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-2">Nurse</th>
                      <th className="text-center p-2">OASIS Avg</th>
                      <th className="text-center p-2">Note Quality</th>
                      <th className="text-center p-2">Compliance</th>
                      <th className="text-center p-2">Pass Rate</th>
                      <th className="text-center p-2">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {nurseMetrics.slice(0, 15).map((nurse, idx) => (
                      <tr key={nurse.email} className={idx === 0 ? 'bg-amber-50' : ''}>
                        <td className="p-2 font-medium">
                          {idx === 0 && <Award className="w-4 h-4 inline mr-1 text-amber-600" />}
                          {nurse.name}
                        </td>
                        <td className="p-2 text-center">
                          {nurse.avgOASIS !== null ? (
                            <Badge className={nurse.avgOASIS >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {nurse.avgOASIS}%
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {nurse.avgNote !== null ? (
                            <Badge className={nurse.avgNote >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {nurse.avgNote}%
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {nurse.avgAudit !== null ? (
                            <Badge className={nurse.avgAudit >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {nurse.avgAudit}%
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {nurse.passRate !== null ? `${nurse.passRate}%` : '-'}
                        </td>
                        <td className="p-2 text-center text-slate-600">
                          {nurse.totalActivity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}