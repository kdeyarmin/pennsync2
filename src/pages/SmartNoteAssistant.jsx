import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CheckCircle2, User, ChevronRight, ChevronLeft, Brain, HelpCircle, ArrowRight, Copy, RotateCcw, Lightbulb, MessageCircle, FileText, Clock, AlertTriangle, ClipboardList } from "lucide-react";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import { todayEastern } from "../components/utils/timezone";
import FavoriteButton from "../components/navigation/FavoriteButton";
import GuidelineReferencePanel from "../components/guidelines/GuidelineReferencePanel";
import UnifiedDocumentReview from "../components/smartNote/UnifiedDocumentReview";
import QuickActionsBar from "../components/smartNote/QuickActionsBar";
import AdmissionNotePrePopulator from "../components/smartNote/AdmissionNotePrePopulator";
import AIAdmissionDocumentationAssistant from "../components/clinical/AIAdmissionDocumentationAssistant";
import { useNoteManagement } from "../components/utils/useNoteManagement";
import { useSpeechRecognition } from "../components/utils/useSpeechRecognition";
import { useSmartNoteData } from "../components/utils/useSmartNoteData";
import PatientSelectionStep from "../components/smartNote/PatientSelectionStep";
import VitalsStep from "../components/smartNote/VitalsStep";
import NotesStep from "../components/smartNote/NotesStep";
import EnhancementStep from "../components/smartNote/EnhancementStep";
import LiveDocumentationGapAnalyzer from "../components/smartNote/LiveDocumentationGapAnalyzer";

const commonDiagnoses = [
  "CHF (Congestive Heart Failure)",
  "COPD (Chronic Obstructive Pulmonary Disease)",
  "Diabetes Mellitus Type 2",
  "Hypertension",
  "Post-operative care",
  "Wound care",
  "Stroke/CVA",
  "Dementia/Alzheimer's",
  "Custom (type below)"
];

const matchAndSetDiagnosis = (patientDiagnosis, setDiagnosis, setCustomDiagnosis) => {
  if (!patientDiagnosis) return;
  const matchingDiagnosis = commonDiagnoses.find(dx => 
    patientDiagnosis.toLowerCase().includes(dx.toLowerCase().split(' ')[0].toLowerCase()) ||
    dx.toLowerCase().includes(patientDiagnosis.toLowerCase().split(' ')[0].toLowerCase())
  );
  setDiagnosis(matchingDiagnosis || "Custom (type below)");
  if (!matchingDiagnosis) setCustomDiagnosis(patientDiagnosis);
};





