import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  FileText,
  Users,
  AlertCircle,
  Calendar,
  Award,
  Loader2,
  Construction
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import EnrollmentSummaryDashboard from '../components/learning/EnrollmentSummaryDashboard';
import EmployeeTranscriptCenter from '../components/learning/EmployeeTranscriptCenter';
import CourseRosterReport from '../components/learning/CourseRosterReport';

export default function LearningReports() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.account_type === 'agency_admin';
  const isSuperAdmin = currentUser?.account_type === 'super_admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">Only administrators can access learning reports.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Learning Reports & Analytics</h1>
        <p className="text-gray-600">View training completion rates, employee transcripts, certificates, and compliance reports.</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="summary" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <BarChart3 className="w-4 h-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="transcript" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="roster" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Users className="w-4 h-4 mr-2" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="plan-compliance" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Award className="w-4 h-4 mr-2" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="overdue" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <AlertCircle className="w-4 h-4 mr-2" />
              Overdue
            </TabsTrigger>
            <TabsTrigger value="expiring" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              Expiring
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary">
          <EnrollmentSummaryDashboard />
        </TabsContent>

        <TabsContent value="transcript">
          <EmployeeTranscriptCenter />
        </TabsContent>

        <TabsContent value="roster">
          <CourseRosterReport />
        </TabsContent>

        <TabsContent value="plan-compliance">
          <Card>
            <CardContent className="py-16 text-center">
              <Construction className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Learning Plan Compliance Report</h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                Track learning plan completion rates, identify non-compliant employees, and generate compliance snapshots.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardContent className="py-16 text-center">
              <Construction className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Overdue & Reminders Report</h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                View all overdue assignments across teams, send reminders, and escalate non-compliance to managers.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardContent className="py-16 text-center">
              <Construction className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Certificate Expiration Report</h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                Monitor upcoming certificate expirations, auto-assign renewal training, and track re-certification progress.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
