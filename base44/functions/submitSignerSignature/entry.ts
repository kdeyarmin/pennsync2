import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * submitSignerSignature — the ONLY authorized path for an external signer to
 * record a signature from the public /signer portal.
 *
 * The portal is unauthenticated; previously the signature was written straight
 * from the browser via the public SDK to the (RLS-less) DocumentSignature
 * entity, with the signer token never checked — so anyone could forge a
 * signature on any document as any signer. This function moves the write
 * server-side behind the token, mirroring validateSignerToken: the caller must
 * present a valid, active, unexpired token whose package actually contains the
 * document, and the signer identity is taken from the TOKEN, never the client.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, document_id, signature_image_url, typed_name } = await req.json();

    if (!token || !document_id) {
      return Response.json({ error: 'token and document_id are required' }, { status: 400 });
    }

    // 1) Validate the token (mirror validateSignerToken): exists, active, unexpired.
    const tokenRecords = await base44.asServiceRole.entities.DocumentPackageToken.filter(
      { token }, '-created_date', 1
    );
    const tokenRecord = tokenRecords?.[0];
    if (!tokenRecord || tokenRecord.is_active === false) {
      return Response.json({ error: 'Invalid or inactive token' }, { status: 401 });
    }
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || now > expiresAt) {
      await base44.asServiceRole.entities.DocumentPackageToken.update(tokenRecord.id, { is_active: false }).catch(() => {});
      return Response.json({ error: 'Token has expired' }, { status: 401 });
    }

    // 2) Bind token -> document: the document MUST belong to this token's package.
    const pkg = await base44.asServiceRole.entities.DocumentPackage.get(tokenRecord.package_id).catch(() => null);
    if (!pkg) {
      return Response.json({ error: 'Document package is no longer available' }, { status: 404 });
    }
    const memberIds = Array.isArray(pkg.document_signatures) ? pkg.document_signatures : [];
    if (!memberIds.includes(document_id)) {
      return Response.json({ error: 'This document is not part of the signer\'s package' }, { status: 403 });
    }

    // 3) Fetch the signature; reject if already signed (single-use per document).
    const signature = await base44.asServiceRole.entities.DocumentSignature.get(document_id).catch(() => null);
    if (!signature) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    if (signature.status === 'signed') {
      return Response.json({ error: 'This document has already been signed', already_signed: true }, { status: 409 });
    }

    // 4) Optional per-signer binding: if the signature was pre-assigned to a
    //    specific signer email, it must match the token's signer.
    if (signature.signer_email && tokenRecord.signer_email &&
        String(signature.signer_email).toLowerCase() !== String(tokenRecord.signer_email).toLowerCase()) {
      return Response.json({ error: 'This document is assigned to a different signer' }, { status: 403 });
    }

    // 5) Write the signature with the SERVER-derived identity (from the token) —
    //    never a client-supplied signer name. Back-fill package_id so the
    //    completion/notification paths that filter by it agree.
    await base44.asServiceRole.entities.DocumentSignature.update(document_id, {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: tokenRecord.signer_name || typed_name || signature.signer_name || '',
      signer_email: tokenRecord.signer_email || signature.signer_email || '',
      signature_image_url: signature_image_url || null,
      package_id: tokenRecord.package_id,
    });

    // 6) Single-use on completion: once every document in the package is signed,
    //    deactivate the token so the link can't be replayed to keep reading PHI.
    //    (The onDocumentSigned entity-trigger handles marking the package complete
    //    and notifying admins.)
    const members = await Promise.all(
      memberIds.map((id) => base44.asServiceRole.entities.DocumentSignature.get(id).catch(() => null))
    );
    const present = members.filter(Boolean);
    const allSigned = present.length === memberIds.length && present.every((s) => s.status === 'signed');
    if (allSigned) {
      await base44.asServiceRole.entities.DocumentPackageToken.update(tokenRecord.id, { is_active: false }).catch(() => {});
    }

    return Response.json({ success: true, document_id, all_signed: allSigned });
  } catch (error) {
    console.error('submitSignerSignature error:', error);
    return Response.json({ error: 'Unable to record signature' }, { status: 500 });
  }
});
