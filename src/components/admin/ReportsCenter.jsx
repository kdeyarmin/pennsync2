import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  FileText,
  Calendar,
  Clock,
  Target,
  Award,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

export default function ReportsCenter({ users, patients, visits, incidents }) {
  const [reportType, setReportType] = useState("productivity");
  const [dateRange, setDateRange] = useState("30");
  const [selectedNurse, setSelectedNurse] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      const today = new Date();
      const startDate = format(subDays(today, parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      if (exportFormat === 'pdf') {
        // Generate comprehensive PDF using backend function
        const response = await base44.functions.invoke('generateComprehensiveReport', {
          reportType,
          dateRange,
          includeCharts: false
        });

        // Handle arraybuffer response
        const data = response.data || response;
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `penn-sync-${reportType}-report-${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // Original CSV export
        const filteredVisits = visits.filter(v => 
          v.visit_date >= startDate && v.visit_date <= endDate
        );
        
        const filteredIncidents = incidents.filter(i =>
          i.incident_date >= startDate && i.incident_date <= endDate
        );

        let reportContent = '';
        let fileName = '';

        switch (reportType) {
          case 'productivity':
            ({ content: reportContent, fileName } = generateProductivityReport(filteredVisits, users, startDate, endDate));
            break;
          case 'quality':
            ({ content: reportContent, fileName } = generateQualityReport(filteredVisits, filteredIncidents, patients, startDate, endDate));
            break;
          case 'financial':
            ({ content: reportContent, fileName } = generateFinancialReport(filteredVisits, patients, startDate, endDate));
            break;
          case 'compliance':
            ({ content: reportContent, fileName } = generateComplianceReport(filteredVisits, patients, startDate, endDate));
            break;
          case 'clinical':
            ({ content: reportContent, fileName } = generateClinicalReport(filteredVisits, patients, startDate, endDate));
            break;
          case 'staff':
            ({ content: reportContent, fileName } = generateStaffPerformanceReport(filteredVisits, users, startDate, endDate));
            break;
          default:
            throw new Error('Unknown report type');
        }

        // Download report as CSV
        const blob = new Blob([reportContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
    
    setIsGenerating(false);
  };

  // Productivity Report
  const generateProductivityReport = (visits, users, startDate, endDate) => {
    const nurseStats = {};
    
    users.filter(u => u.role === 'user').forEach(nurse => {
      const nurseVisits = visits.filter(v => v.created_by === nurse.email);
      const completed = nurseVisits.filter(v => v.status === 'completed').length;
      
      // Calculate documentation time
      const visitsWithTime = nurseVisits.filter(v => v.start_time && v.end_time);
      let avgDocTime = 0;
      if (visitsWithTime.length > 0) {
        const totalMins = visitsWithTime.reduce((sum, v) => {
          try {
            const start = new Date(`2000-01-01 ${v.start_time}`);
            const end = new Date(`2000-01-01 ${v.end_time}`);
            return sum + ((end - start) / 1000 / 60);
          } catch {
            return sum;
          }
        }, 0);
        avgDocTime = Math.round(totalMins / visitsWithTime.length);
      }
      
      nurseStats[nurse.email] = {
        name: nurse.full_name || nurse.email,
        totalVisits: nurseVisits.length,
        completedVisits: completed,
        scheduledVisits: nurseVisits.filter(v => v.status === 'scheduled').length,
        cancelledVisits: nurseVisits.filter(v => v.status === 'cancelled').length,
        completionRate: nurseVisits.length > 0 ? Math.round((completed / nurseVisits.length) * 100) : 0,
        avgDocTime,
        timeSaved: completed * 95 // Penn Sync saves ~95 min per visit
      };
    });

    let content = `Penn Sync Productivity Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `Nurse,Total Visits,Completed,Scheduled,Cancelled,Completion Rate %,Avg Doc Time (min),Time Saved by Penn Sync (hours)\n`;
    
    Object.values(nurseStats).forEach(stats => {
      content += `${stats.name},${stats.totalVisits},${stats.completedVisits},${stats.scheduledVisits},${stats.cancelledVisits},${stats.completionRate},${stats.avgDocTime},${Math.round(stats.timeSaved / 60)}\n`;
    });

    return {
      content,
      fileName: `penn-sync-productivity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  // Quality Report
  const generateQualityReport = (visits, incidents, patients, startDate, endDate) => {
    const completedVisits = visits.filter(v => v.status === 'completed');
    const activePatients = patients.filter(p => p.status === 'active').length;
    
    const falls = incidents.filter(i => i.incident_type === 'fall').length;
    const hospitalizations = incidents.filter(i => i.incident_type === 'hospitalized').length;
    const medErrors = incidents.filter(i => i.incident_type === 'medication_error').length;
    
    const fallRate = visits.length > 0 ? Math.round((falls / visits.length) * 1000) : 0;
    const hospitalizationRate = activePatients > 0 ? Math.round((hospitalizations / activePatients) * 100) : 0;

    let content = `Penn Sync Quality Metrics Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `OVERALL METRICS\n`;
    content += `Total Visits,${visits.length}\n`;
    content += `Completed Visits,${completedVisits.length}\n`;
    content += `Completion Rate,${visits.length > 0 ? Math.round((completedVisits.length / visits.length) * 100) : 0}%\n`;
    content += `Active Patients,${activePatients}\n\n`;
    content += `PATIENT OUTCOMES\n`;
    content += `Falls,${falls}\n`;
    content += `Fall Rate (per 1000 visits),${fallRate}\n`;
    content += `Hospitalizations,${hospitalizations}\n`;
    content += `Hospitalization Rate (per 100 patients),${hospitalizationRate}\n`;
    content += `Medication Errors,${medErrors}\n`;

    return {
      content,
      fileName: `penn-sync-quality-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  // Financial Report
  const generateFinancialReport = (visits, patients, startDate, endDate) => {
    const visitTypes = {};
    visits.forEach(v => {
      const type = v.visit_type || 'unknown';
      visitTypes[type] = (visitTypes[type] || 0) + 1;
    });

    // Estimated revenue per visit type (Medicare averages)
    const revenuePerType = {
      'skilled_nursing': 180,
      'admission': 250,
      'recertification': 200,
      'discharge': 150,
      'routine_visit': 160,
      'prn': 170,
      'unknown': 160
    };

    let totalRevenue = 0;
    Object.entries(visitTypes).forEach(([type, count]) => {
      totalRevenue += count * (revenuePerType[type] || 160);
    });

    const timeSavedHours = visits.filter(v => v.status === 'completed').length * 95 / 60;
    const costSavings = timeSavedHours * 40; // Avg nurse hourly cost

    let content = `Penn Sync Financial Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `REVENUE ANALYSIS\n`;
    content += `Visit Type,Count,Est. Revenue Per Visit,Total Revenue\n`;
    
    Object.entries(visitTypes).forEach(([type, count]) => {
      const revenue = count * (revenuePerType[type] || 160);
      content += `${type.replace(/_/g, ' ')},${count},$${revenuePerType[type] || 160},$${revenue}\n`;
    });
    
    content += `\nTOTAL ESTIMATED REVENUE,$${totalRevenue}\n\n`;
    content += `PENN SYNC ROI\n`;
    content += `Documentation Time Saved (hours),${Math.round(timeSavedHours)}\n`;
    content += `Cost Savings from Efficiency,$${Math.round(costSavings)}\n`;
    content += `Active Patients,${patients.filter(p => p.status === 'active').length}\n`;

    return {
      content,
      fileName: `penn-sync-financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  // Compliance Report
  const generateComplianceReport = (visits, patients, startDate, endDate) => {
    const completedVisits = visits.filter(v => v.status === 'completed');
    const visitsWithNotes = completedVisits.filter(v => v.nurse_notes && v.nurse_notes.length > 100);
    const visitsWithVitals = completedVisits.filter(v => v.vital_signs && Object.keys(v.vital_signs).length > 0);
    
    const complianceRate = completedVisits.length > 0 
      ? Math.round((visitsWithNotes.length / completedVisits.length) * 100)
      : 0;

    const visitsWithinTimeframe = completedVisits.filter(v => {
      if (!v.visit_date || !v.created_date) return false;
      const visitDate = new Date(v.visit_date);
      const docDate = new Date(v.created_date);
      return differenceInDays(docDate, visitDate) <= 7;
    });

    let content = `Penn Sync Medicare Compliance Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `DOCUMENTATION COMPLIANCE\n`;
    content += `Total Completed Visits,${completedVisits.length}\n`;
    content += `Visits with Complete Documentation,${visitsWithNotes.length}\n`;
    content += `Visits with Vital Signs,${visitsWithVitals.length}\n`;
    content += `Documentation Compliance Rate,${complianceRate}%\n`;
    content += `Visits Documented Within 7 Days,${visitsWithinTimeframe.length}\n`;
    content += `Timely Documentation Rate,${completedVisits.length > 0 ? Math.round((visitsWithinTimeframe.length / completedVisits.length) * 100) : 0}%\n`;

    return {
      content,
      fileName: `penn-sync-compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  // Clinical Report
  const generateClinicalReport = (visits, patients, startDate, endDate) => {
    const diagnoses = {};
    patients.forEach(p => {
      if (p.primary_diagnosis) {
        diagnoses[p.primary_diagnosis] = (diagnoses[p.primary_diagnosis] || 0) + 1;
      }
    });

    // Analyze vital signs trends
    const vitalsTrends = {};
    visits.filter(v => v.vital_signs).forEach(v => {
      if (v.vital_signs.blood_pressure_systolic) {
        vitalsTrends.avgBPSystolic = (vitalsTrends.avgBPSystolic || 0) + v.vital_signs.blood_pressure_systolic;
      }
      if (v.vital_signs.heart_rate) {
        vitalsTrends.avgHeartRate = (vitalsTrends.avgHeartRate || 0) + v.vital_signs.heart_rate;
      }
    });

    const visitsWithVitals = visits.filter(v => v.vital_signs && Object.keys(v.vital_signs).length > 0).length;
    if (visitsWithVitals > 0) {
      vitalsTrends.avgBPSystolic = Math.round(vitalsTrends.avgBPSystolic / visitsWithVitals);
      vitalsTrends.avgHeartRate = Math.round(vitalsTrends.avgHeartRate / visitsWithVitals);
    }

    let content = `Penn Sync Clinical Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `DIAGNOSIS DISTRIBUTION\n`;
    content += `Diagnosis,Patient Count\n`;
    
    Object.entries(diagnoses)
      .sort((a, b) => b[1] - a[1])
      .forEach(([diagnosis, count]) => {
        content += `${diagnosis},${count}\n`;
      });

    content += `\nVITAL SIGNS AVERAGES\n`;
    content += `Average Systolic BP,${vitalsTrends.avgBPSystolic || 'N/A'}\n`;
    content += `Average Heart Rate,${vitalsTrends.avgHeartRate || 'N/A'}\n`;

    return {
      content,
      fileName: `penn-sync-clinical-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  // Staff Performance Report
  const generateStaffPerformanceReport = (visits, users, startDate, endDate) => {
    const nursePerformance = {};
    
    users.filter(u => u.role === 'user').forEach(nurse => {
      const nurseVisits = visits.filter(v => v.created_by === nurse.email);
      const completed = nurseVisits.filter(v => v.status === 'completed');
      
      const visitsWithCompleteDoc = completed.filter(v => 
        v.nurse_notes && v.nurse_notes.length > 100 &&
        v.vital_signs && Object.keys(v.vital_signs).length > 0
      );

      nursePerformance[nurse.email] = {
        name: nurse.full_name || nurse.email,
        totalAssigned: nurseVisits.length,
        completed: completed.length,
        completionRate: nurseVisits.length > 0 ? Math.round((completed.length / nurseVisits.length) * 100) : 0,
        docQualityRate: completed.length > 0 ? Math.round((visitsWithCompleteDoc.length / completed.length) * 100) : 0,
        careScope: nurse.care_scope || 'not set',
        credentials: nurse.credentials || 'not set'
      };
    });

    let content = `Penn Sync Staff Performance Report\n`;
    content += `Date Range: ${startDate} to ${endDate}\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    content += `Nurse,Credentials,Care Scope,Total Assigned,Completed,Completion Rate %,Documentation Quality %\n`;
    
    Object.values(nursePerformance)
      .sort((a, b) => b.completionRate - a.completionRate)
      .forEach(perf => {
        content += `${perf.name},${perf.credentials},${perf.careScope},${perf.totalAssigned},${perf.completed},${perf.completionRate},${perf.docQualityRate}\n`;
      });

    return {
      content,
      fileName: `penn-sync-staff-performance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    };
  };

  const reportTypes = [
    {
      value: 'productivity',
      label: 'Productivity Report',
      icon: TrendingUp,
      description: 'Visit counts, completion rates, documentation time, Penn Sync time savings'
    },
    {
      value: 'quality',
      label: 'Quality Metrics Report',
      icon: Award,
      description: 'Patient outcomes, incident rates, quality indicators'
    },
    {
      value: 'financial',
      label: 'Financial Report',
      icon: DollarSign,
      description: 'Revenue analysis by visit type, ROI from Penn Sync efficiency'
    },
    {
      value: 'compliance',
      label: 'Medicare Compliance Report',
      icon: FileText,
      description: 'Documentation compliance, timely completion, Medicare requirements'
    },
    {
      value: 'clinical',
      label: 'Clinical Report',
      icon: Activity,
      description: 'Diagnosis trends, vital signs analysis, clinical patterns'
    },
    {
      value: 'staff',
      label: 'Staff Performance Report',
      icon: Users,
      description: 'Individual nurse performance, completion rates, quality scores'
    }
  ];

  const selectedReportType = reportTypes.find(r => r.value === reportType);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Penn Sync Reports Center</h2>
              <p className="text-blue-100">
                Generate comprehensive reports and analytics for your agency
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 6 Months</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-6">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="csv">CSV Spreadsheet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReportType && (
            <Card className="bg-blue-50 border-blue-200 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <selectedReportType.icon className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{selectedReportType.label}</h4>
                    <p className="text-sm text-gray-700">{selectedReportType.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {exportFormat.toUpperCase()}...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate {exportFormat.toUpperCase()} Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Previews */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map(type => (
          <Card key={type.value} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setReportType(type.value)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <type.icon className="w-6 h-6 text-white" />
                </div>
                {reportType === type.value && (
                  <Badge className="bg-green-500">Selected</Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{type.label}</h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}