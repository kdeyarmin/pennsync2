import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai@4.56.0';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const normalizeCategory = (value) => {
  const allowed = ['compliance', 'clinical', 'safety', 'documentation', 'hospice', 'home_health', 'dme', 'onboarding', 'leadership'];
  return allowed.includes(value) ? value : 'compliance';
};

const normalizeBusinessLine = (value) => {
  if (value === 'home_health' || value === 'hospice') return value;
  return 'all';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin' || user?.account_type === 'agency_admin' || user?.account_type === 'super_admin';

    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    const {
      topic,
      training_category = 'compliance',
      business_line = 'all',
      audience_roles = [],
      purpose_of_training = '',
      reading_level = 'plain professional',
      lesson_length = 30,
      question_count = 10,
      question_types = ['mcq', 'true_false'],
      include_case_scenarios = true,
      include_key_takeaways = true,
      include_policy_section = true,
      include_references = true,
      include_acknowledgement = true,
      custom_instructions = '',
      status = 'draft',
      training_type = 'in_service',
      annual_cycle_year = null
    } = await req.json();

    if (!topic) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }

    const prompt = `You are building a healthcare compliance in-service for employees in hospice, home health, palliative care, and administrative/clinical departments.

Create a complete in-service package as strict JSON with this shape:
{
  "course": {
    "title": "",
    "short_description": "",
    "description": "",
    "learning_objectives": [""],
    "recommended_passing_score": 80,
    "certificate_wording": "",
    "attestation_text": "",
    "warnings": [""]
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
      "type": "mcq|multi_select|true_false|short_answer|matching|scenario_based",
      "prompt": "",
      "options": [{"value":"A","label":""}],
      "correct_answer": {},
      "rationale": "",
      "rubric": "",
      "difficulty": "easy|medium|hard"
    }
  ],
  "references": [
    {"title":"","url":"","note":""}
  ]
}

Rules:
- Topic: ${topic}
- Training category: ${training_category}
- Business line: ${business_line}
- Audience: ${audience_roles.join(', ') || 'all employees'}
- Purpose: ${purpose_of_training}
- Reading level: ${reading_level}
- Lesson length: ${lesson_length} minutes
- Number of test questions: ${question_count}
- Question types to include: ${question_types.join(', ')}
- Include case scenarios: ${include_case_scenarios ? 'yes' : 'no'}
- Include key takeaways: ${include_key_takeaways ? 'yes' : 'no'}
- Include policy section: ${include_policy_section ? 'yes' : 'no'}
- Include references: ${include_references ? 'yes' : 'no'}
- Include acknowledgement language: ${include_acknowledgement ? 'yes' : 'no'}
- Custom instructions: ${custom_instructions || 'none'}

Style and quality requirements:
- Write for frontline healthcare staff, not executives, attorneys, or academics.
- Use plain, practical, professional language at about an 8th-10th grade reading level.
- Make the lesson easy to understand quickly during a busy workday.
- Keep sentences short, direct, and action-oriented.
- Use brief sections with clear headings.
- Explain what staff should do, what to watch for, what to document, and what to report.
- Include realistic home health, hospice, office, leadership, and field-based examples when relevant.
- Prefer checklists, bullets, quick tips, short examples, and simple action steps over long lectures.
- Avoid jargon, theory-heavy explanations, legalistic wording, academic tone, and repetitive filler.
- Define any required clinical or compliance term in simple words before using it.
- Make every section directly useful during real patient care or daily operations.
- Make test questions practical and based on real decisions staff may face.
- If a concept is complex, break it into simple steps before testing it.
- Keep the overall tone supportive, professional, and easy to scan.

Always include a warning that AI-generated training should be reviewed by an admin before publishing.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You create practical healthcare training materials as valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    });

    const generated = JSON.parse(completion.choices[0].message.content || '{}');

    const course = await base44.asServiceRole.entities.TrainingCourse.create({
      title: generated.course?.title || topic,
      short_description: generated.course?.short_description || '',
      description: generated.course?.description || '',
      training_type,
      annual_cycle_year: annual_cycle_year || undefined,
      category: normalizeCategory(training_category),
      business_line_scope: normalizeBusinessLine(business_line),
      employee_audience: audience_roles.join(', '),
      purpose: purpose_of_training,
      reading_level,
      role_targets: audience_roles,
      estimated_minutes: Number(lesson_length) || 30,
      status,
      created_by: user.email,
      learning_objectives: generated.course?.learning_objectives || [],
      passing_score: generated.course?.recommended_passing_score || 80,
      ai_generated: true,
      needs_sme_review: true,
      enable_certificate: true,
      requires_attestation: include_acknowledgement,
      attestation_text: generated.course?.attestation_text || 'I have reviewed and understand this training and agree to follow agency policy.',
      certificate_wording: generated.course?.certificate_wording || 'This certifies successful completion of the assigned compliance in-service.',
      include_case_scenarios,
      include_key_takeaways,
      references_json: generated.references || [],
      ai_prompt_json: {
        topic,
        training_category,
        business_line,
        audience_roles,
        purpose_of_training,
        reading_level,
        lesson_length,
        question_count,
        question_types,
        include_case_scenarios,
        include_key_takeaways,
        include_policy_section,
        include_references,
        include_acknowledgement,
        custom_instructions
      },
      retake_settings_json: {
        passing_threshold: generated.course?.recommended_passing_score || 80,
        unlimited_retakes: true,
        waiting_period_hours: 0,
        regenerate_test_on_retake: true
      },
      test_settings_json: {
        randomize_questions: true,
        randomize_answers: true,
        show_correct_answers_after_completion: false
      }
    });

    for (const [index, module] of (generated.modules || []).entries()) {
      await base44.asServiceRole.entities.TrainingModule.create({
        course_id: course.id,
        title: module.title || `Module ${index + 1}`,
        type: module.type || 'lesson',
        content_json: module.content || {},
        order_index: index,
        estimated_minutes: Math.max(5, Math.floor((Number(lesson_length) || 30) / Math.max((generated.modules || []).length, 1))),
        is_required: true
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
        points: 1
      });
    }

    await base44.asServiceRole.entities.TrainingAuditLog.create({
      actor_id: user.email,
      actor_name: user.full_name,
      action: 'course_created',
      entity_type: 'TrainingCourse',
      entity_id: course.id,
      after_json: {
        title: course.title,
        training_type,
        annual_cycle_year: annual_cycle_year || null,
        status: course.status,
        ai_generated: true
      },
      severity: 'info'
    });

    return Response.json({ success: true, course_id: course.id, title: course.title, status: course.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});