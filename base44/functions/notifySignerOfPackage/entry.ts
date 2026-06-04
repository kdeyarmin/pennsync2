import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data) {
      return Response.json({ error: 'No package data provided' }, { status: 400 });
    }

    const pkg = data;
    if (!pkg.signer_email) {
      return Response.json({ success: true, skipped: 'No signer email' });
    }

    // Generate token for this signer. functions.invoke wraps the body under
    // `.data` (same convention as gradeTrainingAttempt's certResult.data), so
    // reading token.success/token.token directly was always undefined — the
    // function 500'd even on success and never emailed the signer.
    const tokenResult = await base44.asServiceRole.functions.invoke('generateSignerToken', {
      package_id: pkg.id,
      signer_email: pkg.signer_email,
      signer_name: pkg.signer_name,
    });

    const tokenData = tokenResult?.data || tokenResult;
    if (!tokenData?.success || !tokenData?.token) {
      return Response.json({ error: 'Failed to generate signer token' }, { status: 500 });
    }

    // Get patient name
    const patient = await base44.asServiceRole.entities.Patient.get(pkg.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'a patient';

    // Send email notification
    const dueDate = pkg.due_date ? new Date(pkg.due_date).toLocaleDateString() : 'soon';
    const signerPortalLink = `${Deno.env.get('APP_URL') || 'https://app.base44.io'}/signer?token=${tokenData.token}`;

    const subject = `${pkg.package_name} - Documents Ready for Signature`;
    const body = `
Hello ${pkg.signer_name},

A new document package has been assigned to you for ${patientName}.

Package Name: ${pkg.package_name}
Due Date: ${dueDate}
Documents: ${pkg.document_signatures?.length || 0} document(s) to review and sign

Click the link below to access your secure signing portal:
${signerPortalLink}

This link is unique to you and is securely authenticated. It will expire in 30 days.

Please review and sign all documents at your earliest convenience.

If you have any questions, please contact the healthcare provider.

Thank you,
Document Management System
    `;

    await base44.integrations.Core.SendEmail({
      to: pkg.signer_email,
      subject,
      body,
      from_name: 'Document Management',
    });

    return Response.json({ success: true, email_sent: true });
  } catch (error) {
    console.error('Error sending signer notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});