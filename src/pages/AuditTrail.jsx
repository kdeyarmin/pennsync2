import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatEastern } from "../components/utils/timezone";
import AIAuditAnalyzer from "../components/security/AIAuditAnalyzer";

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7"); // days
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Fetch audit logs
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 500),
    enabled: isAdmin,
  });

  // Fetch security logs for critical events
  const { data: securityLogs = [] } = useQuery({
    queryKey: ['securityLogs'],
    queryFn: () => base44.entities.SecurityLog.list('-timestamp', 200),
    enabled: isAdmin,
  });

  // Get unique users, actions, and entities for filters
  const uniqueUsers = [...new Set(auditLogs.map(log => log.user_email))];
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueEntities = [...new Set(auditLogs.map(log => log.entity_type).filter(Boolean))];

  // Apply filters
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesUser = userFilter === 'all' || log.user_email === userFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    
    const logDate = new Date(log.created_date);
    const daysAgo = parseInt(dateFilter);
    const matchesDate = daysAgo === 0 || 
      (Date.now() - logDate.getTime()) <= (daysAgo * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesAction && matchesEntity && matchesUser && matchesSeverity && matchesDate;
  });

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.created_date,
        log.user_name,
        log.user_email,
        log.action,
        log.entity_type || '',
        log.entity_id || '',
        log.severity || 'info',
        JSON.stringify(log.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString()}.csv`;
    a.click();
  };

  const getSeverityBadge = (severity) => {
    const config = {
      critical: { color: 'bg-red-600 text-white', icon: AlertTriangle },
      warning: { color: 'bg-yellow-600 text-white', icon: AlertTriangle },
      info: { color: 'bg-blue-600 text-white', icon: Info },
    };
    const { color, icon: Icon } = config[severity] || config.info;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {severity || 'info'}
      </Badge>
    );
  };

  const getActionColor = (action) => {
    if (action?.includes('delete') || action?.includes('reject')) return 'text-red-600';
    if (action?.includes('approved') || action?.includes('completed')) return 'text-green-600';
    if (action?.includes('updated') || action?.includes('edited')) return 'text-blue-600';
    return 'text-gray-600';
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-2 border-red-200">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only administrators can view the audit trail.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">Audit Trail</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Comprehensive log of all user actions and system events</p>
        </div>
        <Button onClick={exportAuditLog} variant="outline" className="w-full sm:w-auto min-h-[44px]">
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 truncate">Total Events</p>
            <p className="text-xl sm:text-2xl font-bold">{auditLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 truncate">Filtered</p>
            <p className="text-xl sm:text-2xl font-bold">{filteredLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 truncate">Critical Events</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">
              {auditLogs.filter(l => l.severity === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 truncate">Active Users</p>
            <p className="text-xl sm:text-2xl font-bold">{uniqueUsers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users, actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 touch-target"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Time</SelectItem>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <ScrollArea className="h-[400px] sm:h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                    <TableHead className="text-xs sm:text-sm">User</TableHead>
                    <TableHead className="text-xs sm:text-sm">Action</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Entity</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Severity</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No audit logs found matching filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      <TableCell className="text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 hidden sm:inline" />
                          <span className="hidden sm:inline">{formatEastern(new Date(log.created_date), 'MMM d, yyyy HH:mm:ss')}</span>
                          <span className="sm:hidden">{formatEastern(new Date(log.created_date), 'MMM d, HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 hidden sm:inline flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{log.user_name}</p>
                            <p className="text-xs text-gray-500 truncate hidden sm:block">{log.user_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={`font-medium ${getActionColor(log.action)} truncate block`}>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">
                        {log.entity_type && (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {log.entity_type}
                            </Badge>
                            {log.entity_id && (
                              <p className="text-gray-500 mt-1 truncate">ID: {log.entity_id.substring(0, 8)}...</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getSeverityBadge(log.severity)}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs hidden lg:table-cell">
                        {log.details && (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="ai-analysis">
          <AIAuditAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}