import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Unified Referral Analysis Function
 * Handles: priority analysis, task generation, and patient matching
 * Replaces: analyzeReferralPriority, generateReferralTasks, matchPatientWithAI
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();

        switch (action) {
            case 'analyze_priority':
                return await analyzePriority(base44, params);
            
            case 'generate_tasks':
                return await generateTasks(base44, params);
            
            case 'match_patient':
                return await matchPatient(base44, params);
            
            case 'full_analysis':
                // Run all three analyses in parallel for complete referral processing
                return await fullAnalysis(base44, params);
            
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Referral analysis error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});

async function analyzePriority(base44, params) {
    const { extractedData, analysisResults } = params;

    const priorityAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical triage AI specializing in home health referral prioritization with advanced Natural Language Processing (NLP) capabilities.

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
- Unstructured Clinical Notes (NLP)

REFERRAL DATA:
${JSON.stringify(extractedData, null, 2)}

AI-ASSISTED INITIAL ANALYSIS:
${JSON.stringify(analysisResults, null, 2)}

Provide a detailed priority assessment with clear reasoning.`,
        response_json_schema: {
            type: "object",
            properties: {
                priority: {
                    type: "string",
                    enum: ["urgent", "high", "normal", "low"]
                },
                priority_score: {
                    type: "number",
                    description: "Numerical score 1-100"
                },
                urgency_factors: {
                    type: "array",
                    items: { type: "string" }
                },
                clinical_risks: {
                    type: "array",
                    items: { type: "string" }
                },
                recommended_response_time: {
                    type: "string"
                },
                reasoning: {
                    type: "string"
                },
                critical_actions: {
                    type: "array",
                    items: { type: "string" }
                }
            }
        }
    });

    return Response.json({
        success: true,
        priorityAnalysis
    });
}

async function generateTasks(base44, params) {
    const { referralData, priorityAnalysis } = params;

    const tasks = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health intake coordinator. Based on the referral data and priority analysis, generate actionable tasks for office and clinical staff.

REFERRAL DATA:
${JSON.stringify(referralData, null, 2)}

PRIORITY ANALYSIS:
${JSON.stringify(priorityAnalysis, null, 2)}

Generate tasks in these categories:
1. Immediate/Critical Actions
2. Patient Intake & Verification
3. Clinical Assessment & Coordination
4. Administrative Tasks

Each task should have:
- title, description, type, priority, assigned_role, due_date, ai_reason

Priority-based timing:
- Urgent: Same day or within 4-6 hours
- High: Within 24 hours
- Normal: Within 2-3 days
- Low: Within 1 week

Return 5-12 tasks ordered by priority and due date.`, 
        response_json_schema: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            type: { type: "string", enum: ["call", "notify", "schedule", "order", "coordinate", "document", "safety", "followup", "other"] },
                            priority: { type: "string", enum: ["urgent", "high", "normal", "low"] },
                            assigned_role: { type: "string", enum: ["intake_coordinator", "nurse_manager", "field_nurse", "billing", "admin", "other"] },
                            due_date: { type: "string" },
                            ai_reason: { type: "string" }
                        },
                        required: ["title", "description", "type", "priority", "assigned_role", "due_date", "ai_reason"]
                    }
                }
            }
        }
    });

    return Response.json({ success: true, tasks: tasks.tasks || [] });
}

async function matchPatient(base44, params) {
    const { extractedData, existingPatients } = params;

    const matchAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert patient matching system for healthcare records.

Analyze the referral data and compare it against existing patients to find the best match.

REFERRAL PATIENT DATA:
${JSON.stringify(extractedData.demographics, null, 2)}

EXISTING PATIENTS IN SYSTEM:
${JSON.stringify(existingPatients.map(p => ({
    id: p.id,
    name: \`\${p.first_name} \${p.middle_name || ''} \${p.last_name}\`.trim(),
    mrn: p.medical_record_number,
    dob: p.date_of_birth,
    phone: p.phone,
    address: p.address,
    insurance: p.payor,
    physician: p.physician_name
})), null, 2)}

Consider:
- Name similarity (nicknames, abbreviations, spelling variations)
- Date of birth exact and partial matches
- Contact information (phone, address)
- Insurance provider matches
- Physician associations
- Medical history overlap

Provide detailed match analysis with confidence scoring.`,
        response_json_schema: {
            type: "object",
            properties: {
                best_match_id: { type: "string" },
                confidence_score: { type: "number" },
                confidence_level: {
                    type: "string",
                    enum: ["high", "medium", "low", "no_match"]
                },
                match_factors: {
                    type: "array",
                    items: { type: "string" }
                },
                discrepancies: {
                    type: "array",
                    items: { type: "string" }
                },
                alternative_matches: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            patient_id: { type: "string" },
                            confidence_score: { type: "number" },
                            reasons: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                },
                recommendation: {
                    type: "string",
                    enum: ["use_match", "manual_review", "create_new"]
                },
                reasoning: { type: "string" }
            }
        }
    });

    return Response.json({
        success: true,
        matchAnalysis
    });
}

async function fullAnalysis(base44, params) {
    const { extractedData, analysisResults, existingPatients } = params;

    // Run all analyses in parallel for efficiency
    const [priorityResult, matchResult] = await Promise.all([
        analyzePriority(base44, { extractedData, analysisResults }),
        matchPatient(base44, { extractedData, existingPatients })
    ]);

    const priorityData = await priorityResult.json();
    const matchData = await matchResult.json();

    // Generate tasks based on priority analysis
    const tasksResult = await generateTasks(base44, {
        referralData: extractedData,
        priorityAnalysis: priorityData.priorityAnalysis
    });

    const tasksData = await tasksResult.json();

    return Response.json({
        success: true,
        priority: priorityData.priorityAnalysis,
        patientMatch: matchData.matchAnalysis,
        tasks: tasksData.tasks
    });
}