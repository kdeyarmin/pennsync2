import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReferralExtractionPrompt,
  REFERRAL_EXTRACTION_SCHEMA,
  buildReferralQuickScanPrompt,
  REFERRAL_QUICKSCAN_SCHEMA,
  runReferralExtraction,
  runReferralQuickScan,
} from "./referralExtraction.js";

test("rich extraction prompt adapts to scanned-image vs PDF input", () => {
  const image = buildReferralExtractionPrompt("image/tiff");
  const pdf = buildReferralExtractionPrompt("application/pdf");
  assert.match(image, /scanned\/faxed document image/);
  assert.match(pdf, /This is a PDF document/);
  // Default (no arg) should behave like a PDF.
  assert.match(buildReferralExtractionPrompt(), /This is a PDF document/);
});

test("rich extraction prompt covers OASIS, PDGM, and confidence scoring", () => {
  const prompt = buildReferralExtractionPrompt("application/pdf");
  assert.match(prompt, /OASIS-E assessment/);
  assert.match(prompt, /PDGM/);
  assert.match(prompt, /CONFIDENCE SCORING \(REQUIRED\)/);
});

test("rich extraction schema exposes the key clinical sections", () => {
  assert.equal(REFERRAL_EXTRACTION_SCHEMA.type, "object");
  const props = REFERRAL_EXTRACTION_SCHEMA.properties;
  for (const section of [
    "demographics",
    "admission_details",
    "diagnoses",
    "medications",
    "functional_status",
    "wound_details",
    "psychosocial",
    "oasis_assessment",
    "extraction_confidence",
  ]) {
    assert.ok(props[section], `expected schema to define ${section}`);
  }
  // The per-section confidence object backs the real per-field confidence UI.
  assert.ok(REFERRAL_EXTRACTION_SCHEMA.properties.extraction_confidence.properties.overall);
});

test("quick scan prompt + schema drive form pre-fill and triage", () => {
  const prompt = buildReferralQuickScanPrompt();
  assert.match(prompt, /URGENCY ASSESSMENT/);
  assert.match(prompt, /SUGGESTED INITIAL TASKS/);

  const props = REFERRAL_QUICKSCAN_SCHEMA.properties;
  for (const field of ["patient_name", "category", "urgency_level", "suggested_initial_tasks"]) {
    assert.ok(props[field], `expected quick-scan schema to define ${field}`);
  }
  assert.deepEqual(props.urgency_level.enum, ["urgent", "high", "normal", "low"]);
});

// The run helpers take an injected base44 client; verify they invoke the SDK
// with the right prompt/schema and surface the result (a fake client keeps the
// test offline and free of the real SDK).
test("runReferralExtraction calls InvokeLLM with the rich prompt and schema", async () => {
  const calls = [];
  const fakeBase44 = {
    integrations: { Core: { InvokeLLM: async (params) => { calls.push(params); return { ok: true }; } } },
  };
  const result = await runReferralExtraction(fakeBase44, { fileUrl: "u://doc.pdf", fileType: "application/pdf" });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].file_urls, ["u://doc.pdf"]);
  assert.equal(calls[0].response_json_schema, REFERRAL_EXTRACTION_SCHEMA);
  assert.match(calls[0].prompt, /home health intake coordinator/);
});

test("runReferralQuickScan calls InvokeLLM with the quick-scan prompt and schema", async () => {
  const calls = [];
  const fakeBase44 = {
    integrations: { Core: { InvokeLLM: async (params) => { calls.push(params); return { scan: true }; } } },
  };
  const result = await runReferralQuickScan(fakeBase44, { fileUrl: "u://fax.tiff" });
  assert.deepEqual(result, { scan: true });
  assert.equal(calls[0].response_json_schema, REFERRAL_QUICKSCAN_SCHEMA);
  assert.match(calls[0].prompt, /automatic categorization/);
});

test("run helpers retry a transient failure (shared runWithRetry policy)", async () => {
  let attempts = 0;
  const fakeBase44 = {
    integrations: {
      Core: {
        InvokeLLM: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("transient network blip");
          return { ok: true };
        },
      },
    },
  };
  const result = await runReferralQuickScan(fakeBase44, { fileUrl: "u://doc.pdf" });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2, "should have retried once after the transient failure");
});
