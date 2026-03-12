import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  FileText,
  Users,
  AlertCircle,
  Calendar,
  Award
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import EnrollmentSummaryDashboard from '../components/learning/EnrollmentSummaryDashboard';
import EmployeeTranscriptCenter from '../components/learning/EmployeeTranscriptCenter';
import CourseRosterReport from '../components/learning/CourseRosterReport';

const BUSINESS_LINES = [
  { value: 'home_health', label: 'Home Health' },
  { value: 'hospice', label: 'Hospice' },
  { value: 'all', label: 'All' }
];

export default function LearningReports() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.account_type === 'agency_admin';
  const isSuperAdmin = currentUser?.account_type === 'super_admin';

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">Only administrators can access learning reports.</p>
      </div>
    );
  }

  const adminBusinessLines = isSuperAdmin ? BUSINESS_LINES : [
    { value: currentUser?.business_line || 'home_health', label: currentUser?.business_line === 'home_health' ? 'Home Health' : 'Hospice' }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Reports & Analytics</h1>
        <p className="text-gray-600">View training completion rates, employee transcripts, certificates, and compliance reports.</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Transcript</span>
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Roster</span>
          </TabsTrigger>
          <TabsTrigger value="plan-compliance" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Overdue</span>
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Expiring</span>
          </TabsTrigger>
        </TabsList>

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
          <div className="text-center py-12">
            <p className="text-gray-600">Learning Plan Compliance Report coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <div className="text-center py-12">
            <p className="text-gray-600">Overdue & Reminders Report coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="expiring">
          <div className="text-center py-12">
            <p className="text-gray-600">Certificate Expiration Report coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}