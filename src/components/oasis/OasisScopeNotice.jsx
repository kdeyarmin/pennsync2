import { Info } from "lucide-react";
import { ACTIVE_OASIS_SPEC } from "./specs/registry.js";
import { clinicalReviewStatus } from "./specs/verification.js";

/**
 * The standing scope statement for every OASIS surface.
 *
 * PennSync is NOT the official OASIS completion or submission system — the
 * agency completes and submits OASIS in its EMR / iQIES. PennSync reviews,
 * explains and cross-checks what staff entered there. This notice is deliberately
 * always visible rather than tucked behind a disclosure: it is the sentence that
 * stops the OASIS Center reading as the official assessment.
 *
 * It also states the version PennSync's guidance is patterned after, that
 * PennSync's internal item set is abbreviated, and how much of that set a
 * qualified OASIS reviewer has actually signed off — so no one mistakes a
 * screening question for the CMS instrument, and the sign-off gap is visible
 * in the product rather than only in a document.
 */
export default function OasisScopeNotice({ className = "" }) {
  const review = clinicalReviewStatus();
  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2.5 text-xs text-navy-900 ${className}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-600" aria-hidden="true" />
      <div className="space-y-1">
        <p>
          <strong>PennSync assists with OASIS review — it is not the official assessment.</strong>{" "}
          Complete and submit the official OASIS in your agency&apos;s EMR. Nothing here is
          transmitted to CMS or iQIES.
        </p>
        <p className="text-navy-700">
          Guidance is patterned after <strong>{ACTIVE_OASIS_SPEC.label}</strong> (effective{" "}
          {ACTIVE_OASIS_SPEC.effective_date}). PennSync&apos;s internal item set is abbreviated and
          is not the CMS instrument — confirm item wording and response sets in your EMR.
        </p>
        {/* The sign-off gap belongs on screen, not only in an audit document:
            a classification nobody qualified has confirmed must not read as
            settled just because it is rendered confidently. */}
        {!review.complete && (
          <p className="text-navy-700">
            <strong>
              {review.pending} of {review.total} items
            </strong>{" "}
            have not been reviewed by a qualified OASIS reviewer.
          </p>
        )}
      </div>
    </div>
  );
}
