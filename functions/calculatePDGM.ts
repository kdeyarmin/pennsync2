import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// CMS PDGM 2024 Base Payment Rates (national average, simplified)
const BASE_PAYMENT_RATE = 2031.64; // 2024 national standardized 30-day payment

// Clinical Group Weights (simplified from CMS PDGM model)
const CLINICAL_GROUP_WEIGHTS = {
  'MMTA_Surgical_Aftercare': 1.0234,
  'MMTA_Cardiac_Circulatory': 0.9876,
  'MMTA_Endocrine': 0.8934,
  'MMTA_GI_GU': 0.9123,
  'MMTA_Infectious_Disease': 1.1234,
  'MMTA_Other': 0.9456,
  'MMTA_Respiratory': 1.0567,
  'MMTA_Neuro_Rehab': 1.1890,
  'MMTA_Wounds': 1.2345,
  'MMTA_Complex_Nursing': 1.3456,
  'MMTA_Behavioral_Health': 0.8765,
  'MMTA_Medication_Management': 0.8234
};

// Functional Impairment Level Multipliers
const FUNCTIONAL_MULTIPLIERS = {
  'low': 0.85,
  'medium': 1.0,
  'high': 1.25
};

// Comorbidity Adjustment Multipliers
const COMORBIDITY_MULTIPLIERS = {
  'none': 1.0,
  'low': 1.03,
  'high': 1.08
};

// Admission Source Multipliers
const ADMISSION_SOURCE_MULTIPLIERS = {
  'community': 1.0,
  'institutional': 1.05
};

// Episode Timing Multipliers
const TIMING_MULTIPLIERS = {
  'early': 1.0,
  'late': 0.92
};

// Map diagnoses to clinical groups (simplified mapping)
function mapDiagnosisToClinicalGroup(primaryDiagnosis) {
  const diagnosis = (primaryDiagnosis || '').toLowerCase();
  
  if (diagnosis.includes('wound') || diagnosis.includes('ulcer') || diagnosis.includes('surgical site')) {
    return 'MMTA_Wounds';
  }
  if (diagnosis.includes('chf') || diagnosis.includes('heart failure') || diagnosis.includes('cardiac') || diagnosis.includes('hypertension')) {
    return 'MMTA_Cardiac_Circulatory';
  }
  if (diagnosis.includes('copd') || diagnosis.includes('respiratory') || diagnosis.includes('pneumonia') || diagnosis.includes('lung')) {
    return 'MMTA_Respiratory';
  }
  if (diagnosis.includes('diabetes') || diagnosis.includes('thyroid') || diagnosis.includes('endocrine')) {
    return 'MMTA_Endocrine';
  }
  if (diagnosis.includes('stroke') || diagnosis.includes('cva') || diagnosis.includes('parkinson') || diagnosis.includes('neuro') || diagnosis.includes('alzheimer') || diagnosis.includes('dementia')) {
    return 'MMTA_Neuro_Rehab';
  }
  if (diagnosis.includes('surgery') || diagnosis.includes('post-op') || diagnosis.includes('arthroplasty') || diagnosis.includes('replacement')) {
    return 'MMTA_Surgical_Aftercare';
  }
  if (diagnosis.includes('infection') || diagnosis.includes('sepsis') || diagnosis.includes('uti')) {
    return 'MMTA_Infectious_Disease';
  }
  if (diagnosis.includes('gi') || diagnosis.includes('bowel') || diagnosis.includes('kidney') || diagnosis.includes('renal')) {
    return 'MMTA_GI_GU';
  }
  if (diagnosis.includes('depression') || diagnosis.includes('anxiety') || diagnosis.includes('behavioral') || diagnosis.includes('psychiatric')) {
    return 'MMTA_Behavioral_Health';
  }
  if (diagnosis.includes('medication') || diagnosis.includes('polypharmacy')) {
    return 'MMTA_Medication_Management';
  }
  if (diagnosis.includes('complex') || diagnosis.includes('iv') || diagnosis.includes('infusion') || diagnosis.includes('trach') || diagnosis.includes('ventilator')) {
    return 'MMTA_Complex_Nursing';
  }
  
  return 'MMTA_Other';
}

