import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  cleanValue,
  parseCsv,
  buildRowObject,
  buildExistingLookups,
  parseUploadedPatient,
  buildUploadKeys,
  resolveMatch,
} from './patientImportUtils.js';

// SSRF guard: only fetch https URLs on public hosts, never internal IPs /
// metadata. Set FILE_URL_ALLOWED_HOSTS (comma-separated) to restrict to your
// storage host(s). Set FILE_URL_STRICT=true to make that allowlist MANDATORY —
// with strict on and no allowlist configured, all external fetches are rejected
// (fully closes the SSRF surface) rather than allowing any public host.
// (Allowlisting also mitigates DNS rebinding.)
function isSafeFetchUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(String(raw)); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (['localhost', '0.0.0.0', '127.0.0.1', '::1', '169.254.169.254'].includes(host)) return false;
  if (host.endsWith('.internal') || host.endsWith('.local')) return false;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  const allow = Deno.env.get('FILE_URL_ALLOWED_HOSTS');
  const hosts = (allow || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (hosts.length > 0) {
    if (!hosts.some((h) => host === h || host.endsWith('.' + h))) return false;
  } else if (Deno.env.get('FILE_URL_STRICT') === 'true') {
    // Strict mode with no allowlist configured: fail closed (allow nothing).
    return false;
  }
  return true;
}

