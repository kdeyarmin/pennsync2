import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Heart,
  Home,
  Users,
  Sparkles
} from "lucide-react";

export default function StarRatingsSimulator() {
  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
    initialData: [],
  });

  // Calculate Medicare Quality Measures
  const qualityMeasures = useMemo(() => {
    const completedVisits = visits.filter(v => v.status === 'completed');
    const homeHealthPatients = patients.filter(p => p.care_type === 'home_health' && p.status === 'active');
    
    // Measure 1: Improvement in Ambulation/Locomotion
    const ambulationImprovement = 75; // Mock - would calculate from OASIS data
    
    // Measure 2: Improvement in Bed Transferring
    const bedTransferImprovement = 72;
    
    // Measure 3: Improvement in Bathing
    const bathingImprovement = 68;
    
    // Measure 4: Improvement in Dyspnea
    const dyspneaImprovement = 70;
    
    // Measure 5: Acute Care Hospitalization
    const hospitalizations = incidents.filter(i => i.incident_type === 'hospitalized').length;
    const hospitalizationRate = homeHealthPatients.length > 0 
      ? ((hospitalizations / homeHealthPatients.length) * 100).toFixed(1)
      : 0;
    
    // Measure 6: Emergency Department Use Without Hospitalization
    const edVisits = incidents.filter(i => i.incident_type === 'emergency_visit').length;
    const edRate = homeHealthPatients.length > 0
      ? ((edVisits / homeHealthPatients.length) * 100).toFixed(1)
      : 0;
    
    // Measure 7: Improvement in Management of Oral Medications
    const medicationManagement = 80;
    
    // Measure 8: Timely Initiation of Care
    const admissionVisits = completedVisits.filter(v => v.visit_type === 'admission');
    const timelySOC = admissionVisits.length > 0
      ? ((admissionVisits.filter(v => {
          // Check if visit was within 48 hours of referral (mock calculation)
          return true; // Would calculate actual timeliness
        }).length / admissionVisits.length) * 100).toFixed(1)
      : 100;
    
    // Measure 9: Influenza Vaccination Coverage
    const fluVaccination = 85; // Mock - would track from patient data
    
    // Measure 10: Pneumococcal Vaccination Coverage
    const pneumoVaccination = 82;
    
    // Measure 11: Drug Education on All Medications
    const drugEducation = 92;
    
    // Measure 12: Falls with Injury
    const fallsWithInjury = incidents.filter(i => 
      i.incident_type === 'fall' && 
      i.severity === 'high'
    ).length;
    const fallRate = homeHealthPatients.length > 0
      ? ((fallsWithInjury / homeHealthPatients.length) * 100).toFixed(1)
      : 0;
    
    return [
      {
        id: 'm1',
        name: 'Improvement in Ambulation/Locomotion',
        category: 'Functional Outcomes',
        value: ambulationImprovement,
        benchmark: 65,
        weight: 'High',
        trend: 'improving',
        target: 70,
        impact: 'high'
      },
      {
        id: 'm2',
        name: 'Improvement in Bed Transferring',
        category: 'Functional Outcomes',
        value: bedTransferImprovement,
        benchmark: 60,
        weight: 'High',
        trend: 'improving',
        target: 65,
        impact: 'high'
      },
      {
        id: 'm3',
        name: 'Improvement in Bathing',
        category: 'Functional Outcomes',
        value: bathingImprovement,
        benchmark: 62,
        weight: 'High',
        trend: 'stable',
        target: 68,
        impact: 'high'
      },
      {
        id: 'm4',
        name: 'Improvement in Dyspnea',
        category: 'Functional Outcomes',
        value: dyspneaImprovement,
        benchmark: 58,
        weight: 'Medium',
        trend: 'improving',
        target: 65,
        impact: 'medium'
      },
      {
        id: 'm5',
        name: 'Acute Care Hospitalization',
        category: 'Healthcare Utilization',
        value: parseFloat(hospitalizationRate),
        benchmark: 18,
        weight: 'Very High',
        trend: hospitalizationRate < 18 ? 'improving' : 'needs_attention',
        target: 15,
        impact: 'critical',
        lowerIsBetter: true
      },
      {
        id: 'm6',
        name: 'Emergency Department Use',
        category: 'Healthcare Utilization',
        value: parseFloat(edRate),
        benchmark: 12,
        weight: 'High',
        trend: edRate < 12 ? 'improving' : 'needs_attention',
        target: 10,
        impact: 'high',
        lowerIsBetter: true
      },
      {
        id: 'm7',
        name: 'Improvement in Management of Oral Medications',
        category: 'Clinical Quality',
        value: medicationManagement,
        benchmark: 75,
        weight: 'Medium',
        trend: 'improving',
        target: 85,
        impact: 'medium'
      },
      {
        id: 'm8',
        name: 'Timely Initiation of Care',
        category: 'Process Measures',
        value: parseFloat(timelySOC),
        benchmark: 95,
        weight: 'High',
        trend: 'excellent',
        target: 98,
        impact: 'high'
      },
      {
        id: 'm9',
        name: 'Influenza Vaccination Coverage',
        category: 'Preventive Care',
        value: fluVaccination,
        benchmark: 80,
        weight: 'Low',
        trend: 'improving',
        target: 90,
        impact: 'low'
      },
      {
        id: 'm10',
        name: 'Pneumococcal Vaccination Coverage',
        category: 'Preventive Care',
        value: pneumoVaccination,
        benchmark: 78,
        weight: 'Low',
        trend: 'improving',
        target: 88,
        impact: 'low'
      },
      {
        id: 'm11',
        name: 'Drug Education on All Medications',
        category: 'Patient Education',
        value: drugEducation,
        benchmark: 88,
        weight: 'Medium',
        trend: 'excellent',
        target: 95,
        impact: 'medium'
      },
      {
        id: 'm12',
        name: 'Falls with Injury',
        category: 'Patient Safety',
        value: parseFloat(fallRate),
        benchmark: 5,
        weight: 'High',
        trend: fallRate < 5 ? 'excellent' : 'needs_attention',
        target: 3,
        impact: 'high',
        lowerIsBetter: true
      }
    ];
  }, [patients, visits, incidents]);

  // Calculate overall Star Rating (1-5 stars)
  const calculateStarRating = () => {
    let totalScore = 0;
    let weightedSum = 0;
    
    qualityMeasures.forEach(measure => {
      const weightValue = {
        'Very High': 4,
        'High': 3,
        'Medium': 2,
        'Low': 1
      }[measure.weight];
      
      let score;
      if (measure.lowerIsBetter) {
        // For measures where lower is better (hospitalizations, falls)
        score = measure.value <= measure.benchmark ? 100 : 
                Math.max(0, 100 - ((measure.value - measure.benchmark) / measure.benchmark * 100));
      } else {
        // For measures where higher is better
        score = (measure.value / measure.benchmark) * 100;
      }
      
      totalScore += score * weightValue;
      weightedSum += weightValue;
    });
    
    const avgScore = totalScore / weightedSum;
    
    // Convert to 5-star scale
    if (avgScore >= 95) return 5;
    if (avgScore >= 85) return 4;
    if (avgScore >= 75) return 3;
    if (avgScore >= 65) return 2;
    return 1;
  };

  const currentStarRating = calculateStarRating();

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'needs_attention':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'excellent':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getImpactColor = (impact) => {
    switch(impact) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const categories = [...new Set(qualityMeasures.map(m => m.category))];

  return (
    <div className="space-y-6">
      {/* Current Star Rating */}
      <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-none">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-12 h-12 ${
                    i < currentStarRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-white opacity-30'
                  }`}
                />
              ))}
            </div>
            <h2 className="text-4xl font-bold mb-2">
              {currentStarRating} Star{currentStarRating !== 1 ? 's' : ''}
            </h2>
            <p className="text-purple-100 text-lg">Current Medicare Star Rating</p>
            <p className="text-sm text-purple-200 mt-4">
              Based on {qualityMeasures.length} quality measures
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Above Benchmark</p>
                <p className="text-3xl font-bold text-green-600">
                  {qualityMeasures.filter(m => 
                    m.lowerIsBetter ? m.value <= m.benchmark : m.value >= m.benchmark
                  ).length}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Needs Improvement</p>
                <p className="text-3xl font-bold text-orange-600">
                  {qualityMeasures.filter(m => 
                    m.lowerIsBetter ? m.value > m.benchmark : m.value < m.benchmark
                  ).length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">High Impact Areas</p>
                <p className="text-3xl font-bold text-purple-600">
                  {qualityMeasures.filter(m => m.impact === 'critical' || m.impact === 'high').length}
                </p>
              </div>
              <Target className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Potential Stars</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {Math.min(5, currentStarRating + 1)}
                </p>
              </div>
              <Award className="w-10 h-10 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Measures by Category */}
      {categories.map(category => {
        const categoryMeasures = qualityMeasures.filter(m => m.category === category);
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category === 'Functional Outcomes' && <Heart className="w-5 h-5 text-blue-600" />}
                {category === 'Healthcare Utilization' && <Activity className="w-5 h-5 text-red-600" />}
                {category === 'Clinical Quality' && <Target className="w-5 h-5 text-purple-600" />}
                {category === 'Process Measures' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {category === 'Preventive Care' && <Home className="w-5 h-5 text-orange-600" />}
                {category === 'Patient Education' && <Users className="w-5 h-5 text-cyan-600" />}
                {category === 'Patient Safety' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryMeasures.map(measure => {
                const performanceVsBenchmark = measure.lowerIsBetter
                  ? ((measure.benchmark - measure.value) / measure.benchmark * 100)
                  : ((measure.value - measure.benchmark) / measure.benchmark * 100);
                
                const isAboveBenchmark = measure.lowerIsBetter
                  ? measure.value <= measure.benchmark
                  : measure.value >= measure.benchmark;

                return (
                  <div key={measure.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{measure.name}</h4>
                          {getTrendIcon(measure.trend)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getImpactColor(measure.impact)}>
                            {measure.weight} Weight
                          </Badge>
                          <Badge variant="outline">
                            {measure.lowerIsBetter ? 'Lower is Better' : 'Higher is Better'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          {measure.value}%
                        </p>
                        <p className="text-sm text-gray-600">
                          Benchmark: {measure.benchmark}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress to Target</span>
                        <span className="font-semibold">
                          {measure.target}% target
                        </span>
                      </div>
                      <Progress 
                        value={measure.lowerIsBetter 
                          ? Math.max(0, 100 - (measure.value / measure.target * 100))
                          : (measure.value / measure.target * 100)
                        }
                        className="h-2"
                      />
                    </div>

                    {!isAboveBenchmark && (
                      <Alert className="mt-3 bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-900 text-sm">
                          <strong>Action Needed:</strong> This measure is below the national benchmark. 
                          Improving this {measure.weight.toLowerCase()}-weight measure will significantly impact your star rating.
                        </AlertDescription>
                      </Alert>
                    )}

                    {isAboveBenchmark && performanceVsBenchmark >= 20 && (
                      <Alert className="mt-3 bg-green-50 border-green-200">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Excellent Performance:</strong> {performanceVsBenchmark.toFixed(0)}% above benchmark!
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Recommendations */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI-Powered Recommendations to Improve Star Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-white border-indigo-200">
            <Target className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <strong>Priority 1: Reduce Hospitalizations</strong>
              <p className="text-sm text-gray-700 mt-1">
                Focus on the Early Warning System for high-risk patients. Implement proactive interventions 
                for patients showing signs of deterioration. This is a "Very High" weight measure.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="bg-white border-indigo-200">
            <Activity className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <strong>Priority 2: Enhance Functional Outcomes Documentation</strong>
              <p className="text-sm text-gray-700 mt-1">
                Ensure OASIS assessments accurately capture improvements in ambulation, bathing, and transfers. 
                Use the OASIS Scrubber tool to validate data quality.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="bg-white border-indigo-200">
            <Home className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <strong>Priority 3: Fall Prevention Protocol</strong>
              <p className="text-sm text-gray-700 mt-1">
                Implement systematic fall risk assessment at every visit. Document environmental modifications 
                and patient/caregiver education on fall prevention.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="bg-white border-indigo-200">
            <Users className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <strong>Priority 4: Medication Management Excellence</strong>
              <p className="text-sm text-gray-700 mt-1">
                Use the Medication Reconciliation tool at every visit. Document patient understanding 
                and compliance with medication regimen.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}