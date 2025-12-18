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
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Get all patients and filter active ones
    const allPatients = await base44.asServiceRole.entities.Patient.list();
    const patients = allPatients.filter(p => p.status === 'active');
    
    console.log('Total active patients:', patients.length);

    // Find duplicate groups
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < patients.length; i++) {
      if (processed.has(patients[i].id)) continue;

      const duplicates = [];
      
      for (let j = i + 1; j < patients.length; j++) {
        if (processed.has(patients[j].id)) continue;

        const { score, matches } = calculateMatchScore(patients[i], patients[j]);
        
        if (score >= 40) {
          duplicates.push({
            patient: patients[j],
            score,
            matches
          });
          processed.add(patients[j].id);
        }
      }

      if (duplicates.length > 0) {
        duplicateGroups.push({
          primary: patients[i],
          duplicates
        });
        processed.add(patients[i].id);
      }
    }

    // Remove duplicates (keep most recent created)
    const removed = [];
    const detailsArray = [];
    
    for (const group of duplicateGroups) {
      // Sort by created_date to find most recent
      const allInGroup = [group.primary, ...group.duplicates.map(d => d.patient)];
      allInGroup.sort((a, b) => {
        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
        return dateB - dateA;
      });
      
      const keep = allInGroup[0];
      const toRemove = allInGroup.slice(1);

      console.log(`Keeping patient: ${keep.first_name} ${keep.last_name} (${keep.id})`);
      console.log(`Removing ${toRemove.length} duplicate(s)`);

      const removedFromGroup = [];
      for (const patient of toRemove) {
        try {
          await base44.asServiceRole.entities.Patient.update(patient.id, { status: 'discharged' });
          const removedInfo = {
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`,
            mrn: patient.medical_record_number || 'N/A',
            match_score: group.duplicates.find(d => d.patient.id === patient.id)?.score || 0
          };
          removed.push(removedInfo);
          removedFromGroup.push(removedInfo);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`Failed to update patient ${patient.id}:`, err);
        }
      }

      detailsArray.push({
        kept: {
          id: keep.id,
          name: `${keep.first_name} ${keep.last_name}`,
          mrn: keep.medical_record_number || 'N/A'
        },
        removed: removedFromGroup
      });
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