import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { calculateMatchScore } from './dedupUtils.js';

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
    let groupsProcessed = 0;
    for (const [nameKey, group] of nameGroups) {
      if (group.length > 1) {
        const unprocessed = group.filter(p => !processed.has(p.id));
        if (unprocessed.length < 2) continue;

        // Process groups up to 100 patients
        const limit = Math.min(unprocessed.length, 100);
        for (let i = 0; i < limit; i++) {
          if (processed.has(unprocessed[i].id)) continue;

          const duplicates = [];
          for (let j = i + 1; j < limit; j++) {
            if (processed.has(unprocessed[j].id)) continue;

            const { score, matches } = calculateMatchScore(unprocessed[i], unprocessed[j]);
            // Lowered threshold from 60 to 50 to catch more potential duplicates
            if (score >= 50) {
              duplicates.push({ patient: unprocessed[j], score, matches });
              processed.add(unprocessed[j].id);
            }
          }

          if (duplicates.length > 0) {
            duplicateGroups.push({ primary: unprocessed[i], duplicates });
            processed.add(unprocessed[i].id);
          }
        }

        groupsProcessed++;
      }

      // Check timeout every 20 groups
      if (groupsProcessed % 20 === 0 && Date.now() - startTime > 20000) {
        console.log('Approaching timeout, stopping search');
        break;
      }
    }

    console.log(`Found ${duplicateGroups.length} groups in ${Date.now() - startTime}ms`);

    // Remove duplicates with timeout protection
    const removed = [];
    const detailsArray = [];

    // Process deletions in batches to avoid timeout
    const batchSize = 5;
    for (let i = 0; i < duplicateGroups.length; i += batchSize) {
      // Check timeout
      if (Date.now() - startTime > 25000) {
        console.log('Timeout protection - stopping removal');
        break;
      }

      const batch = duplicateGroups.slice(i, i + batchSize);

      for (const group of batch) {
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
            // Quick deletion without checking related records first
            await base44.asServiceRole.entities.Patient.delete(patient.id).catch(async (err) => {
              // If direct delete fails, delete related records first
              const [visits, carePlans, alerts, incidents, tasks] = await Promise.all([
                base44.asServiceRole.entities.Visit.filter({ patient_id: patient.id }).catch(() => []),
                base44.asServiceRole.entities.CarePlan.filter({ patient_id: patient.id }).catch(() => []),
                base44.asServiceRole.entities.PatientAlert.filter({ patient_id: patient.id }).catch(() => []),
                base44.asServiceRole.entities.Incident.filter({ patient_id: patient.id }).catch(() => []),
                base44.asServiceRole.entities.Task.filter({ patient_id: patient.id }).catch(() => [])
              ]);

              await Promise.all([
                ...visits.map(v => base44.asServiceRole.entities.Visit.delete(v.id).catch(err => console.error(`Failed to delete visit ${v.id}:`, err.message))),
                ...carePlans.map(cp => base44.asServiceRole.entities.CarePlan.delete(cp.id).catch(err => console.error(`Failed to delete care plan ${cp.id}:`, err.message))),
                ...alerts.map(a => base44.asServiceRole.entities.PatientAlert.delete(a.id).catch(err => console.error(`Failed to delete alert ${a.id}:`, err.message))),
                ...incidents.map(i => base44.asServiceRole.entities.Incident.delete(i.id).catch(err => console.error(`Failed to delete incident ${i.id}:`, err.message))),
                ...tasks.map(t => base44.asServiceRole.entities.Task.delete(t.id).catch(err => console.error(`Failed to delete task ${t.id}:`, err.message)))
              ]);

              await base44.asServiceRole.entities.Patient.delete(patient.id);
            });

            removedFromGroup.push({
              id: patient.id,
              name: `${patient.first_name} ${patient.last_name}`,
              mrn: patient.medical_record_number || 'N/A',
              match_score: group.duplicates.find(d => d.patient.id === patient.id)?.score || 100
            });
          } catch (err) {
            console.error(`Failed to delete ${patient.id}:`, err.message);
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
      }
    }

    // Calculate confidence levels for results
    const resultsWithConfidence = detailsArray.map(detail => {
      const avgScore = detail.removed.length > 0
        ? detail.removed.reduce((sum, r) => sum + r.match_score, 0) / detail.removed.length
        : 100;

      let confidence = 'High';
      if (avgScore < 70) confidence = 'Medium';
      if (avgScore < 50) confidence = 'Low';

      return {
        ...detail,
        confidence,
        average_match_score: Math.round(avgScore)
      };
    });

    return Response.json({
      success: true,
      duplicate_groups_found: duplicateGroups.length,
      patients_removed: removed.length,
      removed_patients: removed,
      details: resultsWithConfidence
    });
  } catch (error) {
    console.error('Deduplication error:', error);
    return Response.json({
      error: error.message,
      details: 'Check function logs for more information'
    }, { status: 500 });
  }
});
