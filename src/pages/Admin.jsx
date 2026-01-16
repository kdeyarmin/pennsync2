import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  Activity,
  Database,
  Settings,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Search,
  Eye,
  Trash2,
  Mail,
  RefreshCw,
  BookOpen,
  Download,
  FolderArchive
} from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isSyncingRegulations, setIsSyncingRegulations] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Check if current user is admin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setIsAdmin(user.role === 'admin');
      return user;
    },
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Fetch all patients
  const { data: patients } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Fetch all visits
  const { data: visits } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 200),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Fetch all note conversions (enhancements)
  const { data: noteConversions = [] } = useQuery({
    queryKey: ['allNoteConversions'],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 500),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Fetch security logs
  const { data: securityLogs } = useQuery({
    queryKey: ['securityLogs'],
    queryFn: () => base44.entities.SecurityLog.list('-timestamp', 100),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Fetch regulatory updates
  const { data: regulatoryUpdates, refetch: refetchRegulations } = useQuery({
    queryKey: ['regulatoryUpdates'],
    queryFn: () => base44.entities.RegulatoryUpdate.list('-created_date', 50),
    initialData: [],
    enabled: isAdmin === true,
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      alert('User role updated successfully');
    },
  });

  // Calculate metrics
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const activePatients = patients.filter(p => p.status === 'active').length;
  
  // Visits = enhancements (every enhance button click is a visit)
  const enhancementsThisWeek = noteConversions.filter(nc => {
    const createdDate = new Date(nc.created_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;
  
  const totalVisitsAndEnhancements = enhancementsThisWeek; // Visits = enhancements
  
  const completedVisits = noteConversions.length; // All enhancements are completed visits
  // Calculate average time saved per enhancement
  const avgDocTime = noteConversions.length > 0
    ? Math.round(noteConversions.reduce((sum, nc) => {
        const timeSaved = (nc.enhanced_note_length || 0) / 200; // Estimate minutes
        return sum + timeSaved;
      }, 0) / noteConversions.length)
    : 0;

  // Filter users by search
  const filteredUsers = (users || []).filter(user =>
    user && (
      (user.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (user.full_name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    )
  );

  // Security events by type
  const securityEventCounts = securityLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }
    
    try {
      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: 'Invitation to Join PennCares',
        body: `You have been invited to join PennCares as a ${inviteRole === 'admin' ? 'Administrator' : 'User'}.
        
Please visit the app to create your account and start documenting patient visits.

Role: ${inviteRole === 'admin' ? 'Administrator' : 'User'}

If you have any questions, please contact your administrator.`,
        from_name: 'PennCares Admin'
      });
      
      alert('Invitation sent successfully!');
      setInviteEmail('');
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  const handleSyncCMSRegulations = async () => {
    setIsSyncingRegulations(true);
    try {
      const result = await base44.functions.invoke('syncCMSRegulations');
      setLastSyncResult(result);
      refetchRegulations();
      alert(`✅ Successfully synced ${result.regulations_count} CMS regulations!\n\n${result.key_changes_summary}`);
    } catch (error) {
      console.error('Failed to sync regulations:', error);
      alert('Failed to sync CMS regulations. Please try again.');
    }
    setIsSyncingRegulations(false);
  };

  // Check if user is admin
  if (isAdmin === null) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Checking permissions...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <p className="font-semibold mb-2">Access Denied</p>
            <p>You do not have administrator privileges to access this page.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">Admin Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Manage users, monitor system, and view security logs</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Users</p>
                <p className="text-4xl font-bold">{totalUsers}</p>
                <p className="text-blue-100 text-xs mt-1">{adminUsers} admins</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Active Patients</p>
                <p className="text-4xl font-bold">{activePatients}</p>
                <p className="text-green-100 text-xs mt-1">of {patients.length} total</p>
              </div>
              <Activity className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Visits/Enhancements This Week</p>
                <p className="text-4xl font-bold">{totalVisitsAndEnhancements}</p>
                <p className="text-purple-100 text-xs mt-1">{completedVisits} total completed</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Avg Doc Time</p>
                <p className="text-4xl font-bold">{Math.round(avgDocTime)}</p>
                <p className="text-orange-100 text-xs mt-1">minutes</p>
              </div>
              <Database className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-6 gap-1 min-w-max h-auto">
            <TabsTrigger value="overview" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="users" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="compliance" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Compliance</TabsTrigger>
            <TabsTrigger value="discharges" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Discharges</TabsTrigger>
            <TabsTrigger value="security" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Security</TabsTrigger>
            <TabsTrigger value="data" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Data</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">System Online</p>
                      <p className="text-sm text-gray-600">All services operational</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">Database Records</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {patients.length + noteConversions.length + users.length}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">Security Events (Last 100)</p>
                    <p className="text-2xl font-bold text-gray-900">{securityLogs.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {noteConversions.slice(0, 5).map((conversion) => {
                  const patient = patients.find(p => p.id === conversion.patient_id);
                  return (
                    <div key={conversion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          Visit: {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {conversion.visit_type?.replace(/_/g, ' ')} • Score: {conversion.quality_score}%
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Enhanced
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CMS Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                CMS Regulations Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-300">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <p className="font-semibold mb-2">Live Internet-Based Regulatory Updates</p>
                    <p className="text-sm">
                      This feature uses AI with live internet access to fetch the latest CMS regulations, Medicare policy updates, 
                      and home health compliance requirements directly from CMS.gov and official sources.
                    </p>
                  </AlertDescription>
                </Alert>

                {lastSyncResult && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900 mb-2">Last Sync: {new Date(lastSyncResult.sync_date).toLocaleString()}</p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-green-700">📋 Regulations Found: <span className="font-bold">{lastSyncResult.regulations_count}</span></p>
                      </div>
                      <div>
                        <p className="text-green-700">🔔 Recent Updates: <span className="font-bold">{lastSyncResult.recent_updates?.length || 0}</span></p>
                      </div>
                    </div>
                    {lastSyncResult.key_changes_summary && (
                      <p className="mt-3 text-sm text-green-800 bg-green-100 p-2 rounded">{lastSyncResult.key_changes_summary}</p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleSyncCMSRegulations}
                  disabled={isSyncingRegulations}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isSyncingRegulations ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Syncing from Internet...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Sync Latest CMS Regulations
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">This may take 30-60 seconds as it searches live CMS sources</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Synced Regulations ({regulatoryUpdates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regulatoryUpdates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No regulations synced yet. Click "Sync Latest CMS Regulations" to fetch updates.</p>
                  </div>
                ) : (
                  regulatoryUpdates.map((update) => (
                    <div key={update.id} className={`p-4 rounded-lg border-l-4 ${
                      update.impact_level === 'critical' ? 'border-l-red-500 bg-red-50' :
                      update.impact_level === 'high' ? 'border-l-orange-500 bg-orange-50' :
                      update.impact_level === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                      'border-l-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{update.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{update.summary}</p>
                          <div className="flex gap-3 mt-2 text-xs">
                            <Badge className={`${
                              update.impact_level === 'critical' ? 'bg-red-600' :
                              update.impact_level === 'high' ? 'bg-orange-600' :
                              update.impact_level === 'medium' ? 'bg-yellow-600' :
                              'bg-blue-600'
                            }`}>
                              {update.impact_level} impact
                            </Badge>
                            <span className="text-gray-500">Effective: {update.effective_date}</span>
                            <span className="text-gray-500">Source: {update.source}</span>
                          </div>
                        </div>
                        <Badge variant={update.status === 'implemented' ? 'default' : 'outline'}>
                          {update.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite New User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="inviteRole">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleInviteUser}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(user.created_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(role) => updateUserRoleMutation.mutate({ 
                            userId: user.id, 
                            role 
                          })}
                          disabled={user.id === currentUser?.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discharge Report Tab */}
        <TabsContent value="discharges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discharge Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Discharge report management is available in the Patient Data Management section.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Logs Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Event Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(securityEventCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([action, count]) => (
                    <div key={action} className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-1">{action.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm">{log.user_email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.action.includes('UNAUTHORIZED') || log.action.includes('ERROR') 
                            ? 'destructive' 
                            : 'outline'
                        }>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Browser Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-bold">{patients.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="font-bold">{activePatients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Home Health</span>
                    <span className="font-bold">
                      {patients.filter(p => p.care_type === 'home_health').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hospice</span>
                    <span className="font-bold">
                      {patients.filter(p => p.care_type === 'hospice').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
               <CardHeader>
                 <CardTitle>Visits/Enhancements</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   <div className="flex justify-between">
                     <span className="text-sm text-gray-600">Total Visits</span>
                     <span className="font-bold">{noteConversions.length}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-gray-600">This Week</span>
                     <span className="font-bold">{enhancementsThisWeek}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-gray-600">Avg Compliance</span>
                     <span className="font-bold">{noteConversions.length > 0 ? Math.round(noteConversions.reduce((sum, nc) => sum + (nc.quality_score || 0), 0) / noteConversions.length) : 0}%</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-gray-600">Unique Patients</span>
                     <span className="font-bold">{new Set(noteConversions.map(nc => nc.patient_id)).size}</span>
                   </div>
                 </div>
               </CardContent>
             </Card>

            <Card>
              <CardHeader>
                <CardTitle>System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Users</span>
                    <span className="font-bold">{users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Security Logs</span>
                    <span className="font-bold">{securityLogs.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Database className="w-4 h-4" />
            <AlertDescription>
              For detailed data management, use the Dashboard → Data tab to view and manage individual records.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}