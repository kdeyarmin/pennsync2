import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  ClipboardCheck,
  Plus,
  X
} from "lucide-react";

export default function ClinicalDecisionSupport({ 
  patient, 
  visit,
  vitalSigns, 
  narrativeText,
  onAddSuggestion 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  useEffect(() => {
    const newSuggestions = [];

    // Check for vital signs documentation
    if (Object.keys(vitalSigns).length === 0) {
      newSuggestions.push({
        id: 'vital-signs',
        type: 'required',
        priority: 'high',
        title: 'Vital Signs Required',
        message: 'Medicare requires vital signs documentation for all skilled visits.',
        suggestions: [
          'Blood pressure',
          'Heart rate',
          'Respiratory rate',
          'Temperature',
          'Oxygen saturation',
          'Pain level'
        ],
        autoText: 'Vital signs obtained: Temperature [value]°F, Blood pressure [systolic]/[diastolic], Heart rate [value] bpm regular, Respiratory rate [value]/min unlabored, Oxygen saturation [value]% on room air, Pain level [0-10]/10.'
      });
    }

    // Check for CHF-specific documentation
    if (patient?.primary_diagnosis?.toLowerCase().includes('chf') || 
        patient?.primary_diagnosis?.toLowerCase().includes('heart failure')) {
      
      if (!narrativeText.toLowerCase().includes('edema') && 
          !narrativeText.toLowerCase().includes('swelling')) {
        newSuggestions.push({
          id: 'chf-edema',
          type: 'diagnosis-specific',
          priority: 'high',
          title: 'CHF: Edema Assessment Missing',
          message: 'For CHF patients, document peripheral edema assessment.',
          suggestions: [
            'Edema location (bilateral lower extremities, sacral)',
            'Edema grade (1+ to 4+, trace, none)',
            'Comparison to previous visit',
            'Pitting vs non-pitting'
          ],
          autoText: 'Lower extremity edema: [Grade] bilaterally, [improved/worsened/stable] compared to previous visit. No sacral edema noted.'
        });
      }

      if (!narrativeText.toLowerCase().includes('weight')) {
        newSuggestions.push({
          id: 'chf-weight',
          type: 'diagnosis-specific',
          priority: 'high',
          title: 'CHF: Weight Monitoring Missing',
          message: 'CHF patients require weight documentation at each visit.',
          suggestions: [
            'Current weight',
            'Comparison to baseline',
            'Weight trend',
            'Patient compliance with daily weights'
          ],
          autoText: 'Current weight: [value] lbs, [increased/decreased/stable] by [amount] lbs from baseline of [baseline] lbs. Patient reports [compliant/non-compliant] with daily weight monitoring.'
        });
      }

      if (!narrativeText.toLowerCase().includes('dyspnea') && 
          !narrativeText.toLowerCase().includes('shortness of breath')) {
        newSuggestions.push({
          id: 'chf-dyspnea',
          type: 'diagnosis-specific',
          priority: 'medium',
          title: 'CHF: Dyspnea Assessment',
          message: 'Document dyspnea status for CHF patients.',
          autoText: 'Patient reports [no dyspnea/dyspnea with exertion/dyspnea at rest]. No orthopnea or paroxysmal nocturnal dyspnea reported.'
        });
      }
    }

    // Check for COPD-specific documentation
    if (patient?.primary_diagnosis?.toLowerCase().includes('copd') || 
        patient?.primary_diagnosis?.toLowerCase().includes('emphysema') ||
        patient?.primary_diagnosis?.toLowerCase().includes('chronic bronchitis')) {
      
      if (!narrativeText.toLowerCase().includes('lung sounds') && 
          !narrativeText.toLowerCase().includes('breath sounds')) {
        newSuggestions.push({
          id: 'copd-lungs',
          type: 'diagnosis-specific',
          priority: 'high',
          title: 'COPD: Lung Sounds Required',
          message: 'Document detailed respiratory assessment for COPD patients.',
          autoText: 'Lung sounds: [clear/diminished/wheezes/crackles] bilaterally. Respiratory effort [unlabored/labored]. No use of accessory muscles noted.'
        });
      }

      if (!narrativeText.toLowerCase().includes('oxygen')) {
        newSuggestions.push({
          id: 'copd-oxygen',
          type: 'diagnosis-specific',
          priority: 'medium',
          title: 'COPD: Oxygen Status',
          message: 'Document oxygen usage and saturation.',
          autoText: 'Patient currently on oxygen at [liters] via [nasal cannula/mask]. Oxygen saturation [value]% on current settings. Patient demonstrates proper oxygen equipment use.'
        });
      }
    }

    // Check for diabetes documentation
    if (patient?.primary_diagnosis?.toLowerCase().includes('diabetes')) {
      if (!narrativeText.toLowerCase().includes('blood sugar') && 
          !narrativeText.toLowerCase().includes('glucose') &&
          !narrativeText.toLowerCase().includes('blood glucose')) {
        newSuggestions.push({
          id: 'diabetes-glucose',
          type: 'diagnosis-specific',
          priority: 'high',
          title: 'Diabetes: Blood Glucose Missing',
          message: 'Document blood glucose monitoring for diabetic patients.',
          autoText: 'Blood glucose: [value] mg/dL. Patient demonstrates proper glucometer technique. Patient verbalizes understanding of target glucose range [70-180] mg/dL.'
        });
      }

      if (!narrativeText.toLowerCase().includes('foot') && 
          !narrativeText.toLowerCase().includes('feet')) {
        newSuggestions.push({
          id: 'diabetes-foot',
          type: 'diagnosis-specific',
          priority: 'medium',
          title: 'Diabetes: Foot Assessment',
          message: 'Medicare requires regular foot assessment for diabetic patients.',
          autoText: 'Bilateral foot inspection completed. Skin intact, no lesions, ulcers, or areas of breakdown noted. Sensation intact to light touch. Patient demonstrates proper foot care techniques.'
        });
      }
    }

    // Check for wound documentation
    if (narrativeText.toLowerCase().includes('wound') || 
        narrativeText.toLowerCase().includes('pressure injury') ||
        narrativeText.toLowerCase().includes('ulcer')) {
      
      const hasSize = /\d+\s*x\s*\d+\s*(x\s*\d+)?/.test(narrativeText);
      const hasStage = /(stage\s*[1-4]|unstageable|deep tissue)/i.test(narrativeText);
      
      if (!hasSize || !hasStage) {
        newSuggestions.push({
          id: 'wound-detail',
          type: 'required',
          priority: 'high',
          title: 'Wound Documentation Incomplete',
          message: 'Medicare requires detailed wound measurements and staging.',
          suggestions: [
            'Length x Width x Depth in cm',
            'Wound stage (Stage 1-4, Unstageable, Deep Tissue Injury)',
            'Wound bed characteristics (% granulation, slough, eschar)',
            'Drainage amount and type',
            'Periwound condition',
            'Pain level during dressing change',
            'Treatment provided'
          ],
          autoText: 'Wound assessment: [Location] wound measuring [L] x [W] x [D] cm, Stage [#]. Wound bed [%] granulation tissue, [%] slough. Minimal/moderate/large amount of [serous/serosanguinous/purulent] drainage. Periwound skin intact. Pain [0-10]/10 during dressing change. Dressing changed with [product]. Patient/caregiver instructed on wound care.'
        });
      }
    }

    // Check for medication management documentation
    if (!narrativeText.toLowerCase().includes('medication') && 
        visit?.visit_type !== 'admission') {
      newSuggestions.push({
        id: 'medication-management',
        type: 'recommended',
        priority: 'medium',
        title: 'Medication Management',
        message: 'Consider documenting medication compliance and education.',
        autoText: 'Medication compliance assessed via pill organizer review. Patient taking medications as prescribed. Patient verbalizes understanding of medication purposes and dosing schedules. No reported side effects.'
      });
    }

    // Check for patient education
    if (!narrativeText.toLowerCase().includes('education') && 
        !narrativeText.toLowerCase().includes('teaching') &&
        !narrativeText.toLowerCase().includes('instructed')) {
      newSuggestions.push({
        id: 'patient-education',
        type: 'recommended',
        priority: 'medium',
        title: 'Patient Education',
        message: 'Document education provided during visit.',
        autoText: 'Patient/caregiver education provided regarding [topics]. [Verbal/written/demonstration] teaching methods utilized. Patient/caregiver demonstrates understanding and verbalizes key concepts.'
      });
    }

    // Check for safety assessment
    if (!narrativeText.toLowerCase().includes('safety') && 
        !narrativeText.toLowerCase().includes('fall risk')) {
      newSuggestions.push({
        id: 'safety-assessment',
        type: 'recommended',
        priority: 'low',
        title: 'Safety Assessment',
        message: 'Consider documenting home safety and fall risk.',
        autoText: 'Home safety assessment completed. Environment free of fall hazards. Patient demonstrates safe mobility with/without assistive device. Fall risk precautions reviewed with patient/caregiver.'
      });
    }

    // Check for physician communication
    if (vitalSigns.blood_pressure_systolic > 160 || vitalSigns.blood_pressure_systolic < 90) {
      newSuggestions.push({
        id: 'bp-alert',
        type: 'alert',
        priority: 'high',
        title: 'Abnormal Blood Pressure Alert',
        message: `Blood pressure ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} is outside normal parameters.`,
        suggestions: [
          'Document physician notification',
          'Document orders received',
          'Document patient instructions provided'
        ],
        autoText: `Blood pressure ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} noted. Physician Dr. [name] notified via phone at [time]. [Orders received/No new orders at this time]. Patient instructed to [instructions].`
      });
    }

    if (vitalSigns.oxygen_saturation && vitalSigns.oxygen_saturation < 92) {
      newSuggestions.push({
        id: 'o2-alert',
        type: 'alert',
        priority: 'high',
        title: 'Low Oxygen Saturation Alert',
        message: `Oxygen saturation ${vitalSigns.oxygen_saturation}% is below 92%.`,
        autoText: `Oxygen saturation ${vitalSigns.oxygen_saturation}% noted. Physician notified. Patient assessed for respiratory distress. [Oxygen initiated/adjusted to maintain saturation >90%]. Patient will be monitored closely.`
      });
    }

    // Filter out dismissed suggestions
    const filteredSuggestions = newSuggestions.filter(
      s => !dismissedSuggestions.includes(s.id)
    );

    setSuggestions(filteredSuggestions);
  }, [patient, visit, vitalSigns, narrativeText, dismissedSuggestions]);

  const handleDismiss = (suggestionId) => {
    setDismissedSuggestions([...dismissedSuggestions, suggestionId]);
  };

  const handleAddSuggestion = (suggestionText) => {
    onAddSuggestion(suggestionText);
  };

  if (suggestions.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Documentation Looking Good!</p>
              <p className="text-sm text-green-700">No critical items missing from your note.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <ClipboardCheck className="w-5 h-5 text-blue-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority, type) => {
    if (type === 'alert') return 'border-red-300 bg-red-50';
    switch (priority) {
      case 'high':
        return 'border-orange-300 bg-orange-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      required: 'Required',
      'diagnosis-specific': 'Diagnosis-Specific',
      recommended: 'Recommended',
      alert: 'Alert'
    };
    return labels[type] || 'Suggestion';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          Clinical Decision Support ({suggestions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <Alert key={suggestion.id} className={getPriorityColor(suggestion.priority, suggestion.type)}>
            <div className="flex items-start gap-3">
              {getPriorityIcon(suggestion.priority)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertDescription className="font-semibold text-gray-900 mb-0">
                    {suggestion.title}
                  </AlertDescription>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(suggestion.type)}
                  </Badge>
                </div>
                <AlertDescription className="text-sm text-gray-700 mb-3">
                  {suggestion.message}
                </AlertDescription>

                {suggestion.suggestions && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Consider documenting:</p>
                    <ul className="list-disc ml-5 text-xs text-gray-600 space-y-0.5">
                      {suggestion.suggestions.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.autoText && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddSuggestion(suggestion.autoText)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add to Note
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}