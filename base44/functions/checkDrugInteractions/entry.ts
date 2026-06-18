import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ---- Deterministic interaction safety net ----
// Mirror of src/components/medication/drugInteractions.js (keep in sync). A
// small, NON-EXHAUSTIVE set of well-established high-severity interactions used
// to augment (never replace) the LLM analysis. Not a substitute for a full
// interaction database or clinical judgment.
const DDI_GROUPS: Record<string, string[]> = {
  warfarin: ['warfarin', 'coumadin', 'jantoven'],
  nsaid: ['ibuprofen', 'naproxen', 'ketorolac', 'diclofenac', 'meloxicam', 'indomethacin', 'celecoxib', 'nsaid'],
  antiplatelet: ['aspirin', 'asa', 'acetylsalicylic', 'clopidogrel', 'plavix', 'prasugrel', 'effient', 'ticagrelor', 'brilinta', 'dipyridamole', 'aggrenox'],
  maoi: ['phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline', 'rasagiline', 'linezolid'],
  ssri_snri: ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine', 'venlafaxine', 'desvenlafaxine', 'duloxetine'],
  nitrate: ['nitroglycerin', 'isosorbide', 'nitrate'],
  pde5: ['sildenafil', 'tadalafil', 'vardenafil', 'avanafil'],
  ace_arb: ['lisinopril', 'enalapril', 'ramipril', 'benazepril', 'captopril', 'quinapril', 'losartan', 'valsartan', 'olmesartan', 'candesartan', 'irbesartan', 'telmisartan'],
  potassium_sparing: ['spironolactone', 'eplerenone', 'triamterene', 'amiloride', 'potassium chloride', 'potassium', 'klor-con'],
  statin_cyp3a4: ['simvastatin', 'lovastatin', 'atorvastatin'],
  strong_cyp3a4_inhibitor: ['clarithromycin', 'erythromycin', 'itraconazole', 'ketoconazole', 'ritonavir', 'cobicistat'],
  digoxin: ['digoxin', 'lanoxin'],
  digoxin_potentiator: ['amiodarone', 'verapamil', 'quinidine', 'dronedarone'],
  methotrexate: ['methotrexate'],
  mtx_potentiator: ['trimethoprim', 'sulfamethoxazole', 'bactrim', 'septra'],
  lithium: ['lithium'],
  opioid: ['morphine', 'oxycodone', 'hydrocodone', 'fentanyl', 'hydromorphone', 'codeine', 'tramadol', 'methadone', 'oxymorphone'],
  benzodiazepine: ['alprazolam', 'lorazepam', 'diazepam', 'clonazepam', 'temazepam', 'midazolam'],
  allopurinol: ['allopurinol'],
  thiopurine: ['azathioprine', 'mercaptopurine'],
  triptan: ['sumatriptan', 'rizatriptan', 'eletriptan', 'zolmitriptan', 'naratriptan', 'almotriptan', 'frovatriptan'],
  warfarin_potentiator: ['amiodarone', 'fluconazole', 'metronidazole', 'ciprofloxacin', 'sulfamethoxazole', 'bactrim', 'septra'],
  statin_any: ['simvastatin', 'lovastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin', 'pitavastatin', 'fluvastatin'],
  fibrate: ['gemfibrozil', 'fenofibrate'],
  clopidogrel: ['clopidogrel', 'plavix'],
  cyp2c19_inhibitor: ['omeprazole', 'esomeprazole', 'fluconazole'],
};
const DDI_RULES = [
  { a: 'warfarin', b: 'nsaid', severity: 'major', type: 'pharmacodynamic', description: 'Greatly increased risk of serious GI/other bleeding.', recommendation: 'Avoid; if unavoidable use gastroprotection and monitor INR/bleeding closely.' },
  { a: 'warfarin', b: 'antiplatelet', severity: 'major', type: 'pharmacodynamic', description: 'Additive bleeding risk (anticoagulant + antiplatelet).', recommendation: 'Avoid unless a specific indication exists; if combined, use gastroprotection and monitor INR and for bleeding.' },
  { a: 'ssri_snri', b: 'antiplatelet', severity: 'moderate', type: 'pharmacodynamic', description: 'Increased bleeding risk (impaired platelet function plus antiplatelet).', recommendation: 'Monitor for bleeding; consider gastroprotection.' },
  { a: 'maoi', b: 'ssri_snri', severity: 'critical', type: 'contraindication', description: 'Risk of serotonin syndrome (potentially fatal).', recommendation: 'Contraindicated; observe washout (>=2 weeks; 5 weeks after fluoxetine).' },
  { a: 'nitrate', b: 'pde5', severity: 'critical', type: 'contraindication', description: 'Profound, potentially fatal hypotension.', recommendation: 'Contraindicated combination.' },
  { a: 'ace_arb', b: 'potassium_sparing', severity: 'major', type: 'pharmacodynamic', description: 'Risk of life-threatening hyperkalemia.', recommendation: 'Monitor potassium and renal function; avoid in renal impairment.' },
  { a: 'statin_cyp3a4', b: 'strong_cyp3a4_inhibitor', severity: 'major', type: 'pharmacokinetic', description: 'Elevated statin levels -> myopathy/rhabdomyolysis.', recommendation: 'Avoid; hold the statin or use a non-CYP3A4 statin during therapy.' },
  { a: 'digoxin', b: 'digoxin_potentiator', severity: 'major', type: 'pharmacokinetic', description: 'Increased digoxin levels -> toxicity.', recommendation: 'Reduce digoxin dose and monitor levels.' },
  { a: 'methotrexate', b: 'nsaid', severity: 'major', type: 'pharmacokinetic', description: 'Reduced methotrexate clearance -> toxicity.', recommendation: 'Avoid NSAIDs (esp. with higher-dose MTX); monitor.' },
  { a: 'methotrexate', b: 'mtx_potentiator', severity: 'major', type: 'pharmacokinetic', description: 'Increased methotrexate toxicity / myelosuppression.', recommendation: 'Avoid trimethoprim-sulfamethoxazole with methotrexate.' },
  { a: 'opioid', b: 'benzodiazepine', severity: 'major', type: 'pharmacodynamic', description: 'Additive CNS/respiratory depression (FDA boxed warning).', recommendation: 'Avoid co-prescribing; if necessary use lowest doses and monitor.' },
  { a: 'allopurinol', b: 'thiopurine', severity: 'major', type: 'pharmacokinetic', description: 'Severe myelosuppression.', recommendation: 'Avoid, or reduce thiopurine dose by ~75% with close monitoring.' },
  { a: 'lithium', b: 'nsaid', severity: 'major', type: 'pharmacokinetic', description: 'Reduced lithium clearance -> toxicity.', recommendation: 'Avoid NSAIDs; monitor lithium levels.' },
  { a: 'lithium', b: 'ace_arb', severity: 'major', type: 'pharmacokinetic', description: 'Reduced lithium clearance -> toxicity.', recommendation: 'Monitor lithium levels closely.' },
  { a: 'warfarin', b: 'warfarin_potentiator', severity: 'major', type: 'pharmacokinetic', description: 'Raises INR / bleeding risk (CYP / protein-binding interaction).', recommendation: 'Monitor INR closely and adjust the warfarin dose.' },
  { a: 'warfarin', b: 'ssri_snri', severity: 'major', type: 'pharmacodynamic', description: 'Additive bleeding risk (impaired platelet function).', recommendation: 'Monitor for bleeding; consider gastroprotection.' },
  { a: 'ssri_snri', b: 'nsaid', severity: 'moderate', type: 'pharmacodynamic', description: 'Increased GI bleeding risk.', recommendation: 'Use gastroprotection; monitor for bleeding.' },
  { a: 'statin_any', b: 'fibrate', severity: 'major', type: 'pharmacodynamic', description: 'Increased myopathy/rhabdomyolysis risk (esp. gemfibrozil).', recommendation: 'Avoid gemfibrozil with statins; if a fibrate is needed prefer fenofibrate with monitoring.' },
  { a: 'ssri_snri', b: 'triptan', severity: 'moderate', type: 'pharmacodynamic', description: 'Serotonin syndrome risk.', recommendation: 'Monitor for serotonin toxicity and counsel the patient.' },
  { a: 'maoi', b: 'triptan', severity: 'major', type: 'pharmacodynamic', description: 'Serotonin syndrome risk.', recommendation: 'Avoid the combination.' },
  { a: 'clopidogrel', b: 'cyp2c19_inhibitor', severity: 'moderate', type: 'pharmacokinetic', description: 'Reduced activation of clopidogrel -> decreased antiplatelet effect.', recommendation: 'Avoid CYP2C19 inhibitors with clopidogrel where possible (e.g., use pantoprazole instead of omeprazole/esomeprazole; reassess concurrent fluconazole).' },
];
function ddiGroupsFor(name: string): string[] {
  const n = String(name || '').toLowerCase();
  // Token/whole-phrase match so a fragment matches only as a whole word (or whole
  // multi-word phrase), not an arbitrary substring (e.g. 'nitrate' in 'mononitrate').
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenSet = new Set(tokens);
  const matchesFragment = (f: string): boolean => {
    if (f.includes(' ')) {
      const words = f.split(/\s+/).filter(Boolean);
      for (let i = 0; i + words.length <= tokens.length; i++) {
        if (words.every((w, k) => tokens[i + k] === w)) return true;
      }
      return false;
    }
    return tokenSet.has(f);
  };
  const out: string[] = [];
  for (const [group, fragments] of Object.entries(DDI_GROUPS)) {
    if (fragments.some(matchesFragment)) out.push(group);
  }
  return out;
}
function findDeterministicInteractions(medications: any[]): any[] {
  const meds = (medications || []).map((m) => ({ name: m?.medication_name || m?.name || '' })).filter((m) => m.name);
  const memberGroups = meds.map((m) => new Set(ddiGroupsFor(m.name)));
  const results: any[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      for (const rule of DDI_RULES) {
        const iA = memberGroups[i].has(rule.a) && memberGroups[j].has(rule.b);
        const iB = memberGroups[i].has(rule.b) && memberGroups[j].has(rule.a);
        if (!iA && !iB) continue;
        const key = `${rule.a}|${rule.b}|${i}-${j}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          drug_a: meds[i].name, drug_b: meds[j].name, severity: rule.severity,
          interaction_type: rule.type, description: rule.description, clinical_significance: rule.description,
          recommendation: rule.recommendation, monitoring_required: true,
          requires_intervention: rule.severity === 'critical' || rule.severity === 'major',
          source: 'deterministic', verified: true,
        });
      }
    }
  }
  return results;
}
function mergeInteractions(aiInteractions: any[], deterministic: any[]): any[] {
  const norm = (s: any) => String(s || '').toLowerCase().trim();
  const pairKey = (x: any) => [norm(x.drug_a), norm(x.drug_b)].sort().join('|');
  const detKeys = new Set(deterministic.map(pairKey));
  const aiTagged = (aiInteractions || [])
    .filter((x: any) => !detKeys.has(pairKey(x)))
    .map((x: any) => ({ ...x, source: x.source || 'ai_suggested', verified: false }));
  return [...deterministic, ...aiTagged];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { medications } = await req.json();

    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return Response.json({
        error: 'At least 2 medications required for interaction check'
      }, { status: 400 });
    }

    // Use FDA API for drug interaction checking
    const fdaApiUrl = 'https://api.fda.gov/drug/drugsfda.json';

    // Build medication list for analysis
    const medList = medications.map(m => ({
      name: m.medication_name || m.name,
      dosage: m.dosage,
      frequency: m.frequency
    }));

    // Query FDA for each drug
    const drugData = await Promise.all(
      medList.map(async (med) => {
        try {
          const searchName = encodeURIComponent(med.name.split(' ')[0]); // Use first word for generic search
          const response = await fetch(
            `${fdaApiUrl}?search=openfda.brand_name:"${searchName}"&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            return {
              medication: med.name,
              found: true,
              data: data.results?.[0] || null
            };
          }
          return { medication: med.name, found: false, data: null };
        } catch {
          return { medication: med.name, found: false, data: null };
        }
      })
    );

    // Use AI to analyze drug interactions based on medication names and known interactions
    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a clinical pharmacist AI assistant. Analyze the following medications for potential drug-drug interactions, contraindications, and safety concerns.

