import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { findDeterministicInteractions as sourceFind } from "../../src/components/medication/drugInteractions.js";

// entry.ts calls Deno.serve(...) at import time; stub it (as the other inline
// parity tests do) so the module loads under node:test.
globalThis.Deno = globalThis.Deno || { serve() {}, env: { get: () => undefined } };

/**
 * Drift guard for the deterministic drug-interaction safety net, which is mirrored
 * inline into checkDrugInteractions/entry.ts (the edge function that runs at the
 * point of care). This is the highest-clinical-risk inline mirror and was the only
 * one without a guard. We compare the inline engine's behavior to the source on a
 * battery of med pairs by (drug pair, severity, interaction_type) — NOT the
 * description text, which intentionally differs only in arrow encoding (→ vs ->).
 */
async function loadInline(entryPath, names) {
  let src = await readFile(new URL(entryPath, import.meta.url), "utf8");
  src = src.replace(/import\s+\{[^}]*\}\s+from\s+'npm:[^']*';?/, "const createClientFromRequest = () => ({});");
  const js = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const tmp = join(tmpdir(), `ddi_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmp, `${js}\nexport { ${names.join(", ")} };\n`);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

const VECTORS = [
  [{ name: "Warfarin 5mg" }, { name: "Aspirin 81mg" }],     // antiplatelet bleeding (not NSAID, not dup)
  [{ name: "Warfarin" }, { name: "Ibuprofen" }],            // NSAID GI bleed
  [{ name: "Warfarin" }, { name: "Clopidogrel" }],          // antiplatelet
  [{ name: "Methotrexate" }, { name: "Aspirin 81mg" }],     // salicylate renal
  [{ name: "Lithium" }, { name: "Aspirin" }],               // salicylate renal
  [{ name: "Methotrexate" }, { name: "Clopidogrel" }],      // must NOT fire
  [{ name: "Klor-Con 10 mEq" }, { name: "lisinopril" }],    // hyperkalemia (hyphen/phrase)
  [{ name: "Potassium Chloride" }, { name: "Lisinopril" }], // hyperkalemia (phrase)
  [{ name: "Isosorbide mononitrate" }, { name: "sildenafil" }], // critical hypotension
  [{ name: "Sertraline" }, { name: "Sumatriptan" }],        // serotonin
  [{ name: "Simvastatin" }, { name: "Clarithromycin" }],    // statin/CYP3A4
  [{ name: "Oxycodone" }, { name: "Lorazepam" }],           // opioid+benzo
  [{ name: "Phenelzine" }, { name: "Fluoxetine" }],         // MAOI+SSRI
  [{ name: "Aspirin" }, { name: "Acetaminophen" }],         // none
];

const normalize = (list) =>
  (list || [])
    .map((x) => `${[String(x.drug_a).toLowerCase(), String(x.drug_b).toLowerCase()].sort().join("+")}|${x.severity}|${x.interaction_type}`)
    .sort();

test("checkDrugInteractions inline engine matches drugInteractions.js source", async () => {
  const { findDeterministicInteractions: inlineFind } = await loadInline(
    "./checkDrugInteractions/entry.ts",
    ["findDeterministicInteractions"]
  );
  for (const meds of VECTORS) {
    assert.deepEqual(
      normalize(inlineFind(meds)),
      normalize(sourceFind(meds)),
      `drug-interaction drift for: ${meds.map((m) => m.name).join(" + ")}`
    );
  }
});
