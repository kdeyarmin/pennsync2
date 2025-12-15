import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PendingPatientUpdates from "./PendingPatientUpdates";

export default function PatientFileUpdateUploader() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedPatients, setExpandedPatients] = useState({});
  const [showPendingUpdates, setShowPendingUpdates] = useState(false);
  
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }
  });

  const processFileMutation = useMutation({
    mutationFn: async (fileUrl) => {
      const response = await base44.functions.invoke('processPatientFileUpdate', { file_url: fileUrl });
      return response.data || response;
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
      
      setResults(processResults.results);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const togglePatient = (index) => {
    setExpandedPatients(prev => ({ ...prev, [index]: !prev[index] }));
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-semibold mb-1">Processed</p>
                <p className="text-2xl font-bold text-blue-700">{results.processed}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-semibold mb-1">Auto-Applied</p>
                <p className="text-2xl font-bold text-green-700">{results.autoApplied || 0}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-semibold mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-orange-700">{results.pendingReview || 0}</p>
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
                    {results.pendingChanges.map((change, idx) => (
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
                    {results.changes.map((change, idx) => (
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
                            {change.changes.map((fieldChange, fieldIdx) => (
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
                <h3 className="font-semibold text-red-900 mb-3">Errors</h3>
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {results.errors.map((error, idx) => (
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