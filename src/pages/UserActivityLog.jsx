import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Calendar, 
  User, 
  FileText, 
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Clock,
  Filter,
  LogIn,
  Upload,
  BarChart3,
  Save,
  UserCheck,
  Target,
  ClipboardList,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Brain,
  Shield
} from "lucide-react";
import { format } from "date-fns";

export default function UserActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['userActivities'],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchQuery === "" || 
      activity.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.page?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === "all" || activity.action === actionFilter;
    const matchesUser = userFilter === "all" || activity.user_email === userFilter;
    
    // Date filter
    const matchesDate = dateRange === "all" || (() => {
      const activityDate = new Date(activity.created_date);
      const daysAgo = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      return activityDate >= cutoffDate;
    })();
    
    return matchesSearch && matchesAction && matchesUser && matchesDate;
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(activities.map(a => a.action))].filter(Boolean);

  // Action stats
  const actionStats = activities.reduce((acc, activity) => {
    acc[activity.action] = (acc[activity.action] || 0) + 1;
    return acc;
  }, {});

  const getActionIcon = (action) => {
    const icons = {
      'view': Eye,
      'create': Plus,
      'update': Edit,
      'delete': Trash2,
      'export': Download,
      'generate': FileText,
      'error': AlertTriangle,
      'page_visit': Activity,
      'login': LogIn,
      'oasis_upload': Upload,
      'oasis_analyze': BarChart3,
      'oasis_save': Save,
      'patient_match': UserCheck,
      'dispute_match': AlertTriangle,
      'visit_document': FileText,
      'care_plan_create': Target,
      'task_create': ClipboardList,
      'incident_report': AlertCircle,
      'training_complete': GraduationCap,
      'note_enhanced': Sparkles,
      'note_ai_generated': Brain,
      'note_compliance_check': Shield
    };
    const Icon = icons[action] || Activity;
    return <Icon className="w-4 h-4" />;
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'export': 'bg-purple-100 text-purple-800',
      'error': 'bg-red-600 text-white',
      'view': 'bg-gray-100 text-gray-800',
      'generate': 'bg-indigo-100 text-indigo-800',
      'login': 'bg-purple-100 text-purple-800',
      'oasis_upload': 'bg-cyan-100 text-cyan-800',
      'oasis_analyze': 'bg-teal-100 text-teal-800',
      'oasis_save': 'bg-emerald-100 text-emerald-800',
      'patient_match': 'bg-violet-100 text-violet-800',
      'dispute_match': 'bg-orange-100 text-orange-800',
      'visit_document': 'bg-sky-100 text-sky-800',
      'care_plan_create': 'bg-lime-100 text-lime-800',
      'task_create': 'bg-amber-100 text-amber-800',
      'incident_report': 'bg-rose-100 text-rose-800',
      'training_complete': 'bg-fuchsia-100 text-fuchsia-800',
      'note_enhanced': 'bg-indigo-100 text-indigo-800',
      'note_ai_generated': 'bg-purple-100 text-purple-800',
      'note_compliance_check': 'bg-blue-100 text-blue-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Activity Log</h1>
        <p className="text-sm text-gray-600">Monitor all user actions across the system</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Total Activities</p>
                <p className="text-2xl font-bold">{filteredActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Active Users</p>
                <p className="text-2xl font-bold">{new Set(filteredActivities.map(a => a.user_email)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-xs text-indigo-700 font-medium">Notes Enhanced</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {filteredActivities.filter(a => a.action === 'note_enhanced' || a.action === 'note_ai_generated').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-cyan-600" />
              <div>
                <p className="text-xs text-cyan-700 font-medium">OASIS Analyzed</p>
                <p className="text-2xl font-bold text-cyan-900">
                  {filteredActivities.filter(a => a.action === 'oasis_analyze').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-2xl font-bold">{filteredActivities.filter(a => a.action === 'create').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-xs text-gray-500">Errors</p>
                <p className="text-2xl font-bold">{filteredActivities.filter(a => a.action === 'error').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Activity Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Note Enhancement Stats by User */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              AI Note Enhancement Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => {
                const userEnhancements = activities.filter(a => 
                  a.user_email === user.email && 
                  (a.action === 'note_enhanced' || a.action === 'note_ai_generated')
                );
                
                if (userEnhancements.length === 0) return null;
                
                return (
                  <div key={user.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                      <Badge className="bg-indigo-600 text-white text-lg">
                        {userEnhancements.length}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>Enhanced: {userEnhancements.filter(a => a.action === 'note_enhanced').length}</p>
                      <p>AI Generated: {userEnhancements.filter(a => a.action === 'note_ai_generated').length}</p>
                      <p>Compliance Checks: {activities.filter(a => a.user_email === user.email && a.action === 'note_compliance_check').length}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Login Activity Stats */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-purple-600" />
              Login Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => {
                const userLogins = activities.filter(a => 
                  a.user_email === user.email && a.action === 'login'
                );
                
                if (userLogins.length === 0) return null;

                const lastLogin = userLogins.sort((a, b) => 
                  new Date(b.created_date) - new Date(a.created_date)
                )[0];
                
                return (
                  <div key={user.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                      <Badge className="bg-purple-600 text-white">
                        {userLogins.length} logins
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>Last login: {new Date(lastLogin.created_date).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Total sessions: {userLogins.length}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action} ({actionStats[action]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.full_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline ({filteredActivities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading activities...</p>
          ) : filteredActivities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No activities found</p>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={getActionColor(activity.action)}>
                            {activity.action}
                          </Badge>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.user_name}
                          </p>
                          <span className="text-xs text-gray-400">({activity.user_email})</span>
                        </div>
                        
                        {activity.page && (
                          <p className="text-xs text-gray-600 mb-1">
                            Page: <span className="font-mono bg-gray-100 px-1 rounded">{activity.page}</span>
                          </p>
                        )}
                        
                        {activity.entity_type && (
                          <p className="text-xs text-gray-600 mb-1">
                            Entity: <span className="font-medium">{activity.entity_type}</span>
                            {activity.entity_id && <span className="text-gray-400"> (ID: {activity.entity_id.substring(0, 8)}...)</span>}
                          </p>
                        )}
                        
                        {/* Enhanced detail display for specific actions */}
                        {activity.action === 'login' && activity.details?.login_time && (
                          <p className="text-xs text-purple-700 mt-1">
                            Session started at {new Date(activity.details.login_time).toLocaleTimeString()}
                          </p>
                        )}
                        
                        {activity.action === 'note_enhanced' && activity.details && (
                          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                            {activity.details.quality_score && (
                              <p>Quality Score: <Badge className="bg-green-600 text-white text-xs">{activity.details.quality_score}%</Badge></p>
                            )}
                            {activity.details.rough_note_length && activity.details.enhanced_note_length && (
                              <p className="text-[10px] text-gray-500">
                                {activity.details.rough_note_length} → {activity.details.enhanced_note_length} characters
                              </p>
                            )}
                          </div>
                        )}
                        
                        {activity.details && Object.keys(activity.details).length > 0 && 
                         activity.action !== 'login' && activity.action !== 'note_enhanced' && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                              View Details
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-x-auto max-h-40">
                              {JSON.stringify(activity.details, null, 2)}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-gray-500 ml-4">
                      <p className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}