import { base44 } from "@/api/base44Client";

/**
 * Comprehensive performance tracking utility for nurse activities
 */

// Track AI suggestion given to nurse
export const trackAISuggestion = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.TrainingRecommendation.create({
      nurse_email: user.email,
      recommendation_type: data.type || 'documentation',
      recommendation_text: data.text,
      source: data.source,
      severity: data.severity || 'medium',
      addressed: false,
      patient_id: data.patient_id || null,
      visit_id: data.visit_id || null,
      context_data: {
        element: data.element || null,
        note_snippet: data.note_snippet || null,
        full_context: data.context || null,
        suggestion_category: data.category || null,
        was_applied: false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to track AI suggestion:', error);
  }
};

// Track when nurse applies/uses an AI suggestion
export const trackSuggestionUsed = async (recommendationId, applied = true) => {
  try {
    await base44.entities.TrainingRecommendation.update(recommendationId, {
      addressed: applied,
      'context_data.was_applied': applied,
      'context_data.applied_at': new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to track suggestion usage:', error);
  }
};

// Track documentation activity
export const trackDocumentationActivity = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: data.action,
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        documentation_type: data.documentation_type,
        time_spent_seconds: data.time_spent_seconds,
        word_count: data.word_count,
        ai_assistance_used: data.ai_assistance_used,
        templates_used: data.templates_used,
        voice_commands_used: data.voice_commands_used,
        timestamp: new Date().toISOString()
      },
      page: 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });
  } catch (error) {
    console.error('Failed to track documentation activity:', error);
  }
};

// Track AI scribe usage
export const trackScribeUsage = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'ai_scribe_used',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        audio_duration_seconds: data.audio_duration,
        transcript_length: data.transcript_length,
        fields_extracted: data.fields_extracted,
        structured_data_quality: data.quality_score,
        applied_to_visit: data.applied,
        timestamp: new Date().toISOString()
      },
      page: 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });

    // Track as AI suggestion
    if (data.clinical_narrative) {
      await trackAISuggestion({
        type: 'clinical',
        text: `AI Scribe generated clinical narrative (${data.transcript_length} chars transcribed)`,
        source: 'ai_scribe',
        severity: 'high',
        patient_id: data.patient_id,
        visit_id: data.visit_id,
        element: 'Medical Scribe Transcription',
        context: data.clinical_narrative.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('Failed to track scribe usage:', error);
  }
};

// Track compliance check results
export const trackComplianceCheck = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'compliance_check_performed',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        compliance_score: data.score,
        issues_found: data.issues_count,
        critical_issues: data.critical_count,
        issues_fixed: data.fixed_count,
        timestamp: new Date().toISOString()
      },
      page: data.page || 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });
  } catch (error) {
    console.error('Failed to track compliance check:', error);
  }
};

// Track template usage
export const trackTemplateUsage = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'template_generated',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        template_type: data.template_type,
        diagnosis_based: data.diagnosis,
        sections_included: data.sections_count,
        customized: data.customized,
        timestamp: new Date().toISOString()
      },
      page: 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });
  } catch (error) {
    console.error('Failed to track template usage:', error);
  }
};

// Track voice command usage
export const trackVoiceCommand = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'voice_command_used',
      details: {
        command: data.command,
        context: data.context,
        success: data.success !== false,
        page: data.page,
        timestamp: new Date().toISOString()
      },
      page: data.page || 'Unknown'
    });
  } catch (error) {
    console.error('Failed to track voice command:', error);
  }
};

// Track clinical decision support usage
export const trackClinicalDecisionSupport = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'clinical_decision_support_used',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        recommendation_type: data.recommendation_type,
        applied: data.applied,
        timestamp: new Date().toISOString()
      },
      page: 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });

    // Also track as training recommendation
    await trackAISuggestion({
      type: 'clinical',
      text: data.recommendation_text,
      source: 'clinical_decision_support',
      severity: data.severity || 'medium',
      patient_id: data.patient_id,
      visit_id: data.visit_id,
      element: 'Clinical Decision Support',
      context: data.context
    });
  } catch (error) {
    console.error('Failed to track clinical decision support:', error);
  }
};

// Track patient education provided
export const trackPatientEducation = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'patient_education_provided',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        education_topic: data.topic,
        method: data.method, // verbal, written, demonstration
        comprehension_verified: data.comprehension_verified,
        handout_generated: data.handout_generated,
        timestamp: new Date().toISOString()
      },
      page: data.page || 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });
  } catch (error) {
    console.error('Failed to track patient education:', error);
  }
};

// Track visit completion metrics
export const trackVisitCompletion = async (data) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'visit_completed',
      details: {
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        visit_type: data.visit_type,
        duration_minutes: data.duration_minutes,
        documentation_time_minutes: data.documentation_time,
        compliance_score: data.compliance_score,
        ai_tools_used: data.ai_tools_used || [],
        template_used: data.template_used,
        voice_dictation_used: data.voice_dictation_used,
        scribe_used: data.scribe_used,
        word_count: data.word_count,
        vital_signs_documented: data.vital_signs_count,
        timestamp: new Date().toISOString()
      },
      page: 'DocumentVisit',
      entity_type: 'Visit',
      entity_id: data.visit_id
    });
  } catch (error) {
    console.error('Failed to track visit completion:', error);
  }
};

export default {
  trackAISuggestion,
  trackSuggestionUsed,
  trackDocumentationActivity,
  trackScribeUsage,
  trackComplianceCheck,
  trackTemplateUsage,
  trackVoiceCommand,
  trackClinicalDecisionSupport,
  trackPatientEducation,
  trackVisitCompletion
};