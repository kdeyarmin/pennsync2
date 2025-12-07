import { base44 } from "@/api/base44Client";

export const trackAISuggestion = async ({
  nurseEmail,
  suggestionType,
  suggestionText,
  context,
  patientId = null,
  source = 'smart_note'
}) => {
  if (!nurseEmail) return;

  try {
    await base44.entities.TrainingRecommendation.create({
      nurse_email: nurseEmail,
      recommendation_type: suggestionType,
      recommendation_text: suggestionText,
      source: source,
      severity: 'medium',
      addressed: false,
      patient_id: patientId
    });
  } catch (error) {
    console.error("Error tracking AI suggestion:", error);
  }
};

export const SuggestionCategories = {
  HOMEBOUND: 'documentation',
  SKILLED_NEED: 'clinical',
  VITAL_SIGNS: 'clinical',
  PATIENT_RESPONSE: 'communication',
  MEDICATION: 'clinical',
  WOUND_CARE: 'clinical',
  SAFETY: 'safety',
  INFECTION_CONTROL: 'safety',
  GRAMMAR: 'documentation',
  TERMINOLOGY: 'documentation',
  COMPLIANCE: 'compliance',
  ASSESSMENT: 'clinical',
  INTERVENTIONS: 'clinical'
};

export const categorizeAISuggestion = (suggestionText) => {
  const text = suggestionText.toLowerCase();
  
  if (text.includes('homebound') || text.includes('taxing effort')) {
    return 'documentation';
  }
  if (text.includes('skilled') || text.includes('complexity')) {
    return 'clinical';
  }
  if (text.includes('vital') || text.includes('bp') || text.includes('heart rate')) {
    return 'clinical';
  }
  if (text.includes('teaching') || text.includes('patient response') || text.includes('verbalized')) {
    return 'communication';
  }
  if (text.includes('safety') || text.includes('fall')) {
    return 'safety';
  }
  if (text.includes('grammar') || text.includes('spelling')) {
    return 'documentation';
  }
  if (text.includes('compliance') || text.includes('medicare')) {
    return 'compliance';
  }
  
  return 'clinical';
};