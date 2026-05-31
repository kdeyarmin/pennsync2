import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pill, Plus, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MedicationReconciliation({ patientId, onMedicationsUpdated }) {
  const [medications, setMedications] = useState([]);
  const [newMed, setNewMed] = useState({ name: "", dose: "", frequency: "", route: "" });
  const [showForm, setShowForm] = useState(false);
  const [noChanges, setNoChanges] = useState(false);

  useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }),
    select: (data) => data[0],
    enabled: !!patientId,
  });

  const addMedication = () => {
    if (newMed.name && newMed.dose) {
      setMedications([...medications, { ...newMed, id: Date.now(), compliant: true, sideEffects: false }]);
      setNewMed({ name: "", dose: "", frequency: "", route: "" });
      setNoChanges(false);
    }
  };

  const removeMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const toggleCompliance = (id) => {
    setMedications(medications.map(m => 
      m.id === id ? { ...m, compliant: !m.compliant } : m
    ));
  };

  const generateMedicationNarrative = () => {
    if (noChanges) {
      const narrative = `\n\nMEDICATION MANAGEMENT:
Medication list reviewed with patient/caregiver. No changes since last visit. Patient taking all medications as prescribed. No reported adverse effects or concerns. Patient demonstrates understanding of medication purposes and administration schedules.\n`;
      onMedicationsUpdated(narrative);
      return;
    }

    if (medications.length === 0) {
      alert("Please add medications or check 'No changes since last visit'");
      return;
    }

    let narrative = `\n\nMEDICATION MANAGEMENT:\nCurrent medications reviewed and reconciled with patient/caregiver:\n\n`;
    
    medications.forEach((med, index) => {
      narrative += `${index + 1}. ${med.name} ${med.dose} ${med.route || 'PO'} ${med.frequency}\n`;
      narrative += `   - Compliance: ${med.compliant ? 'Taking as prescribed' : 'NON-COMPLIANT - discussed with patient'}\n`;
      if (med.sideEffects) {
        narrative += `   - ADVERSE EFFECTS REPORTED: [Nurse to document]\n`;
      }
    });

    const nonCompliant = medications.filter(m => !m.compliant);
    if (nonCompliant.length > 0) {
      narrative += `\nNON-COMPLIANCE NOTED: Patient not consistently taking ${nonCompliant.map(m => m.name).join(', ')}. Barriers discussed. Education reinforced regarding importance of medication adherence.\n`;
    }

    narrative += `\nPatient/caregiver demonstrates understanding of medication purposes, dosing schedules, and proper administration techniques. Medication organizer reviewed for accuracy. No adverse effects reported except as noted above.\n`;

    onMedicationsUpdated(narrative);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Medication Reconciliation
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Hide' : 'Show'} Form
          </Button>
        </div>
      </CardHeader>
      
      {showForm && (
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox 
              id="no-changes"
              checked={noChanges}
              onCheckedChange={(checked) => {
                setNoChanges(checked);
                if (checked) {
                  setMedications([]);
                }
              }}
            />
            <Label htmlFor="no-changes" className="cursor-pointer text-sm font-medium">
              No changes since last visit (medications same as previous)
            </Label>
          </div>

          {!noChanges && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                <Input
                  placeholder="Medication name"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                />
                <Input
                  placeholder="Dose (e.g., 10mg)"
                  value={newMed.dose}
                  onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
                />
                <Input
                  placeholder="Frequency"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Route"
                    value={newMed.route}
                    onChange={(e) => setNewMed({ ...newMed, route: e.target.value })}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={addMedication}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {medications.length > 0 && (
                <div className="space-y-2">
                  {medications.map((med) => (
                    <div key={med.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {med.name} {med.dose}
                        </p>
                        <p className="text-sm text-gray-600">
                          {med.route || 'PO'} {med.frequency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={med.compliant ? "outline" : "destructive"}
                          onClick={() => toggleCompliance(med.id)}
                          className="text-xs"
                        >
                          {med.compliant ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />Compliant</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3 mr-1" />Non-compliant</>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMedication(med.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Button
            onClick={generateMedicationNarrative}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!noChanges && medications.length === 0}
          >
            <Pill className="w-4 h-4 mr-2" />
            Add Medication Section to Note
          </Button>

          {medications.filter(m => !m.compliant).length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Non-compliance detected:</strong> Make sure to document barriers and education provided.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}