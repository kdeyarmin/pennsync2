/**
 * smsUtils — SMS length / segment accounting for the compose UIs.
 *
 * SMS messages are billed and split by *segment*, not by character: GSM-7 text
 * fits 160 chars in one segment (153 per segment once concatenated), while any
 * non-GSM character forces UCS-2 encoding at 70/67. Showing this to the nurse
 * avoids surprise multi-part texts and accidental Unicode bloat from a single
 * emoji. Unit-tested; no UI dependency.
 */

// Characters encodable in a single GSM-7 unit.
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// GSM-7 extension characters — each costs two units (escape + char).
const GSM7_EXTENDED = "^{}\\[~]|€";

function isGsm7(text) {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXTENDED.includes(ch)) return false;
  }
  return true;
}

/**
 * Account a draft message. Returns the billed unit count, segment count, the
 * encoding, the per-segment capacity, and characters left in the current
 * segment plan.
 */
export function smsSegments(text) {
  const str = text || "";
  const gsm = isGsm7(str);
  const encoding = gsm ? "GSM-7" : "UCS-2";
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;

  let units = 0;
  if (gsm) {
    for (const ch of str) units += GSM7_EXTENDED.includes(ch) ? 2 : 1;
  } else {
    // UCS-2 bills per UTF-16 code unit, so astral chars (emoji) cost two.
    for (const ch of str) units += ch.codePointAt(0) > 0xffff ? 2 : 1;
  }

  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  const capacity = segments <= 1 ? single : segments * multi;
  return {
    chars: units,
    segments,
    encoding,
    perSegment: segments <= 1 ? single : multi,
    remaining: capacity - units,
  };
}
