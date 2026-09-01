import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transpileTs } from "../../tools-transpile-ts.mjs";

/**
 * Behavioral contract tests for the protected OASIS write path.
 *
 * `OASISAssessment` is reachable directly, so this function is the only thing
 * standing between a client and an arbitrary `oasis_items[]`. These tests run
 * the REAL handler against an injected client and assert what it refuses — a
 * validator that is only exercised through the UI is not a validator.
 */

const V2 = "pennsync-oasis-response-v2-cms-e2";
const V1 = "pennsync-oasis-response-v1-legacy";
const FLAG = "oasis_response_schema_v2";

function row(overrides = {}) {
  return {
    definition_id: "m1830_cms_e2",
    item_number: "M1830",
    item_name: "Bathing",
    item_source: "cms_item",
    item_spec_version: "oasis-e2",
    response_schema_id: V2,
    response_shape: "single",
    response_value: { code: "6" },
    response_origin: "clinician_selected",
    selected_by: "rn@example.com",
    selected_at: "2026-06-01T10:00:00.000Z",
    ai_suggested: false,
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    patient_id: "p1",
    visit_type: "Discharge",
    assessment_date: "2026-06-01",
    oasis_items: [row()],
    ...overrides,
  };
}

const DEFAULT_USER = { id: "u1", email: "rn@example.com", agency_id: "ag1", is_active: true };

