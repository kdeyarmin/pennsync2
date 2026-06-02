import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Pill, Upload, Loader2, AlertTriangle, CheckCircle, 
  X, FileText, Download, Send, Eye
} from 'lucide-react';
import DrugInteractionAlert from './DrugInteractionAlert';

export default function MedicationReconciliationInterface({ patientId, onClose, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload, review, reconcile, complete
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [reconciliationId, setReconciliationId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState({});

  const { data: patient } = useQuery({
    queryKey: ['patient-recon', patientId],
    queryFn: async () => {
      const [p] = await base44.entities.Patient.filter({ id: patientId });
      return p;
    },
    enabled: !!patientId
  });

  const { data: reconciliation, refetch: refetchReconciliation } = useQuery({
    queryKey: ['reconciliation', reconciliationId],
    queryFn: async () => {
      const [recon] = await base44.entities.MedicationReconciliation.filter({ id: reconciliationId });
      return recon;
    },
    enabled: !!reconciliationId
  });

  // Upload discharge document
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      setUploadedFileUrl(uploadResponse.file_url);
      toast.success('Document uploaded successfully');
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  // Start reconciliation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('reconcileMedications', {
        patient_id: patientId,
        discharge_document_url: uploadedFileUrl,
        trigger_source: 'hospital_discharge'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setReconciliationId(data.reconciliation.id);
      setStep('review');
      toast.success('Medications analyzed successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reconcile medications');
    }
  });

  // Resolve discrepancy
  const resolveDiscrepancyMutation = useMutation({
    mutationFn: async ({ discrepancyIndex, status, notes, action }) => {
      // Re-read the latest record before mutating so two quick resolutions
      // (or a second tab) don't overwrite each other from a stale snapshot.
      const latestArr = await base44.entities.MedicationReconciliation.filter({ id: reconciliationId });
      const latest = latestArr?.[0] || reconciliation;
      const updatedDiscrepancies = [...(latest.discrepancies || [])];
      updatedDiscrepancies[discrepancyIndex] = {
        ...updatedDiscrepancies[discrepancyIndex],
        status,
        resolution_notes: notes
      };

      // If resolving, apply the action to medications
      if (status === 'resolved' && action) {
        if (action.type === 'add_medication') {
          await base44.entities.Medication.create({
            patient_id: patientId,
            ...action.medication_data
          });
        } else if (action.type === 'update_medication') {
          await base44.entities.Medication.update(action.medication_id, action.medication_data);
        } else if (action.type === 'discontinue_medication') {
          await base44.entities.Medication.update(action.medication_id, { status: 'discontinued' });
        }
      }

      return base44.entities.MedicationReconciliation.update(reconciliationId, {
        discrepancies: updatedDiscrepancies
      });
    },
    onSuccess: () => {
      refetchReconciliation();
      queryClient.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      toast.success('Discrepancy resolved');
    }
  });

  // Complete reconciliation
  const completeMutation = useMutation({
    mutationFn: async () => {
      // PATIENT SAFETY: do not allow sign-off while discrepancies are still
      // open. Each discrepancy's resolution already applies its action to the
      // live Medication list (see resolveDiscrepancyMutation), so completing
      // with pending discrepancies would mark the chart "reconciled" while
      // flagged interactions/duplicates were never reviewed.
      const pendingDiscrepancies = (reconciliation.discrepancies || [])
        .filter(d => !d.status || d.status === 'pending');
      if (pendingDiscrepancies.length > 0) {
        throw new Error(
          `Resolve or dismiss all ${pendingDiscrepancies.length} open discrepancies before completing.`
        );
      }

      // Build final reconciled medication list
      const reconciled = (reconciliation.extracted_discharge_medications || []).map(med => ({
        medication_name: med.medication_name,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        indication: med.indication,
        prescriber: med.prescriber,
        action_taken: 'added',
        start_date: new Date().toISOString().split('T')[0]
      }));

      return base44.entities.MedicationReconciliation.update(reconciliationId, {
        status: 'completed',
        reconciled_by: (await base44.auth.me()).email,
        reconciled_date: new Date().toISOString(),
        reconciled_medications: reconciled
      });
    },
    onSuccess: () => {
      setStep('complete');
      toast.success('Medication reconciliation completed');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to complete reconciliation');
    }
  });

  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle, label: 'Critical' },
    high: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle, label: 'High' },
    moderate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle, label: 'Moderate' },
    low: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Eye, label: 'Low' }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Medication Reconciliation - {patient?.first_name} {patient?.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <FileText className="w-4 h-4" />
              <AlertDescription>
                Upload hospital discharge orders or physician's updated medication list. AI will extract and compare medications automatically.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Discharge Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-semibold">
                      Click to upload
                    </span>
                    {' '}or drag and drop
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    PDF, JPEG, or PNG (Max 10MB)
                  </p>
                </div>

                {uploadedFile && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800">{uploadedFile.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedFileUrl('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => reconcileMutation.mutate()}
                  disabled={!uploadedFileUrl || reconcileMutation.isPending}
                  className="w-full"
                >
                  {reconcileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Medications...
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4 mr-2" />
                      Start Reconciliation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Review Discrepancies */}
        {step === 'review' && reconciliation && (
          <div className="space-y-6">
            <Card className={
              reconciliation.critical_discrepancies > 0 
                ? 'border-red-300 bg-red-50' 
                : 'border-green-300 bg-green-50'
            }>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{reconciliation.total_discrepancies}</p>
                    <p className="text-sm text-slate-600">Total Discrepancies</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{reconciliation.critical_discrepancies}</p>
                    <p className="text-sm text-slate-600">Critical Issues</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{reconciliation.ai_confidence_score}%</p>
                    <p className="text-sm text-slate-600">AI Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Drug Interaction Check */}
            {reconciliation && (reconciliation.current_medications?.length > 0 || reconciliation.extracted_discharge_medications?.length > 0) && (
              <DrugInteractionAlert
                medications={[
                  ...(reconciliation.current_medications || []),
                  ...(reconciliation.extracted_discharge_medications || [])
                ]}
                patientId={patientId}
                autoCheck={true}
              />
            )}

            <Tabs defaultValue="discrepancies">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="discrepancies">
                  Discrepancies ({reconciliation.discrepancies?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="current">Current Meds</TabsTrigger>
                <TabsTrigger value="discharge">Discharge Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="discrepancies" className="space-y-3">
                {reconciliation.discrepancies?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <p className="text-slate-600">No discrepancies found! Medications are aligned.</p>
                    </CardContent>
                  </Card>
                ) : (
                  reconciliation.discrepancies?.map((disc, idx) => {
                    const config = severityConfig[disc.severity] || severityConfig.low;
                    const Icon = config.icon;

                    return (
                      <Card key={idx} className={`border-2 ${config.color}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4" />
                                <Badge className={config.color}>
                                  {config.label}
                                </Badge>
                                <Badge variant="outline">
                                  {disc.discrepancy_type.replace(/_/g, ' ')}
                                </Badge>
                                <Badge className={
                                  disc.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                  disc.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-slate-100 text-slate-800'
                                }>
                                  {disc.status}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {disc.medication_name}
                              </h4>
                              <p className="text-sm text-slate-700 mb-2">{disc.description}</p>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-xs text-slate-500 mb-1">Current</p>
                                  <p className="font-semibold">{disc.current_value}</p>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-xs text-slate-500 mb-1">Discharge Order</p>
                                  <p className="font-semibold">{disc.discharge_value}</p>
                                </div>
                              </div>

                              <Alert className="bg-blue-50 border-blue-200">
                                <AlertDescription className="text-blue-800 text-sm">
                                  <strong>AI Recommendation:</strong> {disc.ai_recommendation}
                                </AlertDescription>
                              </Alert>
                            </div>
                          </div>

                          {disc.status === 'pending' && (
                            <div className="space-y-2 mt-4">
                              <Textarea
                                placeholder="Resolution notes..."
                                value={resolutionNotes[idx] || ''}
                                onChange={(e) => setResolutionNotes({ ...resolutionNotes, [idx]: e.target.value })}
                                rows={2}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => resolveDiscrepancyMutation.mutate({
                                    discrepancyIndex: idx,
                                    status: 'resolved',
                                    notes: resolutionNotes[idx]
                                  })}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resolveDiscrepancyMutation.mutate({
                                    discrepancyIndex: idx,
                                    status: 'dismissed',
                                    notes: resolutionNotes[idx]
                                  })}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="current">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reconciliation.current_medications?.map((med, idx) => (
                        <div key={idx} className="p-3 border rounded hover:bg-slate-50">
                          <p className="font-semibold">{med.medication_name}</p>
                          <p className="text-sm text-slate-600">
                            {med.dosage} {med.frequency} - {med.route}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discharge">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Discharge Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reconciliation.extracted_discharge_medications?.map((med, idx) => (
                        <div key={idx} className="p-3 border rounded hover:bg-slate-50">
                          <p className="font-semibold">{med.medication_name}</p>
                          <p className="text-sm text-slate-600">
                            {med.dosage} {med.frequency} - {med.route}
                          </p>
                          {med.indication && (
                            <p className="text-xs text-slate-500">For: {med.indication}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => completeMutation.mutate()}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Reconciliation
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="space-y-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Reconciliation Complete</h3>
                <p className="text-slate-600 mb-4">
                  Medication list has been updated. Patient and physician notifications are ready.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Patient List
                  </Button>
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Notify Physician
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}