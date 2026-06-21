import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY') || '';
const HEYGEN_BASE = 'https://api.heygen.com';

// Default avatar and voice for training presenter
const DEFAULT_AVATAR_ID = 'Daisy-inskirt-20220818';
const DEFAULT_VOICE_ID = '55f8c0f546884f9cbdefa113f5e7b682'; // Elizabeth - Friendly English

interface VideoScene {
  avatar_id?: string;
  voice_id?: string;
  input_text: string;
  background_color?: string;
}

async function heygenRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${HEYGEN_BASE}${path}`, {
    method,
    headers: {
      'x-api-key': HEYGEN_API_KEY,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function createVideo(scenes: VideoScene[], title: string) {
  const video_inputs = scenes.map((scene) => ({
    character: {
      type: 'avatar',
      avatar_id: scene.avatar_id || DEFAULT_AVATAR_ID,
      avatar_style: 'normal',
    },
    voice: {
      type: 'text',
      voice_id: scene.voice_id || DEFAULT_VOICE_ID,
      input_text: scene.input_text,
      speed: 1.0,
      emotion: 'Friendly',
    },
    background: {
      type: 'color',
      value: scene.background_color || '#FFFFFF',
    },
  }));

  const result = await heygenRequest('/v2/video/generate', 'POST', {
    video_inputs,
    dimension: { width: 1920, height: 1080 },
    caption: true,
    title,
  });

  return result.data?.video_id;
}

async function pollVideoStatus(videoId: string, maxAttempts = 60, intervalMs = 10000): Promise<{ status: string; video_url?: string; thumbnail_url?: string; duration?: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await heygenRequest(`/v1/video_status.get?video_id=${videoId}`, 'GET');
    const data = result.data || {};

    if (data.status === 'completed') {
      return {
        status: 'completed',
        video_url: data.video_url,
        thumbnail_url: data.thumbnail_url,
        duration: data.duration,
      };
    }

    if (data.status === 'failed') {
      throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
    }

    // Still processing — wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video generation timed out after polling');
}

function buildNarrationScript(moduleTitle: string, content: Record<string, unknown>): string {
  const parts: string[] = [];

  parts.push(`Welcome to this module: ${moduleTitle}.`);

  if (content.intro) {
    parts.push(String(content.intro));
  }

  const sections = (content.sections || []) as Array<Record<string, unknown>>;
  for (const section of sections) {
    if (section.heading) {
      parts.push(`Let's talk about: ${section.heading}.`);
    }
    if (section.body) {
      parts.push(String(section.body));
    }
    if (section.pro_tip) {
      parts.push(`Here's a pro tip: ${section.pro_tip}`);
    }
    if (section.warning) {
      parts.push(`Important warning: ${section.warning}`);
    }
  }

  if (content.clinical_pearl) {
    parts.push(`Clinical pearl: ${content.clinical_pearl}`);
  }

  if (content.summary) {
    parts.push(String(content.summary));
  }

  parts.push('That wraps up this module. Let\'s move on.');

  // HeyGen has input text limits — trim to ~5000 chars per scene
  const script = parts.join(' ');
  return script.length > 5000 ? script.slice(0, 4950) + '... That covers the key points for this module.' : script;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin' || user?.account_type === 'agency_admin' || user?.account_type === 'super_admin';

    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    if (!HEYGEN_API_KEY) {
      return Response.json({ error: 'HeyGen API key not configured' }, { status: 500 });
    }

    const { module_id, course_id, avatar_id, voice_id } = await req.json();

    // Mode 1: Generate video for a single module
    if (module_id) {
      const modules = await base44.asServiceRole.entities.TrainingModule.filter({ id: module_id });
      if (!modules || modules.length === 0) {
        return Response.json({ error: 'Module not found' }, { status: 404 });
      }

      const mod = modules[0];
      const content = mod.content_json || {};
      const script = buildNarrationScript(mod.title, content);

      const videoId = await createVideo(
        [{ avatar_id, voice_id, input_text: script }],
        `${mod.title} - Training Video`
      );

      const result = await pollVideoStatus(videoId);

      // Store video URL on the module
      await base44.asServiceRole.entities.TrainingModule.update(mod.id, {
        video_url: result.video_url,
        video_thumbnail_url: result.thumbnail_url,
        video_duration_seconds: result.duration,
        video_status: 'completed',
        video_generated_at: new Date().toISOString(),
        type: 'video',
      });

      return Response.json({
        success: true,
        module_id: mod.id,
        video_url: result.video_url,
        thumbnail_url: result.thumbnail_url,
        duration: result.duration,
      });
    }

    // Mode 2: Generate videos for all modules in a course
    if (course_id) {
      const modules = await base44.asServiceRole.entities.TrainingModule.filter({ course_id });
      if (!modules || modules.length === 0) {
        return Response.json({ error: 'No modules found for this course' }, { status: 404 });
      }

      // Sort by order_index
      modules.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(a.order_index) || 0) - (Number(b.order_index) || 0)
      );

      const results = [];

      for (const mod of modules) {
        try {
          const content = mod.content_json || {};
          const script = buildNarrationScript(mod.title, content);

          const videoId = await createVideo(
            [{ avatar_id, voice_id, input_text: script }],
            `${mod.title} - Training Video`
          );

          const videoResult = await pollVideoStatus(videoId);

          await base44.asServiceRole.entities.TrainingModule.update(mod.id, {
            video_url: videoResult.video_url,
            video_thumbnail_url: videoResult.thumbnail_url,
            video_duration_seconds: videoResult.duration,
            video_status: 'completed',
            video_generated_at: new Date().toISOString(),
            type: 'video',
          });

          results.push({
            module_id: mod.id,
            title: mod.title,
            status: 'completed',
            video_url: videoResult.video_url,
            duration: videoResult.duration,
          });
        } catch (err) {
          results.push({
            module_id: mod.id,
            title: mod.title,
            status: 'failed',
            error: err.message,
          });
        }
      }

      // Update audit log
      await base44.asServiceRole.entities.TrainingAuditLog.create({
        actor_id: user.email,
        actor_name: user.full_name,
        action: 'videos_generated',
        entity_type: 'TrainingCourse',
        entity_id: course_id,
        after_json: {
          modules_processed: results.length,
          modules_completed: results.filter((r: Record<string, unknown>) => r.status === 'completed').length,
          modules_failed: results.filter((r: Record<string, unknown>) => r.status === 'failed').length,
        },
        severity: 'info',
      });

      return Response.json({ success: true, course_id, results });
    }

    return Response.json({ error: 'Either module_id or course_id is required' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
