import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { AccessToken } from 'npm:twilio@5.4.0/lib/jwt/AccessToken.js';
import VideoGrant from 'npm:twilio@5.4.0/lib/jwt/AccessToken.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { room_name, identity } = await req.json();
    if (!room_name) return Response.json({ error: 'room_name is required' }, { status: 400 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!accountSid || !apiKey || !apiSecret) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const participantIdentity = identity || user.full_name || user.email;

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

    const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

    return Response.json({ token, identity: participantIdentity, room_name });
  } catch (error) {
    console.error('createTelehealthToken error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});