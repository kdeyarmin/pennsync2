import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  BookOpen,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  FileText,
  ChevronRight,
  Target,
  Loader2,
  BookOpenCheck,
  LayoutDashboard
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import CertificateDownloadButton from '@/components/training/CertificateDownloadButton';

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';
const daysUntil = (date) => {
  if (!date) return Infinity;
  const target = new Date(date);
  const now = new Date();
  // Compare dates only, ignoring time to avoid timezone edge cases
  target.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

export default function LearningCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['lc-assignments', user?.email],
    queryFn: () => base44.entities.TrainingAssignment.filter({
      assigned_to_user_id: user.email,
    }, '-due_date', 200),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['lc-certificates', user?.email],
    queryFn: () => base44.entities.TrainingCertificate.filter({
      user_id: user.email,
      revoked: false
    }, '-issued_at', 100),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['lc-plan-enrollments', user?.email],
    queryFn: () => base44.entities.PlanEnrollment.filter({
      user_id: user.email,
    }, '-enrolled_at', 50),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['lc-published-courses'],
    queryFn: () => base44.entities.TrainingCourse.filter({
      status: 'published'
    }, '-updated_date', 200),
    initialData: []
  });

  // Derived data
  const activeAssignments = useMemo(() =>
    assignments.filter(a => ['assigned', 'in_progress', 'overdue'].includes(a.status)),
    [assignments]
  );
  const completedAssignments = useMemo(() =>
    assignments.filter(a => a.status === 'completed' || a.pass_fail_result === 'passed'),
    [assignments]
  );
  const overdueAssignments = useMemo(() =>
    assignments.filter(a => a.status === 'overdue'),
    [assignments]
  );
  const dueSoonAssignments = useMemo(() =>
    activeAssignments.filter(a => {
      const days = daysUntil(a.due_date);
      return days >= 0 && days <= 7 && a.status !== 'overdue';
    }),
    [activeAssignments]
  );
  const inProgressAssignments = useMemo(() =>
    assignments.filter(a => a.status === 'in_progress'),
    [assignments]
  );

  // Sort active assignments: overdue first, then due soonest
  const sortedActive = useMemo(() => {
    const order = { overdue: 0, in_progress: 1, assigned: 2 };
    return [...activeAssignments].sort((a, b) => {
      const orderDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.due_date || '9999') - new Date(b.due_date || '9999');
    });
  }, [activeAssignments]);

  // Filter courses for catalog
  const filteredCourses = useMemo(() => {
    let filtered = courses;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.short_description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    return filtered;
  }, [courses, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(courses.map(c => c.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [courses]);

  // Expiring certificates (within 90 days)
  const expiringCerts = useMemo(() =>
    certificates.filter(c => {
      if (!c.expiration_date) return false;
      const days = daysUntil(c.expiration_date);
      return days >= 0 && days <= 90;
    }),
    [certificates]
  );

  // Active learning plans
  const activePlans = useMemo(() =>
    enrollments.filter(e => e.status !== 'completed'),
    [enrollments]
  );

  const isEducatorOrAdmin = user?.role === 'admin' || user?.training_role === 'educator';
  const isSupervisor = user?.training_role === 'supervisor';

  // Overall completion rate
  const completionRate = assignments.length > 0
    ? Math.round((completedAssignments.length / assignments.length) * 100)
    : 0;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-blue-200 mt-1">Your professional development hub — courses, certifications, and learning plans</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={createPageUrl('MyLearning')}>
              <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                <BookOpen className="w-4 h-4 mr-1.5" />
                My Courses
              </Button>
            </Link>
            {isEducatorOrAdmin && (
              <Link to={createPageUrl('AdminTraining')}>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Training Admin
                </Button>
              </Link>
            )}
            {isSupervisor && (
              <Link to={createPageUrl('ClinicalSkillsChecklist')}>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Skills Checklists
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Active Courses', value: activeAssignments.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Overdue', value: overdueAssignments.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Due This Week', value: dueSoonAssignments.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Completed', value: completedAssignments.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Certificates', value: certificates.length, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`border ${item.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Progress Bar */}
      {assignments.length > 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">Overall Completion Rate</span>
              </div>
              <span className="text-sm font-bold text-indigo-600">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2.5 [&>div]:bg-indigo-600" />
            <p className="text-xs text-slate-500 mt-1.5">
              {completedAssignments.length} of {assignments.length} courses completed
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert Banner */}
      {overdueAssignments.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900">
                  {overdueAssignments.length} Overdue {overdueAssignments.length === 1 ? 'Course' : 'Courses'}
                </h3>
                <p className="text-sm text-red-700">Complete these immediately to stay compliant</p>
              </div>
            </div>
            <div className="space-y-2">
              {overdueAssignments.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{a.course_title}</p>
                    <p className="text-xs text-red-600">Due: {formatDate(a.due_date)}</p>
                  </div>
                  <Link to={`${createPageUrl('TrainingCoursePlayer')}?assignment=${a.id}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 ml-3 flex-shrink-0">
                      Start Now
                    </Button>
                  </Link>
                </div>
              ))}
              {overdueAssignments.length > 3 && (
                <Link to={createPageUrl('MyLearning')}>
                  <Button variant="ghost" size="sm" className="text-red-700 w-full">
                    View all {overdueAssignments.length} overdue courses
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Certificates Alert */}
      {expiringCerts.length > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900">
                  {expiringCerts.length} {expiringCerts.length === 1 ? 'Certificate' : 'Certificates'} Expiring Soon
                </h3>
                <div className="mt-2 space-y-1">
                  {expiringCerts.slice(0, 3).map(c => (
                    <p key={c.id} className="text-sm text-amber-800">
                      <span className="font-medium">{c.course_title}</span> — expires {formatDate(c.expiration_date)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="active" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Target className="w-4 h-4 mr-2" />
              My Assignments ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="plans" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Learning Plans ({activePlans.length})
            </TabsTrigger>
            <TabsTrigger value="catalog" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <BookOpenCheck className="w-4 h-4 mr-2" />
              Course Catalog ({courses.length})
            </TabsTrigger>
            <TabsTrigger value="certificates" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Award className="w-4 h-4 mr-2" />
              Certificates ({certificates.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Active Assignments Tab */}
        <TabsContent value="active" className="space-y-3">
          {assignmentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : sortedActive.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">All caught up!</h3>
                <p className="text-slate-500 mt-1">You have no pending assignments. Browse the course catalog to keep learning.</p>
              </CardContent>
            </Card>
          ) : (
            sortedActive.map(assignment => {
              const isOverdue = assignment.status === 'overdue';
              const isInProgress = assignment.status === 'in_progress';
              const days = daysUntil(assignment.due_date);
              const isDueSoon = days >= 0 && days <= 7 && !isOverdue;
              return (
                <Card key={assignment.id} className={`border transition-all hover:shadow-md ${
                  isOverdue ? 'border-red-200 bg-red-50/30' :
                  isDueSoon ? 'border-amber-200 bg-amber-50/20' :
                  isInProgress ? 'border-blue-200 bg-blue-50/20' :
                  'border-slate-200'
                }`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{assignment.course_title}</h3>
                          {isOverdue && <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>}
                          {isDueSoon && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Due Soon</Badge>}
                          {isInProgress && !isOverdue && <Badge className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>}
                          {assignment.priority === 'critical' && <Badge className="bg-red-500 text-white">Critical</Badge>}
                          {assignment.priority === 'high' && <Badge className="bg-orange-500 text-white">High</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due {formatDate(assignment.due_date)}
                          </span>
                          {assignment.score_percentage != null && (
                            <span>Score: {assignment.score_percentage}%</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={assignment.progress_percentage || 0} className="h-1.5 flex-1" />
                          <span className="text-xs text-slate-400 flex-shrink-0">{assignment.progress_percentage || 0}%</span>
                        </div>
                      </div>
                      <Link to={`${createPageUrl('TrainingCoursePlayer')}?assignment=${assignment.id}`} className="sm:w-40 flex-shrink-0">
                        <Button className={`w-full ${isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}`}>
                          {isInProgress ? 'Continue' : 'Start'} Course
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          {activeAssignments.length > 0 && (
            <Link to={createPageUrl('MyLearning')}>
              <Button variant="outline" className="w-full">
                View Full Training Dashboard
              </Button>
            </Link>
          )}
        </TabsContent>

        {/* Learning Plans Tab */}
        <TabsContent value="plans" className="space-y-3">
          {activePlans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">No learning plans assigned</h3>
                <p className="text-slate-500 mt-1">Your manager or admin will assign learning plans as needed.</p>
              </CardContent>
            </Card>
          ) : (
            activePlans.map(enrollment => {
              const isOverdue = enrollment.status === 'overdue' ||
                (enrollment.due_date && new Date(enrollment.due_date) < new Date() && enrollment.status !== 'completed');
              return (
                <Card key={enrollment.id} className={`border transition-all hover:shadow-md ${
                  isOverdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{enrollment.plan_name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {enrollment.courses_completed || 0} of {enrollment.courses_total || 0} courses completed
                          {enrollment.due_date && <> — Due {formatDate(enrollment.due_date)}</>}
                        </p>
                      </div>
                      <Badge className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                        {isOverdue ? 'Overdue' : enrollment.status || 'Active'}
                      </Badge>
                    </div>
                    <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                    <p className="text-xs text-slate-400 mt-1 text-right">{enrollment.progress_percentage || 0}% complete</p>
                  </CardContent>
                </Card>
              );
            })
          )}
          {enrollments.filter(e => e.status === 'completed').length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-slate-500 mb-2 font-medium">Completed Plans</p>
              {enrollments.filter(e => e.status === 'completed').map(enrollment => (
                <Card key={enrollment.id} className="border-emerald-200 bg-emerald-50/30 mb-2">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-800">{enrollment.plan_name}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Course Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">No courses found</h3>
                <p className="text-slate-500 mt-1">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : 'No published courses are available yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.slice(0, 12).map(course => (
                <Card key={course.id} className="border-slate-200 hover:shadow-md transition-all group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {course.category?.replace(/_/g, ' ') || 'General'}
                      </Badge>
                      {course.training_type === 'annual_mandatory' && (
                        <Badge className="bg-indigo-100 text-indigo-700 text-xs">Annual</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                      {course.title}
                    </h3>
                    {course.short_description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{course.short_description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                      {course.estimated_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {course.estimated_minutes} min
                        </span>
                      )}
                      {course.passing_score && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" /> {course.passing_score}% to pass
                        </span>
                      )}
                      {course.enable_certificate && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" /> Certificate
                        </span>
                      )}
                    </div>
                    {isEducatorOrAdmin && (
                      <Link to={`${createPageUrl('TrainingCoursePlayer')}?courseId=${course.id}&preview=true`}>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          Preview Course
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {filteredCourses.length > 12 && (
            <p className="text-sm text-center text-slate-500">
              Showing 12 of {filteredCourses.length} courses. Use search to find specific content.
            </p>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-3">
          {certificates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">No certificates yet</h3>
                <p className="text-slate-500 mt-1">Complete courses to earn certificates of completion.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map(cert => {
                const isExpiring = cert.expiration_date && daysUntil(cert.expiration_date) <= 90 && daysUntil(cert.expiration_date) >= 0;
                const isExpired = cert.expiration_date && daysUntil(cert.expiration_date) < 0;
                return (
                  <Card key={cert.id} className={`border transition-all hover:shadow-md ${
                    isExpired ? 'border-red-200 bg-red-50/20' :
                    isExpiring ? 'border-amber-200 bg-amber-50/20' :
                    'border-slate-200'
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{cert.course_title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Issued {formatDate(cert.issued_at || cert.completion_date)}
                            {cert.score && <> — Score: {cert.score}%</>}
                          </p>
                          {cert.expiration_date && (
                            <p className={`text-xs mt-0.5 ${
                              isExpired ? 'text-red-600 font-semibold' :
                              isExpiring ? 'text-amber-600 font-semibold' :
                              'text-slate-400'
                            }`}>
                              {isExpired ? 'Expired' : 'Expires'} {formatDate(cert.expiration_date)}
                            </p>
                          )}
                          {cert.certificate_id && (
                            <p className="text-xs text-slate-400 mt-0.5">ID: {cert.certificate_id}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <CertificateDownloadButton certificate={cert} size="sm" variant="outline" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recently Completed Section */}
      {completedAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedAssignments.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.course_title}</p>
                    <p className="text-xs text-slate-500">
                      {a.score_percentage != null ? `Score: ${a.score_percentage}%` : 'Completed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {completedAssignments.length > 6 && (
              <Link to={createPageUrl('MyLearning')}>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-slate-500">
                  View all {completedAssignments.length} completed courses
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin/Supervisor Quick Links */}
      {(isEducatorOrAdmin || isSupervisor) && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="p-5">
            <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isEducatorOrAdmin ? 'Administration' : 'Team Management'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {isEducatorOrAdmin && (
                <>
                  <Link to={createPageUrl('AdminTraining')}>
                    <Button variant="outline" size="sm">
                      <Sparkles className="w-4 h-4 mr-1.5" /> Course Manager
                    </Button>
                  </Link>
                  <Link to={createPageUrl('AdminTraining')}>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="w-4 h-4 mr-1.5" /> Training Analytics
                    </Button>
                  </Link>
                </>
              )}
              {isSupervisor && (
                <>
                  <Link to={createPageUrl('ClinicalSkillsChecklist')}>
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Skills Checklists
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
