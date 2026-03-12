import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Stethoscope,
  ClipboardList,
  Target,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  Heart,
  Activity
} from "lucide-react";

const SOAP_SECTIONS = [
  {
    id: 'subjective',
    label: 'Subjective',
    icon: User,
    placeholder: "Patient's complaints, symptoms, what they report...\nExample: Patient reports increased shortness of breath over past 2 days. States 'I can barely walk to the bathroom.' Denies chest pain.",
    prompts: []
  },
  {
    id: 'objective',
    label: 'Objective',
    icon: Stethoscope,
    placeholder: "Vital signs, physical findings, observations...\nExample: VS: BP 142/88, HR 92, RR 22, O2 94% RA. Lungs with bilateral crackles. 2+ pitting edema bilateral lower extremities.",
    prompts: []
  },
  {
    id: 'assessment',
    label: 'Assessment',
    icon: ClipboardList,
    placeholder: "Your clinical assessment, patient status...\nExample: CHF exacerbation with fluid overload. Patient showing signs of decompensation. Medication compliance appears good.",
    prompts: []
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: Target,
    placeholder: "Interventions performed, teaching, next steps...\nExample: Reinforced daily weight monitoring. Educated on low sodium diet. Will notify physician of findings. RTC in 2 days.",
    prompts: []
  }
];

