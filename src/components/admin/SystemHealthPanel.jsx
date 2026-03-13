import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Database } from "lucide-react";
import { migrateExistingData } from "@/functions/migrateExistingData";
import { calculateDataQualityScores } from "@/functions/calculateDataQualityScores";

export default function SystemHealthPanel() {
  const { data: migrationStatus, isLoading: isMigrating, refetch: runMigration } = useQuery({
    queryKey: ['data-migration'],
    queryFn: async () => {
      const response = await migrateExistingData({});
      return response.data;
    },
    enabled: false,
    staleTime: Infinity,
  });

  const { data: qualityUpdate, isLoading: isUpdating, refetch: runQualityUpdate } = useQuery({
    queryKey: ['quality-update'],
    queryFn: async () => {
      const response = await calculateDataQualityScores({});
      return response.data;
    },
    enabled: false,
    staleTime: Infinity,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Migration & Quality Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="font-semibold text-sm">Migrate Existing Data</p>
              <p className="text-xs text-gray-600">Add quality scores and fix missing defaults</p>
            </div>
            <Button onClick={() => runMigration()} disabled={isMigrating} variant="outline">
              <Database className={`h-4 w-4 mr-2 ${isMigrating ? 'animate-spin' : ''}`} />
              {isMigrating ? 'Running...' : 'Run Migration'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="font-semibold text-sm">Recalculate Quality Scores</p>
              <p className="text-xs text-gray-600">Update all entity completeness metrics</p>
            </div>
            <Button onClick={() => runQualityUpdate()} disabled={isUpdating} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update Scores'}
            </Button>
          </div>

          {migrationStatus && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-sm">Migration Complete</p>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Patients updated: {migrationStatus.summary?.patients_updated}</p>
                <p>Visits updated: {migrationStatus.summary?.visits_updated}</p>
                {migrationStatus.summary?.total_errors > 0 && (
                  <p className="text-red-600">Errors: {migrationStatus.summary?.total_errors}</p>
                )}
              </div>
            </div>
          )}

          {qualityUpdate && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-sm">Quality Scores Updated</p>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Total records: {qualityUpdate.records_updated}</p>
                <p>Patients: {qualityUpdate.patients_processed}</p>
                <p>Visits: {qualityUpdate.visits_processed}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}