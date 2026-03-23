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
      question_types = ['mcq', 'true_false', 'scenario_based'],
      include_case_scenarios = true,
      include_key_takeaways = true,
      include_policy_section = true,
      include_references = true,
      include_acknowledgement = true,
      custom_instructions = '',
      status = 'draft',
      training_type = 'in_service',
      annual_cycle_year = null,
      skill_level = 'intermediate',
      num_modules = 0,
    } = await req.json();

    if (!topic) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }

    const audienceLabel = audience_roles.length > 0 ? audience_roles.join(', ') : 'all employees';
    const questionTypeLabel = question_types.join(', ');
    const moduleCount = num_modules > 0 ? num_modules : (lesson_length >= 60 ? 3 : lesson_length >= 40 ? 2 : 1);

    // ──────────────────────────────────────────────────────
    // PHASE 1: Generate course outline for structural quality
    // ──────────────────────────────────────────────────────
    const outlinePrompt = `You are a senior instructional designer specializing in healthcare workforce education. Design a course outline for the following training.

Topic: ${topic}
Category: ${training_category}
Business line: ${business_line}
Target audience: ${audienceLabel}
Skill level: ${skill_level}
Purpose: ${purpose_of_training || 'Ensure staff competency and regulatory compliance'}
Lesson duration: ${lesson_length} minutes across ${moduleCount} module(s)
Question count: ${question_count} assessment questions

Return JSON only:
{
  "title": "Clear, professional course title",
  "short_description": "1-2 sentence summary for catalog display",
  "learning_objectives": ["4-6 measurable objectives using Bloom's action verbs — at least 2 at Apply level or higher"],
  "modules": [
    {
      "title": "Module title",
      "focus": "What this module specifically covers",
      "key_topics": ["topic1", "topic2"],
      "estimated_minutes": 15
    }
  ],
  "assessment_blueprint": [
    {
      "objective_index": 0,
      "bloom_level": "apply",
      "question_type": "scenario_based",
      "topic_focus": "What the question should test"
    }
  ],
  "prerequisite_knowledge": ["What learners should already know"],
  "real_world_relevance": "Why this training matters RIGHT NOW for this audience"
}

Design principles:
- Each module should have a clear, distinct purpose — no overlap
- Scaffold from foundational knowledge to complex application
- Assessment blueprint must cover EVERY learning objective at least once
- Distribute question types: ${questionTypeLabel}
- Distribute difficulty: 30% easy, 40% medium, 30% hard
- Make the "real_world_relevance" compelling — connect to actual incidents, regulatory changes, or common audit findings in ${business_line === 'all' ? 'home health and hospice' : business_line}`;

    const outlineCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a senior healthcare instructional designer. Return valid JSON only.' },
        { role: 'user', content: outlinePrompt }
      ]
    });

    let outline;
    try {
      outline = JSON.parse(outlineCompletion.choices[0].message.content || '{}');
    } catch {
      outline = { title: topic, learning_objectives: [], modules: [{ title: topic, focus: topic, key_topics: [topic], estimated_minutes: lesson_length }], assessment_blueprint: [] };
    }

    // ──────────────────────────────────────────────────────
    // PHASE 2: Generate full course content using outline
    // ──────────────────────────────────────────────────────
    const contentPrompt = `You are building a complete healthcare training course. Use the approved outline below to generate rich, engaging content.

APPROVED OUTLINE:
${JSON.stringify(outline, null, 2)}

PARAMETERS:
- Skill level: ${skill_level}
- Reading level: ${reading_level}
- Include case scenarios: ${include_case_scenarios}
- Include key takeaways: ${include_key_takeaways}
- Include policy/regulatory content: ${include_policy_section}
- Include references: ${include_references}
- Include acknowledgement: ${include_acknowledgement}
- Assessment question count: ${question_count}
- Question types: ${questionTypeLabel}
- Custom instructions: ${custom_instructions || 'none'}

Generate the complete course as strict JSON with this EXACT structure:
{
  "course": {
    "title": "${outline.title || topic}",
    "short_description": "${outline.short_description || ''}",
    "description": "Comprehensive 3-4 sentence description including who should take this, what they will learn, and why it matters",
    "learning_objectives": ${JSON.stringify(outline.learning_objectives || [])},
    "recommended_passing_score": 80,
    "certificate_wording": "This certifies that the above-named employee has successfully completed [course title] and demonstrated competency in the covered material.",
    "attestation_text": "I confirm that I have carefully reviewed all course materials, understand the content presented, and commit to applying these practices in my daily work.",
    "warnings": ["This course was generated with AI assistance and should be reviewed by a subject matter expert before publishing."],
    "prerequisite_knowledge": ${JSON.stringify(outline.prerequisite_knowledge || [])},
    "real_world_relevance": "${outline.real_world_relevance || ''}"
  },
  "modules": [
    {
      "title": "Module title from outline",
      "type": "lesson",
      "content": {
        "intro": "A compelling opening hook — start with a brief real-world scenario, a startling statistic, or a question that makes the reader think. Connect to their daily work immediately.",
        "sections": [
          {
            "heading": "Clear, descriptive heading",
            "body": "Core teaching content — concise paragraphs explaining the concept. Every paragraph must answer: what should staff DO with this information?",
            "bullets": ["Action-oriented bullet points for key facts, steps, or requirements"],
            "example": "A specific, realistic workplace example showing this concept in practice",
            "pro_tip": "An insider tip from experienced practitioners — something you'd tell a colleague, not write in a policy manual",
            "warning": "A critical safety or compliance warning if applicable (omit if not relevant to this section)",
            "steps": ["Step-by-step procedure if this section involves a process (omit if not applicable)"],
            "do_dont": {
              "do": ["Correct practices"],
              "dont": ["Common mistakes to avoid"]
            },
            "mnemonic": "A memory aid if helpful for this concept (omit if forced)"
          }
        ],
        "case_scenarios": [
          {
            "title": "Scenario title",
            "patient_context": "Brief patient background — age, diagnosis, relevant history (for clinical topics) or workplace context (for admin topics)",
            "situation": "Detailed situation description — what is happening, what the employee observes, what decision they face",
            "challenge": "The specific question or decision point the learner must consider",
            "guidance": "The correct approach with explanation of WHY, referencing specific policies or best practices",
            "what_could_go_wrong": "Consequences of the wrong approach — make it concrete and relatable",
            "discussion_questions": ["Thought-provoking questions that extend learning beyond the scenario"]
          }
        ],
        "key_takeaways": ["Actionable, memorable takeaways — each should be something staff can immediately apply"],
        "check_your_understanding": ["Quick self-check questions (not graded) that help learners verify their comprehension before moving on"],
        "clinical_pearl": "One memorable clinical or compliance insight that experienced practitioners wish they had learned earlier (optional — omit if not applicable)",
        "summary": "2-3 sentence recap of the module's most important points — what to remember above all else"
      }
    }
  ],
  "questions": [
    {
      "type": "mcq|multi_select|true_false|short_answer|matching|scenario_based",
      "prompt": "Clear, unambiguous question stem. For scenario-based: include a detailed clinical/workplace situation first.",
      "options": [{"value":"A","label":"Option text"}],
      "correct_answer": {},
      "rationale": "MUST explain: (1) why the correct answer is right, (2) why each wrong answer is wrong, (3) the real-world consequence of choosing incorrectly",
      "rubric": "For short_answer/scenario_based: specific criteria for full credit (3 points), partial credit (1-2 points), and zero credit",
      "difficulty": "easy|medium|hard",
      "bloom_level": "remember|understand|apply|analyze|evaluate",
      "mapped_objective_index": 0,
      "clinical_context": "Brief context connecting this question to real practice (shown after answering)"
    }
  ],
  "references": [
    {"title":"Source title","url":"","note":"How this source relates to the training content"}
  ]
}

CONTENT CREATION RULES:

1. SECTIONS — Make every section rich and multi-dimensional:
   - "body": Core teaching content. Write as if explaining to a competent colleague who is new to this specific topic. Be concrete, not abstract.
   - "bullets": Reserve for lists of requirements, steps, or facts that benefit from scannable format.
   - "example": ALWAYS include a specific, named example. Not "a patient" but "Mrs. Johnson, a 78-year-old with CHF who lives alone." Make examples feel real.
   - "pro_tip": Include when you have genuine practical wisdom to share. These should feel like advice from a mentor.
   - "warning": Include ONLY for genuine safety/compliance risks. When included, be specific about what can go wrong.
   - "steps": Include when the section teaches a procedure or process. Number each step clearly.
   - "do_dont": Include when there are common mistakes worth contrasting. Keep to 2-4 items per side.
   - "mnemonic": Include only when genuinely helpful for recall. Don't force mnemonics.

2. CASE SCENARIOS — These are the most valuable learning tool:
   - Include "patient_context" with enough detail to feel like a real clinical encounter
   - The "challenge" should present a genuine dilemma, not an obvious choice
   - "what_could_go_wrong" should be specific and sobering — connect to real consequences (denied claims, patient harm, survey deficiencies)
   - "discussion_questions" should push higher-order thinking: "What would you do differently if..." or "How would this change if the patient also had..."

3. ASSESSMENT — Quality over quantity:
   - Scenario-based questions should present complete clinical vignettes (3-5 sentences of context)
   - MCQ distractors must be plausible — each wrong answer should represent a real mistake someone might make
   - "clinical_context" after each question connects the assessment back to why this matters in practice
   - Short answer rubrics must be specific: "Full credit requires mentioning X, Y, and Z. Partial credit if..."
   - At least ${Math.max(2, Math.round(question_count * 0.3))} questions should be at Apply/Analyze/Evaluate level

4. WRITING QUALITY:
   - Write for ${audienceLabel} in ${business_line === 'all' ? 'home health and hospice' : business_line} settings
   - Reading level: ${reading_level} (8th-10th grade)
   - Use "you" and "your" to address the learner directly
   - Prefer active voice and concrete language
   - When referencing regulations, explain what they mean in plain language
   - Avoid: jargon without definition, passive constructions, filler phrases, academic tone
   - Every section must pass the "So what?" test — the learner should understand why this matters to THEM`;

    const contentCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an award-winning healthcare education designer known for creating courses that are simultaneously rigorous, engaging, and immediately practical. You combine clinical accuracy with compelling storytelling. Return valid JSON only.' },
        { role: 'user', content: contentPrompt }
      ]
    });

    let generated;
    try {
      generated = JSON.parse(contentCompletion.choices[0].message.content || '{}');
    } catch {
      generated = {};
    }

    const course = await base44.asServiceRole.entities.TrainingCourse.create({
      title: generated.course?.title || outline.title || topic,
      short_description: generated.course?.short_description || outline.short_description || '',
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
      learning_objectives: generated.course?.learning_objectives || outline.learning_objectives || [],
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
        custom_instructions,
        skill_level,
        num_modules: moduleCount,
        generation_method: 'two_pass',
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
        points: question.type === 'scenario_based' || question.type === 'short_answer' ? 2 : 1
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
        ai_generated: true,
        generation_method: 'two_pass',
        outline_modules: outline.modules?.length || 0,
        questions_generated: (generated.questions || []).length
      },
      severity: 'info'
    });

    return Response.json({ success: true, course_id: course.id, title: course.title, status: course.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
