import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // This is a Base44 entity-trigger (fires when a DocumentSignature is updated):
    // the platform invokes it with NO user identity and no way to attach an
    // x-internal-secret header, so an auth/secret gate here would 403 the
    // legitimate trigger the moment INTERNAL_FN_SECRET is set. The integrity
    // defense for a trigger is to NOT trust the posted body — re-fetch the
    // canonical record by id and act only on its real, server-side state. The id
    // is always present on a real trigger, so we REQUIRE it and never fall back to
    // the body (otherwise a forged body with no id would be trusted verbatim).
    if (!event || event.type !== 'update') {
      return Response.json({ success: true });
    }

    if (!data?.id) {
      return Response.json({ success: true, skipped: 'no signature id' });
    }
    const signature = await base44.asServiceRole.entities.DocumentSignature.get(data.id).catch(() => null);
    if (!signature) {
      // No real record for this id → nothing to act on (ignore forged ids).
      return Response.json({ success: true, skipped: 'signature not found' });
    }

    // Only process if signature status changed to "signed"
    if (signature.status !== 'signed') {
      return Response.json({ success: true });
    }

    // Get the package details
    const pkg = await base44.asServiceRole.entities.DocumentPackage.get(
      signature.package_id
    );

    if (!pkg) {
      return Response.json({ success: true });
    }

    // Determine completion from the package's declared membership
    // (pkg.document_signatures = array of signature ids), the authoritative
    // source. The creators don't always back-fill package_id onto each
    // DocumentSignature, so filter({ package_id }) could return an EMPTY set and
    // [].every() === true would mark a package "completed" with NOTHING signed.
    // Mirror checkPendingSignatureRequests.
    const memberIds = Array.isArray(pkg.document_signatures) ? pkg.document_signatures : [];
    const members = await Promise.all(
      memberIds.map((id) => base44.asServiceRole.entities.DocumentSignature.get(id).catch(() => null))
    );
    const present = members.filter(Boolean);
    const allSigned = memberIds.length > 0 &&
      present.length === memberIds.length &&
      present.every((sig) => sig.status === 'signed');

    // Update package status if all documents are signed
    if (allSigned) {
      await base44.asServiceRole.entities.DocumentPackage.update(signature.package_id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    // Send notification email to admins about the signature. Resolve the real
    // admin recipients (mirroring notifyAdminOfSignedDocument / onUserSignup)
    // rather than the previous hardcoded 'admin@agency.com' placeholder, which
    // never reached a real inbox and risked leaking signer details to an
    // address the agency doesn't control.
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            base44.integrations.Core.SendEmail({
              to: admin.email,
              subject: `Document Signed: ${pkg.package_name}`,
              body: `${signature.signer_name} (${signature.signer_email}) has signed the document.\n\nPackage: ${pkg.package_name}\nStatus: ${allSigned ? 'COMPLETE - All documents signed' : 'In Progress'}`,
            })
          )
        );
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Continue even if email fails
    }

    return Response.json({
      success: true,
      package_updated: allSigned,
      all_signed: allSigned,
    });
  } catch (error) {
    console.error('Error in onDocumentSigned:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});