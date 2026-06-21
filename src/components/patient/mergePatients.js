// Shared patient-merge logic, so every surface that merges duplicates
// (the Duplicate Patients admin page, the merge dialogs) reassigns clinical
// history the same way instead of each re-implementing it slightly differently.
import { base44 } from "@/api/base44Client";

// Entities that reference a patient via `patient_id` and must follow the patient
// when duplicates are merged, so visits / care plans / alerts are never left
// orphaned on a record that's about to be archived.
export const PATIENT_RELATED_ENTITIES = [
  "Visit",
  "CarePlan",
  "PatientAlert",
  "PendingPatientUpdate",
];

/**
 * Merge one duplicate patient into a surviving (primary) record:
 *   1. Reassign every related record (visits, care plans, alerts, pending
 *      updates) from the duplicate to the primary, so clinical history moves to
 *      the chart that's being kept.
 *   2. Soft-delete the duplicate — `is_archived: true`, `status: 'merged'`, and a
 *      pointer back to the survivor — mirroring the deduplicatePatients backend
 *      so a merge done in the UI looks identical to one done server-side and is
 *      fully recoverable (clear is_archived to restore). Nothing is hard-deleted.
 *
 * @param {string} primaryId    surviving patient id
 * @param {string} duplicateId  patient id to merge in and archive
 * @param {{ mergedBy?: string|null }} [opts]
 * @returns {Promise<{ reassigned: Record<string, number> }>} counts moved per entity
 */
export async function mergePatientInto(primaryId, duplicateId, { mergedBy = null } = {}) {
  if (!primaryId || !duplicateId) {
    throw new Error("mergePatientInto requires a primary and a duplicate id");
  }
  if (primaryId === duplicateId) {
    throw new Error("Cannot merge a patient into itself");
  }

  const reassigned = {};
  for (const entityName of PATIENT_RELATED_ENTITIES) {
    const api = base44.entities[entityName];
    if (!api?.filter || !api?.update) continue;
    const records = (await api.filter({ patient_id: duplicateId })) || [];
    for (const record of records) {
      await api.update(record.id, { patient_id: primaryId });
    }
    reassigned[entityName] = records.length;
  }

  await base44.entities.Patient.update(duplicateId, {
    status: "merged",
    is_archived: true,
    merged_into_id: primaryId,
    merged_at: new Date().toISOString(),
    ...(mergedBy ? { merged_by: mergedBy } : {}),
  });

  return { reassigned };
}

/**
 * Merge several duplicates into one surviving record, sequentially.
 *
 * @param {string} keepId          surviving patient id
 * @param {string[]} duplicateIds  ids to merge into the survivor
 * @param {{ mergedBy?: string|null }} [opts]
 * @returns {Promise<{ patientsMerged: number, reassigned: Record<string, number> }>}
 */
export async function mergePatientGroup(keepId, duplicateIds = [], opts = {}) {
  if (!keepId) throw new Error("mergePatientGroup requires a survivor id");

  let patientsMerged = 0;
  const reassigned = {};
  for (const dupId of duplicateIds) {
    if (!dupId || dupId === keepId) continue;
    const { reassigned: moved } = await mergePatientInto(keepId, dupId, opts);
    patientsMerged += 1;
    for (const [entity, count] of Object.entries(moved)) {
      reassigned[entity] = (reassigned[entity] || 0) + count;
    }
  }
  return { patientsMerged, reassigned };
}
