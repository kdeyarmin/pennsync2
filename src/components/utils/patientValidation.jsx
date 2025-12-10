// Comprehensive patient data validation utilities

// Validation severity levels
export const SEVERITY = {
  ERROR: 'error',      // Blocks saving
  WARNING: 'warning',  // Can be overridden
  INFO: 'info'        // Just informational
};

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check length
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return {
      severity: SEVERITY.ERROR,
      message: 'Phone number must be 10 digits (or 11 with country code)',
      field: 'phone'
    };
  }
  
  // Check if starts with 1 for 11-digit numbers
  if (cleaned.length === 11 && cleaned[0] !== '1') {
    return {
      severity: SEVERITY.ERROR,
      message: '11-digit phone numbers must start with 1',
      field: 'phone'
    };
  }
  
  return null;
};

// Email validation
export const validateEmail = (email) => {
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      severity: SEVERITY.ERROR,
      message: 'Invalid email format',
      field: 'email'
    };
  }
  
  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (domain && !commonDomains.includes(domain) && domain.split('.').length === 2) {
    const suggestions = commonDomains.filter(d => 
      levenshteinDistance(domain, d) <= 2
    );
    
    if (suggestions.length > 0) {
      return {
        severity: SEVERITY.WARNING,
        message: `Did you mean ${suggestions[0]}?`,
        field: 'email',
        canOverride: true
      };
    }
  }
  
  return null;
};

// Date validation
export const validateDate = (dateString, fieldName = 'date') => {
  if (!dateString) return null;
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(dateString)) {
    return {
      severity: SEVERITY.ERROR,
      message: 'Date must be in YYYY-MM-DD format',
      field: fieldName
    };
  }
  
  const date = new Date(dateString);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return {
      severity: SEVERITY.ERROR,
      message: 'Invalid date',
      field: fieldName
    };
  }
  
  const now = new Date();
  
  // Date of birth specific checks
  if (fieldName === 'date_of_birth') {
    if (date > now) {
      return {
        severity: SEVERITY.ERROR,
        message: 'Date of birth cannot be in the future',
        field: fieldName
      };
    }
    
    const age = (now - date) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (age > 120) {
      return {
        severity: SEVERITY.WARNING,
        message: 'Patient would be over 120 years old. Please verify date of birth.',
        field: fieldName,
        canOverride: true
      };
    }
    
    if (age < 18) {
      return {
        severity: SEVERITY.INFO,
        message: 'Patient is a minor. Ensure guardian information is complete.',
        field: fieldName
      };
    }
  }
  
  // Admission date checks
  if (fieldName === 'admission_date') {
    if (date > now) {
      return {
        severity: SEVERITY.WARNING,
        message: 'Admission date is in the future',
        field: fieldName,
        canOverride: true
      };
    }
    
    const daysSinceAdmission = (now - date) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAdmission > 365) {
      return {
        severity: SEVERITY.INFO,
        message: 'Patient has been in care for over a year',
        field: fieldName
      };
    }
  }
  
  return null;
};

// Medical Record Number validation
export const validateMRN = (mrn) => {
  if (!mrn) return null;
  
  // Check for reasonable format (alphanumeric, 6-20 characters)
  if (mrn.length < 6 || mrn.length > 20) {
    return {
      severity: SEVERITY.WARNING,
      message: 'Medical record number seems unusual (typically 6-20 characters)',
      field: 'medical_record_number',
      canOverride: true
    };
  }
  
  return null;
};

