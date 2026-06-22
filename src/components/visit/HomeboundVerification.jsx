
import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added import for Tabs components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Home,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Shield,
  FileCheck,
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw // Added import for RefreshCw icon
} from "lucide-react";
import { toast } from 'sonner';

export default function HomeboundVerification({ 
  patient,
  visit,
  onHomeboundTextGenerated 
}) {
  const [showAssistant, setShowAssistant] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [complianceScore, setComplianceScore] = useState(0);
  const [generatedText, setGeneratedText] = useState("");
  
  // Homebound criteria checklist
  const [criteria, setCriteria] = useState({
    // Taxing Effort
    taxingEffort: false,
    taxingEffortDetails: "",
    
    // Assistance Required
    assistanceRequired: false,
    assistanceType: "",
    
    // Medical Contraindication
    medicalContraindication: false,
    contraindicationDetails: "",
    
    // Leaves Home Infrequently
    leavesHomeInfrequently: true,
    reasonsLeave: [],
    
    // Specific Observations
    observations: {
      severeSOB: false,
      requiresWalker: false,
      requiresWheelchair: false,
      bedbound: false,
      severePain: false,
      cognitiveImpairment: false,
      fallRisk: false,
      extremeWeakness: false,
      openWounds: false,
      unstableVitals: false,
      other: false,
      otherDetails: ""
    },
    
    // Additional context
    additionalContext: ""
  });

  const [validationResults, setValidationResults] = useState(null);

  // Calculate compliance score
  useEffect(() => {
    let score = 0;
    
    // Must have at least one primary reason
    if (criteria.taxingEffort || criteria.assistanceRequired || criteria.medicalContraindication) {
      score += 30;
    }
    
    // Details provided for selected reasons
    if (criteria.taxingEffort && criteria.taxingEffortDetails.length > 20) score += 15;
    if (criteria.assistanceRequired && criteria.assistanceType.length > 10) score += 15;
    if (criteria.medicalContraindication && criteria.contraindicationDetails.length > 20) score += 15;
    
    // Specific objective observations
    const observationCount = Object.values(criteria.observations).filter(Boolean).length;
    score += Math.min(observationCount * 5, 25);
    
    setComplianceScore(score);
  }, [criteria]);

  const primaryReasons = [
    {
      id: 'taxingEffort',
      label: 'Taxing Effort to Leave Home',
      description: 'Leaving home requires considerable and taxing effort',
      examples: [
        'Severe shortness of breath with minimal exertion',
        'Extreme fatigue requiring frequent rest periods',
        'Debilitating pain that worsens with movement'
      ]
    },
    {
      id: 'assistanceRequired',
      label: 'Requires Assistance of Another Person',
      description: 'Patient cannot leave home without help from another person',
      examples: [
        'Requires physical support for ambulation',
        'Needs supervision due to cognitive impairment',
        'Cannot safely navigate stairs or transportation alone'
      ]
    },
    {
      id: 'medicalContraindication',
      label: 'Medical Contraindication to Leaving Home',
      description: 'Medical condition makes leaving home medically inadvisable',
      examples: [
        'Severe immunocompromised state requiring isolation',
        'Unstable cardiac condition requiring bed rest',
        'Recent surgery with activity restrictions'
      ]
    }
  ];

  const specificObservations = [
    { id: 'severeSOB', label: 'Severe shortness of breath with minimal activity' },
    { id: 'requiresWalker', label: 'Requires walker/cane with assistance' },
    { id: 'requiresWheelchair', label: 'Wheelchair-dependent' },
    { id: 'bedbound', label: 'Bedbound or chair-bound' },
    { id: 'severePain', label: 'Severe pain limiting mobility' },
    { id: 'cognitiveImpairment', label: 'Cognitive impairment requiring supervision' },
    { id: 'fallRisk', label: 'High fall risk, unsafe to ambulate alone' },
    { id: 'extremeWeakness', label: 'Extreme weakness/debility' },
    { id: 'openWounds', label: 'Open wounds requiring frequent dressing changes' },
    { id: 'unstableVitals', label: 'Unstable vital signs' },
    { id: 'other', label: 'Other objective finding' }
  ];

  const leavesHomeReasons = [
    'Medical appointments only',
    'Dialysis treatments',
    'Chemotherapy/radiation',
    'Adult day care for medical reasons',
    'Religious services (infrequent)'
  ];

  const handleCriteriaChange = (field, value) => {
    setCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleObservationChange = (observation, checked) => {
    setCriteria(prev => ({
      ...prev,
      observations: {
        ...prev.observations,
        [observation]: checked
      }
    }));
  };

  const validateHomebound = () => {
    const issues = [];
    const strengths = [];

    // Check primary reasons
    if (!criteria.taxingEffort && !criteria.assistanceRequired && !criteria.medicalContraindication) {
      issues.push({
        severity: 'critical',
        message: 'Must select at least ONE primary homebound reason',
        suggestion: 'Select taxing effort, assistance required, or medical contraindication'
      });
    } else {
      strengths.push('Primary homebound reason documented ✓');
    }

    // Check for details
    if (criteria.taxingEffort && criteria.taxingEffortDetails.length < 20) {
      issues.push({
        severity: 'warning',
        message: 'Taxing effort needs more specific details',
        suggestion: 'Describe exactly what makes it taxing (e.g., "Patient becomes severely short of breath after walking 10 feet, requiring 5 minutes rest")'
      });
    }

    if (criteria.assistanceRequired && criteria.assistanceType.length < 10) {
      issues.push({
        severity: 'warning',
        message: 'Type of assistance needs more detail',
        suggestion: 'Specify who helps and what they help with'
      });
    }

    // Check for objective observations
    const observationCount = Object.values(criteria.observations).filter(Boolean).length;
    if (observationCount === 0) {
      issues.push({
        severity: 'critical',
        message: 'No objective observations documented',
        suggestion: 'Select at least 2-3 specific observations that support homebound status'
      });
    } else if (observationCount === 1) {
      issues.push({
        severity: 'warning',
        message: 'Only one objective observation',
        suggestion: 'Medicare prefers multiple objective findings to support homebound status'
      });
    } else {
      strengths.push(`${observationCount} objective observations documented ✓`);
    }

    // Check leaves home frequency
    if (criteria.reasonsLeave.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Should document when/why patient leaves home',
        suggestion: 'Even if only for medical appointments, this should be stated explicitly'
      });
    } else {
      strengths.push('Documented reasons patient leaves home ✓');
    }

    setValidationResults({ issues, strengths });
    return issues.filter(i => i.severity === 'critical').length === 0;
  };

  const generateHomeboundText = async () => {
    if (!validateHomebound()) {
      toast.error('Please address critical issues before generating documentation');
      return;
    }

    setIsGenerating(true);

    try {
      // Build comprehensive prompt
      let prompt = `You are an expert home health nurse documentation specialist. Generate Medicare-compliant homebound status documentation based on the following assessment:

PATIENT: ${patient.first_name} ${patient.last_name}
PRIMARY DIAGNOSIS: ${patient.primary_diagnosis || 'Not specified'}
VISIT DATE: ${visit.visit_date}

HOMEBOUND CRITERIA ASSESSED:

`;

      // Primary reasons
      if (criteria.taxingEffort) {
        prompt += `✓ TAXING EFFORT TO LEAVE HOME
Details: ${criteria.taxingEffortDetails}

`;
      }

      if (criteria.assistanceRequired) {
        prompt += `✓ REQUIRES ASSISTANCE OF ANOTHER PERSON
Type of assistance: ${criteria.assistanceType}

`;
      }

      if (criteria.medicalContraindication) {
        prompt += `✓ MEDICAL CONTRAINDICATION TO LEAVING HOME
Details: ${criteria.contraindicationDetails}

`;
      }

      // Objective observations
      const selectedObservations = specificObservations
        .filter(obs => criteria.observations[obs.id])
        .map(obs => obs.label);

      if (selectedObservations.length > 0) {
        prompt += `OBJECTIVE OBSERVATIONS SUPPORTING HOMEBOUND STATUS:
${selectedObservations.map(obs => `- ${obs}`).join('\n')}
`;
        
        if (criteria.observations.other && criteria.observations.otherDetails) {
          prompt += `- ${criteria.observations.otherDetails}\n`;
        }
      }

      // Leaves home infrequently
      if (criteria.reasonsLeave.length > 0) {
        prompt += `\nPATIENT LEAVES HOME ONLY FOR:
${criteria.reasonsLeave.map(reason => `- ${reason}`).join('\n')}
`;
      }

      // Additional context
      if (criteria.additionalContext) {
        prompt += `\nADDITIONAL CONTEXT:
${criteria.additionalContext}
`;
      }

      prompt += `

TASK:
Generate a comprehensive, Medicare-compliant homebound status documentation paragraph that:

1. Starts with a clear statement that patient IS homebound
2. States the PRIMARY reason(s) from the three Medicare criteria
3. Provides SPECIFIC, OBJECTIVE evidence
4. Uses professional nursing terminology
5. Is detailed enough to pass Medicare audit
6. Includes a statement about leaving home infrequently and only for medical care
7. Is 4-6 sentences in length

REQUIREMENTS:
- Use phrases like "considerable and taxing effort", "requires assistance", "medically contraindicated"
- Be VERY specific with observations (numbers, measurements, specific limitations)
- Avoid vague language like "difficulty" or "limited"
- Include both the limitation AND the objective evidence
- Make it audit-proof

Generate the homebound documentation now:`;

      const result = await invokeLLM({
        prompt: prompt
      });

      setGeneratedText(result);
      setCurrentStep(3); // Move to review step

    } catch (error) {
      console.error("Error generating homebound text:", error);
      toast.error("Error generating documentation. Please try again.");
    }

    setIsGenerating(false);
  };

  const insertIntoNote = () => {
    if (onHomeboundTextGenerated) {
      onHomeboundTextGenerated(generatedText);
    }
    setShowAssistant(false);
    // Reset for next use
    setCriteria({
      taxingEffort: false,
      taxingEffortDetails: "",
      assistanceRequired: false,
      assistanceType: "",
      medicalContraindication: false,
      contraindicationDetails: "",
      leavesHomeInfrequently: true,
      reasonsLeave: [],
      observations: {
        severeSOB: false,
        requiresWalker: false,
        requiresWheelchair: false,
        bedbound: false,
        severePain: false,
        cognitiveImpairment: false,
        fallRisk: false,
        extremeWeakness: false,
        openWounds: false,
        unstableVitals: false,
        other: false,
        otherDetails: ""
      },
      additionalContext: ""
    });
    setCurrentStep(0);
    setValidationResults(null);
    setGeneratedText("");
  };

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-navy-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-navy-600 rounded-full flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Homebound Status Verification</h3>
                <p className="text-sm text-slate-600">Guided Medicare-compliant homebound documentation</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAssistant(true)}
              className="bg-gradient-to-r from-indigo-600 to-navy-600 hover:from-indigo-700 hover:to-navy-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              Verify Homebound Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAssistant} onOpenChange={setShowAssistant}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Home className="w-7 h-7 text-indigo-600" />
              Homebound Status Verification Assistant
            </DialogTitle>
            <DialogDescription>
              Answer guided questions to generate Medicare-compliant homebound documentation
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Compliance Score</span>
              <span className="font-semibold">{complianceScore}/100</span>
            </div>
            <Progress 
              value={complianceScore} 
              className={`h-3 ${
                complianceScore >= 80 ? 'bg-green-200' :
                complianceScore >= 60 ? 'bg-yellow-200' : 'bg-red-200'
              }`}
            />
            <p className="text-xs text-slate-500">
              {complianceScore >= 80 ? '✓ Excellent - Ready to generate' :
               complianceScore >= 60 ? '⚠ Good - Add more details for stronger documentation' :
               '⚠ Needs improvement - Select criteria and add details'}
            </p>
          </div>

          {/* Steps */}
          <Tabs value={`step-${currentStep}`} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger 
                value="step-0" 
                onClick={() => setCurrentStep(0)}
                disabled={currentStep < 0}
              >
                1. Primary Reason
              </TabsTrigger>
              <TabsTrigger 
                value="step-1" 
                onClick={() => setCurrentStep(1)}
                disabled={currentStep < 1}
              >
                2. Observations
              </TabsTrigger>
              <TabsTrigger 
                value="step-2" 
                onClick={() => setCurrentStep(2)}
                disabled={currentStep < 2}
              >
                3. Context
              </TabsTrigger>
              <TabsTrigger 
                value="step-3" 
                onClick={() => setCurrentStep(3)}
                disabled={currentStep < 3}
              >
                4. Review
              </TabsTrigger>
            </TabsList>

            {/* Step 0: Primary Homebound Reason */}
            <TabsContent value="step-0" className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Medicare Requirement:</strong> Patient must meet at least ONE of these three criteria to be considered homebound.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {primaryReasons.map((reason) => (
                  <Card key={reason.id} className={criteria[reason.id] ? 'border-2 border-indigo-500' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={reason.id}
                            checked={criteria[reason.id]}
                            onCheckedChange={(checked) => handleCriteriaChange(reason.id, checked)}
                          />
                          <div>
                            <Label htmlFor={reason.id} className="text-lg font-semibold cursor-pointer">
                              {reason.label}
                            </Label>
                            <p className="text-sm text-slate-600 mt-1">{reason.description}</p>
                          </div>
                        </div>
                        {criteria[reason.id] && (
                          <Badge className="bg-green-500">Selected</Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    {criteria[reason.id] && (
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Provide Specific Details:
                          </Label>
                          <Textarea
                            placeholder={`Example: ${reason.examples[0]}`}
                            value={
                              reason.id === 'taxingEffort' ? criteria.taxingEffortDetails :
                              reason.id === 'assistanceRequired' ? criteria.assistanceType :
                              criteria.contraindicationDetails
                            }
                            onChange={(e) => {
                              if (reason.id === 'taxingEffort') {
                                handleCriteriaChange('taxingEffortDetails', e.target.value);
                              } else if (reason.id === 'assistanceRequired') {
                                handleCriteriaChange('assistanceType', e.target.value);
                              } else {
                                handleCriteriaChange('contraindicationDetails', e.target.value);
                              }
                            }}
                            rows={3}
                          />
                        </div>

                        <Accordion type="single" collapsible>
                          <AccordionItem value="examples">
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                View Examples
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="list-disc ml-5 space-y-2 text-sm text-slate-700">
                                {reason.examples.map((example, idx) => (
                                  <li key={idx}>{example}</li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setCurrentStep(1)}
                  disabled={!criteria.taxingEffort && !criteria.assistanceRequired && !criteria.medicalContraindication}
                >
                  Next: Objective Observations
                </Button>
              </div>
            </TabsContent>

            {/* Step 1: Objective Observations */}
            <TabsContent value="step-1" className="space-y-6">
              <Alert className="bg-navy-50 border-navy-200">
                <Eye className="w-4 h-4 text-navy-600" />
                <AlertDescription className="text-navy-900">
                  <strong>Medicare Auditors Look For:</strong> Specific, measurable observations that objectively support homebound status. Select all that apply.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {specificObservations.map((obs) => (
                  <div key={obs.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox
                      id={obs.id}
                      checked={criteria.observations[obs.id]}
                      onCheckedChange={(checked) => handleObservationChange(obs.id, checked)}
                    />
                    <Label htmlFor={obs.id} className="cursor-pointer flex-1 text-sm">
                      {obs.label}
                    </Label>
                  </div>
                ))}
              </div>

              {criteria.observations.other && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Describe Other Objective Finding:
                  </Label>
                  <Textarea
                    placeholder="Be specific with measurements and observations"
                    value={criteria.observations.otherDetails}
                    onChange={(e) => setCriteria(prev => ({
                      ...prev,
                      observations: {
                        ...prev.observations,
                        otherDetails: e.target.value
                      }
                    }))}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={Object.values(criteria.observations).filter(Boolean).length === 0}
                >
                  Next: Additional Context
                </Button>
              </div>
            </TabsContent>

            {/* Step 2: Additional Context */}
            <TabsContent value="step-2" className="space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">
                  When Does Patient Leave Home?
                </Label>
                <p className="text-sm text-slate-600 mb-4">
                  Medicare requires documentation that patient leaves home infrequently and only for specific reasons.
                </p>
                
                <div className="space-y-2">
                  {leavesHomeReasons.map((reason) => (
                    <div key={reason} className="flex items-center space-x-3">
                      <Checkbox
                        id={reason}
                        checked={criteria.reasonsLeave.includes(reason)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCriteriaChange('reasonsLeave', [...criteria.reasonsLeave, reason]);
                          } else {
                            handleCriteriaChange('reasonsLeave', criteria.reasonsLeave.filter(r => r !== reason));
                          }
                        }}
                      />
                      <Label htmlFor={reason} className="cursor-pointer text-sm">
                        {reason}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">
                  Additional Context (Optional)
                </Label>
                <Textarea
                  placeholder="Any additional observations that support homebound status..."
                  value={criteria.additionalContext}
                  onChange={(e) => handleCriteriaChange('additionalContext', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    validateHomebound();
                    setCurrentStep(3);
                  }}
                >
                  Review & Generate
                </Button>
              </div>
            </TabsContent>

            {/* Step 3: Review & Generate */}
            <TabsContent value="step-3" className="space-y-6">
              {validationResults && (
                <div className="space-y-4">
                  {/* Strengths */}
                  {validationResults.strengths.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {validationResults.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-green-900 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Issues */}
                  {validationResults.issues.length > 0 && (
                    <Card className={
                      validationResults.issues.some(i => i.severity === 'critical')
                        ? 'border-red-200 bg-red-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {validationResults.issues.some(i => i.severity === 'critical') ? (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              Critical Issues
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              Warnings
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {validationResults.issues.map((issue, idx) => (
                            <li key={idx} className={`text-sm ${issue.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'}`}>
                              <p className="font-semibold mb-1">{issue.message}</p>
                              <p className="italic">💡 {issue.suggestion}</p>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Generated Text */}
              {generatedText && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-indigo-600" />
                      Generated Homebound Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-white rounded border border-indigo-200">
                      <p className="text-slate-900 leading-relaxed">{generatedText}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Edit
                </Button>
                <div className="flex gap-3">
                  {!generatedText ? (
                    <Button
                      onClick={generateHomeboundText}
                      disabled={isGenerating || (validationResults && validationResults.issues.some(i => i.severity === 'critical'))}
                      className="bg-gradient-to-r from-indigo-600 to-navy-600"
                    >
                      {isGenerating ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Documentation
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={generateHomeboundText}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        onClick={insertIntoNote}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Insert into Note
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Help Section */}
          <Accordion type="single" collapsible className="border-t pt-4">
            <AccordionItem value="help">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Medicare Homebound Requirements Reference
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <h4 className="font-semibold mb-2">What Makes a Patient Homebound?</h4>
                    <p className="mb-2">Medicare defines homebound as meeting at least ONE of these criteria:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li><strong>Considerable and taxing effort</strong> required to leave home</li>
                      <li><strong>Requires assistance</strong> of another person to leave home</li>
                      <li><strong>Medical contraindication</strong> to leaving home</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Strong vs. Weak Documentation</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="font-semibold text-red-900 mb-2">❌ Weak Example:</p>
                        <p className="text-xs italic">"Patient has difficulty leaving home due to health problems."</p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="font-semibold text-green-900 mb-2">✓ Strong Example:</p>
                        <p className="text-xs italic">"Patient remains homebound due to considerable and taxing effort required to leave home. Objective evidence: severe shortness of breath with oxygen saturation dropping to 85% after ambulating 15 feet, requiring 10 minutes rest to recover. Patient requires walker and standby assistance of caregiver for all mobility. Leaves home only for physician appointments with caregiver assistance."</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Common Audit Failures:</h4>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Vague language ("difficult", "limited", "has trouble")</li>
                      <li>No objective measurements or observations</li>
                      <li>Not stating one of the three Medicare criteria explicitly</li>
                      <li>No documentation of infrequent absences from home</li>
                      <li>Contradictory information elsewhere in the note</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>
    </>
  );
}
