import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'No signature data provided' }, { status: 400 });
    }

    const signature = data;

    // Only notify if status is 'signed'
    if (signature.status !== 'signed') {
      return Response.json({ success: true, skipped: 'Not a signed status' });
    }

    // Fetch package info
    let pkg = null;
    try {
      // Find package containing this signature
      const packages = await base44.asServiceRole.entities.DocumentPackage.filter({
        document_signatures: signature.id,
      });
      pkg = packages.length > 0 ? packages[0] : null;
    } catch (e) {
      // Package may not exist yet
      console.log('Could not fetch package');
    }

    // Fetch patient info (tolerate a missing/invalid patient_id rather than
    // 500-ing the whole notification on a bad lookup)
    const patient = await base44.asServiceRole.entities.Patient.get(signature.patient_id).catch(() => null);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';

    // Get all admins
    const admins = await base44.asServiceRole.entities.User.filter({
      role: 'admin',
    });

    if (!admins || admins.length === 0) {
      return Response.json({ success: true, skipped: 'No admins found' });
    }

    const subject = `Document Signed: ${signature.document_name}`;
    const documentLink = `/DocumentHub`;
    const body = `
A document has been successfully signed.

Patient: ${patientName}
Document: ${signature.document_name}
Type: ${signature.document_type}
Signed By: ${signature.signer_name} (${signature.signer_email})
Signed At: ${new Date().toLocaleString()}
${pkg ? `Package: ${pkg.package_name}` : ''}

View details in the Document Hub for more information.

---
Document Management System
    `;

    // Send email to all admins
    const emailPromises = admins.map((admin) =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject,
        body,
        from_name: 'Document Management',
      })
    );

    await Promise.all(emailPromises);

    return Response.json({
      success: true,
      admins_notified: admins.length,
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});