// Diagnosis-specific validation
export const diagnosisSpecificValidation = (patient) => {
  const errors = [];
  const primaryDiagnosis = patient.primary_diagnosis?.toLowerCase() || '';
  
  // Diabetes patients
  if (primaryDiagnosis.includes('diabetes') || primaryDiagnosis.includes('dm')) {
    if (!patient.current_medications || patient.current_medications.length === 0) {
      errors.push({
        severity: SEVERITY.WARNING,
        message: 'Diabetes patients typically require medication documentation',
        field: 'current_medications',
        canOverride: true
      });
    }
    
    if (!patient.baseline_vitals?.weight) {
      errors.push({
        severity: SEVERITY.WARNING,
        message: 'Weight is important for diabetes patients',
        field: 'baseline_vitals.weight',
        canOverride: true
      });
    }
  }
  
  // CHF patients
  if (primaryDiagnosis.includes('chf') || primaryDiagnosis.includes('heart failure') || primaryDiagnosis.includes('congestive')) {
    if (!patient.baseline_vitals?.blood_pressure_systolic) {
      errors.push({
        severity: SEVERITY.WARNING,
        message: 'Baseline blood pressure is recommended for CHF patients',
        field: 'baseline_vitals.blood_pressure',
        canOverride: true
      });
    }
    
    if (!patient.baseline_vitals?.weight) {
      errors.push({
        severity: SEVERITY.ERROR,
        message: 'Baseline weight is required for CHF patients (for daily monitoring)',
        field: 'baseline_vitals.weight'
      });
    }
  }
  
  // COPD patients
  if (primaryDiagnosis.includes('copd') || primaryDiagnosis.includes('emphysema') || primaryDiagnosis.includes('chronic bronchitis')) {
    if (!patient.baseline_vitals?.oxygen_saturation) {
      errors.push({
        severity: SEVERITY.WARNING,
        message: 'Baseline oxygen saturation is recommended for COPD patients',
        field: 'baseline_vitals.oxygen_saturation',
        canOverride: true
      });
    }
  }
  
  // Wound care patients
  if (primaryDiagnosis.includes('wound') || primaryDiagnosis.includes('ulcer') || primaryDiagnosis.includes('pressure injury')) {
    if (!patient.wounds || patient.wounds.length === 0) {
      errors.push({
        severity: SEVERITY.ERROR,
        message: 'Wound documentation is required for patients with wound-related diagnoses',
        field: 'wounds'
      });
    }
  }
  
  // Hospice patients
  if (patient.care_type === 'hospice') {
    if (!patient.advance_directives?.dnr_status === undefined) {
      errors.push({
        severity: SEVERITY.WARNING,
        message: 'DNR status should be documented for hospice patients',
        field: 'advance_directives.dnr_status',
        canOverride: true
      });
    }
  }
  
  return errors;
};

// Comprehensive patient validation
export const validatePatient = (patient, options = {}) => {
  const errors = [];
  const { skipWarnings = false } = options;
  
  // Required field validation
  if (!patient.first_name) {
    errors.push({
      severity: SEVERITY.ERROR,
      message: 'First name is required',
      field: 'first_name'
    });
  }
  
  if (!patient.last_name) {
    errors.push({
      severity: SEVERITY.ERROR,
      message: 'Last name is required',
      field: 'last_name'
    });
  }
  
  // Date of birth validation
  if (patient.date_of_birth) {
    const dobError = validateDate(patient.date_of_birth, 'date_of_birth');
    if (dobError) errors.push(dobError);
  }
  
  // Phone validation
  if (patient.phone) {
    const phoneError = validatePhone(patient.phone);
    if (phoneError) errors.push(phoneError);
  }
  
  // Email validation
  if (patient.email) {
    const emailError = validateEmail(patient.email);
    if (emailError) errors.push(emailError);
  }
  
  // Emergency contact phone
  if (patient.emergency_contact_phone) {
    const emergencyPhoneError = validatePhone(patient.emergency_contact_phone);
    if (emergencyPhoneError) {
      errors.push({
        ...emergencyPhoneError,
        field: 'emergency_contact_phone',
        message: 'Emergency contact phone: ' + emergencyPhoneError.message
      });
    }
  }
  
  // Physician email
  if (patient.physician_email) {
    const physicianEmailError = validateEmail(patient.physician_email);
    if (physicianEmailError) {
      errors.push({
        ...physicianEmailError,
        field: 'physician_email',
        message: 'Physician email: ' + physicianEmailError.message
      });
    }
  }
  
  // MRN validation
  if (patient.medical_record_number) {
    const mrnError = validateMRN(patient.medical_record_number);
    if (mrnError) errors.push(mrnError);
  }
  
  // Admission date validation
  if (patient.admission_date) {
    const admissionError = validateDate(patient.admission_date, 'admission_date');
    if (admissionError) errors.push(admissionError);
  }
  
  // Contact information warning
  if (!patient.phone && !patient.email) {
    errors.push({
      severity: SEVERITY.WARNING,
      message: 'At least one contact method (phone or email) is recommended',
      field: 'contact',
      canOverride: true
    });
  }
  
  // Emergency contact validation
  if (patient.emergency_contact_name && !patient.emergency_contact_phone) {
    errors.push({
      severity: SEVERITY.WARNING,
      message: 'Emergency contact phone is recommended when contact name is provided',
      field: 'emergency_contact_phone',
      canOverride: true
    });
  }
  
  // Diagnosis-specific validation
  const diagnosisErrors = diagnosisSpecificValidation(patient);
  errors.push(...diagnosisErrors);
  
  // Filter out warnings if skipWarnings is true
  if (skipWarnings) {
    return errors.filter(e => e.severity === SEVERITY.ERROR);
  }
  
  return errors;
};

// Helper function for string similarity (Levenshtein distance)
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
};