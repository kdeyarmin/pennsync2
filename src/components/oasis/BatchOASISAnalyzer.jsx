import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Trash2,
  Play,
  FolderArchive,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { processOASISBatch } from "@/functions/processOASISBatch";

export default function BatchOASISAnalyzer({ onSingleAnalysis }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(''); // uploading, extracting, analyzing, generating
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [batchResults, setBatchResults] = useState(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      f => f.type === "application/pdf"
    );
    
    if (selectedFiles.length === 0) {
      setError("Please select valid PDF files.");
      return;
    }

    const fileObjects = selectedFiles.map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending', // pending, uploading, analyzing, success, error
      progress: 0,
      result: null,
      error: null
    }));

    setFiles(prev => [...prev, ...fileObjects]);
    setError(null);
    setBatchResults(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setBatchResults(null);
    setError(null);
    setOverallProgress(0);
  };

  const processBatch = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setBatchResults(null);
    setOverallProgress(0);

    const updatedFiles = [...files];
    const uploadedUrls = [];
    const fileNames = [];

    try {
      // Step 1: Upload all files
      setCurrentStep('uploading');
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        updatedFiles[i] = { ...updatedFiles[i], status: 'uploading', progress: 0 };
        setFiles([...updatedFiles]);

        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ 
            file: files[i].file 
          });
          uploadedUrls.push(file_url);
          fileNames.push(files[i].name);
          
          updatedFiles[i] = { ...updatedFiles[i], status: 'uploaded', progress: 100 };
          setFiles([...updatedFiles]);
        } catch (uploadError) {
          updatedFiles[i] = { 
            ...updatedFiles[i], 
            status: 'error', 
            error: 'Upload failed: ' + uploadError.message 
          };
          setFiles([...updatedFiles]);
        }

        setOverallProgress(Math.round(((i + 1) / files.length) * 30));
      }

      // Step 2: Process batch on server
      setCurrentStep('analyzing');
      
      // Mark all uploaded files as analyzing
      for (let i = 0; i < updatedFiles.length; i++) {
        if (updatedFiles[i].status === 'uploaded') {
          updatedFiles[i] = { ...updatedFiles[i], status: 'analyzing' };
        }
      }
      setFiles([...updatedFiles]);
      setOverallProgress(40);

      const response = await processOASISBatch({
        fileUrls: uploadedUrls,
        fileNames: fileNames
      });

      setOverallProgress(90);

      // Update file statuses based on results
      if (response.data?.results) {
        response.data.results.forEach((result, idx) => {
          const fileIndex = files.findIndex(f => f.name === result.fileName);
          if (fileIndex !== -1) {
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              status: result.status,
              result: result.analysis || null,
              error: result.error || null
            };
          }
        });
        setFiles([...updatedFiles]);
      }

      setBatchResults(response.data);
      setOverallProgress(100);
      setCurrentStep('complete');

    } catch (err) {
      console.error("Batch processing error:", err);
      setError(err.message || "Failed to process batch. Please try again.");
    }

    setIsProcessing(false);
  };

  const downloadAllReports = () => {
    if (!batchResults?.zipBase64) return;

    const binaryString = atob(batchResults.zipBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OASIS_Batch_Reports_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FileText className="w-4 h-4 text-gray-400" />;
      case 'uploading': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'uploaded': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'analyzing': return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-gray-100 text-gray-700",
      uploading: "bg-blue-100 text-blue-700",
      uploaded: "bg-blue-100 text-blue-700",
      analyzing: "bg-purple-100 text-purple-700",
      success: "bg-green-100 text-green-700",
      error: "bg-red-100 text-red-700"
    };
    return variants[status] || "bg-gray-100 text-gray-700";
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderArchive className="w-5 h-5 text-indigo-600" />
          Batch OASIS Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="batch-upload"
            disabled={isProcessing}
          />
          <label htmlFor="batch-upload" className={`cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              Click to select multiple OASIS PDFs
            </p>
            <p className="text-xs text-gray-400">
              PDF files only • Select multiple files at once
            </p>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {files.length} document{files.length !== 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAll}
                disabled={isProcessing}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>

            <ScrollArea className="h-48 rounded border">
              <div className="p-2 space-y-2">
                {files.map((file, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      file.status === 'error' ? 'bg-red-50 border-red-200' :
                      file.status === 'success' ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        {file.error && (
                          <p className="text-xs text-red-600 truncate">{file.error}</p>
                        )}
                        {file.result && (
                          <p className="text-xs text-green-600">
                            Score: {file.result.overall_score}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(file.status)}>
                        {file.status}
                      </Badge>
                      {!isProcessing && file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="w-4 h-4 text-gray-400" />
                        </Button>
                      )}
                      {file.status === 'success' && file.result && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSingleAnalysis?.(file.result)}
                          className="h-6 text-xs"
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {currentStep === 'uploading' && `Uploading files (${currentFileIndex + 1}/${files.length})...`}
                {currentStep === 'analyzing' && 'Analyzing documents with AI...'}
                {currentStep === 'complete' && 'Processing complete!'}
              </span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Results Summary */}
        {batchResults && (
          <Alert className={successCount > 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  <strong>{successCount}</strong> document{successCount !== 1 ? 's' : ''} analyzed successfully
                  {errorCount > 0 && <span className="text-red-600 ml-2">• {errorCount} failed</span>}
                </span>
                {successCount > 0 && (
                  <Button size="sm" onClick={downloadAllReports} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-1" />
                    Download All (ZIP)
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {files.length > 0 && !batchResults && (
          <Button
            onClick={processBatch}
            disabled={isProcessing || files.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing {files.length} Document{files.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Analyze {files.length} Document{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        {/* Process More */}
        {batchResults && (
          <Button
            onClick={clearAll}
            variant="outline"
            className="w-full"
          >
            Process More Documents
          </Button>
        )}
      </CardContent>
    </Card>
  );
}