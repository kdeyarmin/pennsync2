import React, { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lightbulb,
  Heart,
  Activity,
  Droplet,
  Shield,
  Stethoscope,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

export default function ClinicalBestPracticeAlerts({ patient, vitalSigns, narrativeText }) {
  const alerts = useMemo(() => {
    const practiceAlerts = [];
    const diagnosis = patient?.primary_diagnosis?.toLowerCase() || '';

    // CHF Best Practices
    if (diagnosis.includes('chf') || diagnosis.includes('heart failure')) {
      practiceAlerts.push({
        id: 'chf-1',
        category: 'CHF Management',
        icon: Heart,
        priority: 'high',
        title: 'Daily Weight Monitoring',
        description: 'CHF patients should be weighed daily at the same time. Document weight and educate patient to report gain of 2-3 lbs in 24 hours or 5 lbs in a week.',
        implemented: narrativeText?.toLowerCase().includes('weight') || vitalSigns?.weight,
        evidence: 'ACC/AHA Heart Failure Guidelines'
      });

      practiceAlerts.push({
        id: 'chf-2',
        category: 'CHF Management',
        icon: Droplet,
        priority: 'high',
        title: 'Fluid Restriction Education',
        description: 'Document patient understanding of fluid restriction (typically 2L/day). Assess compliance and barriers.',
        implemented: narrativeText?.toLowerCase().includes('fluid'),
        evidence: 'ACC/AHA Heart Failure Guidelines'
      });

      practiceAlerts.push({
        id: 'chf-3',
        category: 'CHF Management',
        icon: Activity,
        priority: 'high',
        title: 'Edema Assessment',
        description: 'Systematically assess for peripheral edema (grade 0-4+). Document location and pitting nature.',
        implemented: narrativeText?.toLowerCase().includes('edema'),
        evidence: 'HFSA Practice Guidelines'
      });
    }

    // Diabetes Best Practices
    if (diagnosis.includes('diabetes') || diagnosis.includes('dm')) {
      practiceAlerts.push({
        id: 'dm-1',
        category: 'Diabetes Management',
        icon: Activity,
        priority: 'high',
        title: 'Foot Inspection',
        description: 'Inspect feet bilaterally at every visit. Document skin integrity, sensation, pulses, and any lesions.',
        implemented: narrativeText?.toLowerCase().includes('foot') || narrativeText?.toLowerCase().includes('feet'),
        evidence: 'ADA Standards of Care'
      });

      practiceAlerts.push({
        id: 'dm-2',
        category: 'Diabetes Management',
        icon: Droplet,
        priority: 'high',
        title: 'Blood Glucose Monitoring',
        description: 'Review blood glucose log. Document frequency of monitoring, trends, and hypoglycemic episodes.',
        implemented: narrativeText?.toLowerCase().includes('glucose') || narrativeText?.toLowerCase().includes('blood sugar'),
        evidence: 'ADA Standards of Care'
      });

      practiceAlerts.push({
        id: 'dm-3',
        category: 'Diabetes Management',
        icon: Stethoscope,
        priority: 'medium',
        title: 'Monofilament Testing',
        description: 'Test sensation with monofilament. Document results for each foot.',
        implemented: narrativeText?.toLowerCase().includes('monofilament') || narrativeText?.toLowerCase().includes('sensation'),
        evidence: 'ADA Standards of Care'
      });
    }

    // COPD Best Practices
    if (diagnosis.includes('copd') || diagnosis.includes('emphysema') || diagnosis.includes('chronic bronchitis')) {
      practiceAlerts.push({
        id: 'copd-1',
        category: 'COPD Management',
        icon: Activity,
        priority: 'high',
        title: 'Oxygen Saturation Monitoring',
        description: 'Monitor O2 saturation at rest and with activity. Document oxygen requirements and patient compliance.',
        implemented: vitalSigns?.oxygen_saturation,
        evidence: 'GOLD COPD Guidelines'
      });

      practiceAlerts.push({
        id: 'copd-2',
        category: 'COPD Management',
        icon: Stethoscope,
        priority: 'high',
        title: 'Inhaler Technique Assessment',
        description: 'Assess and teach proper inhaler technique. Document patient demonstration of correct use.',
        implemented: narrativeText?.toLowerCase().includes('inhaler'),
        evidence: 'GOLD COPD Guidelines'
      });

      practiceAlerts.push({
        id: 'copd-3',
        category: 'COPD Management',
        icon: AlertTriangle,
        priority: 'high',
        title: 'Exacerbation Warning Signs',
        description: 'Educate on COPD exacerbation warning signs: increased dyspnea, sputum changes, fever. Provide action plan.',
        implemented: narrativeText?.toLowerCase().includes('exacerbation'),
        evidence: 'GOLD COPD Guidelines'
      });
    }

    // Wound Care Best Practices
    if (diagnosis.includes('wound') || diagnosis.includes('ulcer') || diagnosis.includes('pressure injury')) {
      practiceAlerts.push({
        id: 'wound-1',
        category: 'Wound Management',
        icon: Activity,
        priority: 'high',
        title: 'Wound Measurement',
        description: 'Measure wound dimensions (L x W x D in cm). Document wound bed characteristics, drainage, and periwound condition.',
        implemented: narrativeText?.toLowerCase().includes('wound') && (narrativeText?.toLowerCase().includes('cm') || narrativeText?.toLowerCase().includes('measurement')),
        evidence: 'WOCN Guidelines'
      });

      practiceAlerts.push({
        id: 'wound-2',
        category: 'Wound Management',
        icon: Shield,
        priority: 'high',
        title: 'Pressure Redistribution',
        description: 'Document pressure redistribution measures in place (special mattress, turning schedule, heel protectors).',
        implemented: narrativeText?.toLowerCase().includes('pressure') || narrativeText?.toLowerCase().includes('mattress'),
        evidence: 'NPUAP Guidelines'
      });

      practiceAlerts.push({
        id: 'wound-3',
        category: 'Wound Management',
        icon: Droplet,
        priority: 'medium',
        title: 'Nutritional Assessment',
        description: 'Assess nutritional status. Wound healing requires adequate protein, calories, vitamins C and zinc.',
        implemented: narrativeText?.toLowerCase().includes('nutrition') || narrativeText?.toLowerCase().includes('diet'),
        evidence: 'NPUAP Guidelines'
      });
    }

    // Universal Best Practices
    practiceAlerts.push({
      id: 'universal-1',
      category: 'Patient Safety',
      icon: AlertTriangle,
      priority: 'high',
      title: 'Fall Risk Assessment',
      description: 'Assess fall risk at every visit. Document risk factors, interventions, and patient/caregiver education.',
      implemented: narrativeText?.toLowerCase().includes('fall'),
      evidence: 'CDC Fall Prevention Guidelines'
    });

    practiceAlerts.push({
      id: 'universal-2',
      category: 'Patient Safety',
      icon: Shield,
      priority: 'medium',
      title: 'Medication Reconciliation',
      description: 'Review all medications at every visit. Identify discrepancies, duplications, and potential interactions.',
      implemented: narrativeText?.toLowerCase().includes('medication'),
      evidence: 'TJC National Patient Safety Goals'
    });

    practiceAlerts.push({
      id: 'universal-3',
      category: 'Patient Education',
      icon: Lightbulb,
      priority: 'medium',
      title: 'Teach-Back Method',
      description: 'Use teach-back to verify patient understanding. Document what was taught and patient demonstration of understanding.',
      implemented: narrativeText?.toLowerCase().includes('teach back') || narrativeText?.toLowerCase().includes('demonstrates understanding'),
      evidence: 'AHRQ Health Literacy Guidelines'
    });

    return practiceAlerts;
  }, [patient, vitalSigns, narrativeText]);

  const notImplemented = alerts.filter(a => !a.implemented);
  const implemented = alerts.filter(a => a.implemented);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          Clinical Best Practice Alerts
          <Badge className="ml-auto">{notImplemented.length} Pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notImplemented.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Recommended Actions
            </h4>
            {notImplemented.map(alert => {
              const Icon = alert.icon;
              return (
                <Alert key={alert.id} className="bg-orange-50 border-orange-200">
                  <Icon className="w-4 h-4 text-orange-600" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-orange-900">{alert.title}</strong>
                          <Badge className={getPriorityColor(alert.priority)}>
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-orange-800 mb-2">{alert.description}</p>
                        <p className="text-xs text-orange-700 italic">
                          Evidence: {alert.evidence}
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}

        {implemented.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Documented Best Practices
            </h4>
            <div className="grid gap-2">
              {implemented.map(alert => {
                const Icon = alert.icon;
                return (
                  <div key={alert.id} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-900">{alert.title}</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}