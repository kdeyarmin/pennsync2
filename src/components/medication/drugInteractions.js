/**
 * drugInteractions — a SMALL, deterministic safety net of well-established,
 * high-severity drug–drug interactions. It augments (never replaces) the LLM
 * check in checkDrugInteractions so that a handful of dangerous, unambiguous
 * combinations are surfaced even if the model misses them.
 *
 * This is intentionally NON-EXHAUSTIVE and is not a substitute for a full
 * interaction database or clinical judgment. Mirrored inline in
 * functions/checkDrugInteractions.ts (single-file deploy model); this
 * unit-tested copy is the source of truth.
 */

// Drug / class -> lowercase name fragments that identify a member.
const GROUPS = {
  warfarin: ["warfarin", "coumadin", "jantoven"],
  nsaid: ["ibuprofen", "naproxen", "ketorolac", "diclofenac", "meloxicam", "indomethacin", "aspirin", "celecoxib", "nsaid"],
  maoi: ["phenelzine", "tranylcypromine", "isocarboxazid", "selegiline", "rasagiline", "linezolid"],
  ssri_snri: ["fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram", "fluvoxamine", "venlafaxine", "desvenlafaxine", "duloxetine"],
  nitrate: ["nitroglycerin", "isosorbide", "nitrate"],
  pde5: ["sildenafil", "tadalafil", "vardenafil", "avanafil"],
  ace_arb: ["lisinopril", "enalapril", "ramipril", "benazepril", "captopril", "quinapril", "losartan", "valsartan", "olmesartan", "candesartan", "irbesartan", "telmisartan"],
  potassium_sparing: ["spironolactone", "eplerenone", "triamterene", "amiloride", "potassium chloride", "potassium", "klor-con"],
  statin_cyp3a4: ["simvastatin", "lovastatin", "atorvastatin"],
  strong_cyp3a4_inhibitor: ["clarithromycin", "erythromycin", "itraconazole", "ketoconazole", "ritonavir", "cobicistat"],
  digoxin: ["digoxin", "lanoxin"],
  digoxin_potentiator: ["amiodarone", "verapamil", "quinidine", "dronedarone"],
  methotrexate: ["methotrexate"],
  mtx_potentiator: ["trimethoprim", "sulfamethoxazole", "bactrim", "septra"],
  lithium: ["lithium"],
  opioid: ["morphine", "oxycodone", "hydrocodone", "fentanyl", "hydromorphone", "codeine", "tramadol", "methadone", "oxymorphone"],
  benzodiazepine: ["alprazolam", "lorazepam", "diazepam", "clonazepam", "temazepam", "midazolam"],
  allopurinol: ["allopurinol"],
  thiopurine: ["azathioprine", "mercaptopurine"],
};

