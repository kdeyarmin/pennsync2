import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * submitTimeOffRequest — create a time-off request on behalf of the
 * authenticated caller.
 *
 * Security: the requester's identity (employee_email / created_by) is taken
 * from the verified session, never the request body, so a user cannot file a
 * request for someone else. Dates, type, and the chosen approver are validated
 * server-side, and the row is written with the service role because the
 * TimeOffRequest entity's RLS limits direct writes to admins.
 */

const VALID_TYPES = ['vacation', 'sick', 'personal', 'bereavement', 'jury_duty', 'parental', 'unpaid', 'other'];

function parseISODate(value) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  // Reject overflow dates like 2026-02-31 that JS would silently roll forward.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function businessDaysBetween(start, end) {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s || !e || e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function totalRequestedDays(start, end, halfDay) {
  const business = businessDaysBetween(start, end);
  if (business === 0) return 0;
  return halfDay ? Math.max(0.5, business - 0.5) : business;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = parseISODate(aStart);
  const ae = parseISODate(aEnd);
  const bs = parseISODate(bStart);
  const be = parseISODate(bEnd);
  if (!as || !ae || !bs || !be) return false;
  return as <= be && bs <= ae;
}

// Authoritative copy of the client-side policy check (getPolicyViolation).
function getPolicyViolation(start, end, policy) {
  const s = parseISODate(start);
  if (!policy || !s) return null;
  const notice = Number(policy.minimum_notice_days) || 0;
  if (notice > 0) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const earliest = new Date(today);
    earliest.setDate(earliest.getDate() + notice);
    if (s < earliest) {
      return `Time off requires at least ${notice} day${notice === 1 ? '' : 's'} of advance notice.`;
    }
  }
  const periods = Array.isArray(policy.blackout_periods) ? policy.blackout_periods : [];
  for (const p of periods) {
    if (p && rangesOverlap(start, end, p.start_date, p.end_date)) {
      return `Your selected dates fall within a blackout period${p.label ? ` (${p.label})` : ''}.`;
    }
  }
  return null;
}

const BALANCE_TRACKABLE_TYPES = ['vacation', 'sick', 'personal', 'parental'];

