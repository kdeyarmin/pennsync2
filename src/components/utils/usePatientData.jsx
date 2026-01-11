import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';

export const usePatientData = (selectedPatientId) => {
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ['patientRecentVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId, status: 'completed' }, '-visit_date', 3),
    enabled: !!selectedPatientId,
  });

  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASISForNotes', selectedPatientId],
    queryFn: () => base44.entities.OASISUpload.filter({ patient_id: selectedPatientId }, '-created_date', 1),
    enabled: !!selectedPatientId,
  });

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const oasisContext = useMemo(() => {
    if (!patientOASIS?.length) return null;
    const latest = patientOASIS[0];
    const { pdgm_data: pdgm = {}, extracted_data: extracted = {} } = latest;

    return {
      assessmentDate: latest.created_date,
      admissionSource: pdgm.admission_source || extracted.admission_source,
      clinicalGroup: pdgm.clinical_grouping || extracted.clinical_group,
      functionalLevel: pdgm.functional_impairment_level || extracted.functional_level,
      comorbidities: Array.isArray(pdgm.comorbidity_level) ? pdgm.comorbidity_level : Array.isArray(extracted.comorbidities) ? extracted.comorbidities : [],
      primaryDiagnosis: extracted.primary_diagnosis || pdgm.primary_diagnosis,
      secondaryDiagnoses: extracted.secondary_diagnoses || [],
      medications: extracted.medications || [],
      admissionReason: extracted.admission_reason,
      priorHospitalization: extracted.prior_hospitalization,
      livingArrangement: extracted.living_arrangement,
      visionStatus: extracted.vision,
      hearingStatus: extracted.hearing,
      painLevel: extracted.pain_frequency,
      fallRisk: extracted.fall_risk,
      cognitiveStatus: extracted.cognitive_functioning,
      adlStatus: extracted.adl_limitations || {},
      iadlStatus: extracted.iadl_limitations || {}
    };
  }, [patientOASIS]);

  const patientContext = useMemo(() => {
    if (!selectedPatient) return null;
    return {
      name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
      primaryDiagnosis: selectedPatient.primary_diagnosis,
      secondaryDiagnoses: selectedPatient.secondary_diagnoses || [],
      allergies: selectedPatient.allergies,
      recentConditions: recentVisits[0]?.nurse_notes ? recentVisits[0].nurse_notes.substring(0, 200) + '...' : null,
      previousVisitSummary: recentVisits[0] ? `Last visit ${recentVisits[0].visit_date}: ${recentVisits[0].visit_type}` : null,
      carePlanGoals: carePlans.filter(cp => cp.status === 'active').map(cp => cp.goal)
    };
  }, [selectedPatient, recentVisits, carePlans]);

  return { patients, selectedPatient, carePlans, recentVisits, oasisContext, patientContext };
};