// Pairwise rules. Each links two groups with a fixed severity + guidance.
const RULES = [
  { a: "warfarin", b: "nsaid", severity: "major", type: "pharmacodynamic", description: "Greatly increased risk of serious GI/other bleeding.", recommendation: "Avoid; if unavoidable use gastroprotection and monitor INR/bleeding closely." },
  { a: "maoi", b: "ssri_snri", severity: "critical", type: "contraindication", description: "Risk of serotonin syndrome (potentially fatal).", recommendation: "Contraindicated; observe washout (≥2 weeks; 5 weeks after fluoxetine)." },
  { a: "nitrate", b: "pde5", severity: "critical", type: "contraindication", description: "Profound, potentially fatal hypotension.", recommendation: "Contraindicated combination." },
  { a: "ace_arb", b: "potassium_sparing", severity: "major", type: "pharmacodynamic", description: "Risk of life-threatening hyperkalemia.", recommendation: "Monitor potassium and renal function; avoid in renal impairment." },
  { a: "statin_cyp3a4", b: "strong_cyp3a4_inhibitor", severity: "major", type: "pharmacokinetic", description: "Elevated statin levels → myopathy/rhabdomyolysis.", recommendation: "Avoid; hold the statin or use a non-CYP3A4 statin during therapy." },
  { a: "digoxin", b: "digoxin_potentiator", severity: "major", type: "pharmacokinetic", description: "Increased digoxin levels → toxicity.", recommendation: "Reduce digoxin dose and monitor levels." },
  { a: "methotrexate", b: "nsaid", severity: "major", type: "pharmacokinetic", description: "Reduced methotrexate clearance → toxicity.", recommendation: "Avoid NSAIDs (esp. with higher-dose MTX); monitor." },
  { a: "methotrexate", b: "mtx_potentiator", severity: "major", type: "pharmacokinetic", description: "Increased methotrexate toxicity / myelosuppression.", recommendation: "Avoid trimethoprim-sulfamethoxazole with methotrexate." },
  { a: "opioid", b: "benzodiazepine", severity: "major", type: "pharmacodynamic", description: "Additive CNS/respiratory depression (FDA boxed warning).", recommendation: "Avoid co-prescribing; if necessary use lowest doses and monitor." },
  { a: "allopurinol", b: "thiopurine", severity: "major", type: "pharmacokinetic", description: "Severe myelosuppression.", recommendation: "Avoid, or reduce thiopurine dose by ~75% with close monitoring." },
  { a: "lithium", b: "nsaid", severity: "major", type: "pharmacokinetic", description: "Reduced lithium clearance → toxicity.", recommendation: "Avoid NSAIDs; monitor lithium levels." },
  { a: "lithium", b: "ace_arb", severity: "major", type: "pharmacokinetic", description: "Reduced lithium clearance → toxicity.", recommendation: "Monitor lithium levels closely." },
];

/** Groups a single medication name belongs to. */
function groupsFor(name) {
  const n = String(name || "").toLowerCase();
  const out = [];
  for (const [group, fragments] of Object.entries(GROUPS)) {
    if (fragments.some((f) => n.includes(f))) out.push(group);
  }
  return out;
}

/**
 * Find deterministic interactions among a list of medications.
 * @param {Array<{name?:string, medication_name?:string}>} medications
 * @returns interaction objects shaped like the LLM output, tagged
 *          source:"deterministic", verified:true.
 */
export function findDeterministicInteractions(medications) {
  const meds = (medications || [])
    .map((m) => ({ name: m?.medication_name || m?.name || "" }))
    .filter((m) => m.name);
  const memberGroups = meds.map((m) => new Set(groupsFor(m.name)));
  const results = [];
  const seen = new Set();

  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      for (const rule of RULES) {
        const iA = memberGroups[i].has(rule.a) && memberGroups[j].has(rule.b);
        const iB = memberGroups[i].has(rule.b) && memberGroups[j].has(rule.a);
        if (!iA && !iB) continue;
        const key = `${rule.a}|${rule.b}|${[i, j].join("-")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          drug_a: meds[i].name,
          drug_b: meds[j].name,
          severity: rule.severity,
          interaction_type: rule.type,
          description: rule.description,
          clinical_significance: rule.description,
          recommendation: rule.recommendation,
          monitoring_required: true,
          requires_intervention: rule.severity === "critical" || rule.severity === "major",
          source: "deterministic",
          verified: true,
        });
      }
    }
  }
  return results;
}

/**
 * Merge deterministic interactions into an LLM interaction list. Deterministic
 * findings win on the same drug pair; LLM-only findings are tagged honestly as
 * unverified suggestions.
 */
export function mergeInteractions(aiInteractions, deterministic) {
  const norm = (s) => String(s || "").toLowerCase().trim();
  const pairKey = (x) => [norm(x.drug_a), norm(x.drug_b)].sort().join("|");
  const detKeys = new Set(deterministic.map(pairKey));
  const aiTagged = (aiInteractions || [])
    .filter((x) => !detKeys.has(pairKey(x))) // deterministic wins on overlap
    .map((x) => ({ ...x, source: x.source || "ai_suggested", verified: false }));
  return [...deterministic, ...aiTagged];
}
