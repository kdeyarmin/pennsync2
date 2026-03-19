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
  const signers = Array.isArray(signatureRecord?.signers) ? signatureRecord.signers : [];
  const requiredSigners = signers.filter((signer) => signer.required !== false);
  const signedRequiredCount = requiredSigners.filter((signer) => signer.signature || signer.signed_date).length;

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
