import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function LearningCenter() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-training-assignments', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.TrainingAssignment.filter({
        assigned_to_user_id: user.email,
        status: { $in: ['assigned', 'in_progress', 'overdue'] }
      }, '-due_date', 50);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['my-certificates', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.TrainingCertificate.filter({
        user_id: user.email,
        revoked: false
      }, '-issued_at', 50);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ['my-competencies', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Competency.filter({
        role_target: user.role,
        active: true
      });
    },
    enabled: !!user,
    initialData: []
  });

  const dueAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress');
  const overdueAssignments = assignments.filter(a => a.status === 'overdue');

  const isEducatorOrAdmin = user?.role === 'admin' || user?.training_role === 'educator';
  const isSupervisor = user?.training_role === 'supervisor';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-yellow-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Penn Learning Center</h1>
            <p className="text-gray-600">Your professional development hub</p>
          </div>
        </div>

        {/* Role-based quick actions */}
        <div className="flex items-center gap-2">
          {isEducatorOrAdmin && (
            <>
              <Link to={createPageUrl('AIComplianceInServices')}>
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Compliance In-Services
                </Button>
              </Link>
              <Link to={createPageUrl('CourseApprovalQueue')}>
                <Button variant="outline">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Approval Queue
                </Button>
              </Link>
            </>
          )}
          {isSupervisor && (
            <>
              <Link to={createPageUrl('TeamTrainingDashboard')}>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Team Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl('ManagerSkillGapDashboard')}>
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Skill Gap Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl('ClinicalSkillsChecklist')}>
                <Button variant="outline">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Skills Checklists
                </Button>
              </Link>
            </>
          )}
          <Link to={createPageUrl('MyAnnualEducation')}>
            <Button variant="outline">
              <GraduationCap className="w-4 h-4 mr-2" />
              My Annual Education
            </Button>
          </Link>
          {isEducatorOrAdmin && (
            <Link to={createPageUrl('AnnualMandatoryEducation')}>
              <Button variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Penn Annual Builder
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('TrainingReports')}>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueAssignments.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{dueAssignments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Certificates</p>
                <p className="text-2xl font-bold text-green-600">{certificates.length}</p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Competencies</p>
                <p className="text-2xl font-bold text-blue-600">{competencies.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      {overdueAssignments.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Overdue Training ({overdueAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueAssignments.slice(0, 3).map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                <div>
                  <p className="font-semibold text-gray-900">{assignment.course_title}</p>
                  <p className="text-sm text-red-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                </div>
                <Link to={createPageUrl('TrainingCoursePlayer') + `?assignment=${assignment.id}`}>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    Start Now
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              My Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueAssignments.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No pending assignments</p>
            ) : (
              dueAssignments.slice(0, 5).map(assignment => (
                <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{assignment.course_title}</h3>
                      <p className="text-sm text-gray-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={
                      assignment.priority === 'critical' ? 'bg-red-500' :
                      assignment.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                    }>
                      {assignment.priority}
                    </Badge>
                  </div>
                  <Progress value={assignment.progress || 0} className="h-2 mb-3" />
                  <Link to={createPageUrl('TrainingCoursePlayer') + `?assignment=${assignment.id}`}>
                    <Button size="sm" className="w-full">
                      {assignment.status === 'in_progress' ? 'Continue' : 'Start'} Training
                    </Button>
                  </Link>
                </div>
              ))
            )}
            <Link to={createPageUrl('MyTraining')}>
              <Button variant="outline" className="w-full">
                View All In-Services
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* My Competencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              My Competencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {competencies.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No competencies assigned</p>
            ) : (
              competencies.slice(0, 5).map(comp => (
                <div key={comp.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                      <p className="text-sm text-gray-600">{comp.frequency} validation</p>
                    </div>
                    <Badge className="bg-green-500">
                      Active
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link to={createPageUrl('MyCompetencies')}>
              <Button variant="outline" className="w-full">
                View All Competencies
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Recent Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {certificates.slice(0, 6).map(cert => (
              <div key={cert.id} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <Award className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">{cert.course_title}</h3>
                <p className="text-sm text-gray-600 mb-2">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                {cert.expiration_date && (
                  <p className="text-xs text-gray-500">Expires: {new Date(cert.expiration_date).toLocaleDateString()}</p>
                )}
                <Button size="sm" variant="outline" className="w-full mt-3">
                  Download Certificate
                </Button>
              </div>
            ))}
          </div>
          {certificates.length > 6 && (
            <Link to={createPageUrl('MyCertificates')}>
              <Button variant="outline" className="w-full mt-4">
                View All Certificates
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}