const runInBatches = async (items, batchSize, worker) => {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map(worker));
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const reportType = body.report_type === 'discharge_report' ? 'discharge_report' : 'active_census';
    // Preview mode: classify every row and return the plan without writing
    // anything, so an admin can review which patients would be added vs.
    // matched to existing records before committing the import.
    const dryRun = body.dry_run === true || body.mode === 'preview';
    let fileContent = cleanValue(body.file_content);

    if (!fileContent && body.file_url) {
      if (!isSafeFetchUrl(body.file_url)) return Response.json({ success: false, error: 'Invalid or disallowed file_url' }, { status: 400 });
      const fileResponse = await fetch(body.file_url);
      if (!fileResponse.ok) {
        return Response.json({ success: false, error: 'Failed to read the uploaded file' }, { status: 400 });
      }
      fileContent = await fileResponse.text();
    }

    if (!fileContent) {
      return Response.json({ success: false, error: 'CSV file content is required' }, { status: 400 });
    }

    // Full CSV parse (handles quoted commas, escaped quotes, and embedded
    // newlines) so a single logical record never gets split across rows.
    const records = parseCsv(fileContent);
    if (records.length < 2) {
      return Response.json({ success: false, error: 'CSV file must include a header row and at least one patient row' }, { status: 400 });
    }

    const headers = records[0];
    const rawRows = records.slice(1).map((cols, index) => ({
      rowNumber: index + 2,
      data: buildRowObject(headers, cols),
    }));

    const existingPatients = await base44.asServiceRole.entities.Patient.list('-created_date', 2000);
    const { existingByMrn, existingByNameDob } = buildExistingLookups(existingPatients);

    const results = {
      reportType,
      dryRun,
      processed: 0,
      created: 0,
      matchedExisting: 0,
      discharged: 0,
      archived: 0,
      skippedInFileDuplicates: 0,
      noChanges: 0,
      willCreate: 0,
      willDischarge: 0,
      errors: [],
      // Per-row outcome for the preview table. action is one of:
      // create | matched | discharge | no_change | in_file_duplicate | error
      plan: [],
    };

    const existingLabel = (p) => {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      return p.medical_record_number ? `${name} (MRN ${p.medical_record_number})` : name;
    };

    const createQueue = [];
    const dischargeQueue = [];
    const seenUploadKeys = new Set();
    const queuedDischargeIds = new Set();

    for (const rawRow of rawRows) {
      const hasData = Object.values(rawRow.data).some(Boolean);
      if (!hasData) continue;

      results.processed++;
      const patient = parseUploadedPatient(rawRow.data, rawRow.rowNumber);

      if (!patient.first_name || !patient.last_name) {
        const error = 'Missing patient name; first and last name are required for verification.';
        results.errors.push({ row: rawRow.rowNumber, patient: patient.patientLabel, error });
        results.plan.push({ row: rawRow.rowNumber, action: 'error', patient: patient.patientLabel, detail: error });
        continue;
      }

      const uploadKeys = buildUploadKeys(patient);

      if (uploadKeys.length === 0) {
        const error = 'Cannot safely verify this patient. Provide an MRN or a name with DOB.';
        results.errors.push({ row: rawRow.rowNumber, patient: patient.patientLabel, error });
        results.plan.push({ row: rawRow.rowNumber, action: 'error', patient: patient.patientLabel, detail: error });
        continue;
      }

      if (uploadKeys.some(key => seenUploadKeys.has(key))) {
        results.skippedInFileDuplicates++;
        const error = 'This patient appears more than once in the uploaded file.';
        results.errors.push({ row: rawRow.rowNumber, patient: patient.patientLabel, error });
        results.plan.push({ row: rawRow.rowNumber, action: 'in_file_duplicate', patient: patient.patientLabel, detail: error });
        continue;
      }

      uploadKeys.forEach(key => seenUploadKeys.add(key));

      const matchResult = resolveMatch(patient, existingByMrn, existingByNameDob);
      if (matchResult.error) {
        results.errors.push({ row: rawRow.rowNumber, patient: patient.patientLabel, error: matchResult.error });
        results.plan.push({ row: rawRow.rowNumber, action: 'error', patient: patient.patientLabel, detail: matchResult.error });
        continue;
      }

      if (reportType === 'active_census') {
        if (matchResult.match) {
          results.matchedExisting++;
          results.noChanges++;
          results.plan.push({
            row: rawRow.rowNumber,
            action: 'matched',
            patient: patient.patientLabel,
            detail: `Already in system — matched by ${matchResult.matchedBy} to ${existingLabel(matchResult.match)}`,
          });
          continue;
        }

        results.willCreate++;
        results.plan.push({ row: rawRow.rowNumber, action: 'create', patient: patient.patientLabel, detail: 'New patient — will be added' });
        createQueue.push({
          rowNumber: rawRow.rowNumber,
          patientLabel: patient.patientLabel,
          payload: {
            first_name: patient.first_name,
            middle_name: patient.middle_name || undefined,
            last_name: patient.last_name,
            date_of_birth: patient.date_of_birth || undefined,
            medical_record_number: patient.medical_record_number || undefined,
            admission_date: patient.admission_date || undefined,
            status: patient.status || 'active',
            payor: patient.payor || undefined,
            primary_diagnosis: patient.primary_diagnosis || undefined,
            secondary_diagnoses: patient.secondary_diagnoses.length ? patient.secondary_diagnoses : undefined,
            phone: patient.phone || undefined,
            address: patient.address || undefined,
            care_type: 'home_health',
            is_archived: false,
          },
        });
        continue;
      }

      if (patient.status !== 'discharged') {
        results.noChanges++;
        results.plan.push({ row: rawRow.rowNumber, action: 'no_change', patient: patient.patientLabel, detail: 'Not marked discharged in this report — no change' });
        continue;
      }

      if (!matchResult.match) {
        const error = 'No matching patient was found in the system for this discharged record.';
        results.errors.push({ row: rawRow.rowNumber, patient: patient.patientLabel, error });
        results.plan.push({ row: rawRow.rowNumber, action: 'error', patient: patient.patientLabel, detail: error });
        continue;
      }

      // Check the in-file duplicate BEFORE counting matchedExisting, so a row
      // that resolves to an already-queued patient (via a different match key)
      // is tallied once as a duplicate rather than in both buckets.
      if (queuedDischargeIds.has(matchResult.match.id)) {
        results.skippedInFileDuplicates++;
        results.plan.push({ row: rawRow.rowNumber, action: 'in_file_duplicate', patient: patient.patientLabel, detail: 'Same patient already queued for discharge from an earlier row' });
        continue;
      }

      results.matchedExisting++;

      if (matchResult.match.status === 'discharged' && matchResult.match.is_archived) {
        results.noChanges++;
        results.plan.push({ row: rawRow.rowNumber, action: 'no_change', patient: patient.patientLabel, detail: 'Already discharged and archived — no change' });
        continue;
      }

      results.willDischarge++;
      results.plan.push({
        row: rawRow.rowNumber,
        action: 'discharge',
        patient: patient.patientLabel,
        detail: `Will discharge + archive — matched by ${matchResult.matchedBy} to ${existingLabel(matchResult.match)}`,
      });
      queuedDischargeIds.add(matchResult.match.id);
      dischargeQueue.push({
        id: matchResult.match.id,
        patientLabel: patient.patientLabel,
        payload: {
          status: 'discharged',
          is_archived: true,
          discharge_date: patient.discharge_date || new Date().toISOString().slice(0, 10),
        },
      });
    }

    // Preview mode stops here: report the plan and planned counts, write nothing.
    if (dryRun) {
      return Response.json({ success: true, results });
    }

    await runInBatches(createQueue, 25, async (item) => {
      try {
        await base44.asServiceRole.entities.Patient.create(item.payload);
        results.created++;
      } catch (error) {
        results.errors.push({
          row: item.rowNumber,
          patient: item.patientLabel,
          error: error.message,
        });
      }
    });

    await runInBatches(dischargeQueue, 25, async (item) => {
      try {
        await base44.asServiceRole.entities.Patient.update(item.id, item.payload);
        results.discharged++;
        results.archived++;
      } catch (error) {
        results.errors.push({
          patient: item.patientLabel,
          error: error.message,
        });
      }
    });

    return Response.json({
      success: true,
      results,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});
