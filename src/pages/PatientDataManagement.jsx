import React, { useState, useMemo } from "react";
import DuplicateScanner from "../components/patient/DuplicateScanner";
import PatientFileUpdateUploader from "../components/patient/PatientFileUpdateUploader";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  Activity,
  Calendar,
  MoreVertical,
  Flag,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Database
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatEastern } from "../components/utils/timezone";

export default function PatientDataManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      try {
        const allPatients = await base44.entities.Patient.list('-created_date', 2000);
        return allPatients.filter(patient => !patient.is_archived);
      } catch (err) {
        console.error('Failed to load patients:', err);
        return [];
      }
    },
    initialData: [],
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: async () => {
      try {
        return await base44.entities.Visit.list('-visit_date', 500);
      } catch (err) {
        console.error('Failed to load visits:', err);
        return [];
      }
    },
    initialData: [],
  });

  const { data: allAlerts = [] } = useQuery({
    queryKey: ['allAlerts'],
    queryFn: async () => {
      try {
        return await base44.entities.PatientAlert.list('-created_date', 200);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        return [];
      }
    },
    initialData: [],
  });

  const { data: allIncidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: async () => {
      try {
        return await base44.entities.Incident.list('-incident_date', 200);
      } catch (err) {
        console.error('Failed to load incidents:', err);
        return [];
      }
    },
    initialData: [],
  });

  // Get unique diagnoses for filter
  const uniqueDiagnoses = useMemo(() => {
    const diagnoses = new Set();
    patients.forEach(p => {
      if (p.primary_diagnosis) diagnoses.add(p.primary_diagnosis);
    });
    return Array.from(diagnoses).sort();
  }, [patients]);

  // Enhanced patient data with activity and alerts
  const enhancedPatients = useMemo(() => {
    return patients.map(patient => {
      const patientVisits = allVisits.filter(v => v.patient_id === patient.id);
      const patientAlerts = allAlerts.filter(a => a.patient_id === patient.id && a.status === 'active');
      const patientIncidents = allIncidents.filter(i => i.patient_id === patient.id);
      
      const recentVisit = patientVisits[0];
      const activeAlertsCount = patientAlerts.length;
      const criticalAlerts = patientAlerts.filter(a => a.severity === 'critical').length;
      
      return {
        ...patient,
        recentVisit,
        totalVisits: patientVisits.length,
        activeAlertsCount,
        criticalAlerts,
        hasIncidents: patientIncidents.length > 0,
        lastActivity: recentVisit?.visit_date || patient.created_date,
        riskLevel: criticalAlerts > 0 ? 'high' : activeAlertsCount > 2 ? 'medium' : 'low'
      };
    });
  }, [patients, allVisits, allAlerts, allIncidents]);

  // Filter and sort
  const filteredAndSortedPatients = useMemo(() => {
    let filtered = enhancedPatients.filter(patient => {
      const matchesSearch = 
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.medical_record_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesDiagnosis = diagnosisFilter === 'all' || patient.primary_diagnosis === diagnosisFilter;
      const matchesAlert = 
        alertFilter === 'all' ||
        (alertFilter === 'critical' && patient.criticalAlerts > 0) ||
        (alertFilter === 'active' && patient.activeAlertsCount > 0) ||
        (alertFilter === 'none' && patient.activeAlertsCount === 0);
      
      return matchesSearch && matchesStatus && matchesDiagnosis && matchesAlert;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'lastActivity':
          aVal = new Date(a.lastActivity);
          bVal = new Date(b.lastActivity);
          break;
        case 'alerts':
          aVal = a.activeAlertsCount;
          bVal = b.activeAlertsCount;
          break;
        case 'visits':
          aVal = a.totalVisits;
          bVal = b.totalVisits;
          break;
        default:
          aVal = a.created_date;
          bVal = b.created_date;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [enhancedPatients, searchTerm, statusFilter, diagnosisFilter, alertFilter, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: enhancedPatients.length,
      active: enhancedPatients.filter(p => p.status === 'active').length,
      withAlerts: enhancedPatients.filter(p => p.activeAlertsCount > 0).length,
      critical: enhancedPatients.filter(p => p.criticalAlerts > 0).length,
    };
  }, [enhancedPatients]);

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      discharged: "bg-gray-100 text-gray-800 border-gray-200",
      hospitalized: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status] || colors.active;
  };

  const getRiskColor = (level) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800"
    };
    return colors[level] || colors.low;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <Minus className="w-4 h-4 opacity-30" />;
    return sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex md:grid md:w-full md:max-w-md md:grid-cols-2 gap-1 min-w-max h-auto md:h-14">
                <TabsTrigger value="overview" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Import Patients</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="m-0">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">Patient Data Management</h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Comprehensive overview and management of all patients</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Patients</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">With Alerts</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.withAlerts}</p>
              </div>
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Critical</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

            {/* Duplicate Scanner */}
            <div className="mb-4 sm:mb-6">
              <DuplicateScanner />
            </div>

            {/* Filters */}
            <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 touch-target"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discharged">Discharged</SelectItem>
                <SelectItem value="hospitalized">Hospitalized</SelectItem>
              </SelectContent>
            </Select>

            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Diagnosis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diagnoses</SelectItem>
                {uniqueDiagnoses.map(dx => (
                  <SelectItem key={dx} value={dx}>{dx}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="h-11 touch-target">
                <SelectValue placeholder="Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="active">With Alerts</SelectItem>
                <SelectItem value="none">No Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

            {/* Patient Table */}
            <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 text-base sm:text-lg">
            <span>Patients ({filteredAndSortedPatients.length})</span>
            <Link to={createPageUrl("Patients")} className="w-full sm:w-auto">
              <Button size="sm" className="min-h-[44px] w-full sm:w-auto">Manage Patients</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('name')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm p-1"
                    >
                      Patient <SortIcon field="name" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Diagnosis</TableHead>
                  <TableHead className="text-xs sm:text-sm">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('alerts')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm p-1"
                    >
                      Alerts <SortIcon field="alerts" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Risk</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('visits')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm p-1"
                    >
                      Visits <SortIcon field="visits" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm hidden xl:table-cell">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('lastActivity')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm p-1"
                    >
                      Last Activity <SortIcon field="lastActivity" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {patient.first_name} {patient.last_name}
                        </p>
                        {patient.medical_record_number && (
                          <p className="text-xs text-gray-500 truncate">
                            MRN: {patient.medical_record_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(patient.status)} text-xs`}>
                        {patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                      <span className="truncate block max-w-[150px]">
                        {patient.primary_diagnosis || 'Not specified'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {patient.activeAlertsCount > 0 ? (
                          <>
                            <Badge variant="outline" className="gap-1">
                              <Bell className="w-3 h-3" />
                              {patient.activeAlertsCount}
                            </Badge>
                            {patient.criticalAlerts > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                {patient.criticalAlerts} Critical
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            None
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge className={`${getRiskColor(patient.riskLevel)} text-xs`}>
                        {patient.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                      <span>{patient.totalVisits}</span>
                    </TableCell>
                    <TableCell className="text-xs hidden xl:table-cell">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span className="whitespace-nowrap">
                          {patient.lastActivity ? 
                            formatEastern(patient.lastActivity, 'MMM d, yyyy') : 
                            'No activity'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="min-h-[44px] w-10">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`${createPageUrl("PatientDetails")}?patientId=${patient.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`${createPageUrl("SmartNoteAssistant")}?patientId=${patient.id}`}>
                              <FileText className="w-4 h-4 mr-2" />
                              Create Note
                            </Link>
                          </DropdownMenuItem>
                          {patient.activeAlertsCount > 0 && (
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl("PatientAlerts")}?patientId=${patient.id}`}>
                                <Bell className="w-4 h-4 mr-2" />
                                View Alerts
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedPatient(patient);
                              setFlagDialogOpen(true);
                            }}
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Flag Patient
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedPatients.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No patients found matching your filters.</p>
            </div>
            )}
          </CardContent>
        </Card>

            {/* Flag Dialog */}
            <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Patient</DialogTitle>
            <DialogDescription>
              Create an alert or flag for {selectedPatient?.first_name} {selectedPatient?.last_name}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            This feature allows you to create custom alerts and flags for patients requiring special attention.
            Navigate to the Patient Alerts page to manage all alerts.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button asChild>
              <Link to={`${createPageUrl("PatientAlerts")}?patientId=${selectedPatient?.id}`}>
                Go to Alerts
              </Link>
            </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="import" className="m-0">
          <ImportPatientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Import Patients Component - extracted from ImportPatients.jsx
function ImportPatientsTab() {
  const [file, setFile] = useState(null);
  const [autoImporting, setAutoImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const queryClient = useQueryClient();

  const handleAutoImport = async (selectedFile) => {
    if (!selectedFile) return;

    setAutoImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      const text = await selectedFile.text();
      const response = await base44.functions.invoke('autoImportPatients', { fileContent: text });
      const data = response.data || response;
      
      if (data.success) {
        setImportResults(data.results);
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        setImportProgress(100);
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Auto import error:', error);
      alert('Auto import failed: ' + (error.response?.data?.error || error.message));
    }

    setAutoImporting(false);
  };

  const downloadTemplate = () => {
    const headers = [
      'first_name', 'last_name', 'middle_name', 'date_of_birth', 'medical_record_number',
      'phone', 'email', 'address', 'payor',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'physician_name', 'physician_phone', 'physician_email',
      'primary_diagnosis', 'allergies',
      'admission_date', 'care_type', 'status'
    ];
    const sampleRow = [
      'John', 'Doe', 'A', '1950-05-20', '12345',
      '555-123-4567', 'john.doe@email.com', '123 Main St, City, PA 12345', 'Medicare',
      'Jane Doe', '555-987-6543', 'Spouse',
      'Dr. Smith', '555-111-2222', 'dr.smith@clinic.com',
      'Congestive Heart Failure', 'NKDA',
      '2024-01-15', 'home_health', 'active'
    ];
    const csv = headers.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.csv';
    a.click();
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <span className="truncate">Import Patients</span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-gray-600">
          Upload a CSV file to import multiple patient records at once
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Get Started</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Download our CSV template to ensure your data is formatted correctly
            </p>
            <Button onClick={downloadTemplate} variant="outline" className="w-full min-h-[44px]">
              <FileText className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Quick Import
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Upload your CSV file and automatically import all patients
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAutoImport(file);
              }}
              className="hidden"
              id="auto-import"
              disabled={autoImporting}
            />
            <label htmlFor="auto-import" className="block">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 min-h-[44px]" 
                disabled={autoImporting}
                asChild
              >
                <span>
                  {autoImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Import
                    </>
                  )}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {autoImporting && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Importing patients...</span>
              <span className="text-sm text-gray-600">{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {importResults && (
        <Card className="border-green-300 border-2">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2 sm:gap-3 text-green-900">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
              <span className="truncate">Import Completed!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Card className="bg-green-50 border-green-200 border-2">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-green-600 text-xs sm:text-sm font-medium mb-1 truncate">Processed</p>
                      <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-700">{importResults.success}</p>
                    </div>
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-green-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              {importResults.failed > 0 && (
                <Card className="bg-red-50 border-red-200 border-2">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-red-600 text-xs sm:text-sm font-medium mb-1 truncate">Failed</p>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-700">{importResults.failed}</p>
                      </div>
                      <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-red-500 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 sm:mt-6">
        <CardContent className="p-4 sm:p-6 text-center text-gray-500">
          <p className="text-xs sm:text-sm">
            For advanced import options with manual column mapping and validation, use the full Import Patients feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Reusable import component
const ImportPatientsTabContent = () => {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <p className="text-gray-600 text-center py-8">Import functionality placeholder</p>
    </div>
  );
}