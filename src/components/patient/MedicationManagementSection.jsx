import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Pill, 
  Plus, 
  Edit, 
  Trash2,
  User,
  Calendar
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

export default function MedicationManagementSection({ patient }) {
  const [editDialog, setEditDialog] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    prescriber: '',
    start_date: ''
  });
  const queryClient = useQueryClient();

  // Apply an add/edit/delete against the LATEST medication list rather than the
  // (possibly stale) prop, and match edits/deletes by medication identity rather
  // than array index — so a concurrent change (e.g. medication reconciliation
  // adding a drug) isn't clobbered and we never edit/remove the wrong entry.
  const sameMedication = (a, b) =>
    !!a && !!b &&
    a.name === b.name &&
    a.dosage === b.dosage &&
    a.frequency === b.frequency &&
    a.prescriber === b.prescriber &&
    a.start_date === b.start_date;

  const updatePatientMutation = useMutation({
    mutationFn: async (op) => {
      const latestArr = await base44.entities.Patient.filter({ id: patient.id });
      const meds = [...((latestArr?.[0] || patient).current_medications || [])];
      let updated = meds;

      if (op.type === 'save') {
        if (op.original) {
          const idx = meds.findIndex((m) => sameMedication(m, op.original));
          if (idx !== -1) {
            updated = [...meds];
            updated[idx] = op.medication;
          } else {
            // The edited med is no longer present (changed elsewhere) — add it.
            updated = [...meds, op.medication];
          }
        } else {
          updated = [...meds, op.medication];
        }
      } else if (op.type === 'delete') {
        const idx = op.original ? meds.findIndex((m) => sameMedication(m, op.original)) : -1;
        updated = idx !== -1 ? meds.filter((_, i) => i !== idx) : meds;
      }

      return base44.entities.Patient.update(patient.id, { current_medications: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Medications updated successfully');
      setEditDialog(false);
      setEditingMed(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update medications');
      console.error(error);
    }
  });

  const resetForm = () => {
    setMedForm({
      name: '',
      dosage: '',
      frequency: '',
      prescriber: '',
      start_date: ''
    });
  };

  const openAddMedication = () => {
    resetForm();
    setEditingMed(null);
    setEditDialog(true);
  };

  const openEditMedication = (medication, index) => {
    setMedForm(medication);
    setEditingMed(index);
    setEditDialog(true);
  };

  const handleSaveMedication = () => {
    // Pass the original entry (when editing) so the mutation can locate it in the
    // latest server-side list by identity instead of trusting a stale index.
    const original = editingMed !== null ? (patient.current_medications || [])[editingMed] : null;
    updatePatientMutation.mutate({ type: 'save', medication: medForm, original });
  };

  const handleDeleteMedication = (index) => {
    const original = (patient.current_medications || [])[index];
    updatePatientMutation.mutate({ type: 'delete', original });
  };

  const getFrequencyColor = (frequency) => {
    if (!frequency) return 'bg-slate-100 text-slate-800';
    const lower = frequency.toLowerCase();
    if (lower.includes('daily') || lower.includes('qd')) return 'bg-blue-100 text-blue-800';
    if (lower.includes('twice') || lower.includes('bid')) return 'bg-green-100 text-green-800';
    if (lower.includes('three') || lower.includes('tid')) return 'bg-yellow-100 text-yellow-800';
    if (lower.includes('four') || lower.includes('qid')) return 'bg-orange-100 text-orange-800';
    if (lower.includes('prn') || lower.includes('needed')) return 'bg-purple-100 text-purple-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div>
      <Card>
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-lg flex items-center justify-between text-slate-900">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-600" />
              Current Medications
              <Badge variant="secondary" className="ml-2">
                {patient.current_medications?.length || 0}
              </Badge>
            </div>
            <Button size="sm" onClick={openAddMedication}>
              <Plus className="w-4 h-4 mr-1" />
              Add Medication
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {patient.current_medications?.length > 0 ? (
            <div className="space-y-3">
              {patient.current_medications.map((med, index) => (
                <div 
                  key={index} 
                  className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900 text-lg">{med.name}</h4>
                        <Badge className={getFrequencyColor(med.frequency)}>
                          {med.frequency}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {med.dosage && (
                          <div className="flex items-center gap-2 text-sm">
                            <Pill className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">Dosage:</span>
                            <span className="font-medium text-slate-900">{med.dosage}</span>
                          </div>
                        )}
                        
                        {med.prescriber && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">Prescriber:</span>
                            <span className="font-medium text-slate-900">{med.prescriber}</span>
                          </div>
                        )}
                        
                        {med.start_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">Started:</span>
                            <span className="font-medium text-slate-900">
                              {Number.isNaN(new Date(med.start_date).getTime()) ? med.start_date : format(new Date(med.start_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditMedication(med, index)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteMedication(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 italic mb-4">No current medications recorded</p>
              <Button size="sm" onClick={openAddMedication}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Medication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medication Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMed !== null ? 'Edit Medication' : 'Add New Medication'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="med-name">Medication Name *</Label>
              <Input
                id="med-name"
                value={medForm.name}
                onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                placeholder="e.g., Lisinopril"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="med-dosage">Dosage *</Label>
              <Input
                id="med-dosage"
                value={medForm.dosage}
                onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                placeholder="e.g., 10mg"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="med-frequency">Frequency *</Label>
              <Input
                id="med-frequency"
                value={medForm.frequency}
                onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                placeholder="e.g., Once daily, BID, PRN"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="med-prescriber">Prescriber</Label>
              <Input
                id="med-prescriber"
                value={medForm.prescriber}
                onChange={(e) => setMedForm({ ...medForm, prescriber: e.target.value })}
                placeholder="e.g., Dr. Smith"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="med-start-date">Start Date</Label>
              <Input
                id="med-start-date"
                type="date"
                value={medForm.start_date}
                onChange={(e) => setMedForm({ ...medForm, start_date: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialog(false);
                setEditingMed(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMedication}
              disabled={!medForm.name || !medForm.dosage || !medForm.frequency || updatePatientMutation.isPending}
            >
              {updatePatientMutation.isPending ? 'Saving...' : 'Save Medication'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}