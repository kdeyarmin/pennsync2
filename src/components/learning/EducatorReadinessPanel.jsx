import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ShieldCheck, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const isCompleted = (a) => a.status === 'completed' || a.pass_fail_result === 'passed';
const readinessColor = (pct) =>
  pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
const barColor = (pct) =>
  pct >= 90 ? '[&>div]:bg-emerald-500' : pct >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500';

const BUSINESS_LINES = [
  { key: 'home_health', label: 'Home Health' },
  { key: 'hospice', label: 'Hospice' },
];

/**
 * Org-wide required-training readiness for educators and admins. Joins all
 * training assignments to their courses to determine which are required, then
 * rolls up completion by business line and by role.
 */
export default function EducatorReadinessPanel() {
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['educator-all-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list('-created_date', 2000),
    initialData: [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ['educator-all-courses'],
    queryFn: () => base44.entities.TrainingCourse.list('-updated_date', 500),
    initialData: [],
  });

  const courseById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses]
  );

  const requiredAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.required === true ||
          ['annual_mandatory', 'in_service'].includes(courseById[a.course_id]?.training_type)
      ),
    [assignments, courseById]
  );

  const overall = useMemo(() => {
    const total = requiredAssignments.length;
    const done = requiredAssignments.filter(isCompleted).length;
    const overdue = requiredAssignments.filter((a) => a.status === 'overdue').length;
    return {
      total,
      done,
      overdue,
      pct: total ? Math.round((done / total) * 100) : 100,
      staff: new Set(requiredAssignments.map((a) => a.assigned_to_user_id)).size,
    };
  }, [requiredAssignments]);

  const byBusinessLine = useMemo(() => {
    return BUSINESS_LINES.map(({ key, label }) => {
      const subset = requiredAssignments.filter((a) => a.assigned_to_business_line === key);
      const done = subset.filter(isCompleted).length;
      return {
        key,
        label,
        total: subset.length,
        done,
        overdue: subset.filter((a) => a.status === 'overdue').length,
        pct: subset.length ? Math.round((done / subset.length) * 100) : 100,
      };
    }).filter((row) => row.total > 0);
  }, [requiredAssignments]);

  const rolesNeedingAttention = useMemo(() => {
    const map = {};
    requiredAssignments.forEach((a) => {
      const role = a.assigned_to_role || 'Unspecified role';
      if (!map[role]) map[role] = { role, total: 0, done: 0, overdue: 0 };
      map[role].total += 1;
      if (isCompleted(a)) map[role].done += 1;
      if (a.status === 'overdue') map[role].overdue += 1;
    });
    return Object.values(map)
      .map((r) => ({ ...r, pct: r.total ? Math.round((r.done / r.total) * 100) : 100 }))
      .filter((r) => r.total >= 1)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
  }, [requiredAssignments]);

  if (loadingAssignments) {
    return (
      <Card className="border-indigo-200">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
          <BarChart3 className="w-5 h-5" />
          Team Required-Training Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Headline metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" /> Overall readiness
            </div>
            <p className={`text-2xl font-bold mt-1 ${readinessColor(overall.pct)}`}>{overall.pct}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Required completed</p>
            <p className="text-2xl font-bold mt-1 text-slate-800">{overall.done}/{overall.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue
            </div>
            <p className={`text-2xl font-bold mt-1 ${overall.overdue ? 'text-red-600' : 'text-slate-800'}`}>{overall.overdue}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" /> Staff tracked
            </div>
            <p className="text-2xl font-bold mt-1 text-slate-800">{overall.staff}</p>
          </div>
        </div>

        {/* By business line */}
        {byBusinessLine.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">By business line</p>
            <div className="space-y-2">
              {byBusinessLine.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-slate-600 flex-shrink-0">{row.label}</span>
                  <Progress value={row.pct} className={`h-2.5 flex-1 ${barColor(row.pct)}`} />
                  <span className={`text-sm font-semibold w-24 text-right flex-shrink-0 ${readinessColor(row.pct)}`}>
                    {row.done}/{row.total} ({row.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roles needing attention */}
        {rolesNeedingAttention.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Roles to watch (lowest readiness)</p>
            <div className="space-y-2">
              {rolesNeedingAttention.map((row) => (
                <div key={row.role} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate capitalize">{row.role}</p>
                    <p className="text-xs text-slate-500">{row.done}/{row.total} required complete</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {row.overdue > 0 && (
                      <Badge className="bg-red-100 text-red-700">{row.overdue} overdue</Badge>
                    )}
                    <span className={`text-sm font-bold ${readinessColor(row.pct)}`}>{row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requiredAssignments.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No required training assignments yet. Assign annual in-services to see readiness here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
