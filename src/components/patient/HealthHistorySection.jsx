import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Pill, 
  Activity, 
  AlertCircle, 
  Calendar,
  Users,
  Edit,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function HealthHistorySection({ patient }) {
  const [editDialog, setEditDialog] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const updatePatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patient.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Health history updated successfully');
      setEditDialog(null);
    },
    onError: (error) => {
      toast.error('Failed to update health history');
      console.error(error);
    }
  });

  const openEditDialog = (section) => {
    setEditDialog(section);
    if (section === 'allergies') {
      setFormData({ allergies: patient.allergies || '' });
    } else if (section === 'past_medical') {
      setFormData({ past_medical_history: patient.past_medical_history || [] });
    } else if (section === 'surgeries') {
      setFormData({ past_hospitalizations: patient.past_hospitalizations || [] });
    } else if (section === 'family_history') {
      setFormData({ family_medical_history: patient.family_medical_history || '' });
    }
  };

  const handleSave = () => {
    updatePatientMutation.mutate(formData);
  };

  const addToArray = (field) => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), '']
    });
  };

  const updateArrayItem = (field, index, value) => {
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const removeFromArray = (field, index) => {
    const newArray = [...(formData[field] || [])];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray });
  };

  return (
    <div className="space-y-4">
      {/* Allergies */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-lg flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Allergies & Adverse Reactions
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog('allergies')}>
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {patient.allergies ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{patient.allergies}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No known allergies recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Past Medical History */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-blue-600" />
              Past Medical History
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog('past_medical')}>
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {patient.past_medical_history?.length > 0 ? (
            <ul className="space-y-2">
              {patient.past_medical_history.map((condition, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                  <span className="text-sm text-gray-900">{condition}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No past medical history recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Surgeries & Hospitalizations */}
      <Card>
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-lg flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Surgeries & Hospitalizations
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog('surgeries')}>
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {patient.past_hospitalizations?.length > 0 ? (
            <div className="space-y-3">
              {patient.past_hospitalizations.map((hosp, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{hosp.reason}</p>
                      {hosp.hospital && (
                        <p className="text-sm text-gray-600 mt-1">{hosp.hospital}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {hosp.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(hosp.date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {hosp.length_of_stay && (
                          <span>{hosp.length_of_stay} days</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No hospitalizations recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Family Medical History */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle className="text-lg flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Family Medical History
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog('family_history')}>
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {patient.family_medical_history ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{patient.family_medical_history}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No family medical history recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialogs */}
      <Dialog open={editDialog !== null} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog === 'allergies' && 'Edit Allergies'}
              {editDialog === 'past_medical' && 'Edit Past Medical History'}
              {editDialog === 'surgeries' && 'Edit Surgeries & Hospitalizations'}
              {editDialog === 'family_history' && 'Edit Family Medical History'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editDialog === 'allergies' && (
              <div>
                <Label>Allergies & Adverse Reactions</Label>
                <Textarea
                  value={formData.allergies || ''}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="List all known allergies and adverse reactions..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            )}

            {editDialog === 'past_medical' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Past Medical Conditions</Label>
                  <Button size="sm" onClick={() => addToArray('past_medical_history')}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.past_medical_history || []).map((condition, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={condition}
                        onChange={(e) => updateArrayItem('past_medical_history', index, e.target.value)}
                        placeholder="Enter medical condition..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('past_medical_history', index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editDialog === 'family_history' && (
              <div>
                <Label>Family Medical History</Label>
                <Textarea
                  value={formData.family_medical_history || ''}
                  onChange={(e) => setFormData({ ...formData, family_medical_history: e.target.value })}
                  placeholder="Document family medical history, hereditary conditions, etc..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updatePatientMutation.isPending}>
              {updatePatientMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}