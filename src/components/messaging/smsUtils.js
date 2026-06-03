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

  const costOf = (ch) =>
    gsm
      ? GSM7_EXTENDED.includes(ch) ? 2 : 1
      // UCS-2 bills per UTF-16 code unit, so astral chars (emoji) cost two.
      : ch.codePointAt(0) > 0xffff ? 2 : 1;

  let units = 0;
  for (const ch of str) units += costOf(ch);

  // A 2-unit char (GSM-7 escape pair / surrogate pair) can't be split across a
  // segment boundary: if it doesn't fit in the current segment it pads it and
  // moves whole to the next. So simulate packing rather than dividing units,
  // which would otherwise undercount segments at the boundary.
  let segments;
  if (units === 0) {
    segments = 0;
  } else if (units <= single) {
    segments = 1;
  } else {
    segments = 1;
    let used = 0;
    for (const ch of str) {
      const cost = costOf(ch);
      if (used + cost > multi) {
        segments += 1;
        used = 0;
      }
      used += cost;
    }
  }
  const capacity = segments <= 1 ? single : segments * multi;
  return {
    chars: units,
    segments,
    encoding,
    perSegment: segments <= 1 ? single : multi,
    remaining: capacity - units,
  };
}
