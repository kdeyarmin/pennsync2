import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enhancedNote, patientId, visitType, diagnosis, vitalSigns } = await req.json();

    if (!enhancedNote) {
      return Response.json({ error: 'Enhanced note is required' }, { status: 400 });
    }

    // Fetch existing OASIS data if patient ID provided
    let existingOASIS = null;
    if (patientId) {
      const oasisRecords = await base44.asServiceRole.entities.OASISUpload.filter(
        { patient_id: patientId },
        '-created_date',
        1
      );
      existingOASIS = oasisRecords[0] || null;
    }

    // Common OASIS items with descriptions and possible values
    const oasisItems = [
      {
        number: "M1033",
        description: "Risk for Hospitalization",
        values: { "0": "No", "1": "Yes" }
      },
      {
        number: "M1311",
        description: "Current Number of Unhealed Pressure Ulcers/Injuries",
        values: { "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four or more" }
      },
      {
        number: "M1324",
        description: "Stage of Most Problematic Unhealed Pressure Ulcer/Injury",
        values: { "1": "Stage I", "2": "Stage II", "3": "Stage III", "4": "Stage IV", "A1": "Unstageable", "A2": "Deep Tissue Injury" }
      },
      {
        number: "M1800",
        description: "Grooming",
        values: { "0": "Able to groom self", "1": "Grooming utensils must be placed within reach", "2": "Someone must assist", "3": "Totally dependent" }
      },
      {
        number: "M1810",
        description: "Current Ability to Dress Upper Body",
        values: { "0": "Able to dress upper body", "1": "Able to dress upper body with minimal assistance", "2": "Someone must help", "3": "Totally dependent" }
      },
      {
        number: "M1820",
        description: "Current Ability to Dress Lower Body",
        values: { "0": "Able to dress lower body", "1": "Able to dress lower body with minimal assistance", "2": "Someone must help", "3": "Totally dependent" }
      },
      {
        number: "M1830",
        description: "Bathing",
        values: { "0": "Able to bathe self", "1": "With use of devices", "2": "Able to bathe with some assistance", "3": "Participates in bathing", "4": "Unable to participate", "5": "Totally dependent", "6": "Unable to bathe due to medical restriction" }
      },
      {
        number: "M1840",
        description: "Toilet Transferring",
        values: { "0": "Able to get to and from toilet independently", "1": "When reminded, assisted, or supervised", "2": "Unable to get to and from toilet", "3": "Totally dependent in toileting" }
      },
      {
        number: "M1850",
        description: "Transferring",
        values: { "0": "Able to independently transfer", "1": "Transfers with minimal assistance", "2": "Unable to transfer without assistance", "3": "Bedfast, unable to transfer" }
      },
      {
        number: "M1860",
        description: "Ambulation/Locomotion",
        values: { "0": "Able to walk independently", "1": "Requires use of device", "2": "Able to walk with supervision", "3": "Chairfast, unable to ambulate", "4": "Bedfast, unable to ambulate or be up in chair" }
      },
      {
        number: "M1033",
        description: "Risk for Hospitalization",
        values: { "0": "No", "1": "Yes" }
      },
      {
        number: "M2102",
        description: "Types and Sources of Assistance",
        values: { "0": "No assistance needed", "1": "Non-agency caregiver", "2": "ADH services", "3": "Assistive devices" }
      }
    ];

    const prompt = `You are an expert OASIS-C2/C3 coder with deep knowledge of Medicare home health documentation requirements. Your task is to analyze a clinical nursing note and intelligently map relevant information to specific OASIS assessment items.

CLINICAL NOTE TO ANALYZE:
${enhancedNote}

VISIT CONTEXT:
- Visit Type: ${visitType || 'Not specified'}
- Primary Diagnosis: ${diagnosis || 'Not specified'}
- Vital Signs: ${vitalSigns ? JSON.stringify(vitalSigns) : 'Not provided'}

${existingOASIS ? `EXISTING OASIS DATA (for comparison):
Assessment Date: ${existingOASIS.created_date}
Extracted Data: ${JSON.stringify(existingOASIS.extracted_data || {}, null, 2)}
PDGM Data: ${JSON.stringify(existingOASIS.pdgm_data || {}, null, 2)}
` : 'NO EXISTING OASIS DATA - This is a new assessment'}

OASIS ITEMS TO MAP (Common Items):
${oasisItems.map(item => `${item.number} - ${item.description}
Possible Values: ${JSON.stringify(item.values)}`).join('\n\n')}

TASK:
For EACH OASIS item that can be determined from the clinical note:

1. **Extract Evidence**: Identify EXACT sentences or phrases from the note that relate to this OASIS item
2. **Determine Value**: Based on the evidence, suggest the most appropriate OASIS value
3. **Assign Confidence**: Rate your confidence (0-100%) based on:
   - How explicit the documentation is
   - Whether multiple data points support the value
   - Alignment with clinical judgment
4. **Detect Discrepancies**: If existing OASIS data is provided, compare your suggestion to the current value
5. **Recommend Action**:
   - "auto_update" = High confidence (>80%), clear evidence, update automatically
   - "review" = Moderate confidence (50-80%), should be reviewed by nurse
   - "flag" = Low confidence (<50%) or critical discrepancy, requires manual assessment
   - "no_change" = Current OASIS value is correct based on note

6. **Link to Note**: Identify where in the note the supporting evidence appears

CRITICAL GUIDELINES:
- Only suggest values you have clear evidence for in the note
- Be conservative with confidence scores - it's better to flag for review than to be wrong
- Pay special attention to functional status items (M1800-M1860) as these are frequently documented
- Look for key phrases like "requires assistance," "independent," "wheelchair bound," "bedbound"
- For wound items, look for measurements, staging, location
- For risk items, look for mentions of falls, hospitalization history, safety concerns
- Flag HIGH PRIORITY discrepancies (e.g., wound stage changed, functional decline)

Return JSON with detailed mapping results:`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          oasis_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_number: { type: "string" },
                item_description: { type: "string" },
                suggested_value: { type: "string" },
                suggested_value_label: { type: "string" },
                confidence_score: { type: "number" },
                supporting_text: { type: "string" },
                note_location: { type: "string" },
                current_oasis_value: { type: "string" },
                discrepancy_flag: { type: "boolean" },
                discrepancy_reason: { type: "string" },
                discrepancy_severity: { type: "string" },
                action_needed: { type: "string" },
                clinical_rationale: { type: "string" }
              }
            }
          },
          overall_summary: {
            type: "object",
            properties: {
              total_items_mapped: { type: "number" },
              high_confidence_count: { type: "number" },
              discrepancy_count: { type: "number" },
              flagged_for_review_count: { type: "number" },
              auto_update_ready_count: { type: "number" }
            }
          },
          missing_critical_info: {
            type: "array",
            items: {
              type: "object",
              properties: {
                oasis_item: { type: "string" },
                reason: { type: "string" },
                suggestion: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Log the mapping for audit trail
    try {
      await base44.asServiceRole.entities.SystemLog.create({
        log_type: 'oasis_automation',
        user_email: user.email,
        details: {
          patient_id: patientId,
          items_mapped: result.overall_summary?.total_items_mapped || 0,
          discrepancies: result.overall_summary?.discrepancy_count || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Error logging OASIS automation:', logError);
    }

    return Response.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error in mapNoteToOASIS:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});