async function loadHandler({ agency = { feature_access: { [FLAG]: true } }, user = DEFAULT_USER } = {}) {
  let src = await readFile(new URL("../functions/saveOasisResponses/entry.ts", import.meta.url), "utf8");
  src = src.replace(/import\s+\{[^}]*\}\s+from\s+'npm:[^']*';?/, "const createClientFromRequest = globalThis.__soMakeClient;");
  const js = transpileTs(src).outputText;
  const tmp = join(tmpdir(), `soctr_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmp, js);

  const written = [];
  let handler;
  globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: () => undefined } };
  globalThis.__soMakeClient = () => ({
    // `user` may legitimately be null (anonymous), so no ?? fallback here —
    // that would make the anonymous case untestable.
    auth: { me: async () => user },
    entities: {
      Agency: { get: async () => agency },
      OASISAssessment: {
        create: async (rec) => { written.push({ op: "create", rec }); return { id: "new1", ...rec }; },
        update: async (id, rec) => { written.push({ op: "update", id, rec }); return { id, ...rec }; },
      },
    },
  });
  try {
    await import(pathToFileURL(tmp).href);
  } finally {
    await unlink(tmp).catch(() => {});
  }
  return { handler, written };
}

async function post(handler, body) {
  const res = await handler(new Request("http://local/saveOasisResponses", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  return { status: res.status, json: await res.json() };
}

const reasonOf = (json) => (json.errors || []).map((e) => e.reason);

// ── the happy path ──────────────────────────────────────────────────────────

test("a valid v2 write is accepted and the server stamps provenance", async () => {
  const { handler, written } = await loadHandler();
  const { status, json } = await post(handler, payload());
  assert.equal(status, 200, JSON.stringify(json));
  assert.equal(json.ok, true);
  assert.equal(written.length, 1);
  const rec = written[0].rec;
  assert.equal(rec.response_schema_id, V2);
  assert.equal(rec.instrument_version, "oasis-e2");
  assert.equal(rec.migration_status, "native_v2");
  assert.equal(rec.response_schema_source, "final-oasis-e2-all-item-04-01-2026");
  assert.equal(rec.oasis_items[0].response_value.code, "6");
  // The server sets these itself rather than trusting the client.
  assert.equal(rec.oasis_items[0].response_origin, "clinician_selected");
  assert.equal(rec.oasis_items[0].ai_suggested, false);
  assert.equal(rec.last_written_by, "rn@example.com");
});

// ── the flag and the kill switch ────────────────────────────────────────────

test("the feature flag gates the write and defaults closed", async () => {
  for (const agency of [null, {}, { feature_access: {} }, { feature_access: { [FLAG]: false } }]) {
    const { handler, written } = await loadHandler({ agency });
    const { status, json } = await post(handler, payload());
    assert.equal(status, 403, JSON.stringify(json));
    assert.equal(json.reason, "feature_disabled");
    assert.equal(written.length, 0, "nothing may be written while the flag is off");
  }
});

test("the kill switch stops writes without a deploy", async () => {
  const { handler, written } = await loadHandler({
    agency: { feature_access: { [FLAG]: true, oasis_response_writes_disabled: true } },
  });
  const { status, json } = await post(handler, payload());
  assert.equal(status, 423);
  assert.equal(json.reason, "write_kill_switch");
  assert.equal(written.length, 0);
});

// ── stale clients ───────────────────────────────────────────────────────────

test("a stale client writing the obsolete v1 schema is rejected with an actionable message", async () => {
  const { handler, written } = await loadHandler();
  const { status, json } = await post(handler, payload({
    oasis_items: [row({ response_schema_id: V1 })],
  }));
  assert.equal(status, 409);
  assert.equal(json.reason, "stale_client");
  assert.match(json.error, /older version of PennSync/i);
  assert.match(json.error, /Refresh/i);
  assert.ok(reasonOf(json).includes("obsolete_response_schema"));
  assert.equal(written.length, 0);
});

test("an assessment-level obsolete schema is rejected before any row is read", async () => {
  const { handler, written } = await loadHandler();
  const { status, json } = await post(handler, payload({ response_schema_id: V1 }));
  assert.equal(status, 409);
  assert.equal(json.reason, "stale_client");
  assert.equal(written.length, 0);
});

// ── everything the validator must refuse ────────────────────────────────────

test("the validator rejects each disallowed write, and writes nothing", async () => {
  const cases = [
    ["missing response schema", payload({ oasis_items: [row({ response_schema_id: undefined })] }), "missing_response_schema"],
    ["unknown response schema", payload({ oasis_items: [row({ response_schema_id: "pennsync-oasis-response-v9" })] }), "unknown_response_schema"],
    ["unknown definition", payload({ oasis_items: [row({ definition_id: "m9999_cms_e2" })] }), "unknown_definition"],
    ["invalid code", payload({ oasis_items: [row({ response_value: { code: "9" } })] }), "invalid_code"],
    ["numeric code", payload({ oasis_items: [row({ response_value: { code: 6 } })] }), "invalid_code"],
    ["invalid response shape", payload({ oasis_items: [row({ response_value: { codes: ["6"] } })] }), "invalid_response_shape"],
    ["declared shape mismatch", payload({ oasis_items: [row({ response_shape: "grid" })] }), "invalid_response_shape"],
    ["item at an inapplicable timepoint", payload({
      visit_type: "Start of Care",
      oasis_items: [row({ definition_id: "m2420_cms_e2", item_number: "M2420", response_value: { code: "1" } })],
    }), "item_not_applicable_at_timepoint"],
    ["screening item wearing an M-number", payload({
      oasis_items: [row({ definition_id: "ps_hospitalization_risk_tier", item_number: "M1033", item_source: "pennsync_screening", response_value: { code: "high" } })],
    }), "screening_item_wearing_m_number"],
    ["official response with no clinician selection", payload({ oasis_items: [row({ response_origin: "system" })] }), "response_not_clinician_selected"],
    ["AI-originated official response", payload({ oasis_items: [row({ ai_suggested: true })] }), "ai_originated_response"],
    ["missing selecting clinician", payload({ oasis_items: [row({ selected_by: undefined })] }), "missing_selecting_clinician"],
    ["missing selection timestamp", payload({ oasis_items: [row({ selected_at: "nonsense" })] }), "missing_selection_timestamp"],
    ["mixed schema metadata", payload({ oasis_items: [row({ item_spec_version: "oasis-e1" })] }), "inconsistent_instrument_version"],
    ["inconsistent item source", payload({ oasis_items: [row({ item_source: "pennsync_screening" })] }), "inconsistent_item_source"],
    ["item number mismatch", payload({ oasis_items: [row({ item_number: "M1860" })] }), "item_number_mismatch"],
    ["missing assessment date", payload({ assessment_date: undefined }), "missing_assessment_date"],
    ["invalid assessment date", payload({ assessment_date: "not-a-date" }), "invalid_assessment_date"],
    ["assessment before OASIS-E2", payload({ assessment_date: "2025-06-01" }), "assessment_predates_oasis_e2"],
    ["unresolved timepoint", payload({ visit_type: "Routine Visit" }), "unresolved_timepoint"],
  ];

  for (const [name, body, expected] of cases) {
    const { handler, written } = await loadHandler();
    const { status, json } = await post(handler, body);
    assert.ok(status === 422 || status === 409, `${name}: expected a rejection, got ${status}`);
    assert.ok(reasonOf(json).includes(expected), `${name}: expected "${expected}", got ${JSON.stringify(reasonOf(json))}`);
    assert.equal(written.length, 0, `${name}: nothing may be written on a rejection`);
  }
});

test("a mutually exclusive M1740 combination is refused server-side", async () => {
  const { handler, written } = await loadHandler();
  const { json } = await post(handler, payload({
    oasis_items: [row({ definition_id: "m1740_cms_e2", item_number: "M1740", response_shape: "multi_select", response_value: { codes: ["7", "1"] } })],
  }));
  assert.ok(reasonOf(json).includes("mutually_exclusive_response"));
  assert.equal(written.length, 0);
});

test("an M2401 grid missing a required row is refused server-side", async () => {
  const { handler, written } = await loadHandler();
  const { json } = await post(handler, payload({
    oasis_items: [row({ definition_id: "m2401_cms_e2", item_number: "M2401", response_shape: "grid", response_value: { rows: [{ row_id: "b", code: "1" }] } })],
  }));
  assert.ok(reasonOf(json).includes("missing_grid_row"));
  assert.equal(written.length, 0);
});

test("M1620's UK is refused at DC and accepted at SOC, per CMS", async () => {
  const uk = row({ definition_id: "m1620_cms_e2", item_number: "M1620", response_value: { code: "UK" } });
  const dc = await loadHandler();
  assert.ok(reasonOf((await post(dc.handler, payload({ oasis_items: [uk] }))).json).includes("invalid_code"));
  const soc = await loadHandler();
  const res = await post(soc.handler, payload({
    visit_type: "Start of Care",
    oasis_items: [uk],
  }));
  assert.equal(res.status, 200, JSON.stringify(res.json));
});

test("one bad row rejects the whole write — no partial assessment is persisted", async () => {
  const { handler, written } = await loadHandler();
  const { status, json } = await post(handler, payload({
    oasis_items: [row(), row({ definition_id: "m2420_cms_e2", item_number: "M2420", response_value: { code: "9" } })],
  }));
  assert.equal(status, 422);
  assert.equal(json.errors.length, 1);
  assert.equal(json.errors[0].index, 1, "the failing row is identified by index");
  assert.equal(written.length, 0);
});

test("leading zeros survive the server round-trip", async () => {
  const { handler, written } = await loadHandler();
  const { status } = await post(handler, payload({
    visit_type: "Start of Care",
    oasis_items: [row({ definition_id: "m1100_cms_e2", item_number: "M1100", response_shape: "matrix_choice", response_value: { code: "07" } })],
  }));
  assert.equal(status, 200);
  assert.equal(written[0].rec.oasis_items[0].response_value.code, "07");
});

test("auth is required and a deactivated account is refused", async () => {
  const anon = await loadHandler({ user: null });
  assert.equal((await post(anon.handler, payload())).status, 401);
  const off = await loadHandler({ user: { id: "u1", email: "x@y.com", agency_id: "ag1", is_active: false } });
  assert.equal((await post(off.handler, payload())).status, 403);
  assert.equal(off.written.length, 0);
});

test("only POST is accepted", async () => {
  const { handler } = await loadHandler();
  const res = await handler(new Request("http://local/saveOasisResponses", { method: "GET" }));
  assert.equal(res.status, 405);
});
