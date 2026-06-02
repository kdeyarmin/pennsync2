export function generateSignatureHash(data) {
  const str = JSON.stringify(data);
  let hash = 0;

  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }

  return Math.abs(hash).toString(16);
}

export function buildSignatureIntegrityPayload(signature) {
  return {
    document_type: signature.document_type,
    document_id: signature.document_id,
    document_title: signature.document_title,
    signature_data: signature.signature_data,
    signed_by: signature.signed_by,
    signed_by_name: signature.signed_by_name,
    signed_by_credentials: signature.signed_by_credentials,
    signed_date: signature.signed_date,
    ip_address: signature.ip_address,
    location_data: signature.location_data,
    user_agent: signature.user_agent,
    attestation_accepted: signature.attestation_accepted,
    attestation_text: signature.attestation_text,
    signature_method: signature.signature_method,
    device_type: signature.device_type,
  };
}

export function verifySignatureIntegrity(signature) {
  const calculatedHash = generateSignatureHash(buildSignatureIntegrityPayload(signature));

  return {
    isValid: calculatedHash === signature.signature_hash,
    calculatedHash,
    storedHash: signature.signature_hash,
  };
}

export function getDocumentDisplayName(signatureRecord) {
  return (
    signatureRecord?.document_name
    || signatureRecord?.document_title
    || signatureRecord?.template_name
    || signatureRecord?.packet_name
    || signatureRecord?.document_type
    || 'Document'
  );
}

export function getSignatureDueDate(signatureRecord) {
  return signatureRecord?.due_date || signatureRecord?.expires_at || null;
}

export function getSignatureSignedAt(signatureRecord) {
  return signatureRecord?.signed_at || signatureRecord?.signed_date || signatureRecord?.completed_date || null;
}

export function getSignerProgress(signatureRecord) {
  const signers = Array.isArray(signatureRecord?.signers) && signatureRecord.signers.length > 0
    ? signatureRecord.signers
    : Array.isArray(signatureRecord?.required_signatures)
      ? signatureRecord.required_signatures.map((signer, index) => ({
          id: signer.signer_id || signer.id || `${index}`,
          required: signer.is_required !== false,
          signature: signer.signature,
          signed_date: signer.signed_date,
          is_signed: signer.is_signed,
        }))
      : [];

  const requiredSigners = signers.filter((signer) => signer.required !== false);
  const signedRequiredCount = requiredSigners.filter((signer) => signer.signature || signer.signed_date || signer.is_signed).length;

  return {
    totalSigners: signers.length,
    requiredSigners: requiredSigners.length,
    signedRequiredCount,
    allRequiredSigned: requiredSigners.length > 0 && signedRequiredCount === requiredSigners.length,
  };
}

export function getNormalizedSignatureStatus(signatureRecord) {
  const explicitStatus = signatureRecord?.status;

  if (explicitStatus === 'signed' || explicitStatus === 'completed') {
    return 'signed';
  }

  if (explicitStatus === 'rejected') {
    return 'declined';
  }

  if (explicitStatus === 'declined' || explicitStatus === 'expired') {
    return explicitStatus;
  }

  if (signatureRecord?.signature_data && getSignatureSignedAt(signatureRecord)) {
    return 'signed';
  }

  const progress = getSignerProgress(signatureRecord);
  if (progress.allRequiredSigned) {
    return 'signed';
  }

  return explicitStatus || 'pending';
}

export function getSignatureStatusLabel(signatureRecord) {
  const status = typeof signatureRecord === 'string'
    ? signatureRecord
    : getNormalizedSignatureStatus(signatureRecord);

  switch (status) {
    case 'signed':
      return 'Signed';
    case 'declined':
      return 'Declined';
    case 'expired':
      return 'Expired';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Pending';
  }
}

export function isSignatureOverdue(signatureRecord) {
  const dueDate = getSignatureDueDate(signatureRecord);
  const normalizedStatus = typeof signatureRecord === 'string'
    ? signatureRecord
    : getNormalizedSignatureStatus(signatureRecord);

  return Boolean(
    dueDate
    && normalizedStatus !== 'signed'
    && normalizedStatus !== 'declined'
    && normalizedStatus !== 'expired'
    && new Date(dueDate) < new Date()
  );
}
