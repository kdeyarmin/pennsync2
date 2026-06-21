import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Tolerant JSON extractor: the model is asked (in-prompt) to return strict JSON
// but may wrap it in ```json fences or prose. Pull the outermost {...} and parse.
const parseLLMJson = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  const text = String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skill_gap, nurse_email } = await req.json();
    // Only admins may build training from another nurse's PHI/performance data.
    // Mirrors the guard in generatePersonalizedLearningPath; without it any
    // authenticated user could read another nurse's ComplianceAudit /
    // TrainingRecommendation / UserActivity via the service-role reads below.
    if (nurse_email && nurse_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const targetEmail = nurse_email || user.email;

    // Fetch nurse performance data
    const [recommendations, audits, activities] = await Promise.all([
      base44.asServiceRole.entities.TrainingRecommendation.filter({ 
        nurse_email: targetEmail,
        addressed: false 
      }),
      base44.asServiceRole.entities.ComplianceAudit.filter({ nurse_email: targetEmail }),
      base44.asServiceRole.entities.UserActivity.filter({ user_email: targetEmail })
    ]);

    // Calculate specific deficits
    const avgComplianceScore = audits.length > 0
      ? audits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / audits.length
      : 0;

    const suggestionAcceptance = recommendations.length > 0
      ? (recommendations.filter(r => r.addressed).length / recommendations.length) * 100
      : 0;

    // Generate training content using AI
    const trainingPrompt = `You are an expert nursing educator and training content creator. Generate comprehensive, interactive training content for a home health/hospice nurse.

SKILL GAP: ${skill_gap}

NURSE PERFORMANCE CONTEXT:
- Average Compliance Score: ${Math.round(avgComplianceScore)}%
- AI Suggestion Acceptance Rate: ${Math.round(suggestionAcceptance)}%
- Recent Recommendations (sample): ${recommendations.slice(0, 5).map(r => r.recommendation_text).join('; ')}

COMPLIANCE ISSUES IDENTIFIED:
${audits.slice(0, 5).map(a => `- Issues: ${JSON.stringify(a.issues)}`).join('\n')}

Generate a complete training module with the following components:

1. LESSON CONTENT: 
   - Clear learning objectives (3-5)
   - Key concepts explained in simple terms
   - Real-world examples from home health
   - Best practices and tips
   - Common mistakes to avoid

2. INTERACTIVE SCENARIO:
   - A realistic patient case study
   - Clinical decision points
   - Multiple choice questions with rationales
   - Correct actions and consequences

3. PRACTICE QUIZ (5-7 questions):
   - Multiple choice questions
   - Each with 4 options
   - Clear correct answer
   - Detailed explanation for why each answer is right or wrong

4. KEY TAKEAWAYS:
   - 3-5 bullet points summarizing the most critical information

Make content specific, practical, and immediately applicable to home health nursing.`;

    // Ask for JSON in-prompt and parse the text result rather than passing
    // response_json_schema: the provider's strict structured-output mode rejects
    // deeply-nested free-form objects (it requires an explicit `required` array
    // on every nested object), which this lesson/scenario/quiz shape can't meet.
    const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${trainingPrompt}\n\nReturn ONLY valid JSON, no prose or code fences, with this shape:\n{"title":"","learning_objectives":[""],"lesson_content":{"introduction":"","key_concepts":[{"concept":"","explanation":""}],"best_practices":[""],"common_mistakes":[""]},"scenario":{"title":"","patient_background":"","situation":"","decision_points":[{"question":"","options":[""],"correct_answer":0,"rationale":""}]},"quiz":[{"question":"","options":[""],"correct_answer":0,"explanation":""}],"key_takeaways":[""]}`
    });
    const trainingContent = parseLLMJson(raw) || {};

    return Response.json({
      success: true,
      skill_gap,
      training_content: trainingContent,
      nurse_email: targetEmail,
      estimated_duration: 20 + (trainingContent.quiz?.length || 0) * 2
    });

  } catch (error) {
    console.error('Error generating training:', error);
    return Response.json({ 
      error: error.message,
    }, { status: 500 });
  }
});