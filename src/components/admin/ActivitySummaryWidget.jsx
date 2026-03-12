import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  FileText,
  AlertTriangle
} from "lucide-react";
import { formatEastern } from "../utils/timezone";

export default function ActivitySummaryWidget() {
  const { data: activities = [] } = useQuery({
    queryKey: ['activitySummary'],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 100),
    refetchInterval: 60000, // Refresh every minute
  });

  const userManagementActions = activities.filter(a => 
    ['user_created', 'user_role_changed', 'user_enabled', 'user_disabled', 
     'user_password_reset', 'user_deleted'].includes(a.action)
  );

  const invitationActions = activities.filter(a => 
    ['invitation_sent', 'invitation_resent', 'invitation_deleted'].includes(a.action)
  );

  const documentActions = activities.filter(a => 
    ['document_generated', 'document_signed', 'document_uploaded', 'document_deleted'].includes(a.action)
  );

  const recentErrors = activities.filter(a => a.action === 'error').slice(0, 5);

  const getActionBadgeColor = (action) => {
    if (['user_created', 'invitation_sent', 'document_generated'].includes(action)) {
      return 'bg-green-100 text-green-800';
    }
    if (['user_role_changed', 'document_uploaded'].includes(action)) {
      return 'bg-blue-100 text-blue-800';
    }
    if (['user_disabled', 'user_deleted', 'invitation_deleted', 'document_deleted'].includes(action)) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      {/* User Management Summary */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Management Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Recent Changes (24h)</span>
            <Badge className="bg-blue-600 text-white">{userManagementActions.slice(0, 24).length}</Badge>
          </div>
          <div className="space-y-2">
            {userManagementActions.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={getActionBadgeColor(activity.action)}>
                    {activity.action.replace('user_', '')}
                  </Badge>
                  <span className="text-gray-700 truncate">{activity.user_name}</span>
                </div>
                <span className="text-gray-500 whitespace-nowrap ml-2">
                  {formatEastern(activity.created_date, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Activity Summary */}
      <Card className="border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Invitation Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
            <div className="p-2 rounded-lg bg-green-50">
              <p className="text-green-700 font-medium">Sent</p>
              <p className="text-2xl font-bold text-green-900">
                {invitationActions.filter(a => a.action === 'invitation_sent').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <p className="text-blue-700 font-medium">Resent</p>
              <p className="text-2xl font-bold text-blue-900">
                {invitationActions.filter(a => a.action === 'invitation_resent').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-red-50">
              <p className="text-red-700 font-medium">Deleted</p>
              <p className="text-2xl font-bold text-red-900">
                {invitationActions.filter(a => a.action === 'invitation_deleted').length}
              </p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {invitationActions.slice(0, 3).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-1.5 rounded bg-gray-50">
                <span className="truncate">
                  <span className="font-medium">{activity.details?.invited_email}</span>
                  <span className="text-gray-500 ml-1">({activity.action.replace('invitation_', '')})</span>
                </span>
                <span className="text-gray-400 whitespace-nowrap text-[10px] ml-1">
                  {formatEastern(activity.created_date, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Activity Summary */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Document Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div className="p-2 rounded-lg bg-purple-50">
              <p className="text-purple-700 font-medium">Generated</p>
              <p className="text-2xl font-bold text-purple-900">
                {documentActions.filter(a => a.action === 'document_generated').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-50">
              <p className="text-green-700 font-medium">Signed</p>
              <p className="text-2xl font-bold text-green-900">
                {documentActions.filter(a => a.action === 'document_signed').length}
              </p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {documentActions.slice(0, 3).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-1.5 rounded bg-gray-50">
                <span className="truncate">
                  <span className="font-medium text-gray-700 capitalize">
                    {activity.action.replace('document_', '')}
                  </span>
                  <span className="text-gray-500 ml-1">by {activity.user_name}</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-2 rounded-lg bg-red-50">
            <p className="text-red-700 font-medium text-xs">Errors (24h)</p>
            <p className="text-2xl font-bold text-red-900">
              {activities.filter(a => a.action === 'error').length}
            </p>
          </div>
          {recentErrors.length > 0 && (
            <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
              {recentErrors.map((activity) => (
                <div key={activity.id} className="p-1.5 rounded bg-red-50 border border-red-200">
                  <p className="text-red-900 font-medium truncate">
                    {activity.details?.error_message || 'Unknown error'}
                  </p>
                  <p className="text-red-700 text-[10px]">{activity.user_name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}