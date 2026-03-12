import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DynamicVisitChecklist from './DynamicVisitChecklist';
import { toast } from 'sonner';

/**
 * Integration wrapper for using DynamicVisitChecklist in visit workflows
 * Handles saving checklist progress to the Visit entity
 */
export default function VisitChecklistIntegration({
  visitId,
  patientId,
  onChecklistComplete
}) {
  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId
  });

  // Fetch visit data
  const { data: visit } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => base44.entities.Visit.filter({ id: visitId }).then(v => v[0]),
    enabled: !!visitId
  });

  // Mutation to save checklist progress
  const saveChecklistMutation = useMutation({
    mutationFn: async (checklistProgress) => {
      await base44.entities.Visit.update(visitId, {
        checklist_progress: checklistProgress
      });
      return checklistProgress;
    },
    onError: (error) => {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist progress');
    }
  });

  const handleChecklistUpdate = async (completedItems) => {
    saveChecklistMutation.mutate(completedItems);
  };

  if (!patient || !visit) {
    return null;
  }

  return (
    <DynamicVisitChecklist
      patient={patient}
      visit={visit}
      onChecklistUpdate={handleChecklistUpdate}
      autoSave={true}
    />
  );
}