import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nurse_email, date_range_days = 30 } = await req.json();

    // Admins can view any nurse, nurses can only view themselves
    const targetEmail = (user.role === 'admin' && nurse_email) ? nurse_email : user.email;
    
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - date_range_days);

    // Fetch all relevant data
    const [activities, recommendations, audits, visits, patients] = await Promise.all([
      base44.asServiceRole.entities.UserActivity.filter({ user_email: targetEmail }),
      base44.asServiceRole.entities.TrainingRecommendation.filter({ nurse_email: targetEmail }),
      base44.asServiceRole.entities.ComplianceAudit.filter({ nurse_email: targetEmail }),
      base44.asServiceRole.entities.Visit.filter({ created_by: targetEmail }),
      base44.asServiceRole.entities.Patient.list()
    ]);

    // Calculate metrics
    const metrics = {
      // Overall activity
      total_activities: activities.length,
      activities_last_30_days: activities.filter(a => new Date(a.created_date) >= dateThreshold).length,
      
      // Visit metrics
      total_visits: visits.length,
      completed_visits: visits.filter(v => v.status === 'completed').length,
      avg_visit_duration: 0,
      visits_by_type: {},
      
      // Documentation metrics
      template_usage: activities.filter(a => a.action === 'template_generated').length,
      voice_command_usage: activities.filter(a => a.action === 'voice_command_used').length,
      ai_scribe_usage: activities.filter(a => a.action === 'ai_scribe_used').length,
      avg_documentation_time: 0,
      avg_word_count: 0,
      
      // AI assistance metrics
      total_suggestions_received: recommendations.length,
      suggestions_applied: recommendations.filter(r => r.addressed).length,
      suggestion_acceptance_rate: 0,
      suggestions_by_source: {},
      suggestions_by_type: {},
      
      // Compliance metrics
      total_audits: audits.length,
      avg_compliance_score: 0,
      passed_audits: audits.filter(a => a.status === 'passed').length,
      flagged_audits: audits.filter(a => a.status === 'flagged').length,
      critical_audits: audits.filter(a => a.status === 'critical').length,
      
      // Quality trends
      compliance_trend: [],
      productivity_trend: [],
      ai_adoption_trend: []
    };

    // Calculate visit duration
    const visitsWithDuration = visits.filter(v => v.start_time && v.end_time);
    if (visitsWithDuration.length > 0) {
      const totalMinutes = visitsWithDuration.reduce((sum, v) => {
        const start = new Date(`2000-01-01T${v.start_time}`);
        const end = new Date(`2000-01-01T${v.end_time}`);
        return sum + ((end - start) / (1000 * 60));
      }, 0);
      metrics.avg_visit_duration = Math.round(totalMinutes / visitsWithDuration.length);
    }

    // Visits by type
    visits.forEach(v => {
      metrics.visits_by_type[v.visit_type] = (metrics.visits_by_type[v.visit_type] || 0) + 1;
    });

    // Documentation time and word count
    const docActivities = activities.filter(a => a.action === 'visit_completed' && a.details?.documentation_time_minutes);
    if (docActivities.length > 0) {
      metrics.avg_documentation_time = Math.round(
        docActivities.reduce((sum, a) => sum + (a.details.documentation_time_minutes || 0), 0) / docActivities.length
      );
      metrics.avg_word_count = Math.round(
        docActivities.reduce((sum, a) => sum + (a.details.word_count || 0), 0) / docActivities.length
      );
    }

    // Suggestion acceptance rate
    if (recommendations.length > 0) {
      metrics.suggestion_acceptance_rate = Math.round((metrics.suggestions_applied / recommendations.length) * 100);
    }

    // Suggestions by source and type
    recommendations.forEach(r => {
      metrics.suggestions_by_source[r.source] = (metrics.suggestions_by_source[r.source] || 0) + 1;
      metrics.suggestions_by_type[r.recommendation_type] = (metrics.suggestions_by_type[r.recommendation_type] || 0) + 1;
    });

    // Compliance score
    if (audits.length > 0) {
      metrics.avg_compliance_score = Math.round(
        audits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / audits.length
      );
    }

    // Trends (last 30 days, grouped by week)
    const weeks = 4;
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((i + 1) * 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekAudits = audits.filter(a => {
        const date = new Date(a.created_date);
        return date >= weekStart && date < weekEnd;
      });

      const weekActivities = activities.filter(a => {
        const date = new Date(a.created_date);
        return date >= weekStart && date < weekEnd;
      });

      metrics.compliance_trend.unshift({
        week: `Week ${weeks - i}`,
        score: weekAudits.length > 0 
          ? Math.round(weekAudits.reduce((s, a) => s + (a.compliance_score || 0), 0) / weekAudits.length)
          : 0
      });

      metrics.productivity_trend.unshift({
        week: `Week ${weeks - i}`,
        visits: weekActivities.filter(a => a.action === 'visit_completed').length
      });

      metrics.ai_adoption_trend.unshift({
        week: `Week ${weeks - i}`,
        usage: weekActivities.filter(a => 
          a.action === 'ai_scribe_used' || 
          a.action === 'template_generated' ||
          a.action === 'voice_command_used'
        ).length
      });
    }

    // AI-generated insights and recommendations
    const analysisPrompt = `You are a nursing performance analyst. Analyze the following performance data for nurse ${targetEmail} and provide:

1. Key Strengths (2-3 specific strengths based on data)
2. Areas for Improvement (2-3 specific areas with concrete suggestions)
3. Personalized Training Recommendations (3-5 specific training topics)
4. Risk Factors (any concerning patterns)
5. Overall Performance Summary (2-3 sentences)

DATA:
- Total Visits: ${metrics.total_visits} (${metrics.completed_visits} completed)
- Avg Compliance Score: ${metrics.avg_compliance_score}%
- AI Suggestion Acceptance Rate: ${metrics.suggestion_acceptance_rate}%
- Suggestions Received: ${metrics.total_suggestions_received}
- Compliance Issues: ${metrics.flagged_audits} flagged, ${metrics.critical_audits} critical
- Template Usage: ${metrics.template_usage} times
- AI Scribe Usage: ${metrics.ai_scribe_usage} times
- Voice Commands: ${metrics.voice_command_usage} times
- Avg Documentation Time: ${metrics.avg_documentation_time} minutes
- Visit Types: ${JSON.stringify(metrics.visits_by_type)}

SUGGESTION BREAKDOWN BY SOURCE:
${JSON.stringify(metrics.suggestions_by_source, null, 2)}

SUGGESTION BREAKDOWN BY TYPE:
${JSON.stringify(metrics.suggestions_by_type, null, 2)}

Recent Unaddressed Recommendations (sample):
${recommendations.filter(r => !r.addressed).slice(0, 5).map(r => `- ${r.recommendation_type}: ${r.recommendation_text.substring(0, 100)}`).join('\n')}

Provide actionable, specific insights. Be constructive and focus on growth opportunities.`;

    const insights = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          areas_for_improvement: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          },
          training_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                reason: { type: 'string' },
                urgency: { type: 'string' }
              }
            }
          },
          risk_factors: {
            type: 'array',
            items: { type: 'string' }
          },
          overall_summary: { type: 'string' },
          performance_grade: { type: 'string' }
        }
      }
    });

    // Calculate skill gaps
    const skillGaps = [];
    
    // Low compliance = documentation training needed
    if (metrics.avg_compliance_score < 85) {
      skillGaps.push({
        skill: 'Medicare Documentation Compliance',
        current_level: 'needs_improvement',
        gap_severity: 'high',
        recommendation: 'Complete Medicare documentation training modules'
      });
    }

    // Low suggestion acceptance = may not understand best practices
    if (metrics.suggestion_acceptance_rate < 50 && recommendations.length > 10) {
      skillGaps.push({
        skill: 'AI-Assisted Documentation',
        current_level: 'needs_improvement',
        gap_severity: 'medium',
        recommendation: 'Review AI suggestions more carefully and leverage tools'
      });
    }

    // Low template usage = efficiency opportunity
    if (metrics.template_usage < metrics.completed_visits * 0.3 && metrics.completed_visits > 5) {
      skillGaps.push({
        skill: 'Documentation Efficiency',
        current_level: 'needs_improvement',
        gap_severity: 'medium',
        recommendation: 'Use smart templates to improve efficiency'
      });
    }

    // High documentation time = efficiency issue
    if (metrics.avg_documentation_time > 30) {
      skillGaps.push({
        skill: 'Time Management',
        current_level: 'needs_improvement',
        gap_severity: 'medium',
        recommendation: 'Use voice dictation and AI scribe to reduce documentation time'
      });
    }

    return Response.json({
      success: true,
      nurse_email: targetEmail,
      metrics,
      insights,
      skill_gaps: skillGaps,
      recent_recommendations: recommendations.filter(r => !r.addressed).slice(0, 10),
      recent_activities: activities.slice(0, 20)
    });

  } catch (error) {
    console.error('Error analyzing nurse performance:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});