// Contextual AI Tools Sidebar - Enhanced with better guidance
function ContextualAITools({ currentStep, hasPatient, hasNotes, hasEnhancedNote, onAction, diagnosis, complianceScore }) {
  const getTools = () => {
    if (!hasPatient) return null;
    if (!hasNotes) return null;
    if (!hasEnhancedNote) return null;
    return { 
      title: "🎉 Note Complete!", 
      subtitle: complianceScore ? `${complianceScore}% Compliant` : "Ready to use",
      items: [
        { label: "Copy to Clipboard", action: "copy", type: "action", primary: true, icon: Copy },
        { label: "Generate Follow-up Tasks", action: "tasks", type: "action", icon: ClipboardList },
        { label: "Start New Note", action: "clear", type: "action", icon: RotateCcw }
      ],
      hint: "Review the note before pasting to EHR"
    };
  };
  const tools = getTools();

  if (!tools) return null;

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white">
      <CardHeader className="py-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-600" />
          {tools.title}
        </CardTitle>
        {tools.subtitle && (
          <p className="text-xs text-indigo-600 font-medium">{tools.subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {tools.items.map((item, idx) => (
          <div key={idx}>
            {item.type === 'action' ? (
              <Button
                size="sm"
                variant={item.primary ? "default" : "outline"}
                className={`w-full justify-between ${item.primary ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                onClick={() => onAction?.(item.action)}
              >
                <span className="flex items-center gap-2">
                  {item.icon && <item.icon className="w-3 h-3" />}
                  {item.label}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : item.type === 'example' ? (
              <div className="bg-white/70 p-2 rounded border border-indigo-100">
                <p className="text-xs text-indigo-700 italic flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {item.label}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {item.icon && <item.icon className="w-3 h-3 text-indigo-400" />}
                {item.label}
              </div>
            )}
          </div>
        ))}
        {tools.hint && (
          <div className="pt-2 border-t border-indigo-100">
            <p className="text-xs text-indigo-600 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> {tools.hint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



export default function SmartNoteAssistant() {
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate, setVisitDate] = useState(todayEastern());
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [vitalSigns, setVitalSigns] = useState({ bp_systolic: "", bp_diastolic: "", hr: "", temp: "", o2: "", o2Source: "room_air", o2Flow: "", pain: "" });
  const [collapsedSteps, setCollapsedSteps] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [savedVisitId, setSavedVisitId] = useState(null);
  
  const { roughNote, setRoughNote, enhancedNote, setEnhancedNote, analysisResults, setAnalysisResults, copied, setCopied, savedSuccessfully, setSavedSuccessfully, recheckMode, setRecheckMode, resetNote, startRecheck, completeEnhancement } = useNoteManagement();
  const { listening, interimText, startDictation, stopDictation } = useSpeechRecognition((transcript) => {
    setRoughNote(prev => prev ? prev + ' ' + transcript : transcript);
  });
  const { currentUser, patients, selectedPatient, carePlans, recentVisits, patientOASIS, oasisContext, patientContext, isLoading, error } = useSmartNoteData(selectedPatientId);

  // Show error alert if patient loading fails
  useEffect(() => {
    if (error) {
      console.error('Patient loading error:', error);
    }
  }, [error]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('referral_id');
    if (!refId) return;

    const loadReferralData = async () => {
      try {
        // Use backend function to extract and format referral data
        const response = await base44.functions.invoke('extractReferralDataForSmartNote', {
          referral_id: refId
        });
        
        const { smartNoteData } = response.data || response;
        if (!smartNoteData) return;
        
        // Pre-populate form with extracted data
        setReferralData(smartNoteData.clinical_summary);
        setVisitType('admission');
        setDiagnosis(smartNoteData.diagnosis || 'Custom (type below)');
        
        if (smartNoteData.patient_id) {
          setSelectedPatientId(smartNoteData.patient_id);
        }
        
        // Pre-populate vitals
        if (smartNoteData.vital_signs) {
          setVitalSigns(prev => ({
            ...prev,
            bp_systolic: smartNoteData.vital_signs.bp_systolic || '',
            bp_diastolic: smartNoteData.vital_signs.bp_diastolic || '',
            hr: smartNoteData.vital_signs.hr || '',
            temp: smartNoteData.vital_signs.temp || '',
            o2: smartNoteData.vital_signs.o2 || '',
            pain: smartNoteData.vital_signs.pain || ''
          }));
        }
        
        // Auto-populate rough note with admission template
        if (smartNoteData.admission_note_template && !roughNote) {
          setRoughNote(smartNoteData.admission_note_template);
        }
      } catch (err) {
        console.error('Error loading referral:', err);
      }
    };
    
    loadReferralData();
  }, []);

  // Log page visit
  useEffect(() => {
    if (currentUser?.email) {
      logActivity(ActivityActions.PAGE_VISIT, {
        page: 'SmartNoteAssistant',
        page_title: 'Smart Note Assistant'
      });
    }
  }, [currentUser?.email]);

  React.useEffect(() => {
    if (selectedPatient?.primary_diagnosis && selectedPatientId) {
      matchAndSetDiagnosis(selectedPatient.primary_diagnosis, setDiagnosis, setCustomDiagnosis);
    }
  }, [selectedPatient, selectedPatientId]);

  const finalDiagnosis = diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis;

  const currentStep = useMemo(() => {
    if (!selectedPatientId) return 'patient';
    if (!enhancedNote) return 'notes';
    return 'complete';
  }, [selectedPatientId, enhancedNote]);

  // Auto-collapse completed steps (but keep patient step open until visit type is confirmed)
  useEffect(() => {
    const newCollapsed = [];
    // Only collapse patient step if they've selected a visit type and moved to notes
    if (selectedPatientId && currentStep !== 'patient' && visitType !== 'routine_visit') {
      newCollapsed.push('patient');
    }
    // Don't auto-collapse vitals - they're optional and user should control
    if (roughNote.length >= 50 && currentStep !== 'notes' && !enhancedNote) newCollapsed.push('notes');
    setCollapsedSteps(newCollapsed);
  }, [currentStep, selectedPatientId, roughNote, enhancedNote, visitType]);

  const stepOrder = ['patient', 'vitals', 'notes', 'review', 'complete'];
  
  const handleStepClick = (stepId) => {
    const targetIndex = stepOrder.indexOf(stepId);
    const currentIndex = stepOrder.indexOf(currentStep);
    
    // Allow clicking on completed steps or current step
    if (targetIndex <= currentIndex) {
      // Scroll to the relevant section
      const sectionId = `step-${stepId}`;
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleGoBack = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      handleStepClick(prevStep);
    }
  };



  const toggleStepCollapse = (step) => {
    setCollapsedSteps(prev => 
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const handleEnhancedNoteReady = async ({ enhancedNote: finalNote, analysis, appliedSuggestions }) => {
    if (!selectedPatientId || !currentUser?.email) {
      console.error('Missing required data for saving note');
      return;
    }

    setEnhancedNote(finalNote);
    setAnalysisResults(analysis);
    setRecheckMode(false);

    try {
      const visitData = {
        patient_id: selectedPatientId,
        visit_date: visitDate,
        visit_type: visitType,
        status: 'completed',
        nurse_notes: finalNote,
        raw_transcription: roughNote,
        vital_signs: {
          blood_pressure_systolic: vitalSigns.bp_systolic ? parseInt(vitalSigns.bp_systolic, 10) : null,
          blood_pressure_diastolic: vitalSigns.bp_diastolic ? parseInt(vitalSigns.bp_diastolic, 10) : null,
          heart_rate: vitalSigns.hr ? parseInt(vitalSigns.hr, 10) : null,
          temperature: vitalSigns.temp ? parseFloat(vitalSigns.temp) : null,
          oxygen_saturation: vitalSigns.o2 ? parseInt(vitalSigns.o2, 10) : null,
          pain_level: vitalSigns.pain ? parseInt(vitalSigns.pain, 10) : null
        }
      };

      const savedVisit = await base44.entities.Visit.create(visitData);
      setSavedVisitId(savedVisit.id);
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);

      const complianceScore = analysis?.overall_score || 85;

      await Promise.all([
        base44.entities.NoteConversion.create({
          nurse_email: currentUser.email,
          patient_id: selectedPatientId,
          visit_type: visitType,
          diagnosis: finalDiagnosis,
          rough_note_length: roughNote.length,
          enhanced_note_length: finalNote.length,
          quality_score: complianceScore,
          rough_note_compliance: 50,
          enhanced_note_compliance: complianceScore,
          compliance_improvement: complianceScore - 50,
          conversion_time_ms: 0,
          nurse_name: currentUser.full_name || 'Unknown'
        }),
        base44.entities.ComplianceAudit.create({
          visit_id: savedVisit.id,
          nurse_email: currentUser.email,
          patient_id: selectedPatientId,
          audit_date: new Date().toISOString(),
          compliance_score: complianceScore,
          status: complianceScore >= 90 ? 'passed' : complianceScore >= 80 ? 'flagged' : 'critical',
          issues: analysis?.issues || [],
          compliant_elements: analysis?.compliant_elements || [],
          audit_type: 'automated'
        })
      ]);

      logActivity(ActivityActions.NOTE_ENHANCED, {
        patient_id: selectedPatientId,
        visit_type: visitType,
        diagnosis: finalDiagnosis,
        overall_score: complianceScore,
        suggestions_applied: appliedSuggestions?.length || 0,
        page: 'SmartNoteAssistant',
        ai_utilization: true
      });

      queryClient.invalidateQueries({ queryKey: ['patientRecentVisits', selectedPatientId] });
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };



    const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enhancedNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      logActivity(ActivityActions.EXPORT, {
        type: 'clipboard_copy',
        patient_id: selectedPatientId,
        content_type: 'enhanced_note',
        note_length: enhancedNote.length,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert('Failed to copy. Please try again.');
    }
  };



  const handleClearNote = () => {
    resetNote();
    setCollapsedSteps([]);
  };

  const handleRecheck = () => {
    startRecheck();
  };



  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 w-full sm:w-auto">
          {currentStep !== 'patient' && (
            <Button 
              variant="outline" 
              size="default"
              onClick={handleGoBack}
              className="gap-1 text-gray-600 hover:text-gray-900 flex-shrink-0 min-h-[44px] px-3"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden md:inline">Back</span>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Smart Note Assistant</h1>
            <p className="text-sm md:text-base text-gray-600 hidden md:block">Transform rough notes into Medicare-compliant documentation</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <FavoriteButton type="page" id="SmartNoteAssistant" name="Smart Note Assistant" />
          </div>
          <Button 
            variant="ghost" 
            size="default" 
            className="text-gray-500 gap-1 min-h-[44px] flex-1 sm:flex-initial"
            onClick={async () => {
                try {
                  const response = await base44.functions.invoke('generateSmartNoteGuide');
                  const data = response?.data || response;

                  if (!data?.pdf) {
                    throw new Error('No PDF data received');
                  }

                  const binaryString = atob(data.pdf);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = data.filename || 'Smart_Note_Guide.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error downloading guide:', error);
                  alert('Failed to download guide. Please try again.');
                }
              }}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden xl:inline">User Guide</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Unable to load patients. Please refresh the page or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      {selectedPatientId && !enhancedNote && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Step {currentStep === 'patient' ? '1' : currentStep === 'notes' ? '2' : '3'} of 3</span>
          <ChevronRight className="w-4 h-4" />
          <span>{currentStep === 'patient' ? 'Select Patient' : currentStep === 'notes' ? 'Write Notes' : 'AI Enhancing...'}</span>
        </div>
      )}

      {/* Compact Patient Overview */}
      {selectedPatient && currentStep !== 'patient' && (
        <Card className="mb-4 bg-blue-50 border-blue-300">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-xs text-gray-600">{selectedPatient.primary_diagnosis}</p>
              </div>
            </div>
            {selectedPatient.allergies && (
              <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> Allergies</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          <React.Fragment>

          <PatientSelectionStep 
            patients={patients}
            selectedPatientId={selectedPatientId}
            selectedPatient={selectedPatient}
            visitDate={visitDate}
            visitType={visitType}
            diagnosis={diagnosis}
            customDiagnosis={customDiagnosis}
            onPatientChange={(id) => {
              setSelectedPatientId(id);
              const patient = patients.find(p => p.id === id);
              if (patient?.primary_diagnosis) {
                matchAndSetDiagnosis(patient.primary_diagnosis, setDiagnosis, setCustomDiagnosis);
              }
            }}
            onVisitDateChange={setVisitDate}
            onVisitTypeChange={setVisitType}
            onDiagnosisChange={setDiagnosis}
            onCustomDiagnosisChange={setCustomDiagnosis}
            isCollapsed={collapsedSteps.includes('patient')}
            onToggleCollapse={() => toggleStepCollapse('patient')}
            currentStep={currentStep}
            isLoading={isLoading}
          />



          {selectedPatientId && (
            <VitalsStep
              vitalSigns={vitalSigns}
              onVitalsChange={setVitalSigns}
              isCollapsed={collapsedSteps.includes('vitals')}
              onToggleCollapse={() => toggleStepCollapse('vitals')}
              currentStep={currentStep}
            />
          )}

          {/* Admission Assistant - Simplified */}
          {visitType === 'admission' && selectedPatientId && !enhancedNote && (
            <Card className="border-2 border-indigo-300">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Admission Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referralData && !roughNote ? (
                   <AdmissionNotePrePopulator
                     referralData={referralData}
                     patientData={selectedPatient}
                     onNoteGenerated={(note) => setRoughNote(note)}
                     autoGenerate={true}
                   />
                 ) : (
                  <AIAdmissionDocumentationAssistant
                    referralData={referralData}
                    patientData={selectedPatient}
                    onSaveSection={(title, content) => {
                      setRoughNote(prev => prev ? prev + `\n\n${title}:\n${content}` : `${title}:\n${content}`);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {selectedPatientId && (
            <NotesStep
              roughNote={roughNote}
              onNotesChange={setRoughNote}
              listening={listening}
              interimText={interimText}
              onStartDictation={startDictation}
              onStopDictation={stopDictation}
              isCollapsed={false}
              onToggleCollapse={() => toggleStepCollapse('notes')}
              currentStep={currentStep}
            />
          )}

          {roughNote.length >= 50 && !enhancedNote && (
            !recheckMode ? (
              <EnhancementStep
                roughNote={roughNote}
                enhancedNote={null}
                copied={copied}
                savedSuccessfully={savedSuccessfully}
                recheckMode={recheckMode}
                onEnhance={() => setRecheckMode(true)}
                onCopy={handleCopy}
                onRecheck={handleRecheck}
                onClear={handleClearNote}
                onNoteChange={setEnhancedNote}
                analysisResults={analysisResults}
              />
            ) : (
              <div id="step-review-running">
                <UnifiedDocumentReview
                  roughNote={roughNote}
                  visitType={visitType}
                  diagnosis={finalDiagnosis}
                  patientData={selectedPatient}
                  vitalSigns={vitalSigns}
                  carePlans={carePlans}
                  recentVisits={recentVisits}
                  nurseType={currentUser?.credential_type || 'RN'}
                  onEnhancedNoteReady={handleEnhancedNoteReady}
                  autoRun={true}
                />
              </div>
            )
          )}

          {enhancedNote && (
            <EnhancementStep
              roughNote={roughNote}
              enhancedNote={enhancedNote}
              copied={copied}
              savedSuccessfully={savedSuccessfully}
              recheckMode={recheckMode}
              onEnhance={() => setRecheckMode(true)}
              onCopy={handleCopy}
              onRecheck={handleRecheck}
              onClear={handleClearNote}
              onNoteChange={setEnhancedNote}
              analysisResults={analysisResults}
            />
          )}

                </React.Fragment>
                </div>

                {/* Right Sidebar - AI Tools */}
                <div className="lg:col-span-1 space-y-4">
                <ContextualAITools
                currentStep={currentStep}
                hasPatient={!!selectedPatientId}
                hasNotes={roughNote.length >= 50}
                hasEnhancedNote={!!enhancedNote}
                onAction={(action) => {
                if (action === 'enhance') {
                // Trigger enhancement
                } else if (action === 'copy') {
                handleCopy();
                } else if (action === 'tasks') {
                // Open task generator
                } else if (action === 'clear') {
                handleClearNote();
                }
                }}
                diagnosis={finalDiagnosis}
                complianceScore={analysisResults?.overall_score}
                />

                {/* Guidelines Reference */}
                {selectedPatientId && selectedPatient && (
                <GuidelineReferencePanel
                diagnosis={finalDiagnosis}
                visitType={visitType}
                />
                )}

                {/* Patient Quick Actions */}
                {selectedPatientId && selectedPatient && (
                <QuickActionsBar
                patient={selectedPatient}
                visitType={visitType}
                carePlans={carePlans}
                />
                )}
                </div>
                </div>
                </div>
                );
                }