import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { extractedData, analysisResults } = await req.json();

    // Use AI to comprehensively analyze the referral
    const analysisPrompt = `You are an expert home health intake coordinator. Analyze this referral data and provide comprehensive insights.

REFERRAL DATA:
${JSON.stringify(extractedData, null, 2)}

EXISTING ANALYSIS:
${JSON.stringify(analysisResults, null, 2)}

Provide a JSON response with the following structure:
{
  "category": {
    "primary": "cardiac|respiratory|wound_care|orthopedic|neurological|diabetes|post_surgical|general_medical|hospice|palliative",
    "secondary": ["list of secondary categories if applicable"],
    "specialty_requirements": ["any special certifications or skills needed"]
  },
  "missing_critical_info": {
    "high_priority": ["critical items missing that block admission"],
    "medium_priority": ["important items missing but admission can proceed"],
    "low_priority": ["nice-to-have items missing"]
  },
  "risk_assessment": {
    "clinical_complexity": "low|medium|high|critical",
    "readmission_risk": "low|medium|high",
    "fall_risk": "low|medium|high",
    "infection_risk": "low|medium|high",
    "key_concerns": ["specific clinical concerns to monitor"]
  },
  "suggested_next_steps": [
    {
      "action": "description of action",
      "priority": "immediate|urgent|high|medium|low",
      "timeframe": "within X hours/days",
      "responsible_role": "nurse|admin|physician|coordinator"
    }
  ],
  "assignment_recommendations": {
    "ideal_nurse_qualifications": ["IV therapy", "wound care certified", etc.],
    "visit_frequency_suggested": "daily|3x_week|2x_week|weekly",
    "estimated_episode_length": "30|60|90 days",
    "requires_specialized_skills": true|false
  },
  "care_coordination_needs": {
    "physician_contact_priority": "immediate|high|routine",
    "dme_orders_needed": ["list of equipment"],
    "therapy_services_recommended": ["PT", "OT", "ST"],
    "other_services": ["home health aide", "social work", etc.]
  },
  "compliance_alerts": [
    "any regulatory or compliance concerns identified"
  ],
  "documentation_gaps": [
    "specific documentation that should be obtained before first visit"
  ]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: {
            type: "object",
            properties: {
              primary: { type: "string" },
              secondary: { type: "array", items: { type: "string" } },
              specialty_requirements: { type: "array", items: { type: "string" } }
            }
          },
          missing_critical_info: {
            type: "object",
            properties: {
              high_priority: { type: "array", items: { type: "string" } },
              medium_priority: { type: "array", items: { type: "string" } },
              low_priority: { type: "array", items: { type: "string" } }
            }
          },
          risk_assessment: {
            type: "object",
            properties: {
              clinical_complexity: { type: "string" },
              readmission_risk: { type: "string" },
              fall_risk: { type: "string" },
              infection_risk: { type: "string" },
              key_concerns: { type: "array", items: { type: "string" } }
            }
          },
          suggested_next_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                timeframe: { type: "string" },
                responsible_role: { type: "string" }
              }
            }
          },
          assignment_recommendations: {
            type: "object",
            properties: {
              ideal_nurse_qualifications: { type: "array", items: { type: "string" } },
              visit_frequency_suggested: { type: "string" },
              estimated_episode_length: { type: "string" },
              requires_specialized_skills: { type: "boolean" }
            }
          },
          care_coordination_needs: {
            type: "object",
            properties: {
              physician_contact_priority: { type: "string" },
              dme_orders_needed: { type: "array", items: { type: "string" } },
              therapy_services_recommended: { type: "array", items: { type: "string" } },
              other_services: { type: "array", items: { type: "string" } }
            }
          },
          compliance_alerts: { type: "array", items: { type: "string" } },
          documentation_gaps: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: response
    });

  } catch (error) {
    console.error('Referral analysis error:', error);
    return Response.json({ 
      error: 'Failed to analyze referral',
      details: error.message 
    }, { status: 500 });
  }
});