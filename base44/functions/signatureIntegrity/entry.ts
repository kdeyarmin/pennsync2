import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * signatureIntegrity — server-side tamper-evidence for DocumentSignature records.
 *
 * Replaces the old client-side `generateSignatureHash` (a keyless 32-bit hash that
 * anyone could recompute, providing no real tamper-evidence or non-repudiation).
 * The MAC is computed HERE, over a canonical projection of the STORED record (the
 * single source of truth), using a server-held secret the client never sees.
 *
 *   action: 'stamp'  — compute and store the MAC once, at signing time.
 *   action: 'verify' — recompute and compare; reports valid / tampered / unsigned.
 *
 * Set SIGNATURE_HMAC_SECRET to get keyed HMAC-SHA-256 (forgery-resistant). Without
 * it, falls back to unkeyed SHA-256 — which still detects accidental corruption but
 * is NOT forgery-resistant, and is reported as such so the UI can be honest.
 */

// Canonical, order-stable serialization of the integrity-relevant fields. Derived
// from the stored record so any post-signing edit to a covered field changes the
// recomputed value and fails verification.
function canonicalPayload(rec) {
  const signers = (Array.isArray(rec?.signers) ? rec.signers : [])
    .map((s) => ({
      id: s?.id ?? null,
      email: s?.email ?? null,
      name: s?.name ?? null,
      role: s?.role ?? null,
      status: s?.status ?? null,
      signed_date: s?.signed_date ?? null,
      signature: s?.signature ?? null,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify({
    id: rec?.id ?? null,
    patient_id: rec?.patient_id ?? null,
    document_type: rec?.document_type ?? null,
    document_title: rec?.document_title ?? null,
    document_url: rec?.document_url ?? null,
    completed_date: rec?.completed_date ?? null,
    signers,
  });
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compute the integrity hash. `forceAlg` lets verify recompute with the SAME
// algorithm a record was signed with (e.g. an old sha256-unkeyed record stays
// verifiable even after a secret is later configured).
async function computeHash(message, forceAlg) {
  const enc = new TextEncoder();
  const secret = (Deno.env.get('SIGNATURE_HMAC_SECRET') || '').trim();
  const alg = forceAlg || (secret ? 'hmac-sha256' : 'sha256-unkeyed');
  if (alg === 'hmac-sha256') {
    if (!secret) return { hash: null, alg, error: 'secret_unconfigured' };
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return { hash: toHex(sig), alg };
  }
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return { hash: toHex(digest), alg: 'sha256-unkeyed' };
}

// Constant-time string compare to avoid timing oracles on the MAC.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Same authorization model as sendSignatureReminder: admin / clinical lead, the
// record's owner, or a nurse assigned to (or creator of) the patient.
async function canMutate(base44, user, sig) {
  const role = user.role;
  if (role === 'admin' || role === 'clinician' || role === 'nurse_manager') return true;
  if (sig.created_by === user.email || sig.created_by_email === user.email
    || sig.requested_by === user.email || sig.sender_email === user.email) return true;
  if (sig.patient_id) {
    const [p] = await base44.asServiceRole.entities.Patient.filter({ id: sig.patient_id }).catch(() => []);
    if (p && (p.created_by === user.email
      || (Array.isArray(p.assigned_nurses) && p.assigned_nurses.includes(user.email)))) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, signature_id } = await req.json();
    if (!signature_id) return Response.json({ error: 'signature_id is required' }, { status: 400 });

    const sig = await base44.asServiceRole.entities.DocumentSignature.get(signature_id).catch(() => null);
    if (!sig) return Response.json({ error: 'Signature not found' }, { status: 404 });

    if (action === 'stamp') {
      if (!(await canMutate(base44, user, sig))) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Stamp exactly once, at signing. Re-stamping would let someone edit a signed
      // record and then recompute a fresh "valid" MAC over the tampered data, which
      // would defeat the entire tamper-evidence guarantee.
      if (sig.signature_hash) {
        return Response.json({ error: 'Signature is already stamped; re-stamping is not allowed.' }, { status: 409 });
      }
      const { hash, alg } = await computeHash(canonicalPayload(sig));
      await base44.asServiceRole.entities.DocumentSignature.update(signature_id, {
        signature_hash: hash,
        signature_hash_alg: alg,
        signature_hash_at: new Date().toISOString(),
      });
      return Response.json({ success: true, alg });
    }

    // Default action: verify.
    const stored = sig.signature_hash || null;
    if (!stored) {
      return Response.json({ success: true, isValid: false, status: 'unsigned', reason: 'no_integrity_hash' });
    }
    const { hash, error } = await computeHash(canonicalPayload(sig), sig.signature_hash_alg);
    if (error === 'secret_unconfigured') {
      // The record was HMAC-signed but the secret isn't available to verify it now.
      return Response.json({ success: true, isValid: false, status: 'unverifiable', reason: 'secret_unconfigured', alg: sig.signature_hash_alg });
    }
    const isValid = timingSafeEqual(hash, stored);
    return Response.json({
      success: true,
      isValid,
      alg: sig.signature_hash_alg || 'sha256-unkeyed',
      status: isValid ? 'valid' : 'tampered',
    });
  } catch (error) {
    console.error('signatureIntegrity error:', error);
    return Response.json({ error: 'Integrity operation failed' }, { status: 500 });
  }
});
