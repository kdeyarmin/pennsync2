/**
 * phoneAnalytics — pure aggregation for the admin phone/SMS analytics panel.
 *
 * Turns raw SmsMessage / CallLog / SmsConsent / User rows into the summary the
 * dashboard renders. Kept pure and unit-tested (no entity/network access) so
 * the math is verifiable in isolation, like the other *Utils modules.
 */

const last10 = (raw) => String(raw || "").replace(/[^\d]/g, "").slice(-10);
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** Keep only rows created on/after `sinceDays` ago (0/undefined => all rows). */
function withinWindow(rows, sinceDays) {
  if (!sinceDays || sinceDays <= 0) return rows;
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  return rows.filter((r) => {
    const t = new Date(r?.created_date).getTime();
    return Number.isNaN(t) ? true : t >= cutoff;
  });
}

/**
 * Summarize phone/SMS activity.
 *
 * @param {object} input
 * @param {Array} [input.smsMessages]
 * @param {Array} [input.callLogs]
 * @param {Array} [input.consents]  latest-first consent ledger rows
 * @param {Array} [input.users]
 * @param {number} [input.sinceDays] window in days (0/undefined => all time)
 */
export function summarizePhoneActivity({ smsMessages = [], callLogs = [], consents = [], users = [], sinceDays = 0 } = {}) {
  const sms = withinWindow(smsMessages, sinceDays);
  const calls = withinWindow(callLogs, sinceDays);

  // --- SMS ---
  const outbound = sms.filter((m) => m.direction === "outbound");
  const inbound = sms.filter((m) => m.direction === "inbound");
  const delivered = outbound.filter((m) => m.status === "delivered").length;
  const failed = outbound.filter((m) => m.status === "failed").length;
  const smsStats = {
    total: sms.length,
    inbound: inbound.length,
    outbound: outbound.length,
    delivered,
    failed,
    deliveryRate: pct(delivered, outbound.length),
    failureRate: pct(failed, outbound.length),
  };

  // --- Calls ---
  const inboundCalls = calls.filter((c) => c.direction === "inbound");
  const outboundCalls = calls.filter((c) => c.direction === "outbound");
  const missed = calls.filter((c) => c.status === "no_answer" || c.status === "failed").length;
  const completed = calls.filter((c) => c.status === "completed" || c.status === "bridged").length;
  const durations = calls.map((c) => Number(c.duration_seconds)).filter((n) => Number.isFinite(n) && n > 0);
  const avgDurationSec = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const callStats = {
    total: calls.length,
    inbound: inboundCalls.length,
    outbound: outboundCalls.length,
    missed,
    completed,
    missedRate: pct(missed, calls.length),
    avgDurationSec,
  };

  // --- Consent (latest status per phone; ledger assumed newest-first) ---
  const latestByPhone = {};
  for (const c of consents) {
    const k = last10(c.phone_e164);
    if (k && !(k in latestByPhone)) latestByPhone[k] = c.consent_status;
  }
  const statuses = Object.values(latestByPhone);
  const consentStats = {
    optedIn: statuses.filter((s) => s === "opted_in").length,
    optedOut: statuses.filter((s) => s === "opted_out").length,
    tracked: statuses.length,
  };

  // --- Provisioning coverage ---
  const withWork = users.filter((u) => u.work_phone_number);
  const fullyProvisioned = withWork.filter((u) => u.personal_cell_e164);
  const provisioning = {
    totalUsers: users.length,
    withWorkNumber: withWork.length,
    fullyProvisioned: fullyProvisioned.length,
    coverageRate: pct(withWork.length, users.length),
  };

  return { sms: smsStats, calls: callStats, consent: consentStats, provisioning };
}

/** Format a seconds count as m:ss for display. */
export function formatDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
