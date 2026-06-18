import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Archiving retires a patient's signed clinical/legal document, so restrict
    // it to administrators rather than any authenticated user.
    const isAdminLike =
      user.role === 'admin' ||
      user.account_type === 'agency_admin' ||
      user.account_type === 'super_admin';
    if (!isAdminLike) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const { document_id, archive_notes } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'Missing document_id' }, { status: 400 });
    }

    // Fetch the document
    const docs = await base44.entities.DocumentSignature.filter({ id: document_id });
    if (!docs || docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = docs[0];

    // Add archive entry to audit trail
    const updatedAuditTrail = document.audit_trail || [];
    updatedAuditTrail.push({
      action: 'archived',
      timestamp: new Date().toISOString(),
      signer_id: null,
      notes: `Document archived by ${user.full_name}. ${archive_notes || ''}`
    });

    // Update document with archived status and audit trail
    await base44.asServiceRole.entities.DocumentSignature.update(document_id, {
      status: 'archived',
      audit_trail: updatedAuditTrail
    });

    // Create archive log entry for compliance
    await base44.asServiceRole.entities.SystemLog.create({
      action: 'document_archived',
      user_email: user.email,
      details: {
        document_id,
        document_type: document.document_type,
        patient_id: document.patient_id,
        archive_date: new Date().toISOString(),
        total_signers: document.signers?.length || 0,
        archive_notes
      }
    });

    return Response.json({ 
      success: true, 
      message: 'Document archived successfully',
      archived_at: new Date().toISOString(),
      audit_trail_entries: updatedAuditTrail.length
    });
  } catch (error) {
    console.error('Error archiving document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});