Medications:
${medList.map((m, i) => `${i + 1}. ${m.name} - ${m.dosage} ${m.frequency}`).join('\n')}

FDA Drug Data (if available):
${JSON.stringify(drugData, null, 2)}

Analyze and identify:
1. Direct drug-drug interactions (moderate to severe)
2. Duplicate therapy concerns
3. Dosing concerns based on combinations
4. Clinical significance of each interaction
5. Specific recommendations for each interaction found

Provide detailed, clinically actionable information.`,
      response_json_schema: {
        type: "object",
        properties: {
          interactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                drug_a: { type: "string" },
                drug_b: { type: "string" },
                severity: {
                  type: "string",
                  enum: ["critical", "major", "moderate", "minor"]
                },
                interaction_type: {
                  type: "string",
                  enum: ["pharmacodynamic", "pharmacokinetic", "duplicate_therapy", "contraindication", "dose_adjustment"]
                },
                description: { type: "string" },
                clinical_significance: { type: "string" },
                recommendation: { type: "string" },
                monitoring_required: { type: "boolean" },
                requires_intervention: { type: "boolean" }
              }
            }
          },
          overall_risk_level: {
            type: "string",
            enum: ["critical", "high", "moderate", "low"]
          },
          summary: { type: "string" },
          immediate_actions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Deterministic safety net: surface well-established high-severity
    // interactions even if the model missed them, and tag AI-only findings
    // honestly as unverified (the previous code always claimed verified:true
    // without doing any real external verification).
    const deterministic = findDeterministicInteractions(medList);
    const mergedInteractions = mergeInteractions(aiAnalysis.interactions || [], deterministic);

    // Escalate the overall risk if a deterministic interaction is more severe
    // than the model's assessment.
    const severities = mergedInteractions.map((i) => i.severity);
    const overallRisk = severities.includes('critical') ? 'critical'
      : severities.includes('major') ? 'high'
      : severities.includes('moderate') ? 'moderate'
      : (aiAnalysis.overall_risk_level || 'low');

    return Response.json({
      success: true,
      interactions: mergedInteractions,
      overall_risk_level: overallRisk,
      summary: aiAnalysis.summary,
      immediate_actions: aiAnalysis.immediate_actions || [],
      total_interactions: mergedInteractions.length,
      critical_count: mergedInteractions.filter((i) => i.severity === 'critical').length,
      major_count: mergedInteractions.filter((i) => i.severity === 'major').length,
      deterministic_count: deterministic.length,
      medications_analyzed: medications.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Drug interaction check error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