// Calculate functional impairment level from M-items
function calculateFunctionalLevel(functionalData) {
  // Scoring based on M1800-M1860 items (simplified)
  // Higher scores = more impairment
  let totalPoints = 0;
  
  // M1800 - Grooming (0-3)
  totalPoints += (functionalData.m1800_grooming || 0);
  
  // M1810 - Dress Upper (0-3)
  totalPoints += (functionalData.m1810_dress_upper || 0);
  
  // M1820 - Dress Lower (0-3)
  totalPoints += (functionalData.m1820_dress_lower || 0);
  
  // M1830 - Bathing (0-6)
  totalPoints += (functionalData.m1830_bathing || 0);
  
  // M1840 - Toilet Transfer (0-4)
  totalPoints += (functionalData.m1840_toilet_transfer || 0);
  
  // M1850 - Transferring (0-5)
  totalPoints += (functionalData.m1850_transferring || 0);
  
  // M1860 - Ambulation (0-6)
  totalPoints += (functionalData.m1860_ambulation || 0);
  
  // Determine level based on total points (max ~30)
  if (totalPoints >= 18) return 'high';
  if (totalPoints >= 10) return 'medium';
  return 'low';
}

// Determine comorbidity adjustment
function calculateComorbidityAdjustment(comorbidities) {
  if (!comorbidities || comorbidities.length === 0) return 'none';
  
  const highComorbidities = [
    'diabetes with complications', 'chf', 'copd', 'renal failure', 
    'cancer', 'stroke', 'dementia', 'wound infection'
  ];
  
  const hasHighComorbidity = comorbidities.some(c => 
    highComorbidities.some(hc => (c || '').toLowerCase().includes(hc))
  );
  
  if (hasHighComorbidity && comorbidities.length >= 2) return 'high';
  if (comorbidities.length >= 1) return 'low';
  return 'none';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdgmData, correctedPdgmData } = await req.json();

    if (!pdgmData) {
      return Response.json({ error: 'No PDGM data provided' }, { status: 400 });
    }

    // Calculate original PDGM revenue
    const originalRevenue = calculatePDGMRevenue(pdgmData);
    
    // Calculate corrected PDGM revenue if provided
    let correctedRevenue = null;
    let revenueDifference = null;
    let percentageIncrease = null;

    if (correctedPdgmData) {
      correctedRevenue = calculatePDGMRevenue(correctedPdgmData);
      revenueDifference = correctedRevenue.totalPayment - originalRevenue.totalPayment;
      percentageIncrease = ((revenueDifference / originalRevenue.totalPayment) * 100).toFixed(2);
    }

    return Response.json({
      original: originalRevenue,
      corrected: correctedRevenue,
      revenueDifference: revenueDifference ? Math.round(revenueDifference * 100) / 100 : null,
      percentageIncrease: percentageIncrease ? parseFloat(percentageIncrease) : null,
      financialImpact: revenueDifference ? {
        perEpisode: Math.round(revenueDifference * 100) / 100,
        annual30Episodes: Math.round(revenueDifference * 30 * 100) / 100,
        annual60Episodes: Math.round(revenueDifference * 60 * 100) / 100
      } : null
    });

  } catch (error) {
    console.error('PDGM calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculatePDGMRevenue(data) {
  // Extract data
  const primaryDiagnosis = data.primary_diagnosis || '';
  const comorbidities = data.comorbidities || [];
  const admissionSource = data.admission_source || 'community';
  const episodeTiming = data.episode_timing || 'early';
  const functionalData = data.functional_scores || {};

  // Determine clinical group
  const clinicalGroup = mapDiagnosisToClinicalGroup(primaryDiagnosis);
  const clinicalWeight = CLINICAL_GROUP_WEIGHTS[clinicalGroup] || 1.0;

  // Calculate functional level
  const functionalLevel = calculateFunctionalLevel(functionalData);
  const functionalMultiplier = FUNCTIONAL_MULTIPLIERS[functionalLevel];

  // Calculate comorbidity adjustment
  const comorbidityLevel = calculateComorbidityAdjustment(comorbidities);
  const comorbidityMultiplier = COMORBIDITY_MULTIPLIERS[comorbidityLevel];

  // Get admission and timing multipliers
  const admissionMultiplier = ADMISSION_SOURCE_MULTIPLIERS[admissionSource] || 1.0;
  const timingMultiplier = TIMING_MULTIPLIERS[episodeTiming] || 1.0;

  // Calculate total case-mix weight
  const caseMixWeight = clinicalWeight * functionalMultiplier * comorbidityMultiplier * admissionMultiplier * timingMultiplier;

  // Calculate payment
  const totalPayment = Math.round(BASE_PAYMENT_RATE * caseMixWeight * 100) / 100;

  return {
    basePayment: BASE_PAYMENT_RATE,
    clinicalGroup,
    clinicalWeight,
    functionalLevel,
    functionalMultiplier,
    comorbidityLevel,
    comorbidityMultiplier,
    admissionSource,
    admissionMultiplier,
    episodeTiming,
    timingMultiplier,
    caseMixWeight: Math.round(caseMixWeight * 10000) / 10000,
    totalPayment
  };
}