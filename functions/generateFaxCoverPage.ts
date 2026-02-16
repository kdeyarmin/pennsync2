import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id, document_id, recipient_number, sender_number, recipient_name, sender_name, subject, notes } = await req.json();

    let patientDetails = {};
    if (patient_id) {
      const patients = await base44.entities.Patient.filter({ id: patient_id });
      if (patients.length > 0) {
        patientDetails = patients[0];
      }
    }

    let documentDetails = {};
    if (document_id) {
      const documents = await base44.entities.Document.filter({ id: document_id });
      if (documents.length > 0) {
        documentDetails = documents[0];
      }
    }

    const llmPrompt = `Generate a professional fax cover page in JSON format. Populate the fields based on the provided data. If a field is not provided, use a reasonable default or leave it blank.

Sender Information:
  Name: ${sender_name || user.full_name}
  Phone: ${sender_number || ''}

Recipient Information:
  Name: ${recipient_name || ''}
  Fax Number: ${recipient_number || ''}

Subject: ${subject || 'Regarding patient ' + (patientDetails.first_name || '') + ' ' + (patientDetails.last_name || '')}

Notes: ${notes || ''}

Current Date: ${new Date().toLocaleDateString()}

Patient Details (if available):
  Patient Name: ${patientDetails.first_name || ''} ${patientDetails.last_name || ''}
  Date of Birth: ${patientDetails.date_of_birth || ''}
  Medical Record Number: ${patientDetails.medical_record_number || ''}

Document Details (if available):
  Document Title: ${documentDetails.title || ''}
  Document Category: ${documentDetails.category || ''}

Output a JSON object with the following structure. Do NOT include any other text, only the JSON.
{
  "from": {
    "name": "<Sender Name>",
    "phone": "<Sender Phone>"
  },
  "to": {
    "name": "<Recipient Name>",
    "fax": "<Recipient Fax Number>"
  },
  "date": "<Current Date>",
  "subject": "<Fax Subject>",
  "message": "<Notes to Recipient>",
  "patient_info": {
    "name": "<Patient Full Name>",
    "dob": "<Patient DOB>",
    "mrn": "<Patient MRN>"
  },
  "document_info": {
    "title": "<Document Title>",
    "category": "<Document Category>"
  }
}
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          from: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" } } },
          to: { type: "object", properties: { name: { type: "string" }, fax: { type: "string" } } },
          date: { type: "string" },
          subject: { type: "string" },
          message: { type: "string" },
          patient_info: { type: "object", properties: { name: { type: "string" }, dob: { type: "string" }, mrn: { type: "string" } } },
          document_info: { type: "object", properties: { title: { type: "string" }, category: { type: "string" } } }
        },
        required: ["from", "to", "date", "subject"]
      }
    });

    return Response.json({ success: true, cover_page_data: aiResponse });

  } catch (error) {
    console.error('AI fax cover page generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});