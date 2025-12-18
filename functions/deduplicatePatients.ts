import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Levenshtein distance for fuzzy string matching
const levenshteinDistance = (str1, str2) => {
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
};

// Calculate similarity percentage
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
};

// Parse date components from various formats
const parseDateComponents = (dateStr) => {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/\D/g, '');
  
  // Try YYYYMMDD format
  if (cleaned.length === 8) {
    return {
      year: cleaned.substring(0, 4),
      month: cleaned.substring(4, 6),
      day: cleaned.substring(6, 8)
    };
  }
  
  // Try MMDDYYYY format
  if (cleaned.length === 8) {
    return {
      year: cleaned.substring(4, 8),
      month: cleaned.substring(0, 2),
      day: cleaned.substring(2, 4)
    };
  }
  
  return null;
};

// Calculate match score between two patients
const calculateMatchScore = (p1, p2) => {
  let score = 0;
  const matches = [];

  // Normalize names (remove commas and extra spaces)
  const normalizeName = (str) => str?.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim() || '';
  
  // Name matching with fuzzy logic
  const firstName1 = normalizeName(p1.first_name);
  const firstName2 = normalizeName(p2.first_name);
  const lastName1 = normalizeName(p1.last_name);
  const lastName2 = normalizeName(p2.last_name);
  const fullName1 = `${firstName1} ${lastName1}`;
  const fullName2 = `${firstName2} ${lastName2}`;
  
  // Exact match
  if (fullName1 === fullName2) {
    score += 40;
    matches.push('name_exact');
  } 
  // Fuzzy match on full name (85% similarity threshold)
  else {
    const fullNameSimilarity = calculateSimilarity(fullName1, fullName2);
    if (fullNameSimilarity >= 85) {
      score += 35;
      matches.push('name_fuzzy_high');
    } else if (fullNameSimilarity >= 70) {
      score += 25;
      matches.push('name_fuzzy_medium');
    }
    
    // Check individual name components
    const firstNameSimilarity = calculateSimilarity(firstName1, firstName2);
    const lastNameSimilarity = calculateSimilarity(lastName1, lastName2);
    
    if (firstNameSimilarity >= 90 && lastNameSimilarity >= 90) {
      score += 30;
      matches.push('name_components_similar');
    } else if (firstNameSimilarity === 100 || lastNameSimilarity === 100) {
      score += 15;
      matches.push('name_partial');
    }
  }

  // Address fuzzy matching
  if (p1.address && p2.address) {
    const addr1 = normalizeName(p1.address);
    const addr2 = normalizeName(p2.address);
    const addressSimilarity = calculateSimilarity(addr1, addr2);
    
    if (addressSimilarity === 100) {
      score += 15;
      matches.push('address_exact');
    } else if (addressSimilarity >= 85) {
      score += 10;
      matches.push('address_similar');
    }
  }

  // Enhanced DOB matching with variation detection
  if (p1.date_of_birth && p2.date_of_birth) {
    const dob1Str = p1.date_of_birth.replace(/\D/g, '');
    const dob2Str = p2.date_of_birth.replace(/\D/g, '');
    
    // Exact match
    if (dob1Str === dob2Str) {
      score += 30;
      matches.push('dob_exact');
    } else {
      // Parse date components
      const dob1 = parseDateComponents(p1.date_of_birth);
      const dob2 = parseDateComponents(p2.date_of_birth);
      
      if (dob1 && dob2) {
        // Check for month/day reversal (common data entry error)
        if (dob1.year === dob2.year) {
          if (dob1.month === dob2.day && dob1.day === dob2.month) {
            score += 25;
            matches.push('dob_reversed');
          }
          // Check if same year, close month/day
          else if (Math.abs(parseInt(dob1.month) - parseInt(dob2.month)) <= 1 &&
                   Math.abs(parseInt(dob1.day) - parseInt(dob2.day)) <= 1) {
            score += 15;
            matches.push('dob_close');
          }
        }
        // Check if year is off by 1 (typo) but month/day match
        else if (Math.abs(parseInt(dob1.year) - parseInt(dob2.year)) === 1 &&
                 dob1.month === dob2.month && dob1.day === dob2.day) {
          score += 20;
          matches.push('dob_year_typo');
        }
      }
    }
  }

  // MRN matching
  if (p1.medical_record_number && p2.medical_record_number) {
    const mrn1 = p1.medical_record_number.toString().trim();
    const mrn2 = p2.medical_record_number.toString().trim();
    
    if (mrn1 === mrn2) {
      score += 30;
      matches.push('mrn_exact');
    } else {
      // Check for similar MRNs (one digit off)
      const mrnSimilarity = calculateSimilarity(mrn1, mrn2);
      if (mrnSimilarity >= 90) {
        score += 20;
        matches.push('mrn_similar');
      }
    }
  }

  // Phone number matching (bonus points)
  if (p1.phone && p2.phone) {
    const phone1 = p1.phone.replace(/\D/g, '');
    const phone2 = p2.phone.replace(/\D/g, '');
    if (phone1 === phone2 && phone1.length >= 10) {
      score += 10;
      matches.push('phone_match');
    }
  }

  return { score, matches };
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    console.log('Starting deduplication...');
    
    // Get all patients with minimal fields for faster processing
    const patients = await base44.asServiceRole.entities.Patient.list();
    console.log(`Loaded ${patients.length} patients in ${Date.now() - startTime}ms`);

    // Quick grouping by MRN and name
    const mrnGroups = new Map();
    const nameGroups = new Map();

    patients.forEach(patient => {
      // Group by MRN (exact matches only)
      if (patient.medical_record_number) {
        const mrn = patient.medical_record_number.toString().trim().toUpperCase();
        if (!mrnGroups.has(mrn)) mrnGroups.set(mrn, []);
        mrnGroups.get(mrn).push(patient);
      }

      // Group by exact name match
      const nameKey = `${patient.first_name?.toLowerCase().trim() || ''}_${patient.last_name?.toLowerCase().trim() || ''}`;
      if (nameKey !== '_') {
        if (!nameGroups.has(nameKey)) nameGroups.set(nameKey, []);
        nameGroups.get(nameKey).push(patient);
      }
    });

    console.log(`Grouped into ${mrnGroups.size} MRN groups, ${nameGroups.size} name groups`);

    const duplicateGroups = [];
    const processed = new Set();

    // Process exact MRN matches (100% confidence)
    for (const [mrn, group] of mrnGroups) {
      if (group.length > 1) {
        const unprocessed = group.filter(p => !processed.has(p.id));
        if (unprocessed.length > 1) {
          duplicateGroups.push({
            primary: unprocessed[0],
            duplicates: unprocessed.slice(1).map(p => ({
              patient: p,
              score: 100,
              matches: ['mrn_exact']
            }))
          });
          unprocessed.forEach(p => processed.add(p.id));
        }
      }
    }

    // Process exact name matches with DOB/Address checks
    for (const [nameKey, group] of nameGroups) {
      if (group.length > 1) {
        const unprocessed = group.filter(p => !processed.has(p.id));
        if (unprocessed.length < 2) continue;

        // Only do detailed matching for groups with 10 or fewer patients
        if (unprocessed.length <= 10) {
          for (let i = 0; i < unprocessed.length; i++) {
            if (processed.has(unprocessed[i].id)) continue;

            const duplicates = [];
            for (let j = i + 1; j < unprocessed.length; j++) {
              if (processed.has(unprocessed[j].id)) continue;

              const { score, matches } = calculateMatchScore(unprocessed[i], unprocessed[j]);
              if (score >= 60) {
                duplicates.push({ patient: unprocessed[j], score, matches });
                processed.add(unprocessed[j].id);
              }
            }

            if (duplicates.length > 0) {
              duplicateGroups.push({ primary: unprocessed[i], duplicates });
              processed.add(unprocessed[i].id);
            }
          }
        }
      }

      // Check timeout
      if (Date.now() - startTime > 25000) {
        console.log('Approaching timeout, stopping search');
        break;
      }
    }

    console.log(`Found ${duplicateGroups.length} groups in ${Date.now() - startTime}ms`);

    // Remove duplicates with timeout protection
    const removed = [];
    const detailsArray = [];

    for (const group of duplicateGroups) {
      // Check timeout before each group
      if (Date.now() - startTime > 28000) {
        console.log('Timeout protection - stopping removal');
        break;
      }

      // Sort by status (active first) then by created_date
      const allInGroup = [group.primary, ...group.duplicates.map(d => d.patient)];
      allInGroup.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
        return dateB - dateA;
      });

      const keep = allInGroup[0];
      const toRemove = allInGroup.slice(1);

      const removedFromGroup = [];
      for (const patient of toRemove) {
        try {
          await base44.asServiceRole.entities.Patient.delete(patient.id);
          removedFromGroup.push({
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`,
            mrn: patient.medical_record_number || 'N/A',
            match_score: group.duplicates.find(d => d.patient.id === patient.id)?.score || 100
          });
        } catch (err) {
          console.error(`Failed to delete ${patient.id}:`, err);
        }
      }

      removed.push(...removedFromGroup);
      detailsArray.push({
        kept: {
          id: keep.id,
          name: `${keep.first_name} ${keep.last_name}`,
          mrn: keep.medical_record_number || 'N/A',
          status: keep.status
        },
        removed: removedFromGroup
      });

      // Small delay every 5 groups
      if (detailsArray.length % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return Response.json({
      success: true,
      duplicate_groups_found: duplicateGroups.length,
      patients_removed: removed.length,
      removed_patients: removed,
      details: detailsArray
    });
  } catch (error) {
    console.error('Deduplication error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      details: 'Check function logs for more information'
    }, { status: 500 });
  }
});