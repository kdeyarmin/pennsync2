// Pure, deterministic utilities for duplicate patient detection.
//
// All scoring/grouping logic lives here (no React / no network) so it can be
// unit-tested and reused by every duplicate-detection surface in the app.
// Point values are calibrated so that:
//   - a single strong identifier (MRN / exact name+DOB / email) clears the bar,
//   - typos and data-entry variations are still caught,
//   - clearly different patients stay below threshold.

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/** Soundex phonetic code (first letter + 3 digits) for matching misspellings. */
export function soundex(str) {
  if (!str) return '';
  const s = String(str).toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  const codes = { BFPV: '1', CGJKQSXZ: '2', DT: '3', L: '4', MN: '5', R: '6' };
  const codeFor = (ch) => {
    for (const key in codes) if (key.includes(ch)) return codes[key];
    return '';
  };

  let result = s[0];
  let prevCode = codeFor(s[0]);
  for (let i = 1; i < s.length; i++) {
    const code = codeFor(s[i]);
    if (code && code !== prevCode) result += code;
    // Vowels (and H/W/Y) reset the "previous code" only for vowels, matching
    // the classic algorithm closely enough for fuzzy name matching.
    if (code === '') prevCode = '';
    else prevCode = code;
  }
  return (result + '000').substring(0, 4);
}

/** Levenshtein edit distance between two strings. */
export function levenshtein(str1, str2) {
  const a = String(str1 ?? '');
  const b = String(str2 ?? '');
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
  return matrix[b.length][a.length];
}

/** Case-insensitive similarity as a 0-100 percentage. */
export function similarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const a = String(str1).toLowerCase();
  const b = String(str2).toLowerCase();
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
}

