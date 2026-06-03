// The ONLY place the LLM touches the note. It acts as a constrained scribe:
// it may re-voice the nurse's own words + answers into a compliant narrative,
// but may not introduce any clinical fact. A second "grounding" pass classifies
// each output sentence as supported/unsupported by the source.
//
// Vite-only module (depends on the base44 client), so it is exercised by the
// build + manual testing rather than the node unit-test suite.
import { base44 } from "@/api/base44Client";
import { secureAICall } from "@/components/utils/security";
import { splitSentences } from "./factExtraction";
import { GenerationResponse, GroundingResponse, safeParseLLM } from "./schemas";

const DEFAULT_MODEL = "claude_sonnet_4_6";

function buildSourceBlock({ draftSentences = [], answers = [], confirmedNegatives = [] }) {
  const draft = draftSentences.length ? draftSentences.map((s) => `- ${s}`).join("\n") : "(none)";
  const ans = answers.length
    ? answers.map((a) => `- Q: ${a.label} -> A: ${a.text}`).join("\n")
    : "(none)";
  const neg = confirmedNegatives.length ? confirmedNegatives.map((n) => `- ${n}`).join("\n") : "(none)";
  return { draft, ans, neg };
}

/**
 * Generate the final note from ONLY the nurse's own material.
 * @returns {Promise<{ note: string }>}
 * @throws if the LLM response fails schema validation
 */
export async function generateConstrainedNote(inputs, { userKey, model = DEFAULT_MODEL } = {}) {
  const { draft, ans, neg } = buildSourceBlock(inputs);
  const prompt = `You are a clinical scribe producing ONE Medicare-compliant home health nursing note.

ABSOLUTE RULES (a violation makes the note unusable):
- Use ONLY the material in the three sections below. Add NO clinical fact, value,
  measurement, vital sign, finding, diagnosis, medication, or recommendation that
  is not present in that material.
- You MAY ONLY: reorder into a logical flow (assessment -> interventions ->
  patient response -> education -> plan), convert to professional past tense,
  fix grammar, and connect fragments into complete sentences.
- Do NOT invent vitals. Do NOT infer a homebound rationale. Do NOT add teach-back,
  negatives, or normals that are not stated below.
- If a section is "(none)", simply omit that content; do not fabricate it.

NURSE-WRITTEN OBSERVATIONS:
${draft}

NURSE ANSWERS TO REQUIRED-ELEMENT QUESTIONS:
${ans}

CONFIRMED STANDARD NEGATIVES (include these verbatim in meaning):
${neg}

Return JSON: { "note": "<the final note text>" }`;

  const raw = await secureAICall(
    () =>
      base44.integrations.Core.InvokeLLM({
        prompt,
        model,
        response_json_schema: {
          type: "object",
          properties: { note: { type: "string" } },
          required: ["note"],
        },
      }),
    userKey
  );

  const parsed = safeParseLLM(GenerationResponse, raw);
  if (!parsed.ok) throw new Error(`Note generation failed: ${parsed.error}`);
  return parsed.data;
}

/**
 * Grounding pass: classify each output sentence as supported/unsupported by the
 * source. Reorganization, tense, and grammar do NOT make a sentence unsupported.
 * @returns {Promise<{ ok: boolean, unsupported: Array, sentences: Array, error?: string }>}
 */
export async function groundNote(outputText, sourceText, { userKey, model = DEFAULT_MODEL } = {}) {
  const numbered = splitSentences(outputText)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const prompt = `Classify each sentence of the OUTPUT note as "supported" or "unsupported" by the SOURCE.

- "supported": every clinical fact/value/finding in the sentence is present in the
  SOURCE (a nurse-written observation, a nurse answer, or a confirmed negative).
- "unsupported": the sentence introduces any fact/value/finding NOT in the SOURCE.
- Reorganization, past-tense conversion, and grammar fixes do NOT make a sentence
  unsupported. Generic connective phrasing with no new clinical content is "supported".

SOURCE:
${sourceText}

OUTPUT (one sentence per line):
${numbered}

Return JSON: { "sentences": [ { "text": "...", "status": "supported"|"unsupported", "source": "draft"|"answer"|"negative"|"none" } ] }`;

  try {
    const raw = await secureAICall(
      () =>
        base44.integrations.Core.InvokeLLM({
          prompt,
          model,
          response_json_schema: {
            type: "object",
            properties: {
              sentences: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    status: { type: "string" },
                    source: { type: "string" },
                  },
                },
              },
            },
          },
        }),
      userKey
    );

    const parsed = safeParseLLM(GroundingResponse, raw);
    if (!parsed.ok) return { ok: false, unsupported: [], sentences: [], error: parsed.error };
    const unsupported = parsed.data.sentences.filter((s) => s.status === "unsupported");
    return { ok: unsupported.length === 0, unsupported, sentences: parsed.data.sentences };
  } catch (err) {
    return { ok: false, unsupported: [], sentences: [], error: err?.message || "Grounding check failed" };
  }
}
