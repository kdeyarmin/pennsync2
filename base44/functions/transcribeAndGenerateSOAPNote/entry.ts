import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Construct the OpenAI client inside the handler — module-level init
        // crashes boot if the secret is missing (no try/catch reached, no logs).
        const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

        const payload = await req.json();
        const { audio_base64, mime_type } = payload;
        
        if (!audio_base64) {
             return Response.json({ error: 'No audio provided' }, { status: 400 });
        }

        // Convert base64 to File object for OpenAI
        const binaryString = atob(audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // determine extension
        let ext = "webm";
        if (mime_type && mime_type.includes("mp4")) ext = "mp4";
        if (mime_type && mime_type.includes("wav")) ext = "wav";

        const file = new File([bytes], `audio.${ext}`, { type: mime_type || "audio/webm" });

        // 1. Transcribe audio using gpt-4o-transcribe
        const transcriptionResponse = await openai.audio.transcriptions.create({
            file: file,
            model: "gpt-4o-transcribe",
            response_format: "text",
        });

        const transcript = transcriptionResponse;

        // 2. Generate SOAP note using gpt-5.5
        const soapResponse = await openai.chat.completions.create({
            model: "gpt-5.5",
            messages: [
                {
                    role: "system",
                    content: "You are an expert clinical documentation assistant. Extract information from the provided transcript and generate a structured SOAP note (Subjective, Objective, Assessment, Plan). Return a JSON object with keys: subjective, objective, assessment, plan."
                },
                {
                    role: "user",
                    content: `Please generate a SOAP note from the following transcript:\n\n${transcript}`
                }
            ],
            response_format: { type: "json_object" }
        });

        let soapNote;
        try {
           soapNote = JSON.parse(soapResponse.choices[0].message.content);
        } catch (e) {
           soapNote = { subjective: "Error parsing response.", objective: "", assessment: "", plan: "" };
        }

        soapNote.raw_transcript = transcript;

        return Response.json({ success: true, data: soapNote });

    } catch (error) {
        console.error("Error in transcribeAndGenerateSOAPNote:", error);
        return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
});