import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { extractedData, existingPatients } = await req.json();

        // Use AI to analyze and match patients with nuanced data points
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
    physician: p.physician_name,
    past_diagnoses: p.secondary_diagnoses,
    admission_date: p.admission_date,
    status: p.status
})), null, 2)}

Consider:
- Name similarity (nicknames, abbreviations, spelling variations)
- Date of birth exact and partial matches
- Contact information (phone, address)
- Insurance provider matches
- Physician associations
- Medical history overlap
- Demographics consistency

Provide detailed match analysis with confidence scoring.`,
            response_json_schema: {
                type: "object",
                properties: {
                    best_match_id: {
                        type: "string",
                        description: "Patient ID of best match, or null if no confident match"
                    },
                    confidence_score: {
                        type: "number",
                        description: "Confidence percentage 0-100"
                    },
                    confidence_level: {
                        type: "string",
                        enum: ["high", "medium", "low", "no_match"],
                        description: "Categorized confidence level"
                    },
                    match_factors: {
                        type: "array",
                        items: { type: "string" },
                        description: "Factors supporting the match"
                    },
                    discrepancies: {
                        type: "array",
                        items: { type: "string" },
                        description: "Factors that don't match or raise questions"
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
                        },
                        description: "Other possible matches to consider"
                    },
                    recommendation: {
                        type: "string",
                        enum: ["use_match", "manual_review", "create_new"],
                        description: "Recommended action"
                    },
                    reasoning: {
                        type: "string",
                        description: "Detailed explanation of the analysis"
                    }
                }
            }
        });

        return Response.json({
            success: true,
            matchAnalysis
        });

    } catch (error) {
        console.error('Error matching patient with AI:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});