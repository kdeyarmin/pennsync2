import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function MedicationManager({ patientId }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    route: "oral",
    indication: "",
    start_date: new Date().toISOString().split('T')[0],
    prescribed_by: "",
    refills_remaining: "",
    notes: ""
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => base44.entities.Medication.filter({ patient_id: patientId }, '-created_date'),
    initialData: [],
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Medication.create({
      ...data,
      patient_id: patientId,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] });
      resetForm();
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] });
      resetForm();
      setEditingId(null);
    },
  });

  const discontinueMutation = useMutation({
    mutationFn: (id) => base44.entities.Medication.update(id, {
      status: 'discontinued',
      end_date: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Medication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] });
    },
  });

  const activeMeds = medications.filter(m => m.status === 'active');
  const discontinuedMeds = medications.filter(m => m.status === 'discontinued');

  const resetForm = () => {
    setFormData({
      name: "",
      dosage: "",
      frequency: "",
      route: "oral",
      indication: "",
      start_date: new Date().toISOString().split('T')[0],
      prescribed_by: "",
      refills_remaining: "",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (med) => {
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      route: med.route,
      indication: med.indication || "",
      start_date: med.start_date,
      prescribed_by: med.prescribed_by || "",
      refills_remaining: med.refills_remaining || "",
      notes: med.notes || ""
    });
    setEditingId(med.id);
  };

  const statusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'discontinued':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Medications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Current Prescriptions
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">{activeMeds.length} active medication(s)</p>
          </div>
          <Dialog open={showAddForm && !editingId} onOpenChange={(open) => {
            setShowAddForm(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Medication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Medication Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Metformin"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dosage *</Label>
                    <Input
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <Input
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      placeholder="e.g., Twice daily"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Route *</Label>
                    <Select value={formData.route} onValueChange={(value) => setFormData({ ...formData, route: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="injection">Injection</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhaled">Inhaled</SelectItem>
                        <SelectItem value="transdermal">Transdermal</SelectItem>
                        <SelectItem value="rectal">Rectal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Indication</Label>
                  <Input
                    value={formData.indication}
                    onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                    placeholder="e.g., Diabetes management"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prescribed By</Label>
                    <Input
                      value={formData.prescribed_by}
                      onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
                      placeholder="Physician name"
                    />
                  </div>
                  <div>
                    <Label>Refills Remaining</Label>
                    <Input
                      type="number"
                      value={formData.refills_remaining}
                      onChange={(e) => setFormData({ ...formData, refills_remaining: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="resize-none h-20"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" />
                    Add Medication
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-3">
          {activeMeds.length > 0 ? (
            activeMeds.map((med) => (
              <Card key={med.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{med.name}</h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{med.dosage}</span> - {med.frequency}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(med)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Edit Medication</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <Label>Medication Name *</Label>
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Dosage *</Label>
                                <Input
                                  value={formData.dosage}
                                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <Label>Frequency *</Label>
                                <Input
                                  value={formData.frequency}
                                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Route *</Label>
                                <Select value={formData.route} onValueChange={(value) => setFormData({ ...formData, route: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="oral">Oral</SelectItem>
                                    <SelectItem value="injection">Injection</SelectItem>
                                    <SelectItem value="topical">Topical</SelectItem>
                                    <SelectItem value="inhaled">Inhaled</SelectItem>
                                    <SelectItem value="transdermal">Transdermal</SelectItem>
                                    <SelectItem value="rectal">Rectal</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Start Date *</Label>
                                <Input
                                  type="date"
                                  value={formData.start_date}
                                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Indication</Label>
                              <Input
                                value={formData.indication}
                                onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Prescribed By</Label>
                                <Input
                                  value={formData.prescribed_by}
                                  onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Refills Remaining</Label>
                                <Input
                                  type="number"
                                  value={formData.refills_remaining}
                                  onChange={(e) => setFormData({ ...formData, refills_remaining: e.target.value })}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Notes</Label>
                              <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="resize-none h-20"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => {
                                setEditingId(null);
                                resetForm();
                              }}>
                                Cancel
                              </Button>
                              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Check className="w-4 h-4 mr-2" />
                                Update Medication
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => discontinueMutation.mutate(med.id)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Route</p>
                      <p className="text-gray-900 font-medium capitalize">{med.route}</p>
                    </div>
                    {med.indication && (
                      <div>
                        <p className="text-gray-500">Indication</p>
                        <p className="text-gray-900 font-medium">{med.indication}</p>
                      </div>
                    )}
                  </div>

                  {med.refills_remaining !== undefined && med.refills_remaining !== null && (
                    <p className="text-xs text-gray-500 mb-2">
                      Refills remaining: <span className="font-medium">{med.refills_remaining}</span>
                    </p>
                  )}

                  {med.notes && (
                    <p className="text-sm text-gray-600 italic border-t pt-2">{med.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No active medications</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discontinued Medications */}
      {discontinuedMeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Discontinued Medications ({discontinuedMeds.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {discontinuedMeds.map((med) => (
              <div key={med.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-700 line-through">{med.name} - {med.dosage}</p>
                  <p className="text-xs text-gray-500">Discontinued {med.end_date}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(med.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}