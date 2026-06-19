import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// A guest invite link (capability URL) is otherwise valid for as long as the
// session stays scheduled/active, so a forgotten or leaked link would grant
// audio/video access indefinitely. Bound the guest capability in time as well:
// reject joins more than this long past the scheduled start. 12h is generous
// enough to cover a full clinical day of early/late joins and reconnects while
// still expiring a stale link the same day. Staff joins are unaffected.
const GUEST_JOIN_WINDOW_MS = 12 * 60 * 60 * 1000;

// Constant-time comparison so the per-session join token can't be recovered
// via response-timing analysis.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// The patient's capability token lives in the session's invite link (?t=...),
// so guest joins need no extra entity field.
function extractJoinToken(inviteLink) {
  if (!inviteLink || typeof inviteLink !== 'string') return '';
  try {
    return new URL(inviteLink).searchParams.get('t') || '';
  } catch {
    const match = inviteLink.match(/[?&]t=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { room_name, join_token } = await req.json();
    if (!room_name) return Response.json({ error: 'room_name is required' }, { status: 400 });

    // Service-role lookup so we can authorize the caller before minting any
    // audio/video grant for this room.
    const sessions = await base44.asServiceRole.entities.TelehealthSession.filter({ room_name }, '-created_date', 1);
    const session = sessions[0];
    if (!session) return Response.json({ error: 'Telehealth session not found' }, { status: 404 });

    let participantIdentity;

    if (join_token) {
      // PATIENT (guest) path. Access is granted by possession of the
      // high-entropy, per-session token carried in the private invite link — a
      // capability URL. This is deliberately NOT the old IDOR (where any
      // authenticated user could join any room by name): the token is
      // unguessable, scoped to a single session, and stops working once the
      // visit is completed or cancelled. The identity is taken from the session
      // (server-controlled) so a guest cannot impersonate the clinician.
      const expected = extractJoinToken(session.invite_link);
      if (!expected || !timingSafeEqual(String(join_token), expected)) {
        return Response.json({ error: 'Invalid or expired join link' }, { status: 403 });
      }
      if (session.status !== 'scheduled' && session.status !== 'active') {
        return Response.json({ error: 'This telehealth visit is no longer open' }, { status: 403 });
      }
      // Time-bound the capability token so a leaked/forgotten invite link can't
      // grant A/V access indefinitely. Fail open when scheduled_at is absent,
      // consistent with the rest of the codebase's "unknown → allow" convention.
      const scheduledAtMs = session.scheduled_at ? Date.parse(session.scheduled_at) : NaN;
      if (Number.isFinite(scheduledAtMs) && Date.now() - scheduledAtMs > GUEST_JOIN_WINDOW_MS) {
        return Response.json({ error: 'This telehealth invite link has expired' }, { status: 403 });
      }
      participantIdentity = session.patient_name || 'Patient';
    } else {
      // STAFF path. Only the authenticated host, a listed participant, or an
      // admin may mint a grant — otherwise any authenticated user could join
      // another patient's live A/V session (PHI breach).
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const participants = Array.isArray(session.participant_list) ? session.participant_list : [];
      const authorized = user.role === 'admin'
        || session.host_email === user.email
        || participants.includes(user.email)
        || (user.full_name && participants.includes(user.full_name));
      if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });
      participantIdentity = user.full_name || user.email;
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!accountSid || !apiKey || !apiSecret) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // Generate token via Twilio REST API
    const tokenUrl = `https://iam.twilio.com/v1/Accounts/${accountSid}/Tokens`;
    const credentials = btoa(`${apiKey}:${apiSecret}`);

    const formBody = new URLSearchParams();
    formBody.append('identity', participantIdentity);
    formBody.append('ttl', '3600');

    // Use Twilio's REST API to create a Video Grant token
    // Build JWT manually since we're in Deno
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
    const payload = {
      jti: `${apiKey}-${now}`,
      iss: apiKey,
      sub: accountSid,
      exp,
      grants: {
        identity: participantIdentity,
        video: { room: room_name }
      }
    };

    // UTF-8 safe base64url: btoa() throws on non-Latin1 characters, so a
    // participant name with an accent/non-Latin script (e.g. "José") would
    // crash token minting (500) and block their telehealth join. Encode the
    // JSON as UTF-8 bytes first.
    const encode = (obj) => {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const token = `${signingInput}.${sigB64}`;

    return Response.json({ token, identity: participantIdentity, room_name, host_name: session.host_name || null });
  } catch (error) {
    console.error('createTelehealthToken error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
