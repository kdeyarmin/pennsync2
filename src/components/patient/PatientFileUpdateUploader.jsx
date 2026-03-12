import { useState } from "react";
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
      label: reportType === "discharge_report" ? "Matched in system" : "Already in system",
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
}