import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.training_role !== 'educator')) {
      return Response.json({ error: 'Unauthorized - Educator/Admin only' }, { status: 403 });
    }

    const { 
      topic, 
      audience_roles, 
      state, 
      setting, 
      skill_level, 
      time_length_minutes,
      policy_ids,
      include_competency 
    } = await req.json();

    // Fetch selected policies
    let policyContext = '';
    if (policy_ids && policy_ids.length > 0) {
      const policies = await base44.asServiceRole.entities.PolicyLibrary.filter({
        id: { $in: policy_ids }
      });
      policyContext = policies.map(p => `Policy: ${p.title}\n${p.content}\n\n`).join('');
    }

    // Build AI prompt
    const systemPrompt = `You are a healthcare compliance training designer for home health/hospice/DME agencies.

Your task is to generate a complete, audit-ready training course as JSON.

CRITICAL REQUIREMENTS:
1. Base all content on the internal policies provided below (if any)
2. Include regulatory citations from CMS, OSHA, CDC, state-specific regulations
3. Use plain language suitable for clinical staff
4. Include interactive case scenarios
5. Generate 10-20 knowledge check questions with rationales
6. Flag high-risk topics for SME review
7. Include competency checklist if requested
8. Provide source citations for all regulatory statements

POLICIES TO USE AS PRIMARY AUTHORITY:
${policyContext || 'No internal policies provided - use industry best practices and cite sources.'}

OUTPUT FORMAT (must be valid JSON):
{
  "course": {
    "title": "...",
    "description": "...",
    "learning_objectives": ["...", "..."],
    "estimated_minutes": number,
    "needs_sme_review": boolean,
    "risk_flags": ["..."]
  },
  "modules": [
    {
      "title": "...",
      "type": "lesson|policy|simulation",
      "content": {
        "intro": "...",
        "key_points": ["...", "..."],
        "scenarios": [{"situation": "...", "question": "...", "answer": "..."}],
        "dos_and_donts": {"do": ["..."], "dont": ["..."]}
      },
      "order_index": number
    }
  ],
  "questions": [
    {
      "type": "mcq|multi_select|true_false",
      "prompt": "...",
      "options": [{"value": "A", "label": "..."}],
      "correct_answer": "A" or ["A", "B"],
      "rationale": "...",
      "difficulty": "easy|medium|hard",
      "citations": [{"source": "...", "url": "..."}]
    }
  ],
  "competency": {
    "name": "...",
    "description": "...",
    "skills_checklist": [
      {"item": "...", "criteria": "..."}
    ]
  },
  "attestation": {
    "statement": "I attest that I have completed this training and understand...",
    "signature_required": true
  },
  "citations": [
    {"source_name": "...", "source_type": "regulation|guideline", "snippet": "...", "url": "..."}
  ]
}`;

    const userPrompt = `Generate a comprehensive training course for:

Topic: ${topic}
Audience Roles: ${audience_roles.join(', ')}
State: ${state || 'All states'}
Setting: ${setting}
Skill Level: ${skill_level}
Target Duration: ${time_length_minutes} minutes
Include Competency Checklist: ${include_competency ? 'Yes' : 'No'}

Generate the complete course as JSON following the schema above.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    });

    const generatedContent = JSON.parse(completion.choices[0].message.content);

    // Create course in pending_review status
    const course = await base44.asServiceRole.entities.TrainingCourse.create({
      title: generatedContent.course.title,
      description: generatedContent.course.description,
      category: setting === 'hospice' ? 'hospice' : setting === 'dme' ? 'dme' : 'home_health',
      role_targets: audience_roles,
      tags: [topic, setting, state].filter(Boolean),
      estimated_minutes: generatedContent.course.estimated_minutes || time_length_minutes,
      status: 'pending_review',
      version: '1.0',
      created_by: user.email,
      learning_objectives: generatedContent.course.learning_objectives,
      passing_score: 80,
      ai_generated: true,
      needs_sme_review: generatedContent.course.needs_sme_review || false,
      policy_references: policy_ids || [],
      citation_count: generatedContent.citations?.length || 0
    });

    // Create modules
    for (const [idx, module] of generatedContent.modules.entries()) {
      await base44.asServiceRole.entities.TrainingModule.create({
        course_id: course.id,
        title: module.title,
        type: module.type,
        content_json: module.content,
        order_index: idx,
        estimated_minutes: Math.floor(time_length_minutes / generatedContent.modules.length)
      });
    }

    // Create questions
    for (const [idx, question] of generatedContent.questions.entries()) {
      await base44.asServiceRole.entities.TrainingQuestion.create({
        course_id: course.id,
        type: question.type,
        prompt: question.prompt,
        options_json: question.options || [],
        correct_answer_json: { answer: question.correct_answer },
        rationale: question.rationale,
        difficulty: question.difficulty || 'medium',
        source_citations_json: question.citations || [],
        order_index: idx,
        points: 1
      });
    }

    // Create competency if requested
    if (include_competency && generatedContent.competency) {
      const competency = await base44.asServiceRole.entities.Competency.create({
        name: generatedContent.competency.name,
        role_target: audience_roles,
        description: generatedContent.competency.description,
        category: 'clinical',
        frequency: 'annual',
        required_observations_count: 1,
        active: false // Not active until course is published
      });

      await base44.asServiceRole.entities.SkillsChecklist.create({
        competency_id: competency.id,
        title: `${generatedContent.competency.name} - Skills Checklist`,
        checklist_items_json: generatedContent.competency.skills_checklist,
        required_observations_count: 1
      });
    }

    // Store citations
    for (const citation of generatedContent.citations || []) {
      await base44.asServiceRole.entities.CitationLibrary.create({
        source_name: citation.source_name,
        source_type: citation.source_type || 'guideline',
        snippet: citation.snippet,
        url: citation.url,
        full_citation: `${citation.source_name}. ${citation.snippet}`,
        last_verified_at: new Date().toISOString().split('T')[0],
        tags: [topic]
      });
    }

    // Log action
    await base44.asServiceRole.entities.TrainingAuditLog.create({
      actor_id: user.email,
      actor_name: user.full_name,
      action: 'course_created',
      entity_type: 'TrainingCourse',
      entity_id: course.id,
      after_json: {
        title: course.title,
        status: course.status,
        ai_generated: true,
        needs_sme_review: course.needs_sme_review
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      severity: 'info'
    });

    return Response.json({
      success: true,
      course_id: course.id,
      title: course.title,
      status: course.status,
      needs_sme_review: course.needs_sme_review,
      risk_flags: generatedContent.course.risk_flags || []
    });

  } catch (error) {
    console.error('Course generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});