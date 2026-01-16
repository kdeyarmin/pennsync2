// Validation utilities for patient data

export const VALIDATION_ERRORS = {
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone format (10+ digits)',
  INVALID_DATE: 'Invalid date format (YYYY-MM-DD)',
  FUTURE_DOB: 'Date of birth cannot be in the future',
  INVALID_DATE_ORDER: 'Admission date must be before discharge date',
  INVALID_MRN: 'MRN cannot be empty or only spaces',
  INVALID_NAME: 'First and last name are required',
  INVALID_AGE: 'Patient appears to be over 125 years old'
};

// Email validation
export const validateEmail = (email) => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : VALIDATION_ERRORS.INVALID_EMAIL;
};

// Phone number validation (US format)
export const validatePhone = (phone) => {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? null : VALIDATION_ERRORS.INVALID_PHONE;
};

// Date validation (YYYY-MM-DD format)
export const validateDate = (dateString) => {
  if (!dateString) return null;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return VALIDATION_ERRORS.INVALID_DATE;
  }
  
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return VALIDATION_ERRORS.INVALID_DATE;
  }
  
  return null;
};

// Date of birth validation
export const validateDateOfBirth = (dob) => {
  const error = validateDate(dob);
  if (error) return error;
  
  const dobDate = new Date(dob + 'T00:00:00');
  const today = new Date();
  
  if (dobDate > today) {
    return VALIDATION_ERRORS.FUTURE_DOB;
  }
  
  const age = today.getFullYear() - dobDate.getFullYear();
  if (age > 125) {
    return VALIDATION_ERRORS.INVALID_AGE;
  }
  
  return null;
};

// Cross-field validation: admission before discharge
export const validateDateOrder = (admissionDate, dischargeDate) => {
  if (!admissionDate || !dischargeDate) return null;
  
  const admission = new Date(admissionDate + 'T00:00:00');
  const discharge = new Date(dischargeDate + 'T00:00:00');
  
  if (admission > discharge) {
    return VALIDATION_ERRORS.INVALID_DATE_ORDER;
  }
  
  return null;
};

// MRN validation
export const validateMRN = (mrn) => {
  if (!mrn || !mrn.trim()) return VALIDATION_ERRORS.INVALID_MRN;
  return null;
};

// Name validation
export const validateName = (firstName, lastName) => {
  if (!firstName?.trim() || !lastName?.trim()) {
    return VALIDATION_ERRORS.INVALID_NAME;
  }
  return null;
};

// Comprehensive patient record validation
export const validatePatientRecord = (patient) => {
  const errors = {};
  
  if (patient.email) {
    const emailError = validateEmail(patient.email);
    if (emailError) errors.email = emailError;
  }
  
  if (patient.phone) {
    const phoneError = validatePhone(patient.phone);
    if (phoneError) errors.phone = phoneError;
  }
  
  if (patient.date_of_birth) {
    const dobError = validateDateOfBirth(patient.date_of_birth);
    if (dobError) errors.date_of_birth = dobError;
  }
  
  if (patient.admission_date) {
    const admitError = validateDate(patient.admission_date);
    if (admitError) errors.admission_date = admitError;
  }
  
  if (patient.discharge_date) {
    const dischargeError = validateDate(patient.discharge_date);
    if (dischargeError) errors.discharge_date = dischargeError;
  }
  
  if (patient.admission_date && patient.discharge_date) {
    const orderError = validateDateOrder(patient.admission_date, patient.discharge_date);
    if (orderError) errors.date_order = orderError;
  }
  
  if (patient.emergency_contact_phone) {
    const emergPhoneError = validatePhone(patient.emergency_contact_phone);
    if (emergPhoneError) errors.emergency_contact_phone = emergPhoneError;
  }
  
  if (patient.physician_phone) {
    const physPhoneError = validatePhone(patient.physician_phone);
    if (physPhoneError) errors.physician_phone = physPhoneError;
  }
  
  if (patient.caregiver_phone) {
    const carePhoneError = validatePhone(patient.caregiver_phone);
    if (carePhoneError) errors.caregiver_phone = carePhoneError;
  }
  
  return Object.keys(errors).length === 0 ? null : errors;
};