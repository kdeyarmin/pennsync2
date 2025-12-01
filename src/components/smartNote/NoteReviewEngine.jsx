import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  BookOpen,
  Stethoscope,
  Send,
  MessageSquare,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NoteReviewEngine({
  noteText,
  patientId,
  patientName,
  diagnosis,
  careType,
  visitType,
  nurseEmail,
  onCreateTask,
  onTrainingRecommended
}) {
  const [reviewResult, setReviewResult] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [flaggedItems, setFlaggedItems] = useState({});
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [currentFlagItem, setCurrentFlagItem] = useState(null);
  const [flagNote, setFlagNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  // Fetch nurse skills for gap analysis
  const { data: nurseSkills = [] } = useQuery({
    queryKey: ['nurseSkills', nurseEmail],
    queryFn: () => base44.entities.NurseSkill.filter({ nurse_email: nurseEmail }).catch(() => []),
    enabled: !!nurseEmail
  });

  // Fetch existing tasks for this patient
  const { data: existingTasks = [] } = useQuery({
    queryKey: ['patientTasks', patientId],
    queryFn: () => base44.entities.Task.filter({ patient_id: patientId, status: 'pending' }).catch(() => []),
    enabled: !!patientId
  });

  // Comprehensive clinical protocol definitions based on diagnosis and symptoms
  const getClinicalProtocols = (diagnosisText, noteContent = '') => {
    const protocols = [];
    const diagLower = (diagnosisText || '').toLowerCase();
    const noteLower = (noteContent || '').toLowerCase();
    
    // Sepsis/Infection Protocol
    if (diagLower.includes('sepsis') || diagLower.includes('infection') || diagLower.includes('uti') || 
        diagLower.includes('pneumonia') || diagLower.includes('cellulitis') ||
        noteLower.includes('fever') || noteLower.includes('chills') || noteLower.includes('infection')) {
      protocols.push({
        name: 'Sepsis Screening Protocol (qSOFA/SIRS)',
        category: 'Critical',
        guideline_source: 'Surviving Sepsis Campaign 2021',
        elements: [
          { item: 'Temperature documented (fever >38°C or hypothermia <36°C)', category: 'SIRS Criteria' },
          { item: 'Heart rate documented (tachycardia >90 bpm)', category: 'SIRS Criteria' },
          { item: 'Respiratory rate documented (tachypnea >20/min)', category: 'SIRS Criteria' },
          { item: 'Mental status assessment (confusion, altered LOC, GCS)', category: 'qSOFA Criteria' },
          { item: 'Blood pressure documented (hypotension SBP <100 mmHg)', category: 'qSOFA Criteria' },
          { item: 'Signs of infection source identified and documented', category: 'Source Control' },
          { item: 'WBC count referenced if available', category: 'SIRS Criteria' },
          { item: 'Lactate level discussed if recent labs', category: 'Severity Markers' },
          { item: 'Urine output/hydration status assessed', category: 'Organ Function' },
          { item: 'Physician notification documented if 2+ criteria met', category: 'Escalation' }
        ]
      });
    }
    
    // CHF/Heart Failure Protocol
    if (diagLower.includes('chf') || diagLower.includes('heart failure') || diagLower.includes('cardiac') ||
        diagLower.includes('cardiomyopathy') || diagLower.includes('lvef') ||
        noteLower.includes('edema') || noteLower.includes('dyspnea') || noteLower.includes('weight gain')) {
      protocols.push({
        name: 'Heart Failure Management Protocol',
        category: 'Chronic Disease',
        guideline_source: 'ACC/AHA Heart Failure Guidelines 2022',
        elements: [
          { item: 'Daily weight documented and compared to dry weight baseline', category: 'Fluid Status' },
          { item: 'Weight change trend analysis (gain >2-3 lbs warrants action)', category: 'Fluid Status' },
          { item: 'Edema assessment with grading (1+ to 4+, location, pitting)', category: 'Fluid Status' },
          { item: 'JVD assessment documented', category: 'Fluid Status' },
          { item: 'Dyspnea assessment (NYHA class, at rest vs exertion, orthopnea, PND)', category: 'Symptoms' },
          { item: 'Lung sounds bilateral (crackles location and extent, wheezes)', category: 'Cardiopulmonary' },
          { item: 'Oxygen saturation on room air and with supplementation', category: 'Cardiopulmonary' },
          { item: 'Heart rate and rhythm documented', category: 'Cardiac' },
          { item: 'Blood pressure (both arms if indicated)', category: 'Cardiac' },
          { item: 'Medication compliance verified (diuretics, ACE/ARB, beta blockers)', category: 'Medication' },
          { item: 'Sodium/fluid restriction education and compliance assessed', category: 'Education' },
          { item: 'Activity tolerance and fatigue level documented', category: 'Functional' },
          { item: 'Signs of decompensation checklist reviewed', category: 'Monitoring' },
          { item: 'When to call doctor/911 education reinforced', category: 'Education' }
        ]
      });
    }
    
    // Diabetes Protocol
    if (diagLower.includes('diabetes') || diagLower.includes('dm') || diagLower.includes('diabetic') ||
        diagLower.includes('hyperglycemia') || diagLower.includes('a1c') ||
        noteLower.includes('blood sugar') || noteLower.includes('glucose') || noteLower.includes('insulin')) {
      protocols.push({
        name: 'Diabetes Management Protocol',
        category: 'Chronic Disease',
        guideline_source: 'ADA Standards of Care 2024',
        elements: [
          { item: 'Blood glucose level documented with time of reading', category: 'Glycemic Control' },
          { item: 'Glucose trend analysis (pattern of highs/lows)', category: 'Glycemic Control' },
          { item: 'Hypoglycemia signs/symptoms assessed and history', category: 'Safety' },
          { item: 'Hyperglycemia signs/symptoms assessed', category: 'Safety' },
          { item: 'Comprehensive foot inspection performed (pulses, sensation, skin)', category: 'Complication Prevention' },
          { item: 'Signs of neuropathy evaluated (numbness, tingling, pain)', category: 'Complications' },
          { item: 'Skin integrity assessment (especially extremities)', category: 'Complications' },
          { item: 'Medication/insulin compliance and technique verified', category: 'Medication' },
          { item: 'Insulin storage and rotation site education', category: 'Medication' },
          { item: 'Diet compliance and carbohydrate awareness assessed', category: 'Nutrition' },
          { item: 'A1C level discussed if recent (goal typically <7%)', category: 'Monitoring' },
          { item: 'Vision changes assessed (retinopathy screening)', category: 'Complications' },
          { item: 'Hypoglycemia treatment plan reviewed (Rule of 15)', category: 'Education' },
          { item: 'Sick day management education provided', category: 'Education' }
        ]
      });
    }
    
    // COPD Protocol - Enhanced
    if (diagLower.includes('copd') || diagLower.includes('emphysema') || diagLower.includes('chronic bronchitis') ||
        diagLower.includes('pulmonary') || diagLower.includes('respiratory') ||
        noteLower.includes('shortness of breath') || noteLower.includes('sob') || noteLower.includes('wheezing') ||
        noteLower.includes('dyspnea') || noteLower.includes('oxygen')) {
      protocols.push({
        name: 'COPD/Respiratory Management Protocol',
        category: 'Chronic Disease',
        guideline_source: 'GOLD Guidelines 2024',
        elements: [
          { item: 'Oxygen saturation documented (at rest and with activity)', category: 'Oxygenation' },
          { item: 'Oxygen requirements documented (liters, delivery method)', category: 'Oxygenation' },
          { item: 'Respiratory rate and pattern assessed', category: 'Respiratory Status' },
          { item: 'Work of breathing evaluated (accessory muscle use, retractions)', category: 'Respiratory Status' },
          { item: 'Lung sounds bilateral assessment (wheezes, rhonchi, diminished)', category: 'Respiratory Status' },
          { item: 'Cough assessment (productive vs dry, sputum color/amount)', category: 'Symptoms' },
          { item: 'Sputum characteristics if productive (color, consistency, blood)', category: 'Symptoms' },
          { item: 'Inhaler/nebulizer technique observed and corrected', category: 'Medication' },
          { item: 'Medication compliance (bronchodilators, steroids, antibiotics)', category: 'Medication' },
          { item: 'PFT results referenced if available (FEV1, FVC)', category: 'Baseline Data' },
          { item: 'COPD exacerbation history documented', category: 'History' },
          { item: 'Signs of acute exacerbation assessed (increased dyspnea, sputum, fever)', category: 'Monitoring' },
          { item: 'Activity tolerance and ADL impact documented', category: 'Functional' },
          { item: 'Smoking status and cessation support addressed', category: 'Risk Reduction' },
          { item: 'Trigger avoidance education (allergens, irritants)', category: 'Education' },
          { item: 'COPD action plan reviewed (when to escalate)', category: 'Education' },
          { item: 'Vaccination status (flu, pneumonia, COVID)', category: 'Prevention' }
        ]
      });
    }
    
    // Wound Care Protocol - Enhanced
    if (diagLower.includes('wound') || diagLower.includes('ulcer') || diagLower.includes('surgical') ||
        diagLower.includes('pressure injury') || diagLower.includes('debridement') || diagLower.includes('amputation') ||
        noteLower.includes('dressing') || noteLower.includes('wound') || noteLower.includes('incision')) {
      protocols.push({
        name: 'Wound Care Protocol',
        category: 'Specialized Care',
        guideline_source: 'WOCN Clinical Practice Guidelines',
        elements: [
          { item: 'Wound measurements documented (L x W x D in cm)', category: 'Assessment' },
          { item: 'Wound location precisely documented (anatomical terms)', category: 'Assessment' },
          { item: 'Wound bed description (% granulation, slough, necrotic, epithelial)', category: 'Assessment' },
          { item: 'Wound edges described (attached, rolled, macerated)', category: 'Assessment' },
          { item: 'Undermining/tunneling measured if present (clock position, depth)', category: 'Assessment' },
          { item: 'Exudate amount documented (none, scant, small, moderate, large)', category: 'Assessment' },
          { item: 'Exudate characteristics (serous, sanguineous, purulent, odor)', category: 'Assessment' },
          { item: 'Periwound skin assessment (intact, macerated, erythema, induration)', category: 'Assessment' },
          { item: 'Signs of infection (erythema, warmth, odor, increased drainage, fever)', category: 'Infection Monitoring' },
          { item: 'Pain assessment before, during, after procedure', category: 'Pain Management' },
          { item: 'Dressing change performed with sterile/clean technique noted', category: 'Intervention' },
          { item: 'Dressing type and materials documented', category: 'Intervention' },
          { item: 'Wound progress compared to last visit', category: 'Trend Analysis' },
          { item: 'Nutritional status for wound healing assessed', category: 'Healing Factors' },
          { item: 'Pressure redistribution/offloading addressed', category: 'Prevention' },
          { item: 'Patient/caregiver wound care education', category: 'Education' }
        ]
      });
    }
    
    // Fall Risk Protocol
    if (diagLower.includes('fall') || diagLower.includes('fracture') || diagLower.includes('hip') ||
        diagLower.includes('balance') || diagLower.includes('vertigo') ||
        noteLower.includes('fall') || noteLower.includes('unsteady') || noteLower.includes('dizziness')) {
      protocols.push({
        name: 'Fall Prevention Protocol',
        category: 'Safety',
        guideline_source: 'CDC STEADI Guidelines',
        elements: [
          { item: 'Fall risk assessment tool completed (Morse, Hendrich, TUG)', category: 'Assessment' },
          { item: 'Fall history documented (when, where, circumstances)', category: 'History' },
          { item: 'Gait assessment performed (steady, unsteady, shuffling)', category: 'Mobility' },
          { item: 'Balance evaluation documented (Romberg, tandem stance)', category: 'Mobility' },
          { item: 'Lower extremity strength assessed', category: 'Mobility' },
          { item: 'Environmental hazard assessment completed', category: 'Safety' },
          { item: 'Medication review for fall-risk medications (sedatives, antihypertensives)', category: 'Medication' },
          { item: 'Orthostatic blood pressure measured', category: 'Assessment' },
          { item: 'Vision and hearing status assessed', category: 'Sensory' },
          { item: 'Footwear evaluation (appropriate, non-slip)', category: 'Safety' },
          { item: 'Assistive device use and appropriateness evaluated', category: 'Equipment' },
          { item: 'Home safety modifications discussed/implemented', category: 'Intervention' },
          { item: 'PT/OT referral consideration documented', category: 'Referral' },
          { item: 'Patient/caregiver education on fall prevention strategies', category: 'Education' }
        ]
      });
    }
    
    // Stroke/CVA Protocol
    if (diagLower.includes('stroke') || diagLower.includes('cva') || diagLower.includes('tia') ||
        diagLower.includes('cerebrovascular') || diagLower.includes('hemiparesis') ||
        noteLower.includes('weakness') || noteLower.includes('speech') || noteLower.includes('facial droop')) {
      protocols.push({
        name: 'Stroke/CVA Management Protocol',
        category: 'Neurological',
        guideline_source: 'AHA/ASA Stroke Guidelines 2024',
        elements: [
          { item: 'Neurological assessment documented (NIH Stroke Scale elements)', category: 'Neuro Assessment' },
          { item: 'Level of consciousness (alert, oriented x3)', category: 'Neuro Assessment' },
          { item: 'Speech assessment (clear, slurred, aphasia type)', category: 'Neuro Assessment' },
          { item: 'Facial symmetry evaluated', category: 'Neuro Assessment' },
          { item: 'Motor strength bilateral upper and lower extremities', category: 'Neuro Assessment' },
          { item: 'Sensation assessment bilateral', category: 'Neuro Assessment' },
          { item: 'Blood pressure documented (per post-stroke parameters)', category: 'Cardiovascular' },
          { item: 'Swallowing assessment/aspiration precautions', category: 'Safety' },
          { item: 'Mobility and transfer status documented', category: 'Functional' },
          { item: 'Safety awareness and judgment evaluated', category: 'Cognitive' },
          { item: 'Skin integrity (especially affected side)', category: 'Integumentary' },
          { item: 'Medication compliance (anticoagulants, antihypertensives, statins)', category: 'Medication' },
          { item: 'Depression/mood screening (PHQ-2 or PHQ-9)', category: 'Psychosocial' },
          { item: 'Caregiver burden assessed', category: 'Psychosocial' },
          { item: 'Stroke warning signs education (FAST)', category: 'Education' },
          { item: 'Secondary prevention measures addressed', category: 'Prevention' }
        ]
      });
    }

    // Hypertension Protocol
    if (diagLower.includes('hypertension') || diagLower.includes('htn') || diagLower.includes('high blood pressure') ||
        noteLower.includes('blood pressure') || noteLower.includes('bp elevated')) {
      protocols.push({
        name: 'Hypertension Management Protocol',
        category: 'Chronic Disease',
        guideline_source: 'ACC/AHA Hypertension Guidelines 2017',
        elements: [
          { item: 'Blood pressure documented (both arms if initial or discrepancy)', category: 'Vital Signs' },
          { item: 'BP compared to target goal (<130/80 for most patients)', category: 'Goal Tracking' },
          { item: 'BP trend analysis from previous visits', category: 'Trend Analysis' },
          { item: 'Symptoms of uncontrolled HTN assessed (headache, visual changes)', category: 'Symptoms' },
          { item: 'Medication compliance verified', category: 'Medication' },
          { item: 'Side effects of antihypertensives assessed', category: 'Medication' },
          { item: 'Lifestyle modifications discussed (diet, exercise, sodium, alcohol)', category: 'Education' },
          { item: 'Home BP monitoring technique reviewed if applicable', category: 'Self-Management' },
          { item: 'End-organ damage signs assessed (vision, kidney function)', category: 'Complications' }
        ]
      });
    }

    // Pain Management Protocol
    if (diagLower.includes('pain') || diagLower.includes('chronic pain') || diagLower.includes('cancer') ||
        diagLower.includes('palliative') || diagLower.includes('hospice') ||
        noteLower.includes('pain') || noteLower.includes('discomfort') || noteLower.includes('opioid')) {
      protocols.push({
        name: 'Pain Management Protocol',
        category: 'Symptom Management',
        guideline_source: 'NCCN Cancer Pain Guidelines',
        elements: [
          { item: 'Pain level documented using validated scale (0-10, FACES)', category: 'Assessment' },
          { item: 'Pain characteristics (location, quality, radiation)', category: 'Assessment' },
          { item: 'Pain triggers and alleviating factors identified', category: 'Assessment' },
          { item: 'Impact on function and quality of life documented', category: 'Functional' },
          { item: 'Current pain regimen effectiveness evaluated', category: 'Medication' },
          { item: 'Breakthrough pain medication use and effectiveness', category: 'Medication' },
          { item: 'Side effects of pain medications assessed (constipation, sedation)', category: 'Medication' },
          { item: 'Non-pharmacological pain interventions discussed', category: 'Intervention' },
          { item: 'Pain goals discussed with patient', category: 'Goals' }
        ]
      });
    }

    // Anticoagulation Protocol
    if (diagLower.includes('anticoagul') || diagLower.includes('warfarin') || diagLower.includes('coumadin') ||
        diagLower.includes('dvt') || diagLower.includes('pe') || diagLower.includes('afib') ||
        noteLower.includes('inr') || noteLower.includes('blood thinner') || noteLower.includes('bleeding')) {
      protocols.push({
        name: 'Anticoagulation Management Protocol',
        category: 'Medication Safety',
        guideline_source: 'CHEST Antithrombotic Guidelines',
        elements: [
          { item: 'Current anticoagulant regimen documented', category: 'Medication' },
          { item: 'INR result documented if on warfarin (with date)', category: 'Monitoring' },
          { item: 'INR therapeutic range and target documented', category: 'Monitoring' },
          { item: 'Signs of bleeding assessed (bruising, gum bleeding, blood in stool/urine)', category: 'Safety' },
          { item: 'Signs of clotting assessed (leg swelling, pain, SOB)', category: 'Safety' },
          { item: 'Medication compliance verified', category: 'Medication' },
          { item: 'Drug-drug and drug-food interactions reviewed', category: 'Safety' },
          { item: 'Fall risk addressed (bleeding risk with falls)', category: 'Safety' },
          { item: 'Patient education on anticoagulation safety', category: 'Education' }
        ]
      });
    }

    // Dementia/Cognitive Protocol
    if (diagLower.includes('dementia') || diagLower.includes('alzheimer') || diagLower.includes('cognitive') ||
        diagLower.includes('memory') || noteLower.includes('confusion') || noteLower.includes('wandering')) {
      protocols.push({
        name: 'Cognitive/Dementia Care Protocol',
        category: 'Neurological',
        guideline_source: 'Alzheimer\'s Association Care Guidelines',
        elements: [
          { item: 'Cognitive status assessed (orientation, memory, attention)', category: 'Assessment' },
          { item: 'Baseline cognition compared to current status', category: 'Trend Analysis' },
          { item: 'Behavioral symptoms assessed (agitation, wandering, sundowning)', category: 'Behavioral' },
          { item: 'Safety assessment completed (wandering risk, stove, driving)', category: 'Safety' },
          { item: 'Medication management safety evaluated', category: 'Safety' },
          { item: 'Caregiver stress and coping assessed', category: 'Caregiver Support' },
          { item: 'Nutrition and hydration status', category: 'Basic Needs' },
          { item: 'Sleep pattern documented', category: 'Basic Needs' },
          { item: 'Communication strategies utilized and documented', category: 'Care Approach' },
          { item: 'Advance care planning discussed', category: 'Planning' }
        ]
      });
    }

    // Default general protocol if no specific match
    if (protocols.length === 0) {
      protocols.push({
        name: 'General Clinical Assessment Protocol',
        category: 'Standard',
        guideline_source: 'Home Health Conditions of Participation',
        elements: [
          { item: 'Complete vital signs assessment documented', category: 'Vital Signs' },
          { item: 'Pain assessment using validated scale', category: 'Pain' },
          { item: 'Medication review and compliance verified', category: 'Medication' },
          { item: 'Functional status evaluation (ADLs, IADLs)', category: 'Functional' },
          { item: 'Safety assessment completed', category: 'Safety' },
          { item: 'Cognitive/mental status noted', category: 'Cognitive' },
          { item: 'Patient/caregiver education provided and documented', category: 'Education' },
          { item: 'Care plan goals addressed and progress noted', category: 'Goals' },
          { item: 'Changes since last visit documented', category: 'Monitoring' }
        ]
      });
    }
    
    return protocols;
  };

  const runReview = async () => {
    if (!noteText || noteText.length < 100) {
      alert("Please complete your documentation before running the review.");
      return;
    }

    setIsReviewing(true);
    setFlaggedItems({});
    try {
      const skillsList = nurseSkills.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ');
      const existingTasksList = existingTasks.map(t => t.title).join(', ');
      
      // Get applicable clinical protocols based on diagnosis AND note content
      const applicableProtocols = getClinicalProtocols(diagnosis, noteText);
      const protocolPrompt = applicableProtocols.map(p => 
        `\n${p.name} (${p.category}) - Source: ${p.guideline_source}:\n${p.elements.map(e => 
          typeof e === 'object' ? `  - [${e.category}] ${e.item}` : `  - ${e}`
        ).join('\n')}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert clinical documentation auditor for ${careType === 'hospice' ? 'hospice' : 'home health'}. Perform a comprehensive review of this completed note.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine'}
NURSE'S SKILLS: ${skillsList || 'Not available'}
EXISTING PENDING TASKS: ${existingTasksList || 'None'}

COMPLETED NOTE:
${noteText}

===== CLINICAL PROTOCOL CROSS-REFERENCE =====
Based on the patient's diagnosis, check documentation against these specific clinical protocols:
${protocolPrompt}

For EACH protocol element, determine if it was addressed in the note.

Perform a thorough review checking for:

1. MISSING FOLLOW-UP ACTIONS - Did the nurse document something that requires follow-up but didn't create a task?
   - Abnormal vitals requiring physician notification
   - New symptoms needing further assessment
   - Patient teaching that needs reinforcement
   - Care coordination needs
   - Equipment or supply orders
   - Scheduled follow-up calls

2. DOCUMENTATION COMPLETENESS - For Medicare compliance:
   ${careType === 'hospice' ? `
   - Terminal prognosis indicators
   - Symptom management documentation
   - Comfort measures
   - Patient/family coping
   - Spiritual/psychosocial needs
   ` : `
   - Homebound status justification
   - Skilled nursing necessity
   - Patient response to teaching
   - Functional status
   - Progress toward goals
   `}

3. CLINICAL SAFETY CONCERNS - Any red flags that weren't addressed:
   - Vital sign abnormalities
   - New symptoms of concern
   - Medication issues
   - Safety hazards
   - Signs of decline

4. SKILL GAP INDICATORS - Documentation patterns suggesting training needs:
   - Consistently missing certain elements
   - Vague or non-specific documentation
   - Missing evidence-based language

5. PROTOCOL COMPLIANCE - Check each applicable clinical protocol element thoroughly
   - For each protocol, evaluate EVERY element listed
   - Provide specific quotes from the note where elements are addressed
   - Give actionable recommendations for missing elements
   - Calculate accurate compliance scores based on elements met

6. CROSS-REFERENCE ANALYSIS - Correlate patient history with current symptoms
   - If symptoms are mentioned, check if appropriate protocol elements are addressed
   - Flag when symptoms suggest a condition but related documentation is missing
   - Example: SOB in COPD patient should trigger all respiratory assessment elements

Return JSON:
{
  "overall_score": 0-100,
  "review_summary": "Brief summary of findings",
  "protocol_compliance": [
    {
      "protocol_name": "Protocol name",
      "category": "Protocol category",
      "guideline_source": "Source guideline reference",
      "elements_checked": [
        {
          "element": "Protocol element",
          "element_category": "Category within protocol",
          "status": "met" | "partial" | "not_addressed" | "not_applicable",
          "found_text": "Exact quote from note if found, null if not",
          "recommendation": "Specific actionable recommendation if not met",
          "clinical_importance": "Why this element matters clinically"
        }
      ],
      "compliance_score": 0-100,
      "compliance_breakdown": {
        "met_count": 0,
        "partial_count": 0,
        "not_addressed_count": 0,
        "not_applicable_count": 0
      },
      "priority_gaps": ["Top 3 most critical missing elements"],
      "improvement_summary": "Specific guidance to improve this protocol's score"
    }
  ],
  "cross_reference_findings": [
    {
      "finding": "What was identified from cross-referencing",
      "patient_history_factor": "Relevant history element",
      "current_symptom": "Current symptom noted",
      "expected_documentation": "What should be documented based on this correlation",
      "status": "documented" | "missing" | "incomplete",
      "clinical_rationale": "Why this cross-reference matters"
    }
  ],
  "missing_followups": [
    {
      "issue": "What was documented that needs follow-up",
      "suggested_task": {
        "title": "Task title",
        "description": "Task description",
        "priority": "high" | "medium" | "low",
        "type": "call" | "notify" | "schedule" | "order" | "document"
      },
      "urgency": "immediate" | "today" | "this_week"
    }
  ],
  "documentation_gaps": [
    {
      "element": "Missing element",
      "importance": "critical" | "important" | "recommended",
      "suggestion": "How to fix it",
      "guideline_reference": "Clinical guideline this relates to"
    }
  ],
  "safety_alerts": [
    {
      "concern": "Safety concern identified",
      "action_needed": "What should be done",
      "priority": "urgent" | "high" | "medium",
      "clinical_rationale": "Why this is a concern"
    }
  ],
  "skill_gaps": [
    {
      "area": "Documentation skill area",
      "evidence": "What indicates this gap",
      "recommended_training": "Specific training topic"
    }
  ],
  "strengths": ["Well-documented elements"],
  "ready_to_submit": true | false,
  "submission_blockers": ["Critical issues preventing submission"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            review_summary: { type: "string" },
            protocol_compliance: { type: "array", items: { type: "object" } },
            cross_reference_findings: { type: "array", items: { type: "object" } },
            missing_followups: { type: "array", items: { type: "object" } },
            documentation_gaps: { type: "array", items: { type: "object" } },
            safety_alerts: { type: "array", items: { type: "object" } },
            skill_gaps: { type: "array", items: { type: "object" } },
            strengths: { type: "array", items: { type: "string" } },
            ready_to_submit: { type: "boolean" },
            submission_blockers: { type: "array", items: { type: "string" } }
          }
        }
      });

      setReviewResult(result);

      // Save skill gaps to localStorage for Learning Hub
      if (result.skill_gaps?.length > 0) {
        const existingGaps = JSON.parse(localStorage.getItem(`skill_gaps_${nurseEmail}`) || '[]');
        const newGaps = result.skill_gaps.filter(
          gap => !existingGaps.some(eg => eg.area === gap.area)
        );
        const allGaps = [...existingGaps, ...newGaps];
        localStorage.setItem(`skill_gaps_${nurseEmail}`, JSON.stringify(allGaps));
        
        if (onTrainingRecommended) {
          onTrainingRecommended(result.skill_gaps);
        }
      }
    } catch (error) {
      console.error("Error reviewing note:", error);
      alert("Error reviewing note. Please try again.");
    }
    setIsReviewing(false);
  };

  // Flagging functions
  const openFlagDialog = (itemType, itemId, itemContent) => {
    setCurrentFlagItem({ type: itemType, id: itemId, content: itemContent });
    setFlagNote("");
    setFlagDialogOpen(true);
  };

  const submitFlag = async () => {
    if (!currentFlagItem) return;
    
    const flagKey = `${currentFlagItem.type}_${currentFlagItem.id}`;
    const flagData = {
      type: currentFlagItem.type,
      content: currentFlagItem.content,
      note: flagNote,
      flaggedBy: nurseEmail,
      flaggedAt: new Date().toISOString(),
      status: 'pending_review'
    };
    
    setFlaggedItems(prev => ({
      ...prev,
      [flagKey]: flagData
    }));
    
    // Create a task for supervisor review
    try {
      await base44.entities.Task.create({
        patient_id: patientId,
        title: `Review Flagged Finding: ${currentFlagItem.type}`,
        description: `Flagged by ${nurseEmail}:\n\nFinding: ${currentFlagItem.content}\n\nNurse Note: ${flagNote || 'No additional notes'}`,
        priority: 'medium',
        type: 'document',
        status: 'pending',
        source: 'ai_generated',
        ai_reason: 'Flagged for supervisor review from AI Note Review'
      });
    } catch (error) {
      console.error("Error creating flag task:", error);
    }
    
    setFlagDialogOpen(false);
    setCurrentFlagItem(null);
  };

  const isFlagged = (itemType, itemId) => {
    return !!flaggedItems[`${itemType}_${itemId}`];
  };

  const FlagButton = ({ itemType, itemId, content }) => {
    const flagged = isFlagged(itemType, itemId);
    return (
      <Button
        size="sm"
        variant="ghost"
        className={`h-6 px-2 ${flagged ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!flagged) {
            openFlagDialog(itemType, itemId, content);
          }
        }}
        title={flagged ? "Flagged for review" : "Flag for supervisor review"}
      >
        <Flag className={`w-3 h-3 ${flagged ? 'fill-orange-600' : ''}`} />
      </Button>
    );
  };

  const handleCreateTask = async (followup) => {
    if (!patientId) {
      alert("Please select a patient first.");
      return;
    }

    try {
      await base44.entities.Task.create({
        patient_id: patientId,
        title: followup.suggested_task.title,
        description: followup.suggested_task.description,
        priority: followup.suggested_task.priority,
        type: followup.suggested_task.type,
        status: 'pending',
        source: 'ai_generated',
        ai_reason: `Identified during note review: ${followup.issue}`
      });
      
      // Remove from list after creation
      setReviewResult(prev => ({
        ...prev,
        missing_followups: prev.missing_followups.filter(f => f !== followup)
      }));

      if (onCreateTask) onCreateTask(followup.suggested_task);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      immediate: 'bg-red-600 text-white',
      urgent: 'bg-red-100 text-red-800',
      today: 'bg-yellow-100 text-yellow-800',
      this_week: 'bg-blue-100 text-blue-800'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            AI Note Review
          </div>
          <div className="flex items-center gap-2">
            {reviewResult && (
              <Badge className={reviewResult.ready_to_submit ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {reviewResult.ready_to_submit ? 'Ready to Submit' : 'Needs Attention'}
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3">
          {!reviewResult ? (
            <div className="text-center py-4">
              <FileCheck className="w-10 h-10 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                AI will review your note against clinical protocols, compliance requirements, and safety standards
              </p>
              <Button
                onClick={runReview}
                disabled={isReviewing || !noteText || noteText.length < 100}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReviewing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with Protocols...</>
                ) : (
                  <><FileCheck className="w-4 h-4 mr-2" /> Run Advanced AI Review</>
                )}
              </Button>
              {diagnosis && (
                <p className="text-xs text-gray-400 mt-2">
                  <Stethoscope className="w-3 h-3 inline mr-1" />
                  Will cross-reference: {getClinicalProtocols(diagnosis).map(p => p.name).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score and Summary */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${getScoreColor(reviewResult.overall_score)}`}>
                    {reviewResult.overall_score}
                  </p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="flex-1">
                  <Progress value={reviewResult.overall_score} className="h-2 mb-2" />
                  <p className="text-sm text-gray-700">{reviewResult.review_summary}</p>
                </div>
              </div>

              {/* Flagged Items Count */}
              {Object.keys(flaggedItems).length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <Flag className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-orange-800">
                    {Object.keys(flaggedItems).length} item(s) flagged for supervisor review
                  </span>
                </div>
              )}

              {/* Tabs for organized view */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="protocols" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Protocols
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                  <TabsTrigger value="training" className="text-xs">Training</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3 mt-3">
                  {/* Submission Blockers */}
                  {!reviewResult.ready_to_submit && reviewResult.submission_blockers?.length > 0 && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-800">
                        <p className="font-semibold mb-1">Cannot Submit - Issues Found:</p>
                        <ul className="list-disc list-inside">
                          {reviewResult.submission_blockers.map((blocker, idx) => (
                            <li key={idx}>{blocker}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Safety Alerts */}
                  {reviewResult.safety_alerts?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-red-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Safety Alerts
                      </p>
                      {reviewResult.safety_alerts.map((alert, idx) => (
                        <Alert key={idx} className="py-2 bg-red-50 border-red-200">
                          <AlertDescription className="text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getUrgencyBadge(alert.priority)}>{alert.priority}</Badge>
                                <span className="font-medium">{alert.concern}</span>
                              </div>
                              <FlagButton itemType="safety" itemId={idx} content={alert.concern} />
                            </div>
                            <p className="text-red-700">Action: {alert.action_needed}</p>
                            {alert.clinical_rationale && (
                              <p className="text-gray-500 mt-1 italic">Rationale: {alert.clinical_rationale}</p>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Strengths */}
                  {reviewResult.strengths?.length > 0 && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Strengths
                      </p>
                      <p className="text-xs text-green-700">{reviewResult.strengths.join(', ')}</p>
                    </div>
                  )}

                  {/* Documentation Gaps */}
                  {reviewResult.documentation_gaps?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-yellow-800">Documentation Gaps</p>
                      {reviewResult.documentation_gaps.map((gap, idx) => (
                        <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge className={gap.importance === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                {gap.importance}
                              </Badge>
                              <span className="font-medium">{gap.element}</span>
                            </div>
                            <FlagButton itemType="gap" itemId={idx} content={`${gap.element}: ${gap.suggestion}`} />
                          </div>
                          <p className="text-gray-600">{gap.suggestion}</p>
                          {gap.guideline_reference && (
                            <p className="text-gray-400 mt-1 text-xs italic">
                              <BookOpen className="w-3 h-3 inline mr-1" />
                              Ref: {gap.guideline_reference}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Protocols Tab */}
                <TabsContent value="protocols" className="space-y-3 mt-3">
                  {reviewResult.protocol_compliance?.length > 0 ? (
                    reviewResult.protocol_compliance.map((protocol, pIdx) => (
                      <div key={pIdx} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-indigo-50">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-900">{protocol.protocol_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={protocol.compliance_score >= 80 ? 'bg-green-100 text-green-800' : protocol.compliance_score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {protocol.compliance_score}%
                            </Badge>
                            <FlagButton itemType="protocol" itemId={pIdx} content={`${protocol.protocol_name}: ${protocol.compliance_score}% compliance`} />
                          </div>
                        </div>
                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                          {protocol.elements_checked?.map((element, eIdx) => (
                            <div 
                              key={eIdx} 
                              className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                                element.status === 'met' ? 'bg-green-50' :
                                element.status === 'partial' ? 'bg-yellow-50' :
                                element.status === 'not_applicable' ? 'bg-gray-50' : 'bg-red-50'
                              }`}
                            >
                              {element.status === 'met' ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                              ) : element.status === 'partial' ? (
                                <Clock className="w-3 h-3 text-yellow-600 shrink-0 mt-0.5" />
                              ) : element.status === 'not_applicable' ? (
                                <span className="w-3 h-3 text-gray-400 shrink-0">—</span>
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{element.element}</p>
                                {element.found_text && (
                                  <p className="text-gray-500 italic truncate">"{element.found_text}"</p>
                                )}
                                {element.status !== 'met' && element.status !== 'not_applicable' && element.recommendation && (
                                  <p className="text-orange-700 mt-0.5">→ {element.recommendation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No protocol data available
                    </div>
                  )}
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-3 mt-3">
                  {reviewResult.missing_followups?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                        <ListTodo className="w-3 h-3" /> Missing Follow-up Actions
                      </p>
                      {reviewResult.missing_followups.map((followup, idx) => (
                        <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={getUrgencyBadge(followup.urgency)}>{followup.urgency}</Badge>
                            <div className="flex items-center gap-1">
                              <FlagButton itemType="followup" itemId={idx} content={followup.issue} />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => handleCreateTask(followup)}
                              >
                                Create Task
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mb-1">{followup.issue}</p>
                          <p className="text-xs text-orange-700">
                            → {followup.suggested_task.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-green-600 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      All follow-up actions documented!
                    </div>
                  )}
                </TabsContent>

                {/* Training Tab */}
                <TabsContent value="training" className="space-y-3 mt-3">
                  {reviewResult.skill_gaps?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> Training Recommendations
                      </p>
                      {reviewResult.skill_gaps.map((gap, idx) => (
                        <div key={idx} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-purple-900">{gap.area}</p>
                            <FlagButton itemType="training" itemId={idx} content={`Training: ${gap.recommended_training}`} />
                          </div>
                          <p className="text-gray-600 mb-1">{gap.evidence}</p>
                          <Link to={`${createPageUrl("NurseTraining")}?topic=${encodeURIComponent(gap.recommended_training)}`}>
                            <Button size="sm" variant="link" className="h-5 p-0 text-xs text-purple-600">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {gap.recommended_training}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-green-600 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      No training gaps identified!
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button variant="outline" size="sm" className="w-full" onClick={() => setReviewResult(null)}>
                Run New Review
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-600" />
              Flag for Supervisor Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-700">Flagging:</p>
              <p className="text-gray-600">{currentFlagItem?.content}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Add a note (optional):</label>
              <Textarea
                placeholder="Why are you flagging this? Any concerns or questions for the supervisor..."
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitFlag} className="bg-orange-600 hover:bg-orange-700">
              <Send className="w-4 h-4 mr-2" />
              Submit Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}