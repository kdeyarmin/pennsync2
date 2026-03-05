import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import ReferralTriageAnalyzer from '../components/referral/ReferralTriageAnalyzer';

/**
 * AI-Powered Referral Triage Workflow
 * Parse incoming unstructured clinical data and auto-generate care plans
 */
export default function ReferralTriage() {
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [showCreatePatient, setShowCreatePatient] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleTriageComplete = (analysis) => {
    setLastAnalysis(analysis);
    setShowCreatePatient(true);
  };

  const handleCreatePatientFromTriage = async () => {
    if (!lastAnalysis) return;

    try {
      // Create patient from triage analysis
      const patientData = {
        first_name: lastAnalysis.patient_name?.split(' ')[0] || 'Unknown',
        last_name: lastAnalysis.patient_name?.split(' ').slice(1).join(' ') || '',
        date_of_birth: lastAnalysis.date_of_birth === 'Not provided' ? null : lastAnalysis.date_of_birth,
        primary_diagnosis: lastAnalysis.primary_diagnosis,
        secondary_diagnoses: lastAnalysis.secondary_diagnoses || [],
        status: 'active',
        care_type: 'home_health',
        clinical_notes: lastAnalysis.clinical_summary,
      };

      const patient = await base44.entities.Patient.create(patientData);

      // Create initial care plans from preliminary care plan
      if (lastAnalysis.preliminary_care_plan?.initial_focus_areas?.length > 0) {
        const carePlans = lastAnalysis.preliminary_care_plan.initial_focus_areas.map((area, index) => ({
          patient_id: patient.id,
          problem: area,
          goal: `Address ${area.toLowerCase()} during care delivery`,
          interventions: [area],
          status: 'active',
          frequency: lastAnalysis.preliminary_care_plan.skilled_nursing_frequency,
          baseline_measurement: 'Initial assessment pending',
        }));

        await Promise.all(carePlans.map(plan => base44.entities.CarePlan.create(plan)));
      }

      // Create a referral intake task
      await base44.entities.Task.create({
        title: `Admission Setup: ${lastAnalysis.patient_name}`,
        description: `Complete admission assessment and reconcile medications. Urgency: ${lastAnalysis.urgency_level}`,
        type: 'schedule',
        priority: lastAnalysis.urgency_level === 'CRITICAL' ? 'high' : 'medium',
        status: 'pending',
        assigned_to: currentUser?.email,
        due_timeframe: lastAnalysis.urgency_level === 'CRITICAL' ? '24_hours' : 'this_week',
      });

      setShowCreatePatient(false);
      setLastAnalysis(null);
      alert(`Patient ${lastAnalysis.patient_name} created successfully!`);
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Referral Triage</h1>
        <p className="text-gray-600">
          AI-powered analysis of incoming referrals with automatic urgency assessment and care plan generation
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase">Time Saved</p>
                <p className="text-2xl font-bold text-blue-900">45+ min</p>
                <p className="text-xs text-blue-600 mt-1">per admission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase">Structured Data</p>
                <p className="text-2xl font-bold text-green-900">100%</p>
                <p className="text-xs text-green-600 mt-1">automatically parsed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-purple-600 font-semibold uppercase">Risk Flagged</p>
                <p className="text-2xl font-bold text-purple-900">Auto</p>
                <p className="text-xs text-purple-600 mt-1">priority assignment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Triage Analyzer */}
      <ReferralTriageAnalyzer onTriageComplete={handleTriageComplete} />

      {/* Post-Analysis Actions */}
      {lastAnalysis && showCreatePatient && (
        <Card className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-indigo-600" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Triage analysis complete! Create a patient record and preliminary care plans from this analysis?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleCreatePatientFromTriage}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <ArrowRight className="w-4 h-4" />
                Create Patient & Care Plans
              </Button>
              <Button
                onClick={() => setShowCreatePatient(false)}
                variant="outline"
              >
                Review More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { number: '1', title: 'Upload', desc: 'Paste referral or upload fax text' },
              { number: '2', title: 'Analyze', desc: 'AI parses and structures data' },
              { number: '3', title: 'Assess', desc: 'Urgency level and risk assigned' },
              { number: '4', title: 'Plan', desc: 'Care plan generated automatically' },
            ].map((step, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm mb-2">
                  {step.number}
                </div>
                <p className="font-semibold text-gray-900 mb-1">{step.title}</p>
                <p className="text-xs text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}