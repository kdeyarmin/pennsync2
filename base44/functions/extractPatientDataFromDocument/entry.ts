import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PATIENT_SCHEMA = {
  type: "object",
  properties: {
    first_name: { type: "string", description: "Patient's first name" },
    middle_name: { type: "string", description: "Patient's middle name or initial" },
    last_name: { type: "string", description: "Patient's last name" },
    date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
    phone: { type: "string", description: "Phone number" },
    email: { type: "string", description: "Email address" },
    address: { type: "string", description: "Full address" },
    medical_record_number: { type: "string", description: "Medical record number (MRN)" },
    primary_diagnosis: { type: "string", description: "Primary diagnosis or chief complaint" },
    allergies: { type: "string", description: "Known allergies" },
    emergency_contact_name: { type: "string", description: "Emergency contact name" },
    emergency_contact_phone: { type: "string", description: "Emergency contact phone" },
    emergency_contact_relationship: { type: "string", description: "Relationship to patient" },
    physician_name: { type: "string", description: "Primary care physician name" },
    physician_phone: { type: "string", description: "Physician phone" },
    payor: { type: "string", description: "Primary insurance/payor type" },
    insurance_primary: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Insurance provider name" },
        policy_number: { type: "string", description: "Policy number" },
        group_number: { type: "string", description: "Group number" }
      }
    },
    secondary_diagnoses: {
      type: "array",
      items: { type: "string" },
      description: "Secondary diagnoses"
    },
    past_medical_history: {
      type: "array",
      items: { type: "string" },
      description: "Past medical conditions"
    },
    current_medications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          dosage: { type: "string" },
          frequency: { type: "string" }
        }
      },
      description: "Current medications"
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ 
        status: 'error',
        details: 'file_url is required' 
      }, { status: 400 });
    }

    // Use AI to extract structured patient data from the document
    const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: PATIENT_SCHEMA
    });

    if (extractionResult.status === 'success') {
      return Response.json({
        status: 'success',
        patient_data: extractionResult.output || {},
        message: 'Patient data extracted successfully'
      });
    } else {
      return Response.json({
        status: 'error',
        details: extractionResult.details || 'Failed to extract patient data from document',
        patient_data: null
      });
    }

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message 
    }, { status: 500 });
  }
});