// Merge agency default allowances with a user's per-user overrides.
function resolveAllowances(policy, user) {
  const defaults = (policy && policy.default_allowances) || {};
  const overrides = (user && user.pto_allowances) || {};
  const merged = {};
  for (const type of BALANCE_TRACKABLE_TYPES) {
    const raw = overrides[type] != null && overrides[type] !== '' ? overrides[type] : defaults[type];
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) merged[type] = n;
    }
  }
  return merged;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      request_type = 'vacation',
      start_date,
      end_date,
      half_day = false,
      reason = '',
      coverage = '',
      manager_email = '',
    } = body || {};

    if (!VALID_TYPES.includes(request_type)) {
      return Response.json({ error: 'Invalid request type.' }, { status: 400 });
    }

    const start = parseISODate(start_date);
    const end = parseISODate(end_date);
    if (!start || !end) {
      return Response.json({ error: 'Valid start and end dates are required.' }, { status: 400 });
    }
    if (end < start) {
      return Response.json({ error: 'The end date cannot be before the start date.' }, { status: 400 });
    }

    const total = totalRequestedDays(start_date, end_date, !!half_day);
    if (total <= 0) {
      return Response.json({ error: 'The selected range contains no working days.' }, { status: 400 });
    }

    // Enforce agency policy (minimum notice + blackout periods) authoritatively.
    const policies = await base44.asServiceRole.entities.TimeOffPolicy.list('-created_date', 1).catch(() => []);
    const policy = policies && policies[0];
    const policyViolation = getPolicyViolation(start_date, end_date, policy);
    if (policyViolation) {
      return Response.json({ error: policyViolation }, { status: 400 });
    }

    // Enforce the annual balance for tracked leave types (defaults + per-user
    // overrides). Computed against the start date's calendar year.
    const allowances = resolveAllowances(policy, user);
    if (request_type in allowances) {
      const year = start.getFullYear();
      const existing = await base44.asServiceRole.entities.TimeOffRequest
        .filter({ employee_email: user.email, request_type })
        .catch(() => []);
      const usedPending = (existing || []).reduce((sum, r) => {
        if (!['approved', 'pending'].includes(r.status)) return sum;
        const es = parseISODate(r.start_date);
        if (!es || es.getFullYear() !== year) return sum;
        return sum + (Number(r.total_days) || totalRequestedDays(r.start_date, r.end_date, r.half_day));
      }, 0);
      // Effective allowance: accrued portion (if accrual is on) + carryover.
      const base = Number(allowances[request_type]) || 0;
      const nowYear = new Date().getFullYear();
      const fraction = year === nowYear ? (new Date().getMonth() + 1) / 12 : 1;
      const accrued = policy && policy.accrual_enabled ? Math.round(base * fraction) : base;
      const carryMax = Number(policy && policy.carryover_max) || 0;
      let carryover = 0;
      if (carryMax > 0) {
        const prevUsed = (existing || []).reduce((sum, r) => {
          if (r.status !== 'approved') return sum;
          const es = parseISODate(r.start_date);
          if (!es || es.getFullYear() !== year - 1) return sum;
          return sum + (Number(r.total_days) || totalRequestedDays(r.start_date, r.end_date, r.half_day));
        }, 0);
        carryover = Math.max(0, Math.min(carryMax, base - prevUsed));
      }
      const allowance = accrued + carryover;
      if (usedPending + total > allowance) {
        const remaining = Math.max(0, allowance - usedPending);
        return Response.json(
          { error: `This exceeds the ${request_type.replace(/_/g, ' ')} allowance — ${remaining} of ${allowance} day(s) available this year.` },
          { status: 400 }
        );
      }
    }

    // Validate the chosen approver: must be an admin or a flagged manager, and
    // can never be the requester themselves (that would enable self-approval).
    let resolvedManagerEmail = '';
    let resolvedManagerName = '';
    if (manager_email) {
      if (manager_email === user.email) {
        return Response.json({ error: 'You cannot assign yourself as your own approver.' }, { status: 400 });
      }
      const matches = await base44.asServiceRole.entities.User.filter({ email: manager_email });
      const mgr = matches && matches[0];
      if (!mgr || !(mgr.role === 'admin' || mgr.is_manager === true)) {
        return Response.json({ error: 'The selected approver is not authorized to approve time off.' }, { status: 400 });
      }
      resolvedManagerEmail = mgr.email;
      resolvedManagerName = mgr.full_name || mgr.email;
    }

    const created = await base44.asServiceRole.entities.TimeOffRequest.create({
      employee_email: user.email,
      employee_name: user.full_name || user.email,
      manager_email: resolvedManagerEmail,
      manager_name: resolvedManagerName,
      request_type,
      start_date,
      end_date,
      half_day: !!half_day,
      total_days: total,
      reason: String(reason || '').slice(0, 2000),
      coverage: String(coverage || '').slice(0, 2000),
      status: 'pending',
    });

    // Notify the approver(s) — a designated manager directly, otherwise admins
    // so unassigned requests still surface. Best-effort: never fail the request.
    try {
      let recipients = [];
      if (resolvedManagerEmail) {
        recipients = [{ email: resolvedManagerEmail }];
      } else {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
        recipients = users.filter((u) => u.role === 'admin' && u.email);
      }
      const requesterName = user.full_name || user.email;
      const prettyType = request_type.replace(/_/g, ' ');
      const summary = `${total} day(s) of ${prettyType} (${start_date} → ${end_date})`;
      await Promise.all(
        recipients.map((r) =>
          base44.asServiceRole.entities.Notification.create({
            user_email: r.email,
            title: 'New time-off request',
            message: `${requesterName} requested ${summary}.`,
            type: 'info',
            priority: 'medium',
            action_url: '/TimeOff',
            action_label: 'Review request',
            metadata: { time_off_request_id: created.id, employee_email: user.email },
          })
        )
      );
      // Email the approver(s) in addition to the in-app notification.
      await Promise.all(
        recipients.map((r) =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: r.email,
            from_name: 'Penn Sync Time Off',
            subject: `Time-off request from ${requesterName}`,
            body: `${requesterName} has requested time off and needs your review.\n\n` +
              `Type: ${prettyType}\nDates: ${start_date} → ${end_date}\nBusiness days: ${total}\n` +
              `${reason ? `Reason: ${reason}\n` : ''}${coverage ? `Coverage: ${coverage}\n` : ''}` +
              `\nReview it in Penn Sync under Time Off → Approvals.`,
          }).catch(() => null)
        )
      );
    } catch (_notifyError) {
      // Notifications/emails are best-effort; the dashboard remains the source of truth.
    }

    return Response.json({ success: true, request: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
