import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  Users,
} from "lucide-react";

const REPORT_OPTIONS = {
  active_census: {
    label: "Current patient census",
    helper: "Adds only patients that are not already in the system after verifying by MRN or by name and DOB.",
  },
  discharge_report: {
    label: "Discharged patient report",
    helper: "Finds matching patients and marks them discharged + archived so they are hidden from active rosters.",
  },
};

export default function PatientFileUpdateUploader() {
  const [fileName, setFileName] = useState("");
  const [reportType, setReportType] = useState("active_census");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    },
  });

  const processFileMutation = useMutation({
    mutationFn: async ({ fileUrl, selectedReportType }) => {
      const response = await base44.functions.invoke("processPatientFileUpdate", {
        file_url: fileUrl,
        report_type: selectedReportType,
      });
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    setIsProcessing(true);
    setResults(null);

    try {
      const fileUrl = await uploadFileMutation.mutateAsync(selectedFile);
      const processResults = await processFileMutation.mutateAsync({
        fileUrl,
        selectedReportType: reportType,
      });

      if (!processResults.success) {
        throw new Error(processResults.error || "Failed to process file");
      }

      setResults(processResults.results);
    } catch (error) {
      alert(error.message || "Failed to process file");
    }

    setIsProcessing(false);
    event.target.value = "";
  };

  const summaryCards = [
    {
      key: "processed",
      label: "Rows processed",
      value: results?.processed || 0,
      className: "bg-blue-50 text-blue-700",
      icon: FileText,
    },
    {
      key: "created",
      label: "New patients added",
      value: results?.created || 0,
      className: "bg-green-50 text-green-700",
      icon: Users,
    },
    {
      key: "matchedExisting",
      label: "Already in system",
      value: results?.matchedExisting || 0,
      className: "bg-amber-50 text-amber-700",
      icon: CheckCircle2,
    },
    {
      key: "discharged",
      label: "Discharged + archived",
      value: results?.archived || results?.discharged || 0,
      className: "bg-slate-50 text-slate-700",
      icon: Archive,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Patient roster import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Upload a CSV export with the patient headers from your census or discharge report. Verification is done by MRN first, then by name + DOB when MRN is not available.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Report type</p>
          <Select value={reportType} onValueChange={setReportType} disabled={isProcessing}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active_census">{REPORT_OPTIONS.active_census.label}</SelectItem>
              <SelectItem value="discharge_report">{REPORT_OPTIONS.discharge_report.label}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">{REPORT_OPTIONS[reportType].helper}</p>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="patient-file-upload"
            disabled={isProcessing}
          />
          <label htmlFor="patient-file-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {fileName || "Click to upload CSV file"}
            </p>
            <p className="text-xs text-gray-500">CSV only • several hundred rows supported</p>
          </label>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Carefully verifying uploaded patients...
            </div>
            <Progress value={60} className="h-2" />
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className={`rounded-lg p-4 ${card.className}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold opacity-80">{card.label}</p>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                      </div>
                      <Icon className="w-6 h-6 opacity-80" />
                    </div>
                  </div>
                );
              })}
            </div>

            {results.skippedInFileDuplicates > 0 && (
              <Alert>
                <AlertDescription>
                  {results.skippedInFileDuplicates} duplicate row{results.skippedInFileDuplicates === 1 ? " was" : "s were"} skipped because the same patient appeared more than once in the uploaded file.
                </AlertDescription>
              </Alert>
            )}

            {results.errors?.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-900 mb-3">Items needing attention ({results.errors.length})</h3>
                <ScrollArea className="h-56 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {results.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <span className="font-semibold">{error.patient}</span>
                          {error.row ? ` • row ${error.row}` : ""}
                          {`: ${error.error}`}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {results.errors?.length === 0 && (
              <Alert>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription>
                  Import completed successfully with no verification conflicts.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFileName("");
                setResults(null);
              }}
            >
              Upload another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PendingPatientUpdates from "./PendingPatientUpdates";

export default function PatientFileUpdateUploader() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedPatients, setExpandedPatients] = useState({});
  const [showPendingUpdates, setShowPendingUpdates] = useState(false);
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);
  
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }
  });

  const processFileMutation = useMutation({
    mutationFn: async (fileUrl) => {
      try {
        const response = await base44.functions.invoke('processPatientFileUpdate', { file_url: fileUrl });
        return response.data || response;
      } catch (error) {
        console.error('Process file mutation error:', error);
        throw new Error(error.response?.data?.details || error.message || 'Failed to process file');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setResults(null);

    try {
      // Upload file
      const fileUrl = await uploadFileMutation.mutateAsync(selectedFile);

      // Process file and update patients
      const processResults = await processFileMutation.mutateAsync(fileUrl);

      if (processResults.success) {
        setResults(processResults.results);
      } else {
        throw new Error(processResults.details || processResults.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = error.message || error.response?.data?.details || 'Failed to process file. Please check the file format and try again.';
      alert('Error: ' + errorMessage);
    }
    
    setIsProcessing(false);
  };

  const togglePatient = (index) => {
    setExpandedPatients(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleDeleteDuplicates = async () => {
    if (!results?.errors?.length) return;
    
    const duplicateErrors = results.errors.filter(err => 
      err.error.includes('Duplicate detected') || err.error.includes('Multiple potential matches')
    );
    
    if (duplicateErrors.length === 0) {
      alert('No duplicates found to delete');
      return;
    }
    
    const confirmDelete = confirm(
      `Are you sure you want to delete ${duplicateErrors.length} duplicate patient(s)?\n\n` +
      `This will permanently remove: ${duplicateErrors.map(e => e.patient).join(', ')}`
    );
    
    if (!confirmDelete) return;
    
    setDeletingDuplicates(true);
    
    try {
      let deletedCount = 0;
      let failedCount = 0;
      
      // Fetch all patients to find and delete duplicates
      const allPatients = await base44.entities.Patient.list();
      
      for (const error of duplicateErrors) {
        try {
          const patientName = error.patient.trim();
          const [firstName, ...lastNameParts] = patientName.split(' ');
          const lastName = lastNameParts.join(' ');
          
          // Find matching patient(s) to delete
          const matchingPatients = allPatients.filter(p => {
            const pFirstName = p.first_name?.toLowerCase().trim();
            const pLastName = p.last_name?.toLowerCase().trim();
            return pFirstName === firstName.toLowerCase() && 
                   pLastName === lastName.toLowerCase();
          });
          
          // Delete all matching patients
          for (const patient of matchingPatients) {
            await base44.entities.Patient.delete(patient.id);
            deletedCount++;
          }
        } catch (err) {
          console.error('Failed to delete patient:', error.patient, err);
          failedCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      // Update results to remove deleted duplicates from errors
      setResults(prev => ({
        ...prev,
        errors: prev.errors.filter(err => 
          !err.error.includes('Duplicate detected') && 
          !err.error.includes('Multiple potential matches')
        )
      }));
      
      alert(
        `✅ Deletion complete!\n\n` +
        `Successfully deleted: ${deletedCount} patient(s)\n` +
        (failedCount > 0 ? `Failed: ${failedCount} patient(s)` : '')
      );
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      alert('Failed to delete duplicates: ' + error.message);
    }
    
    setDeletingDuplicates(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Update Patients from File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Upload a file (PDF, CSV, or image) containing patient information. The system will automatically detect changes and update patient records.
        </p>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".pdf,.csv,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
            id="patient-file-upload"
            disabled={isProcessing}
          />
          <label htmlFor="patient-file-upload" className="cursor-pointer">
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : 'Click to upload file'}
            </p>
            <p className="text-xs text-gray-500">
              PDF, CSV, PNG, or JPG
            </p>
          </label>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Processing file and detecting changes...</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-semibold mb-1">Processed</p>
                <p className="text-2xl font-bold text-blue-700">{results.processed}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-semibold mb-1">New Patients</p>
                <p className="text-2xl font-bold text-purple-700">{results.created || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-semibold mb-1">Auto-Applied</p>
                <p className="text-2xl font-bold text-green-700">{results.autoApplied || 0}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-semibold mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-orange-700">{results.pendingReview || 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-semibold mb-1">Discharged</p>
                <p className="text-2xl font-bold text-red-700">{results.discharged || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold mb-1">No Changes</p>
                <p className="text-2xl font-bold text-gray-700">{results.noChanges}</p>
              </div>
            </div>

            {/* Info Alert */}
            {results.pendingReview > 0 && (
              <Alert className="bg-orange-50 border-orange-300">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  {results.pendingReview} update{results.pendingReview > 1 ? 's' : ''} require{results.pendingReview === 1 ? 's' : ''} admin review due to critical field changes or data conflicts.
                  <Button
                    variant="link"
                    className="p-0 h-auto ml-2 text-orange-700 underline"
                    onClick={() => setShowPendingUpdates(true)}
                  >
                    Review now
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Pending Changes requiring review */}
            {results.pendingChanges && results.pendingChanges.length > 0 && (
              <div>
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Review ({results.pendingChanges.length})
                </h3>
                <ScrollArea className="h-48 border rounded-lg border-orange-300 bg-orange-50">
                  <div className="p-4 space-y-2">
                    {(results.pendingChanges || []).map((change, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-white border-orange-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-orange-900">{change.patient}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {change.criticalFieldCount > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                {change.criticalFieldCount} critical
                              </span>
                            )}
                            {change.conflictCount > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                {change.conflictCount} conflict{change.conflictCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {change.changeCount} field{change.changeCount > 1 ? 's' : ''} • Requires admin approval
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={() => setShowPendingUpdates(true)}
                  className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Review Pending Updates
                </Button>
              </div>
            )}

            {/* Auto-Applied Changes */}
            {results.changes && results.changes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Auto-Applied Updates ({results.changes.length})
                </h3>
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {(results.changes || []).map((change, idx) => (
                      <Collapsible key={idx} open={expandedPatients[idx]}>
                        <div className="border rounded-lg p-3 bg-green-50">
                          <CollapsibleTrigger
                            onClick={() => togglePatient(idx)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-900">{change.patient}</span>
                              <span className="text-xs text-green-600">
                                ({change.changeCount} field{change.changeCount > 1 ? 's' : ''} updated)
                              </span>
                            </div>
                            {expandedPatients[idx] ? (
                              <ChevronUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-green-600" />
                            )}
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="mt-3 space-y-2">
                            {(change.changes || []).map((fieldChange, fieldIdx) => (
                              <div key={fieldIdx} className="pl-6 text-sm">
                                <p className="font-medium text-gray-700">{fieldChange.field}:</p>
                                <div className="ml-2 text-xs">
                                  <p className="text-red-600">- {JSON.stringify(fieldChange.oldValue)}</p>
                                  <p className="text-green-600">+ {JSON.stringify(fieldChange.newValue)}</p>
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Errors */}
            {results.errors && results.errors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-red-900">Errors & Duplicates ({results.errors.length})</h3>
                  {results.errors.some(err => 
                    err.error.includes('Duplicate detected') || 
                    err.error.includes('Multiple potential matches')
                  ) && (
                    <Button
                      onClick={handleDeleteDuplicates}
                      disabled={deletingDuplicates}
                      variant="destructive"
                      size="sm"
                    >
                      {deletingDuplicates ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All Duplicates
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {(results.errors || []).map((error, idx) => (
                      <Alert key={idx} variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <span className="font-semibold">{error.patient}:</span> {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Reset Button */}
            <Button
              onClick={() => {
                setFile(null);
                setResults(null);
                setExpandedPatients({});
              }}
              variant="outline"
              className="w-full"
            >
              Upload Another File
            </Button>
          </div>
        )}

        {/* Pending Updates Panel */}
        {showPendingUpdates && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Review Pending Updates</h2>
                <Button variant="ghost" onClick={() => setShowPendingUpdates(false)}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <PendingPatientUpdates />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}