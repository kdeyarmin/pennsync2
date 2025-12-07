import { base44 } from "@/api/base44Client";

export const analyzeNurseDeficits = async (nurseEmail) => {
  if (!nurseEmail) return null;

  try {
    // Fetch all AI suggestions for this nurse
    const suggestions = await base44.entities.TrainingRecommendation.filter({
      nurse_email: nurseEmail,
      addressed: false
    }, '-created_date', 100);

    if (suggestions.length === 0) {
      return { deficits: [], strengths: [], recommendations: [] };
    }

    // Analyze patterns
    const categoryFrequency = {};
    const sourceFrequency = {};
    const recentSuggestions = {};

    suggestions.forEach(sugg => {
      // Count by category
      categoryFrequency[sugg.recommendation_type] = (categoryFrequency[sugg.recommendation_type] || 0) + 1;
      
      // Count by source
      sourceFrequency[sugg.source] = (sourceFrequency[sugg.source] || 0) + 1;
      
      // Track recent examples
      if (!recentSuggestions[sugg.recommendation_type]) {
        recentSuggestions[sugg.recommendation_type] = [];
      }
      if (recentSuggestions[sugg.recommendation_type].length < 3) {
        recentSuggestions[sugg.recommendation_type].push({
          text: sugg.recommendation_text,
          source: sugg.source,
          date: sugg.created_date
        });
      }
    });

    // Identify deficits (categories with 3+ suggestions)
    const deficits = Object.entries(categoryFrequency)
      .filter(([_, count]) => count >= 3)
      .map(([category, count]) => ({
        category,
        count,
        severity: count >= 10 ? 'critical' : count >= 6 ? 'high' : 'medium',
        examples: recentSuggestions[category] || []
      }))
      .sort((a, b) => b.count - a.count);

    // Map deficits to training recommendations
    const trainingMap = {
      'documentation': {
        scenarios: ['homebound_justification', 'skilled_need'],
        quizzes: ['medicare_cop', 'oasis']
      },
      'clinical': {
        scenarios: ['vital_signs', 'skilled_need'],
        quizzes: ['skilled_need', 'oasis']
      },
      'communication': {
        scenarios: ['patient_response'],
        quizzes: ['homebound', 'safety']
      },
      'compliance': {
        scenarios: ['homebound_justification', 'skilled_need', 'patient_response'],
        quizzes: ['medicare_cop', 'oasis', 'homebound']
      },
      'safety': {
        scenarios: ['vital_signs', 'patient_response'],
        quizzes: ['safety', 'infection_control']
      }
    };

    const recommendations = deficits.map(deficit => ({
      category: deficit.category,
      severity: deficit.severity,
      count: deficit.count,
      suggestedScenarios: trainingMap[deficit.category]?.scenarios || [],
      suggestedQuizzes: trainingMap[deficit.category]?.quizzes || [],
      priority: deficit.severity === 'critical' ? 1 : deficit.severity === 'high' ? 2 : 3
    })).sort((a, b) => a.priority - b.priority);

    return {
      deficits,
      recommendations,
      totalSuggestions: suggestions.length,
      analysis: {
        mostCommonCategory: Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1])[0],
        primarySource: Object.entries(sourceFrequency).sort((a, b) => b[1] - a[1])[0]
      }
    };
  } catch (error) {
    console.error("Error analyzing nurse deficits:", error);
    return null;
  }
};

export const getTrainingRecommendations = (deficitAnalysis) => {
  if (!deficitAnalysis || !deficitAnalysis.recommendations) return [];
  
  return deficitAnalysis.recommendations.slice(0, 5);
};