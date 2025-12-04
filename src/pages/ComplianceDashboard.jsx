import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  TrendingUp,
  Calendar,
  User,
  ChevronRight,
  Bell,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  Download,
  BarChart3,
  Target,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { format, differenceInDays, addDays, subDays } from "date-fns";

import PolicyGuidelineMonitor from "../components/compliance/PolicyGuidelineMonitor";
import AutomatedComplianceReporting from "../components/compliance/AutomatedComplianceReporting";
import ComplianceRuleManager from "../components/compliance/ComplianceRuleManager";
import EnhancedComplianceAuditor from "../components/compliance/EnhancedComplianceAuditor";
import AIAuditSuggestions from "../components/compliance/AIAuditSuggestions";
import AuditCategoryAnalyzer from "../components/compliance/AuditCategoryAnalyzer";
import NurseAuditTrends from "../components/compliance/NurseAuditTrends";

export default function ComplianceDashboard() {
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients } = useQuery({
    queryKey: ['compliancePatients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: visits } = useQuery({
    queryKey: ['complianceVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 200),
    initialData: [],
  });

  const { data: carePlans } = useQuery({
    queryKey: ['complianceCarePlans'],
    queryFn: () => base44.entities.CarePlan.list(),
    initialData: [],
  });

  const { data: incidents } = useQuery({
    queryKey: ['complianceIncidents'],
    queryFn: () => base44.entities.Incident.filter({ status: 'reported' }),
    initialData: [],
  });

  const { data: securityLogs } = useQuery({
    queryKey: ['complianceSecurityLogs'],
    queryFn: () => base44.entities.SecurityLog.list('-timestamp', 50),
    initialData: [],
  });

  const aggregatedAlerts = useMemo(() => {
    const alerts = [];
    const today = new Date();

    // Visit Documentation Deadlines
    (visits || []).forEach(visit => {
      if (visit.status === 'scheduled' || visit.status === 'in_progress') {
        const visitDate = new Date(visit.visit_date);
        const daysSince = differenceInDays(today, visitDate);
        
        if (daysSince > 0 && visit.status !== 'completed') {
          const patient = patients.find(p => p.id === visit.patient_id);
          alerts.push({
            id: `visit-overdue-${visit.id}`,
            type: 'documentation',
            severity: daysSince > 2 ? 'critical' : 'warning',
            title: 'Overdue Visit Documentation',
            message: `Visit for ${patient?.first_name || 'Patient'} ${patient?.last_name || ''} on ${format(visitDate, 'MMM d')} needs documentation`,
            daysOverdue: daysSince,
            link: `${createPageUrl("DocumentVisit")}?visitId=${visit.id}`,
            linkText: 'Document Now',
            category: 'Documentation',
            timestamp: visit.visit_date
          });
        }
      }
    });

    // Recertification Due
    (patients || []).forEach(patient => {
      const patientVisits = visits.filter(v => v.patient_id === patient.id);
      const lastRecert = patientVisits.find(v => v.visit_type === 'recertification' || v.visit_type === 'admission');
      
      if (lastRecert) {
        const recertDate = new Date(lastRecert.visit_date);
        const nextRecertDue = addDays(recertDate, 60);
        const daysUntil = differenceInDays(nextRecertDue, today);
        
        if (daysUntil <= 14 && daysUntil > 0) {
          alerts.push({
            id: `recert-${patient.id}`,
            type: 'recertification',
            severity: daysUntil <= 7 ? 'critical' : 'warning',
            title: 'Recertification Due Soon',
            message: `${patient.first_name} ${patient.last_name} - recertification due in ${daysUntil} days`,
            dueDate: nextRecertDue,
            link: `${createPageUrl("PatientDetails")}?patientId=${patient.id}`,
            linkText: 'View Patient',
            category: 'Recertification',
            timestamp: nextRecertDue.toISOString()
          });
        } else if (daysUntil <= 0) {
          alerts.push({
            id: `recert-overdue-${patient.id}`,
            type: 'recertification',
            severity: 'critical',
            title: 'Recertification Overdue',
            message: `${patient.first_name} ${patient.last_name} - recertification ${Math.abs(daysUntil)} days overdue`,
            dueDate: nextRecertDue,
            link: `${createPageUrl("PatientDetails")}?patientId=${patient.id}`,
            linkText: 'Schedule Recert',
            category: 'Recertification',
            timestamp: nextRecertDue.toISOString()
          });
        }
      }
    });

    // Care Plan Reviews
    (carePlans || []).forEach(cp => {
      if (cp.status === 'active' && cp.target_date) {
        const targetDate = new Date(cp.target_date);
        const daysUntil = differenceInDays(targetDate, today);
        
        if (daysUntil <= 7 && daysUntil > 0) {
          const patient = patients.find(p => p.id === cp.patient_id);
          alerts.push({
            id: `careplan-${cp.id}`,
            type: 'careplan',
            severity: 'info',
            title: 'Care Plan Goal Due',
            message: `${patient?.first_name || 'Patient'}'s goal "${cp.goal?.substring(0, 40)}..." due in ${daysUntil} days`,
            dueDate: targetDate,
            link: createPageUrl("CarePlanManagement"),
            linkText: 'Review',
            category: 'Care Plans',
            timestamp: cp.target_date
          });
        } else if (daysUntil <= 0) {
          const patient = patients.find(p => p.id === cp.patient_id);
          alerts.push({
            id: `careplan-overdue-${cp.id}`,
            type: 'careplan',
            severity: 'warning',
            title: 'Care Plan Goal Overdue',
            message: `${patient?.first_name || 'Patient'}'s goal "${cp.goal?.substring(0, 40)}..." is ${Math.abs(daysUntil)} days past target`,
            dueDate: targetDate,
            link: createPageUrl("CarePlanManagement"),
            linkText: 'Update Status',
            category: 'Care Plans',
            timestamp: cp.target_date
          });
        }
      }
    });

    // Unresolved Incidents
    (incidents || []).forEach(incident => {
      const patient = patients.find(p => p.id === incident.patient_id);
      const daysSince = differenceInDays(today, new Date(incident.incident_date));
      
      alerts.push({
        id: `incident-${incident.id}`,
        type: 'incident',
        severity: incident.severity === 'high' ? 'critical' : 'warning',
        title: `Unresolved ${(incident.incident_type || '').replace(/_/g, ' ')} Incident`,
        message: `${patient?.first_name || 'Patient'} ${patient?.last_name || ''} - reported ${daysSince} days ago`,
        daysAgo: daysSince,
        link: `${createPageUrl("PatientDetails")}?patientId=${incident.patient_id}`,
        linkText: 'Review',
        category: 'Incidents',
        timestamp: incident.incident_date
      });
    });

    // Security Alerts
    const recentSecurityEvents = (securityLogs || []).filter(log => {
      const logDate = new Date(log.timestamp);
      return differenceInDays(today, logDate) <= 7 && 
             (log.action?.includes('UNAUTHORIZED') || log.action?.includes('FAILED') || log.action?.includes('ERROR'));
    });

    if (recentSecurityEvents.length > 0) {
      alerts.push({
        id: 'security-alerts',
        type: 'security',
        severity: 'warning',
        title: 'Security Events Detected',
        message: `${recentSecurityEvents.length} security event(s) in the last 7 days require review`,
        count: recentSecurityEvents.length,
        link: createPageUrl("AdminDashboard"),
        linkText: 'View Logs',
        category: 'Security',
        timestamp: recentSecurityEvents[0]?.timestamp
      });
    }

    // Quality Measure Alerts
    const incompleteVisits = (visits || []).filter(v => 
      v.status === 'completed' && 
      (!v.nurse_notes || v.nurse_notes.length < 100)
    );
    
    if (incompleteVisits.length > 0) {
      alerts.push({
        id: 'quality-documentation',
        type: 'quality',
        severity: 'warning',
        title: 'Incomplete Visit Documentation',
        message: `${incompleteVisits.length} completed visit(s) have minimal documentation`,
        count: incompleteVisits.length,
        link: createPageUrl("QualityDashboard"),
        linkText: 'Review Quality',
        category: 'Quality Measures',
        timestamp: new Date().toISOString()
      });
    }

    // OASIS Submission Deadlines (simulated)
    const recentAdmissions = (visits || []).filter(v => 
      v.visit_type === 'admission' && 
      differenceInDays(today, new Date(v.visit_date)) <= 5 &&
      differenceInDays(today, new Date(v.visit_date)) >= 3
    );

    recentAdmissions.forEach(admission => {
      const patient = patients.find(p => p.id === admission.patient_id);
      const daysRemaining = 5 - differenceInDays(today, new Date(admission.visit_date));
      
      alerts.push({
        id: `oasis-${admission.id}`,
        type: 'oasis',
        severity: daysRemaining <= 2 ? 'critical' : 'warning',
        title: 'OASIS Submission Deadline',
        message: `${patient?.first_name || 'Patient'} ${patient?.last_name || ''} - OASIS due in ${daysRemaining} days`,
        daysRemaining,
        link: `${createPageUrl("DocumentVisit")}?visitId=${admission.id}`,
        linkText: 'Complete OASIS',
        category: 'OASIS',
        timestamp: admission.visit_date
      });
    });

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts
      .filter(a => !dismissedAlerts.includes(a.id))
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [patients, visits, carePlans, incidents, securityLogs, dismissedAlerts]);

  const filteredAlerts = useMemo(() => {
    return aggregatedAlerts.filter(alert => {
      const matchesCategory = filterCategory === 'all' || alert.category === filterCategory;
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesSearch = !searchTerm || 
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSeverity && matchesSearch;
    });
  }, [aggregatedAlerts, filterCategory, filterSeverity, searchTerm]);

  const alertCounts = useMemo(() => ({
    critical: aggregatedAlerts.filter(a => a.severity === 'critical').length,
    warning: aggregatedAlerts.filter(a => a.severity === 'warning').length,
    info: aggregatedAlerts.filter(a => a.severity === 'info').length,
    total: aggregatedAlerts.length
  }), [aggregatedAlerts]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    aggregatedAlerts.forEach(a => {
      breakdown[a.category] = (breakdown[a.category] || 0) + 1;
    });
    return breakdown;
  }, [aggregatedAlerts]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'info': return <Bell className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-l-4 border-l-red-500';
      case 'warning': return 'bg-orange-50 border-l-4 border-l-orange-500';
      case 'info': return 'bg-blue-50 border-l-4 border-l-blue-500';
      default: return 'bg-gray-50 border-l-4 border-l-gray-500';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Documentation': return <FileText className="w-4 h-4" />;
      case 'Recertification': return <Calendar className="w-4 h-4" />;
      case 'Care Plans': return <Target className="w-4 h-4" />;
      case 'Incidents': return <AlertTriangle className="w-4 h-4" />;
      case 'Security': return <Shield className="w-4 h-4" />;
      case 'Quality Measures': return <TrendingUp className="w-4 h-4" />;
      case 'OASIS': return <FileText className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const handleDismiss = (id) => {
    setDismissedAlerts([...dismissedAlerts, id]);
  };

  const quickLinks = [
    { name: 'Care Plans', url: createPageUrl('CarePlanManagement'), icon: Target, color: 'bg-green-500' },
    { name: 'Security Logs', url: createPageUrl('AdminDashboard'), icon: Shield, color: 'bg-orange-500' },
    { name: 'Patients', url: createPageUrl('Patients'), icon: User, color: 'bg-teal-500' },
  ];

  const exportComplianceReport = () => {
    const report = {
      generated: new Date().toISOString(),
      summary: alertCounts,
      alerts: aggregatedAlerts.map(a => ({
        category: a.category,
        severity: a.severity,
        title: a.title,
        message: a.message,
        timestamp: a.timestamp
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Aggregated alerts and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportComplianceReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3 md:p-4 text-center">
            <XCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 opacity-80" />
            <p className="text-2xl md:text-3xl font-bold">{alertCounts.critical}</p>
            <p className="text-xs md:text-sm opacity-90">Critical</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3 md:p-4 text-center">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 opacity-80" />
            <p className="text-2xl md:text-3xl font-bold">{alertCounts.warning}</p>
            <p className="text-xs md:text-sm opacity-90">Warnings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3 md:p-4 text-center">
            <Bell className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 opacity-80" />
            <p className="text-2xl md:text-3xl font-bold">{alertCounts.info}</p>
            <p className="text-xs md:text-sm opacity-90">Info</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3 md:p-4 text-center">
            <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 opacity-80" />
            <p className="text-2xl md:text-3xl font-bold">{Math.max(0, 100 - alertCounts.total * 2)}%</p>
            <p className="text-xs md:text-sm opacity-90">Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alert Banner */}
      {alertCounts.critical > 0 && (
        <Alert className="mb-6 bg-red-100 border-red-300">
          <XCircle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <span className="font-bold">⚠️ {alertCounts.critical} Critical Alert(s) Require Immediate Attention</span>
            <span className="ml-2">Scroll down to view and resolve.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for Compliance Sections */}
      <Tabs defaultValue="alerts" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="alerts">Compliance Alerts</TabsTrigger>
          <TabsTrigger value="auditor">Audit Documentation</TabsTrigger>
          <TabsTrigger value="rules">Configure Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="auditor">
          <EnhancedComplianceAuditor />
        </TabsContent>

        <TabsContent value="rules">
          <ComplianceRuleManager />
        </TabsContent>

        <TabsContent value="alerts">
          {/* Quick Links */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {quickLinks.map((link, idx) => (
                  <Link key={idx} to={link.url}>
                    <div className="p-2 md:p-3 rounded-lg border hover:shadow-md transition-all text-center cursor-pointer">
                      <div className={`w-8 h-8 md:w-10 md:h-10 ${link.color} rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2`}>
                        <link.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <p className="text-[10px] md:text-xs font-medium text-gray-700 truncate">{link.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Main Alerts List */}
            <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search alerts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Documentation">Documentation</SelectItem>
                        <SelectItem value="Recertification">Recertification</SelectItem>
                        <SelectItem value="Care Plans">Care Plans</SelectItem>
                        <SelectItem value="Incidents">Incidents</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Quality Measures">Quality Measures</SelectItem>
                        <SelectItem value="OASIS">OASIS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
                      <p className="text-gray-500">No compliance alerts match your current filters.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredAlerts.map((alert) => (
                    <Card key={alert.id} className={`${getSeverityStyle(alert.severity)} border`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getSeverityIcon(alert.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryIcon(alert.category)}
                                <span className="ml-1">{alert.category}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                            <div className="flex items-center gap-3">
                              <Link to={alert.link}>
                                <Button size="sm" className="gap-1">
                                  {alert.linkText}
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismiss(alert.id)}
                                className="text-gray-500"
                              >
                                Dismiss
                              </Button>
                              {alert.timestamp && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {format(new Date(alert.timestamp), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 order-1 lg:order-2">
              {/* Category Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(categoryBreakdown).map(([category, count]) => (
                      <div 
                        key={category} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setFilterCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="text-sm">{category}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aggregatedAlerts
                      .filter(a => a.dueDate || a.daysRemaining)
                      .slice(0, 5)
                      .map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{alert.title.substring(0, 20)}...</span>
                          <Badge variant="outline" className={
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                            alert.severity === 'warning' ? 'bg-orange-100 text-orange-800' : 
                            'bg-blue-100 text-blue-800'
                          }>
                            {alert.daysRemaining ? `${alert.daysRemaining}d` : 
                             alert.dueDate ? format(new Date(alert.dueDate), 'MMM d') : ''}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Policy & Guideline Monitor */}
              <PolicyGuidelineMonitor 
                nurseEmail={currentUser?.email}
                onTrainingRecommended={(topics) => console.log('Training recommended:', topics)}
              />

              {/* Automated Compliance Reporting */}
              <AutomatedComplianceReporting 
                nurseEmail={currentUser?.email}
                isAdmin={currentUser?.role === 'admin'}
              />

              {/* Compliance Tips */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                    <Sparkles className="w-5 h-5" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-indigo-800">
                    <li>• Complete documentation within 24 hours</li>
                    <li>• Schedule recerts 2 weeks before due date</li>
                    <li>• Review care plans at each visit</li>
                    <li>• Document homebound status every visit</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}