/** Normalize a name: lowercase, strip punctuation, collapse whitespace. */
export function normalizeName(name) {
  return (
    String(name ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
  );
}

/** Normalize an address by removing common street-type words and unit markers. */
export function normalizeAddress(address) {
  if (!address) return '';
  return String(address)
    .toLowerCase()
    .replace(
      /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|parkway|pkwy|way)\b/g,
      ''
    )
    .replace(/\b(apt|apartment|unit|ste|suite|#)\s*\w+/gi, '')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep only digits. */
export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

const pad2 = (v) => String(v).padStart(2, '0');

/**
 * Parse a date of birth into { year, month, day } string components, handling
 * ISO (YYYY-MM-DD), US (MM/DD/YYYY) and bare 8-digit formats. Returns null when
 * the value can't be confidently parsed.
 */
export function parseDob(value) {
  if (!value) return null;
  const s = String(value).trim();

  let m = s.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})/); // YYYY-MM-DD
  if (m) return { year: m[1], month: pad2(m[2]), day: pad2(m[3]) };

  m = s.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})/); // MM/DD/YYYY
  if (m) return { year: m[3], month: pad2(m[1]), day: pad2(m[2]) };

  const digits = s.replace(/\D/g, '');
  if (digits.length === 8) {
    const first4 = parseInt(digits.substring(0, 4), 10);
    if (first4 >= 1900 && first4 <= 2100) {
      return { year: digits.substring(0, 4), month: digits.substring(4, 6), day: digits.substring(6, 8) };
    }
    return { year: digits.substring(4, 8), month: digits.substring(0, 2), day: digits.substring(2, 4) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Match reason constants
// ---------------------------------------------------------------------------

export const REASON = {
  EXACT_NAME: 'Exact name match',
  FULL_NAME: 'Exact full name match',
  PHONETIC_NAME: 'Names sound alike',
  VERY_SIMILAR_NAME: 'Very similar name',
  SIMILAR_NAME: 'Similar name',
  BOTH_NAMES_SIMILAR: 'Both names similar',
  PARTIAL_NAME: 'Partial name match',
  NAME_VARIATION: 'Name variation match',
  DOB: 'DOB match',
  DOB_SWAPPED: 'DOB month/day swapped',
  DOB_YEAR_TYPO: 'DOB year typo',
  DOB_CLOSE: 'DOB very close',
  MRN: 'MRN match',
  MRN_SIMILAR: 'MRN similar',
  PHONE: 'Phone exact match',
  PHONE_LOCAL: 'Phone local match',
  PHONE_LAST4: 'Phone last-4 match',
  EMERGENCY_PHONE: 'Emergency contact phone match',
  STREET_ADDRESS: 'Street address match',
  STREET_NUMBER: 'Street number match',
  ADDRESS_EXACT: 'Address exact match',
  ADDRESS_SIMILAR: 'Address very similar',
  ADDRESS_PARTIAL: 'Address similar',
  ZIP: 'Same zip code',
  MIDDLE_NAME: 'Middle name match',
  MIDDLE_INITIAL: 'Middle initial match',
  EMAIL: 'Email match',
  CAREGIVER_EMAIL: 'Caregiver email match',
  CAREGIVER_PHONE: 'Caregiver phone match',
  PHYSICIAN_EMAIL: 'Physician email match',
};

// Reasons strong enough on their own to justify a lowered threshold.
const STRONG_IDENTIFIERS = new Set([
  REASON.EXACT_NAME,
  REASON.MRN,
  REASON.DOB,
  REASON.EMAIL,
  REASON.PHONE,
  REASON.ADDRESS_EXACT,
  REASON.STREET_ADDRESS,
]);

// ---------------------------------------------------------------------------
// Pairwise scoring
// ---------------------------------------------------------------------------

function scoreNames(p1, p2, add) {
  const firstName1 = normalizeName(p1.first_name);
  const firstName2 = normalizeName(p2.first_name);
  const lastName1 = normalizeName(p1.last_name);
  const lastName2 = normalizeName(p2.last_name);
  const name1 = `${firstName1} ${lastName1}`.trim();
  const name2 = `${firstName2} ${lastName2}`.trim();

  const exactFirst = firstName1 === firstName2 && firstName1.length >= 2;
  const exactLast = lastName1 === lastName2 && lastName1.length >= 2;

  if (exactFirst && exactLast) {
    add(60, REASON.EXACT_NAME);
    return true; // name fully resolved
  }

  const phonetic =
    soundex(p1.first_name) === soundex(p2.first_name) &&
    soundex(p1.last_name) === soundex(p2.last_name) &&
    soundex(p1.first_name) !== '' &&
    soundex(p1.last_name) !== '';

  if (name1 && name1 === name2) {
    add(45, REASON.FULL_NAME);
    return true;
  }
  if (phonetic) {
    add(40, REASON.PHONETIC_NAME);
    return true;
  }

  let matchedName = false;
  const fullSim = similarity(name1, name2);
  if (fullSim >= 90) {
    add(35, REASON.VERY_SIMILAR_NAME);
    matchedName = true;
  } else if (fullSim >= 75) {
    add(28, REASON.SIMILAR_NAME);
    matchedName = true;
  }

  const firstSim = similarity(firstName1, firstName2);
  const lastSim = similarity(lastName1, lastName2);
  if (firstSim >= 85 && lastSim >= 85) {
    add(30, REASON.BOTH_NAMES_SIMILAR);
    matchedName = true;
  } else if (firstSim === 100 || lastSim === 100) {
    add(18, REASON.PARTIAL_NAME);
    matchedName = true;
  }
  return matchedName;
}

function scoreDob(p1, p2, add) {
  const d1 = digitsOnly(p1.date_of_birth);
  const d2 = digitsOnly(p2.date_of_birth);
  if (!d1 || !d2) return;

  if (d1 === d2) {
    add(30, REASON.DOB);
    return;
  }

  const a = parseDob(p1.date_of_birth);
  const b = parseDob(p2.date_of_birth);
  if (!a || !b) return;

  if (a.year === b.year && a.month === b.day && a.day === b.month) {
    add(22, REASON.DOB_SWAPPED);
  } else if (a.month === b.month && a.day === b.day && Math.abs(+a.year - +b.year) === 1) {
    add(18, REASON.DOB_YEAR_TYPO);
  } else if (
    a.year === b.year &&
    Math.abs(+a.month - +b.month) <= 1 &&
    Math.abs(+a.day - +b.day) <= 1
  ) {
    add(12, REASON.DOB_CLOSE);
  }
}

function scoreMrn(p1, p2, add) {
  if (!p1.medical_record_number || !p2.medical_record_number) return;
  const mrn1 = p1.medical_record_number.toString().trim();
  const mrn2 = p2.medical_record_number.toString().trim();
  if (!mrn1 || !mrn2) return;
  if (mrn1.toLowerCase() === mrn2.toLowerCase()) {
    add(30, REASON.MRN);
  } else if (similarity(mrn1, mrn2) >= 85) {
    add(22, REASON.MRN_SIMILAR);
  }
}

function scorePhone(p1, p2, add) {
  if (!p1.phone || !p2.phone) return;
  const phone1 = digitsOnly(p1.phone);
  const phone2 = digitsOnly(p2.phone);
  if (phone1.length < 10 || phone2.length < 10) return;
  if (phone1 === phone2) {
    add(20, REASON.PHONE);
  } else if (phone1.slice(-7) === phone2.slice(-7)) {
    add(15, REASON.PHONE_LOCAL);
  } else if (phone1.slice(-4) === phone2.slice(-4)) {
    add(8, REASON.PHONE_LAST4);
  }
}

function scoreAddress(p1, p2, add) {
  if (!p1.address || !p2.address) return;
  const addr1 = String(p1.address).toLowerCase().trim();
  const addr2 = String(p2.address).toLowerCase().trim();

  const streetNum1 = String(p1.address).match(/^\d+/)?.[0];
  const streetNum2 = String(p2.address).match(/^\d+/)?.[0];
  const zip1 = String(p1.address).match(/\b\d{5}\b/)?.[0];
  const zip2 = String(p2.address).match(/\b\d{5}\b/)?.[0];

  const normalized1 = normalizeAddress(p1.address);
  const normalized2 = normalizeAddress(p2.address);
  const bestSim = Math.max(similarity(addr1, addr2), similarity(normalized1, normalized2));

  if (streetNum1 && streetNum1 === streetNum2) {
    const streetName1 = normalized1.split(/\s+/)[1];
    const streetName2 = normalized2.split(/\s+/)[1];
    if (streetName1 && streetName2 && similarity(streetName1, streetName2) >= 85) {
      add(18, REASON.STREET_ADDRESS);
    } else if (streetName1 && streetName2) {
      add(12, REASON.STREET_NUMBER);
    }
  } else if (bestSim >= 90) {
    add(15, REASON.ADDRESS_EXACT);
  } else if (bestSim >= 80) {
    add(12, REASON.ADDRESS_SIMILAR);
  } else if (bestSim >= 70) {
    add(8, REASON.ADDRESS_PARTIAL);
  }

  if (zip1 && zip1 === zip2) add(6, REASON.ZIP);
}

function scoreContact(p1, p2, add) {
  // Emergency contact phone
  if (p1.emergency_contact_phone && p2.emergency_contact_phone) {
    const e1 = digitsOnly(p1.emergency_contact_phone);
    const e2 = digitsOnly(p2.emergency_contact_phone);
    if (e1 === e2 && e1.length >= 10) add(12, REASON.EMERGENCY_PHONE);
  }
  // Middle name
  if (p1.middle_name && p2.middle_name) {
    const m1 = String(p1.middle_name).toLowerCase().trim();
    const m2 = String(p2.middle_name).toLowerCase().trim();
    if (m1 && m1 === m2) add(8, REASON.MIDDLE_NAME);
    else if (m1 && m2 && m1.charAt(0) === m2.charAt(0)) add(5, REASON.MIDDLE_INITIAL);
  }
  // Email
  if (p1.email && p2.email && p1.email.toLowerCase().trim() === p2.email.toLowerCase().trim()) {
    add(25, REASON.EMAIL);
  }
  // Caregiver
  if (
    p1.caregiver_email &&
    p2.caregiver_email &&
    p1.caregiver_email.toLowerCase() === p2.caregiver_email.toLowerCase()
  ) {
    add(10, REASON.CAREGIVER_EMAIL);
  }
  if (p1.caregiver_phone && p2.caregiver_phone) {
    const c1 = digitsOnly(p1.caregiver_phone);
    const c2 = digitsOnly(p2.caregiver_phone);
    if (c1 === c2 && c1.length >= 10) add(10, REASON.CAREGIVER_PHONE);
  }
  // Physician
  if (
    p1.physician_email &&
    p2.physician_email &&
    p1.physician_email.toLowerCase() === p2.physician_email.toLowerCase()
  ) {
    add(8, REASON.PHYSICIAN_EMAIL);
  }
}

/**
 * Score how likely two patient records are the same person.
 * Returns { score, matches } where `matches` is a de-duplicated list of reasons.
 * Symmetric: scorePatientPair(a, b) === scorePatientPair(b, a).
 */
export function scorePatientPair(p1, p2) {
  let score = 0;
  const matches = [];
  const add = (points, reason) => {
    if (matches.includes(reason)) return;
    score += points;
    matches.push(reason);
  };

  const nameMatched = scoreNames(p1, p2, add);
  scoreDob(p1, p2, add);
  scoreMrn(p1, p2, add);
  scorePhone(p1, p2, add);
  scoreAddress(p1, p2, add);
  scoreContact(p1, p2, add);

  // Name-variation cross-check only when no other name signal fired, so we
  // never double-count the name.
  if (!nameMatched) {
    const variations = (p) => {
      const set = new Set();
      const first = normalizeName(p.first_name);
      const middle = normalizeName(p.middle_name);
      const last = normalizeName(p.last_name);
      if (first && last) {
        set.add(`${first} ${last}`);
        if (middle) {
          set.add(`${first} ${middle} ${last}`);
          set.add(`${first} ${middle.charAt(0)} ${last}`);
        }
        set.add(`${first.charAt(0)} ${last}`);
        set.add(`${last} ${first}`);
      }
      return [...set];
    };
    const v1 = variations(p1);
    const v2 = variations(p2);
    let found = false;
    for (const a of v1) {
      for (const b of v2) {
        if (similarity(a, b) >= 95) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) add(8, REASON.NAME_VARIATION);
  }

  return { score, matches };
}

// ---------------------------------------------------------------------------
// Related-entity (visit) corroboration
// ---------------------------------------------------------------------------

/** Build a Map of patient_id -> visits[] once, for O(1) lookups during a scan. */
export function buildVisitsByPatient(visits = []) {
  const map = new Map();
  for (const v of visits) {
    if (!v || !v.patient_id) continue;
    if (!map.has(v.patient_id)) map.set(v.patient_id, []);
    map.get(v.patient_id).push(v);
  }
  return map;
}

/** Extra score from shared visit history between two patients. */
export function relatedEntityScore(p1, p2, visitsByPatient) {
  const matches = [];
  let score = 0;
  if (!visitsByPatient) return { score, matches };

  const v1 = visitsByPatient.get(p1.id) || [];
  const v2 = visitsByPatient.get(p2.id) || [];
  if (v1.length === 0 || v2.length === 0) return { score, matches };

  const dates2 = new Set(v2.map((v) => v.visit_date).filter(Boolean));
  const commonDates = [...new Set(v1.map((v) => v.visit_date).filter(Boolean))].filter((d) =>
    dates2.has(d)
  );
  if (commonDates.length > 0) {
    score += 15;
    matches.push(`${commonDates.length} matching visit date(s)`);
  }

  const nurses2 = new Set(v2.map((v) => v.created_by).filter(Boolean));
  if (v1.some((v) => v.created_by && nurses2.has(v.created_by))) {
    score += 8;
    matches.push('Same nurse documentation');
  }

  return { score, matches };
}

// ---------------------------------------------------------------------------
// Confidence + grouping
// ---------------------------------------------------------------------------

/** Bucket a raw score into a confidence level. */
export function confidenceFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/** A display-safe confidence percentage (never exceeds 100). */
export function confidencePercent(score) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** The score a pair must reach to be flagged, lowered for strong signals. */
export function effectiveThreshold(matches, base = 35) {
  return matches.some((m) => STRONG_IDENTIFIERS.has(m)) ? 25 : base;
}

/**
 * Group patients into duplicate clusters. Deterministic for a given input
 * order: each patient is claimed by at most one group, and pairwise scoring is
 * symmetric so a forward-only scan is exhaustive.
 *
 * @param {Array} patients
 * @param {{ visitsByPatient?: Map, threshold?: number }} [opts]
 * @returns {Array<{ primary: object, duplicates: Array }>}
 */
export function findDuplicateGroups(patients, opts = {}) {
  const { visitsByPatient = null, threshold = 35 } = opts;
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < patients.length; i++) {
    const primary = patients[i];
    if (processed.has(primary.id)) continue;

    const duplicates = [];
    for (let j = i + 1; j < patients.length; j++) {
      const other = patients[j];
      if (processed.has(other.id)) continue;

      const base = scorePatientPair(primary, other);
      const related = relatedEntityScore(primary, other, visitsByPatient);
      const totalScore = base.score + related.score;

      if (totalScore >= effectiveThreshold(base.matches, threshold)) {
        duplicates.push({
          patient: other,
          score: totalScore,
          matches: [...base.matches, ...related.matches],
          confidenceLevel: confidenceFromScore(totalScore),
          confidencePercent: confidencePercent(totalScore),
        });
        processed.add(other.id);
      }
    }

    if (duplicates.length > 0) {
      duplicates.sort((a, b) => b.score - a.score);
      groups.push({ primary, duplicates });
      processed.add(primary.id);
    }
  }

  return groups;
}
