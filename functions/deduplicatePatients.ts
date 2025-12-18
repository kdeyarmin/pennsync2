import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Calculate match score between two patients
const calculateMatchScore = (p1, p2) => {
  let score = 0;
  const matches = [];

  // Normalize names (remove commas and extra spaces)
  const normalizeName = (str) => str?.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim() || '';
  
  // Name matching
  const name1 = `${normalizeName(p1.first_name)} ${normalizeName(p1.last_name)}`;
  const name2 = `${normalizeName(p2.first_name)} ${normalizeName(p2.last_name)}`;
  
  if (name1 === name2) {
    score += 40;
    matches.push('name_exact');
  } else if (
    normalizeName(p1.first_name) === normalizeName(p2.first_name) ||
    normalizeName(p1.last_name) === normalizeName(p2.last_name)
  ) {
    score += 20;
    matches.push('name_partial');
  }

  // DOB matching
  if (p1.date_of_birth && p2.date_of_birth) {
    const dob1 = p1.date_of_birth.replace(/\D/g, '');
    const dob2 = p2.date_of_birth.replace(/\D/g, '');
    if (dob1 === dob2) {
      score += 30;
      matches.push('dob_exact');
    }
  }

  // MRN matching
  if (p1.medical_record_number && p2.medical_record_number) {
    if (p1.medical_record_number === p2.medical_record_number) {
      score += 30;
      matches.push('mrn_exact');
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