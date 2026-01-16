// Fuzzy matching utilities for duplicate detection

// Levenshtein distance algorithm for string similarity
const levenshteinDistance = (str1, str2) => {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  
  return matrix[b.length][a.length];
};

// Check if two names are similar (accounts for typos)
const namesSimilar = (name1, name2, threshold = 2) => {
  if (!name1 || !name2) return false;
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return levenshteinDistance(n1, n2) <= threshold;
};

// Normalize phone numbers for comparison
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Normalize email for comparison
const normalizeEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Calculate match score between two patients
export const calculateMatchScore = (uploadedPatient, existingPatient) => {
  let score = 0;
  
  const uploadFirst = uploadedPatient.first_name?.toLowerCase().trim() || '';
  const uploadLast = uploadedPatient.last_name?.toLowerCase().trim() || '';
  const uploadMiddle = uploadedPatient.middle_name?.toLowerCase().trim() || '';
  const uploadDOB = uploadedPatient.date_of_birth;
  const uploadPhone = normalizePhone(uploadedPatient.phone);
  const uploadEmail = normalizeEmail(uploadedPatient.email);
  const uploadMRN = uploadedPatient.medical_record_number?.toLowerCase().trim() || '';
  
  const existFirst = existingPatient.first_name?.toLowerCase().trim() || '';
  const existLast = existingPatient.last_name?.toLowerCase().trim() || '';
  const existMiddle = existingPatient.middle_name?.toLowerCase().trim() || '';
  const existDOB = existingPatient.date_of_birth;
  const existPhone = normalizePhone(existingPatient.phone);
  const existEmail = normalizeEmail(existingPatient.email);
  const existMRN = existingPatient.medical_record_number?.toLowerCase().trim() || '';
  
  // MRN match (very definitive)
  if (uploadMRN && existMRN && uploadMRN === existMRN) {
    score += 100;
    return { score, reasons: ['Exact MRN match'] };
  }
  
  const reasons = [];
  
  // Exact name match (strong)
  if (uploadFirst === existFirst && uploadLast === existLast) {
    score += 40;
    reasons.push('Exact name match');
  }
  
  // Similar first and last names (medium)
  if (namesSimilar(uploadFirst, existFirst) && namesSimilar(uploadLast, existLast)) {
    score += 30;
    reasons.push('Similar names');
  }
  
  // Name transposition (common data entry error)
  if (uploadFirst === existLast && uploadLast === existFirst) {
    score += 20;
    reasons.push('Name transposition detected');
  }
  
  // Middle initial match
  if (uploadMiddle && existMiddle && uploadMiddle[0] === existMiddle[0]) {
    score += 5;
  }
  
  // DOB match (very strong)
  if (uploadDOB && existDOB === uploadDOB) {
    score += 35;
    reasons.push('Exact date of birth match');
  }
  
  // Phone number match (strong)
  if (uploadPhone && existPhone) {
    if (uploadPhone === existPhone) {
      score += 25;
      reasons.push('Exact phone match');
    } else if (uploadPhone.slice(-7) === existPhone.slice(-7)) {
      score += 15;
      reasons.push('Last 7 digits of phone match');
    }
  }
  
  // Email match (strong)
  if (uploadEmail && existEmail === uploadEmail) {
    score += 30;
    reasons.push('Exact email match');
  }
  
  // Address similarity
  if (uploadedPatient.address && existingPatient.address) {
    const uploadAddr = uploadedPatient.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existAddr = existingPatient.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (uploadAddr.includes(existAddr.slice(0, 15)) || existAddr.includes(uploadAddr.slice(0, 15))) {
      score += 10;
      reasons.push('Address similarity');
    }
  }
  
  // Emergency contact phone match
  if (uploadedPatient.emergency_contact_phone && existingPatient.emergency_contact_phone) {
    const uploadEmergPhone = normalizePhone(uploadedPatient.emergency_contact_phone);
    const existEmergPhone = normalizePhone(existingPatient.emergency_contact_phone);
    if (uploadEmergPhone === existEmergPhone) {
      score += 15;
      reasons.push('Emergency contact phone match');
    }
  }
  
  // Physician match
  if (uploadedPatient.physician_name && existingPatient.physician_name) {
    if (namesSimilar(uploadedPatient.physician_name, existingPatient.physician_name)) {
      score += 8;
      reasons.push('Physician name match');
    }
  }
  
  return { score, reasons };
};

// Find potential matches for a patient
export const findPotentialMatches = (uploadedPatient, existingPatients, threshold = 40) => {
  const matches = existingPatients
    .map(existingPatient => ({
      patient: existingPatient,
      ...calculateMatchScore(uploadedPatient, existingPatient)
    }))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
  
  return matches;
};

// Classify match confidence
export const getMatchConfidence = (score) => {
  if (score >= 80) return { level: 'DEFINITE', label: 'Definite match' };
  if (score >= 60) return { level: 'LIKELY', label: 'Likely match - review recommended' };
  if (score >= 40) return { level: 'POSSIBLE', label: 'Possible match - manual review needed' };
  return { level: 'UNLIKELY', label: 'No significant match' };
};