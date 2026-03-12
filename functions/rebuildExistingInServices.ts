import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai@4.56.0';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const isAdminUser = (user) => user?.role === 'admin' || user?.account_type === 'agency_admin' || user?.account_type === 'super_admin';

const buildPrompt = (course) => `Create a presentation-style healthcare in-service with short, easy-to-follow lesson sections and a graded quiz at the end.

Course title: ${course.title}
Short description: ${course.short_description || ''}
Description: ${course.description || ''}
Category: ${course.category || 'compliance'}
Business line: ${course.business_line_scope || 'all'}
Audience: ${course.employee_audience || course.role_targets?.join(', ') || 'frontline healthcare staff'}
Estimated minutes: ${course.estimated_minutes || 30}
Training type: ${course.training_type}

Reference style inspiration:
- Relias-style annual mandatory education: concise modules, practical application, strong compliance focus
- Home care training style: short plain-language explanations, realistic home setting examples, quick knowledge checks

Requirements:
- Write in plain, practical language suitable for frontline staff
- Make the lesson easy to scan and understand quickly
- Use short sections, bullets, examples, and mini-scenarios
- Avoid academic tone and unnecessary theory
- Include 2-3 modules that feel like presentation slides/sections
- Include 8-10 quiz questions at the end
- Mix MCQ, true/false, multi-select, and 1-2 short-answer questions
- Make questions directly based on lesson content
- Include key takeaways

Return strict JSON in this shape:
{
  "course": {
    "short_description": "",
    "description": "",
    "learning_objectives": [""],
    "passing_score": 80
  },
  "modules": [
    {
      "title": "",
      "type": "lesson",
      "content": {
        "intro": "",
        "sections": [
          {
            "heading": "",
            "body": "",
            "bullets": [""],
            "example": ""
          }
        ],
        "case_scenarios": [
          {
            "title": "",
            "situation": "",
            "guidance": ""
          }
        ],
        "key_takeaways": [""]
      }
    }
  ],
  "questions": [
    {
      "type": "mcq|multi_select|true_false|short_answer|scenario_based",
      "prompt": "",
      "options": [{"value":"A","label":""}],
      "correct_answer": {},
      "rationale": "",
      "rubric": "",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!isAdminUser(user)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { limit = 10 } = await req.json();
    const courses = await base44.asServiceRole.entities.TrainingCourse.list('-updated_date', limit);
    const targets = courses.filter((course) => ['in_service', 'annual_mandatory'].includes(course.training_type));
    const results = [];

    for (const course of targets) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 7000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You create practical healthcare in-service training as valid JSON only.' },
          { role: 'user', content: buildPrompt(course) }
        ]
      });

      const generated = JSON.parse(completion.choices[0].message.content || '{}');

      const existingModules = await base44.asServiceRole.entities.TrainingModule.filter({ course_id: course.id }, 'order_index', 100);
      const existingQuestions = await base44.asServiceRole.entities.TrainingQuestion.filter({ course_id: course.id }, 'order_index', 200);
      await Promise.all(existingModules.map((item) => base44.asServiceRole.entities.TrainingModule.delete(item.id)));
      await Promise.all(existingQuestions.map((item) => base44.asServiceRole.entities.TrainingQuestion.delete(item.id)));

      await base44.asServiceRole.entities.TrainingCourse.update(course.id, {
        short_description: generated.course?.short_description || course.short_description,
        description: generated.course?.description || course.description,
        learning_objectives: generated.course?.learning_objectives || course.learning_objectives || [],
        passing_score: generated.course?.passing_score || course.passing_score || 80,
        ai_generated: true,
        needs_sme_review: true,
        include_case_scenarios: true,
        include_key_takeaways: true,
      });

      for (const [index, module] of (generated.modules || []).entries()) {
        await base44.asServiceRole.entities.TrainingModule.create({
          course_id: course.id,
          title: module.title || `Module ${index + 1}`,
          type: module.type || 'lesson',
          content_json: module.content || {},
          order_index: index,
          estimated_minutes: Math.max(5, Math.floor((course.estimated_minutes || 30) / Math.max((generated.modules || []).length, 1))),
          is_required: true,
        });
      }

      for (const [index, question] of (generated.questions || []).entries()) {
        await base44.asServiceRole.entities.TrainingQuestion.create({
          course_id: course.id,
          type: question.type || 'mcq',
          prompt: question.prompt || `Question ${index + 1}`,
          options_json: question.options || [],
          correct_answer_json: { answer: question.correct_answer },
          rationale: question.rationale || '',
          rubric: question.rubric || '',
          difficulty: question.difficulty || 'medium',
          order_index: index,
          points: 1,
          active: true,
        });
      }

      await base44.asServiceRole.entities.TrainingAuditLog.create({
        actor_id: user.email,
        actor_name: user.full_name,
        action: 'course_created',
        entity_type: 'TrainingCourse',
        entity_id: course.id,
        after_json: { rebuilt_with_ai: true, module_count: (generated.modules || []).length, question_count: (generated.questions || []).length },
        reason: 'rebuilt existing in-service with AI presentation-style content',
        severity: 'info'
      });

      results.push({ course_id: course.id, title: course.title, modules: (generated.modules || []).length, questions: (generated.questions || []).length });
    }

    return Response.json({ success: true, rebuilt: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});