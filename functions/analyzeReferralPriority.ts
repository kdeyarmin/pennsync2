import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { extractedData, analysisResults } = await req.json();

        // Analyze referral and determine priority using AI
        const priorityAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a clinical triage AI specializing in home health referral prioritization.

Analyze this referral and determine the urgency/priority level based on:
- Medical condition severity and complexity
- Recent hospitalizations or ER visits
- Clinical stability indicators
- Wound severity or infection risks
- Medication complexity and safety concerns
- Fall risk or safety issues
- Cognitive/mental health concerns
- Social determinants and support system
- Discharge planning urgency
- Insurance/authorization timeline pressures

REFERRAL DATA:
${JSON.stringify(extractedData, null, 2)}

ANALYSIS RESULTS:
${JSON.stringify(analysisResults, null, 2)}

Provide a priority assessment with clear reasoning.`,
            response_json_schema: {
                type: "object",
                properties: {
                    priority: {
                        type: "string",
                        enum: ["urgent", "high", "normal", "low"],
                        description: "Overall priority level"
                    },
                    priority_score: {
                        type: "number",
                        description: "Numerical score 1-100 (higher = more urgent)"
                    },
                    urgency_factors: {
                        type: "array",
                        items: { type: "string" },
                        description: "Key factors driving the priority"
                    },
                    clinical_risks: {
                        type: "array",
                        items: { type: "string" },
                        description: "Identified clinical risks"
                    },
                    recommended_response_time: {
                        type: "string",
                        description: "When this should be addressed (e.g., 'within 24 hours', 'within 48 hours', 'this week')"
                    },
                    reasoning: {
                        type: "string",
                        description: "Detailed explanation of priority assignment"
                    },
                    critical_actions: {
                        type: "array",
                        items: { type: "string" },
                        description: "Immediate actions that should be taken"
                    }
                }
            }
        });

        return Response.json({
            success: true,
            priorityAnalysis
        });

    } catch (error) {
        console.error('Error analyzing referral priority:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});