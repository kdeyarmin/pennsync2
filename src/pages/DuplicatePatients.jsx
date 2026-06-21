import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  GitMerge,
  RefreshCw,
} from "lucide-react";
import {
  buildVisitsByPatient,
  findDuplicateGroups,
} from "@/components/patient/patientDuplicateUtils";
import { mergePatientGroup } from "@/components/patient/mergePatients";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function DuplicatePatients() {
  const confirm = useConfirm();
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [mergingKey, setMergingKey] = useState(null);
  const autoScanned = useRef(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['all-patients-duplicate-scan'],
    queryFn: async () => {
      const all = await base44.entities.Patient.list('-created_date', 10000);
      // Don't surface already-archived/merged records as fresh duplicates.
      return all.filter((p) => !p.is_archived);
    }
  });

  const { data: allVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['all-visits-duplicate-analysis'],
    queryFn: () => base44.entities.Visit.list('-created_date', 5000),
    enabled: patients.length > 0
  });

  const runScan = (patientList, visitList) => {
    setIsScanning(true);
    setDuplicateGroups([]);
    // Yield so the "Scanning..." state paints before the (synchronous) matching
    // work runs.
    setTimeout(() => {
      const visitsByPatient = buildVisitsByPatient(visitList);
      const groups = findDuplicateGroups(patientList, { visitsByPatient });
      setDuplicateGroups(groups);
      setHasScanned(true);
      setIsScanning(false);
    }, 0);
  };

  // Auto-scan once the roster (and its visits, for corroboration) have loaded —
  // the admin shouldn't have to click a button to find out the database is dirty.
  useEffect(() => {
    if (autoScanned.current) return;
    if (isLoading || visitsLoading) return;
    if (patients.length === 0) return;
    autoScanned.current = true;
    runScan(patients, allVisits);
  }, [isLoading, visitsLoading, patients, allVisits]);

  const rescan = () => runScan(patients, allVisits);

  // Merge an entire group into one surviving record: reassign that record's
  // clinical history onto the survivor and archive the rest. `survivor` is the
  // record the admin chose to keep (defaults to the group's primary).
  const handleMergeGroup = async (group, groupKey, survivor) => {
    const others = [group.primary, ...group.duplicates.map((d) => d.patient)].filter(
      (p) => p.id !== survivor.id
    );
    const ok = await confirm({
      title: "Merge duplicates?",
      description:
        `Keep "${survivor.first_name} ${survivor.last_name}" and merge ${others.length} ` +
        `other record(s) into it? Their visits and care plans move to the kept record, ` +
        `and the duplicates are archived (recoverable).`,
      confirmText: "Merge",
      destructive: true,
    });
    if (!ok) return;

    setMergingKey(groupKey);
    try {
      const { patientsMerged, reassigned } = await mergePatientGroup(
        survivor.id,
        others.map((p) => p.id),
        { mergedBy: currentUser?.email }
      );
      const moved = Object.values(reassigned).reduce((a, b) => a + b, 0);
      toast.success(
        `Merged ${patientsMerged} record(s) into ${survivor.first_name} ${survivor.last_name}` +
          (moved > 0 ? ` and moved ${moved} related record(s).` : '.')
      );
      setDuplicateGroups((prev) => prev.filter((_, i) => `group-${i}` !== groupKey));
      queryClient.invalidateQueries({ queryKey: ['all-patients-duplicate-scan'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge the duplicates. Please try again.');
    } finally {
      setMergingKey(null);
    }
  };

  const dismissGroup = (groupKey) => {
    setDuplicateGroups((prev) => prev.filter((_, i) => `group-${i}` !== groupKey));
  };

  const totalDuplicateRecords = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Loading patients...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Users}
        eyebrow="Patient Care"
        title="Duplicate Patients"
        description="Automatically scans the database for likely duplicate records and merges them — moving visits and care plans onto the record you keep."
        favoritePage="DuplicatePatients"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Duplicate scan
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={rescan}
              disabled={isScanning || patients.length === 0}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rescan
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Total patients scanned: <strong>{patients.length}</strong>
            {hasScanned && !isScanning && (
              <>
                {' · '}
                {duplicateGroups.length > 0 ? (
                  <span className="text-orange-600 font-medium">
                    {duplicateGroups.length} duplicate group(s), {totalDuplicateRecords} extra record(s)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">no duplicates found</span>
                )}
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {isScanning && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Scanning {patients.length} patients for duplicates...</p>
          </CardContent>
        </Card>
      )}

      {hasScanned && duplicateGroups.length === 0 && !isScanning && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">No Duplicates Found</h3>
            <p className="text-sm text-emerald-700">
              The database is clean. No duplicate patient records detected.
            </p>
          </CardContent>
        </Card>
      )}

      {duplicateGroups.length > 0 && !isScanning && (
        <div className="space-y-6">
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>{duplicateGroups.length} potential duplicate group(s) found.</strong> Choose the
              record to keep in each group — its visits and care plans absorb the others, which are
              archived (recoverable).
            </AlertDescription>
          </Alert>

          {duplicateGroups.map((group, idx) => {
            const groupKey = `group-${idx}`;
            const isMerging = mergingKey === groupKey;
            const records = [
              { patient: group.primary, isPrimary: true, confidencePercent: null, confidenceLevel: null, matches: [] },
              ...group.duplicates.map((d) => ({ patient: d.patient, isPrimary: false, ...d })),
            ];

            return (
              <Card key={groupKey} className="border-2 border-orange-300">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-lg flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-orange-600" />
                      Duplicate Group {idx + 1}
                      <Badge variant="outline" className="bg-white">{records.length} records</Badge>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500"
                      onClick={() => dismissGroup(groupKey)}
                      disabled={isMerging}
                      title="Not duplicates — dismiss"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Not duplicates
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-xs text-slate-500">
                    Pick the most complete record to keep. The other{records.length > 2 ? 's' : ''} will
                    be merged into it.
                  </p>
                  {records.map(({ patient, isPrimary, confidencePercent, confidenceLevel, matches }) => (
                    <Card
                      key={patient.id}
                      className={isPrimary ? 'border-2 border-blue-300 bg-blue-50' : 'bg-slate-50'}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-bold text-slate-900">
                                {patient.first_name} {patient.last_name}
                              </h4>
                              {isPrimary ? (
                                <Badge className="bg-blue-600">Suggested keep</Badge>
                              ) : (
                                confidencePercent != null && (
                                  <Badge
                                    className={
                                      confidenceLevel === 'high' ? 'bg-red-100 text-red-800' :
                                      confidenceLevel === 'medium' ? 'bg-orange-100 text-orange-800' :
                                      'bg-amber-100 text-amber-800'
                                    }
                                  >
                                    {confidencePercent}% match
                                  </Badge>
                                )
                              )}
                              <Badge className={
                                patient.status === 'active' ? 'bg-emerald-600' :
                                patient.status === 'discharged' ? 'bg-slate-600' :
                                'bg-orange-600'
                              }>
                                {patient.status || 'unknown'}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 space-y-0.5">
                              <p>DOB: {patient.date_of_birth || 'N/A'}</p>
                              <p>MRN: {patient.medical_record_number || 'N/A'}</p>
                              <p>Phone: {patient.phone || 'N/A'}</p>
                              <p>Diagnosis: {patient.primary_diagnosis || 'N/A'}</p>
                            </div>
                            {!isPrimary && matches?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {matches.slice(0, 5).map((reason, mIdx) => (
                                  <Badge key={mIdx} variant="outline" className="text-xs bg-white">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleMergeGroup(group, groupKey, patient)}
                              disabled={isMerging}
                              className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                            >
                              {isMerging ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <GitMerge className="w-4 h-4 mr-1" />
                              )}
                              Keep &amp; merge others
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
