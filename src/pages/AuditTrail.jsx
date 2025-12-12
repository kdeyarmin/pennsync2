import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Search, 
  Filter, 
  Download,
  Eye,
  User,
  Calendar,
  Activity
} from "lucide-react";
import { format } from "date-fns";

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['userActivities'],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 500),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Get unique actions from activities
  const uniqueActions = [...new Set(activities.map(a => a.action))];

  // Filter activities based on search and filters
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.page?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || activity.action === actionFilter;
    const matchesUser = userFilter === "all" || activity.user_email === userFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange !== "all") {
      const activityDate = new Date(activity.created_date);
      const now = new Date();
      const daysAgo = parseInt(dateRange.replace('d', ''));
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      matchesDate = activityDate >= cutoffDate;
    }

    return matchesSearch && matchesAction && matchesUser && matchesDate;
  });

  const getActionBadge = (action) => {
    const actionColors = {
      login: 'bg-blue-500',
      logout: 'bg-gray-500',
      create: 'bg-green-500',
      update: 'bg-yellow-500',
      delete: 'bg-red-500',
      view: 'bg-purple-500',
      export: 'bg-indigo-500',
      user_created: 'bg-green-600',
      user_updated: 'bg-yellow-600',
      user_approved: 'bg-green-600',
      user_revoked: 'bg-red-600',
      error: 'bg-red-700'
    };

    return (
      <Badge className={actionColors[action] || 'bg-gray-400'}>
        {action?.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Email', 'Action', 'Page', 'Entity Type', 'Entity ID', 'Details'].join(','),
      ...filteredActivities.map(activity => [
        activity.created_date,
        activity.user_name,
        activity.user_email,
        activity.action,
        activity.page,
        activity.entity_type || '',
        activity.entity_id || '',
        JSON.stringify(activity.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
        </div>
        <p className="text-gray-600">
          Complete activity log of all user actions in the system
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action?.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Log ({filteredActivities.length} records)</span>
            {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No activities found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm">
                        {format(new Date(activity.created_date), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-sm">{activity.user_name}</div>
                            <div className="text-xs text-gray-500">{activity.user_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(activity.action)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {activity.page || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {activity.entity_type ? (
                          <div>
                            <div className="font-medium">{activity.entity_type}</div>
                            {activity.entity_id && (
                              <div className="text-xs text-gray-500">ID: {activity.entity_id}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {activity.details && Object.keys(activity.details).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-blue-600 hover:underline">
                              View details
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-h-40">
                              {JSON.stringify(activity.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}