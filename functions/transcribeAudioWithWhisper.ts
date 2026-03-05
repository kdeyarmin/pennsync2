import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { audioData, mimeType = 'audio/webm' } = body;

    if (!audioData) {
      return Response.json({ error: 'Audio data required' }, { status: 400 });
    }

    // Convert base64 audio to binary
    const binaryData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([binaryData], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('prompt', 'This is a clinical nursing observation. Use medical terminology and be concise.');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.json();
      console.error('Whisper API error:', error);
      return Response.json(
        { error: 'Transcription failed', details: error.error?.message },
        { status: whisperResponse.status }
      );
    }

    const result = await whisperResponse.json();

    // Log the transcription for audit
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'voice_transcription',
      details: {
        transcription_length: result.text.length,
        timestamp: new Date().toISOString(),
      },
      page: 'voice_transcription',
      user_agent: req.headers.get('user-agent'),
    }).catch(err => console.error('Activity logging failed:', err));

    return Response.json({
      success: true,
      text: result.text,
      confidence: result.text ? 1.0 : 0, // Whisper doesn't return confidence
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json(
      { error: 'Transcription service error', details: error.message },
      { status: 500 }
    );
  }
});