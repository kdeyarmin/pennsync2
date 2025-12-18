import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Shield
} from "lucide-react";

export default function DuplicateScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const scanAndRemoveDuplicates = async () => {
    setIsScanning(true);
    try {
      const response = await base44.functions.invoke('deduplicatePatients');
      const data = response.data || response;
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      alert('Failed to scan for duplicates: ' + error.message);
    }
    setIsScanning(false);
  };

  return (
    <Card className="border-2 border-indigo-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Automatic Duplicate Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results ? (
          <>
            <p className="text-sm text-gray-700">
              Scan all active patients for duplicates based on name, date of birth, and medical record number. 
              Duplicates will be automatically closed, keeping the most recent record.
            </p>
            <Button
              onClick={scanAndRemoveDuplicates}
              disabled={isScanning}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning for Duplicates...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Scan & Remove Duplicates
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {results.patients_removed > 0 ? (
              <>
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>✅ Deduplication Complete!</strong>
                    <div className="mt-2 text-sm">
                      Found {results.duplicate_groups_found} duplicate group(s) and removed {results.patients_removed} duplicate record(s).
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">Duplicate Groups</p>
                    <p className="text-2xl font-bold text-blue-900">{results.duplicate_groups_found}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 mb-1">Records Closed</p>
                    <p className="text-2xl font-bold text-red-900">{results.patients_removed}</p>
                  </div>
                </div>

                {results.details && results.details.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Deduplication Details
                    </h4>
                    <ScrollArea className="h-64 border rounded-lg">
                      <div className="p-4 space-y-3">
                        {results.details.map((detail, idx) => (
                          <Card key={idx} className="bg-white">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-sm">Kept: {detail.kept.name}</span>
                                <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                  MRN: {detail.kept.mrn}
                                </Badge>
                              </div>
                              <div className="ml-6 space-y-1">
                                {detail.removed.map((removed, rIdx) => (
                                  <div key={rIdx} className="flex items-center gap-2 text-xs text-gray-600">
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                    <span>Removed: {removed.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      MRN: {removed.mrn}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs bg-blue-100">
                                      {removed.match_score}% match
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            ) : (
              <Alert className="bg-blue-50 border-blue-300">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>✅ No duplicates found!</strong>
                  <div className="mt-1 text-sm">
                    All patient records are unique.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setResults(null)}
              variant="outline"
              className="w-full"
            >
              Scan Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}