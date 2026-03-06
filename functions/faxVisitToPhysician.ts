import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { visitId, patientId, physicianFaxNumber, pdfBase64 } = await req.json();

    if (!visitId || !physicianFaxNumber || !pdfBase64) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch visit and patient details
    const [visit, patient] = await Promise.all([
      base44.entities.Visit.read(visitId),
      base44.entities.Patient.read(patientId)
    ]);

    if (!visit || !patient) {
      return Response.json({ error: 'Visit or patient not found' }, { status: 404 });
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FAX_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // Decode base64 PDF - pass directly as string
    const uploadResponse = await base44.integrations.Core.UploadFile({
      file: pdfBase64
    });

    if (!uploadResponse.file_url) {
      return Response.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    // Send fax via Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    const faxData = new URLSearchParams();
    faxData.append('To', physicianFaxNumber);
    faxData.append('From', fromNumber);
    faxData.append('MediaUrl', uploadResponse.file_url);

    const twilioResponse = await fetch(
      `https://fax.twilio.com/v1/Faxes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: faxData.toString()
      }
    );

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio error:', errorText);
      return Response.json({ error: 'Failed to send fax via Twilio' }, { status: 500 });
    }

    const twilioData = await twilioResponse.json();

    // Log the fax in FaxLog
    const faxLog = await base44.entities.FaxLog.create({
      from_number: fromNumber,
      to_number: physicianFaxNumber,
      to_name: patient.physician_name || 'Physician',
      document_url: uploadResponse.file_url,
      document_name: `Visit Note - ${patient.first_name} ${patient.last_name} - ${new Date().toLocaleDateString()}`,
      status: 'sent',
      telnyx_fax_id: twilioData.sid,
      patient_id: patientId,
      sent_by: user.email,
      priority: 'normal',
      pages: 1
    });

    // Update visit with physician notification flag
    await base44.entities.Visit.update(visitId, {
      family_update_sent: true,
      family_update_date: new Date().toISOString(),
      family_update_text: `Fax sent to ${patient.physician_name} at ${physicianFaxNumber}`
    });

    return Response.json({
      success: true,
      message: 'Fax sent successfully',
      faxLogId: faxLog.id,
      twilioSid: twilioData.sid
    });
  } catch (error) {
    console.error('Error sending fax:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});