export default function GuidedDocumentationFlow({
  diagnosis,
  careType,
  visitType,
  onNoteChange,
  initialNote = "",
  patient = null,
  previousVisits = [],
  carePlans = [],
  prefillData = null
}) {
  const [activeSection, setActiveSection] = useState('subjective');
  const [sections, setSections] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [contextualPrompts, setContextualPrompts] = useState([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);
  const [sentenceStarters, setSentenceStarters] = useState({});
  const [criticalReminders, setCriticalReminders] = useState([]);
  const [vitalBaselines, setVitalBaselines] = useState(null);

  // Load contextual prompts when diagnosis/visit type changes
  useEffect(() => {
    if (diagnosis) {
      loadContextualPrompts();
    }
  }, [diagnosis, visitType, careType]);

  // Apply prefill data from IntelligentPatientContext
  useEffect(() => {
    if (prefillData && !hasAppliedPrefill) {
      setSections(prev => ({
        ...prev,
        ...prefillData
      }));
      setHasAppliedPrefill(true);
    }
  }, [prefillData, hasAppliedPrefill]);

  // Combine sections and notify parent
  useEffect(() => {
    const combinedNote = Object.entries(sections)
      .filter(([_, value]) => value.trim())
      .map(([key, value]) => `${key.toUpperCase()}:\n${value}`)
      .join('\n\n');
    onNoteChange && onNoteChange(combinedNote);
  }, [sections]);

  // Get last visit summary for context
  const getLastVisitContext = () => {
    if (!previousVisits || previousVisits.length === 0) return '';
    const lastVisit = previousVisits[0];
    return `
LAST VISIT NOTES: ${lastVisit.nurse_notes?.substring(0, 500) || 'None'}
LAST VITAL SIGNS: ${lastVisit.vital_signs ? JSON.stringify(lastVisit.vital_signs) : 'None'}`;
  };

  // Extract vital baselines from previous visits
  useEffect(() => {
    if (previousVisits?.length > 0) {
      const lastVisit = previousVisits[0];
      if (lastVisit?.vital_signs) {
        setVitalBaselines(lastVisit.vital_signs);
      }
    }
  }, [previousVisits]);

  const loadContextualPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const lastVisitContext = getLastVisitContext();
      const activeGoals = carePlans.filter(cp => cp.status === 'active');
      const activeGoalsList = activeGoals.map(cp => `${cp.problem}: ${cp.goal}`).join('\n');
      const lastVitals = previousVisits?.[0]?.vital_signs;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert clinical documentation assistant. Generate HIGHLY SPECIFIC, condition-aware documentation prompts for a ${careType} ${visitType} visit.

PATIENT CONTEXT:
${patient ? `Name: ${patient.first_name} ${patient.last_name}` : ''}
Primary Diagnosis: ${diagnosis || 'Not specified'}
Secondary Diagnoses: ${patient?.secondary_diagnoses?.join(', ') || 'None'}
Allergies: ${patient?.allergies || 'NKDA'}

ACTIVE CARE PLAN GOALS:
${activeGoalsList || 'None'}

LAST VISIT DATA:
${lastVisitContext}
${lastVitals ? `
Last Vitals:
- BP: ${lastVitals.blood_pressure_systolic}/${lastVitals.blood_pressure_diastolic}
- HR: ${lastVitals.heart_rate}
- Weight: ${lastVitals.weight}
- O2: ${lastVitals.oxygen_saturation}%
- Pain: ${lastVitals.pain_level}/10
` : ''}

INSTRUCTIONS:
Generate prompts that are SPECIFIC to this patient's conditions. Examples:
- For CHF: Ask about edema levels, daily weights, orthopnea, paroxysmal nocturnal dyspnea
- For COPD: Ask about sputum color/amount, inhaler technique, oxygen use
- For Diabetes: Ask about blood glucose logs, foot exam findings, hypoglycemia symptoms
- For Wounds: Ask about wound measurements, drainage, tissue type, periwound skin
- For Pain: Ask about pain quality, location, aggravating/alleviating factors

For each SOAP section, provide:
1. 3-4 SPECIFIC clickable prompts tailored to this patient's diagnoses
2. 2-3 sentence starters the nurse can click to begin documenting
3. Any critical items that MUST be documented for this patient

Return JSON:
{
  "subjective": {
    "prompts": ["specific question 1", "specific question 2", "specific question 3"],
    "sentence_starters": ["Patient reports...", "Since last visit, patient states..."]
  },
  "objective": {
    "prompts": ["specific assessment 1", "specific assessment 2", "specific assessment 3"],
    "sentence_starters": ["On examination...", "Vital signs today show..."],
    "vital_comparisons": ["what to compare from last visit"]
  },
  "assessment": {
    "prompts": ["clinical judgment prompt 1", "clinical judgment prompt 2"],
    "sentence_starters": ["Patient's condition is...", "Compared to last visit..."]
  },
  "plan": {
    "prompts": ["intervention prompt 1", "teaching prompt 2", "follow-up prompt 3"],
    "sentence_starters": ["Interventions performed today include...", "Patient education provided on..."],
    "education_topics": ["specific education topics for this patient's conditions"]
  },
  "critical_reminders": ["critical documentation items for this patient"],
  "diagnosis_specific_focus": {
    "primary_focus": "main thing to assess for this diagnosis",
    "red_flags": ["warning signs to document if present"],
    "required_assessments": ["assessments required for this condition"]
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "object" },
            objective: { type: "object" },
            assessment: { type: "object" },
            plan: { type: "object" },
            critical_reminders: { type: "array", items: { type: "string" } },
            diagnosis_specific_focus: { type: "object" }
          }
        }
      });
      
      // Extract prompts for each section
      setContextualPrompts({
        subjective: result.subjective?.prompts || [],
        objective: result.objective?.prompts || [],
        assessment: result.assessment?.prompts || [],
        plan: result.plan?.prompts || []
      });
      
      // Store sentence starters
      setSentenceStarters({
        subjective: result.subjective?.sentence_starters || [],
        objective: result.objective?.sentence_starters || [],
        assessment: result.assessment?.sentence_starters || [],
        plan: result.plan?.sentence_starters || [],
        education_topics: result.plan?.education_topics || [],
        vital_comparisons: result.objective?.vital_comparisons || []
      });
      
      // Store critical reminders
      setCriticalReminders(result.critical_reminders || []);
      
      // Store diagnosis-specific focus for display
      if (result.diagnosis_specific_focus) {
        setDiagnosisFocus(result.diagnosis_specific_focus);
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
    }
    setIsLoadingPrompts(false);
  };
  
  const [diagnosisFocus, setDiagnosisFocus] = useState(null);

  const handleSectionChange = (sectionId, value) => {
    setSections(prev => ({ ...prev, [sectionId]: value }));
  };

  const insertPromptText = (text) => {
    setSections(prev => ({
      ...prev,
      [activeSection]: prev[activeSection] + (prev[activeSection] ? '\n' : '') + text + ' '
    }));
  };

  const getSectionCompleteness = (sectionId) => {
    const content = sections[sectionId];
    if (!content) return 0;
    if (content.length < 20) return 25;
    if (content.length < 50) return 50;
    if (content.length < 100) return 75;
    return 100;
  };

  const goToNextSection = () => {
    const sectionIds = SOAP_SECTIONS.map(s => s.id);
    const currentIndex = sectionIds.indexOf(activeSection);
    if (currentIndex < sectionIds.length - 1) {
      setActiveSection(sectionIds[currentIndex + 1]);
    }
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Guided SOAP Documentation</span>
          <div className="flex gap-1">
            {SOAP_SECTIONS.map((section) => (
              <Badge
                key={section.id}
                variant="outline"
                className={`text-xs ${
                  getSectionCompleteness(section.id) === 100 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : getSectionCompleteness(section.id) > 0
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : 'bg-gray-100'
                }`}
              >
                {section.label.charAt(0)}
                {getSectionCompleteness(section.id) === 100 && <CheckCircle2 className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="w-full rounded-none border-b">
            {SOAP_SECTIONS.map((section) => (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex-1 gap-1"
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SOAP_SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id} className="p-4 space-y-3">
              {/* Critical Reminders for this section */}
              {section.id === 'subjective' && criticalReminders.length > 0 && (
                <Alert className="bg-amber-50 border-amber-300 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    <strong>Critical for this patient:</strong> {criticalReminders.join(' • ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Diagnosis-Specific Focus */}
              {section.id === 'objective' && diagnosisFocus && (
                <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Focus for {diagnosis}:
                  </p>
                  <p className="text-xs text-purple-700 mb-2">{diagnosisFocus.primary_focus}</p>
                  {diagnosisFocus.required_assessments?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {diagnosisFocus.required_assessments.map((assess, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs bg-white cursor-pointer hover:bg-purple-100"
                          onClick={() => insertPromptText(`${assess}: `)}
                        >
                          {assess}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Red Flags to Watch */}
              {section.id === 'assessment' && diagnosisFocus?.red_flags?.length > 0 && (
                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Red Flags to Document if Present:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {diagnosisFocus.red_flags.map((flag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs bg-white text-red-700 border-red-300 cursor-pointer hover:bg-red-100"
                        onClick={() => insertPromptText(`${flag}: `)}
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vital Signs Comparison - Objective section */}
              {section.id === 'objective' && vitalBaselines && (
                <div className="bg-gray-50 p-2 rounded-lg border">
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Last Visit Vitals (compare today):
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {vitalBaselines.blood_pressure_systolic && (
                      <span className="bg-white px-2 py-1 rounded border">
                        BP: {vitalBaselines.blood_pressure_systolic}/{vitalBaselines.blood_pressure_diastolic}
                      </span>
                    )}
                    {vitalBaselines.heart_rate && (
                      <span className="bg-white px-2 py-1 rounded border">HR: {vitalBaselines.heart_rate}</span>
                    )}
                    {vitalBaselines.weight && (
                      <span className="bg-white px-2 py-1 rounded border">Wt: {vitalBaselines.weight} lbs</span>
                    )}
                    {vitalBaselines.oxygen_saturation && (
                      <span className="bg-white px-2 py-1 rounded border">O2: {vitalBaselines.oxygen_saturation}%</span>
                    )}
                  </div>
                  {sentenceStarters.vital_comparisons?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Compare: {sentenceStarters.vital_comparisons.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Sentence Starters */}
              {sentenceStarters[section.id]?.length > 0 && (
                <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Quick Start:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sentenceStarters[section.id].map((starter, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-xs bg-white hover:bg-green-100 text-green-800 border-green-300"
                        onClick={() => insertPromptText(starter)}
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Topics - Plan section */}
              {section.id === 'plan' && sentenceStarters.education_topics?.length > 0 && (
                <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                  <p className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Patient Education for This Condition:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sentenceStarters.education_topics.map((topic, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-xs bg-white hover:bg-indigo-100"
                        onClick={() => insertPromptText(`Educated patient on ${topic}. `)}
                      >
                        {topic}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual Prompts */}
              {contextualPrompts[section.id]?.length > 0 && (
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Document for {diagnosis}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contextualPrompts[section.id].map((prompt, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-xs bg-white hover:bg-blue-100"
                        onClick={() => insertPromptText(prompt + ': ')}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoadingPrompts && (
                <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Loading condition-specific prompts...
                </div>
              )}

              <Textarea
                value={sections[section.id]}
                onChange={(e) => handleSectionChange(section.id, e.target.value)}
                placeholder={section.placeholder}
                className="min-h-[150px] font-mono text-sm"
              />

              <div className="flex justify-between">
                <p className="text-xs text-gray-500">
                  {sections[section.id].length} characters
                </p>
                {activeSection !== 'plan' && (
                  <Button
                    size="sm"
                    onClick={goToNextSection}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Next: {SOAP_SECTIONS[SOAP_SECTIONS.findIndex(s => s.id === activeSection) + 1]?.label}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}