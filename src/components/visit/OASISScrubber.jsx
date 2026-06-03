import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { extractPhrases, getSentencesContaining } from "@/components/smartNote/compliance/factExtraction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  DollarSign,
  TrendingUp,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageSquare,
  Upload,
  Download,
  Copy,
  Eye,
  EyeOff,
  Filter,
  BarChart3,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Pill,
  Brain,
  Footprints,
  Hand,
  Stethoscope,
  ClipboardList
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logSecurityEvent } from "../utils/security";
import OASISFeedbackPanel from "../oasis/OASISFeedbackPanel";
import CMSComplianceReference from "../oasis/CMSComplianceReference";
import OASISPDFUploader from "../oasis/OASISPDFUploader";

export default function OASISScrubber({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onFixSuggestion,
  uploadedOasisData // New prop for uploaded OASIS PDF data
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [oasisResults, setOasisResults] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("results");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ accepted: 0, rejected: 0, modified: 0 });
  const [extractedOasisData, setExtractedOasisData] = useState(uploadedOasisData || null);
  const [showUploader, setShowUploader] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState('all');
  const [showExtractedIndicators, setShowExtractedIndicators] = useState(false);
  const [extractedIndicators, setExtractedIndicators] = useState(null);
  const [copiedText, setCopiedText] = useState(null);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(true);
  const [clinicalAlerts, setClinicalAlerts] = useState([]);

  const isHomeHealth = patient?.care_type === 'home_health';
  const isOASISVisit = ['admission', 'recertification', 'discharge'].includes(visit?.visit_type);

  // Handle data from OASISPDFUploader
  const handleOasisDataExtracted = (data) => {
    setExtractedOasisData(data);
    setShowUploader(false);
  };

  // Format extracted OASIS data for display
  const formatExtractedOasisForPrompt = (data) => {
    if (!data) return '';
    
    let formatted = '\n\n=== UPLOADED OASIS ASSESSMENT DATA ===\n';
    
    if (data.patient_info) {
      formatted += `\nPATIENT INFO:\n`;
      formatted += `- Assessment Type: ${data.m0100_reason_for_assessment || data.patient_info.assessment_type || 'N/A'}\n`;
      formatted += `- Assessment Date: ${data.patient_info.assessment_date || 'N/A'}\n`;
      formatted += `- SOC Date: ${data.patient_info.soc_date || 'N/A'}\n`;
    }
    
    if (data.clinical_record_items) {
      formatted += `\nCLINICAL RECORD:\n`;
      formatted += `- M1021 Primary Dx: ${data.clinical_record_items.m1021_primary_diagnosis || 'N/A'} (${data.clinical_record_items.m1021_icd10_code || ''})\n`;
      if (data.clinical_record_items.m1023_other_diagnoses?.length > 0) {
        formatted += `- M1023 Other Dx: ${data.clinical_record_items.m1023_other_diagnoses.map(d => `${d.code}: ${d.description}`).join('; ')}\n`;
      }
      formatted += `- M1030 Therapy at SOC: ${data.clinical_record_items.m1030_therapies_at_soc || 'N/A'}\n`;
      formatted += `- M1033 Risk Hospitalization: ${data.clinical_record_items.m1033_risk_hospitalization || 'N/A'}\n`;
    }
    
    if (data.sensory_status) {
      formatted += `\nSENSORY STATUS:\n`;
      formatted += `- M1200 Vision: ${data.sensory_status.m1200_vision || 'N/A'}\n`;
      formatted += `- M1242 Pain Frequency: ${data.sensory_status.m1242_pain_frequency || 'N/A'}\n`;
    }
    
    if (data.integumentary_status) {
      formatted += `\nINTEGUMENTARY:\n`;
      formatted += `- M1302 Risk Pressure Ulcer: ${data.integumentary_status.m1302_risk_pressure_ulcer || 'N/A'}\n`;
      formatted += `- M1306 Pressure Ulcer Present: ${data.integumentary_status.m1306_pressure_ulcer_present || 'N/A'}\n`;
      formatted += `- M1330 Stasis Ulcer: ${data.integumentary_status.m1330_stasis_ulcer || 'N/A'}\n`;
      formatted += `- M1340 Surgical Wound: ${data.integumentary_status.m1340_surgical_wound || 'N/A'}\n`;
    }
    
    if (data.respiratory_status) {
      formatted += `\nRESPIRATORY:\n`;
      formatted += `- M1400 Dyspnea: ${data.respiratory_status.m1400_dyspnea || 'N/A'}\n`;
    }
    
    if (data.neuro_emotional_status) {
      formatted += `\nNEURO/EMOTIONAL:\n`;
      formatted += `- M1700 Cognitive: ${data.neuro_emotional_status.m1700_cognitive_functioning || 'N/A'}\n`;
      formatted += `- M1710 Confused: ${data.neuro_emotional_status.m1710_confused || 'N/A'}\n`;
      formatted += `- M1730 PHQ-2: ${data.neuro_emotional_status.m1730_phq2_depression || 'N/A'}\n`;
    }
    
    if (data.adl_iadl_status) {
      formatted += `\nADL/IADL STATUS (M1800-M1910):\n`;
      formatted += `- M1800 Grooming: ${data.adl_iadl_status.m1800_grooming || 'N/A'}\n`;
      formatted += `- M1810 Dress Upper: ${data.adl_iadl_status.m1810_dress_upper || 'N/A'}\n`;
      formatted += `- M1820 Dress Lower: ${data.adl_iadl_status.m1820_dress_lower || 'N/A'}\n`;
      formatted += `- M1830 Bathing: ${data.adl_iadl_status.m1830_bathing || 'N/A'}\n`;
      formatted += `- M1840 Toilet Transfer: ${data.adl_iadl_status.m1840_toilet_transfer || 'N/A'}\n`;
      formatted += `- M1850 Transferring: ${data.adl_iadl_status.m1850_transferring || 'N/A'}\n`;
      formatted += `- M1860 Ambulation: ${data.adl_iadl_status.m1860_ambulation || 'N/A'}\n`;
    }
    
    if (data.medications) {
      formatted += `\nMEDICATIONS:\n`;
      formatted += `- M2001 Drug Regimen Review: ${data.medications.m2001_drug_regimen_review || 'N/A'}\n`;
      formatted += `- M2010 High Risk Drugs: ${data.medications.m2010_high_risk_drugs || 'N/A'}\n`;
      formatted += `- M2020 Oral Med Mgmt: ${data.medications.m2020_oral_med_management || 'N/A'}\n`;
    }
    
    if (data.gg_functional_abilities) {
      formatted += `\nSECTION GG - FUNCTIONAL ABILITIES:\n`;
      
      if (data.gg_functional_abilities.gg0130_self_care) {
        formatted += `\nGG0130 Self-Care (SOC/DC Goal):\n`;
        const sc = data.gg_functional_abilities.gg0130_self_care;
        formatted += `- Eating: ${sc.eating_soc || '?'} / ${sc.eating_dc_goal || '?'}\n`;
        formatted += `- Oral Hygiene: ${sc.oral_hygiene_soc || '?'} / ${sc.oral_hygiene_dc_goal || '?'}\n`;
        formatted += `- Toileting Hygiene: ${sc.toileting_hygiene_soc || '?'} / ${sc.toileting_hygiene_dc_goal || '?'}\n`;
        formatted += `- Shower/Bathe: ${sc.shower_bathe_soc || '?'} / ${sc.shower_bathe_dc_goal || '?'}\n`;
        formatted += `- Upper Body Dressing: ${sc.upper_body_dressing_soc || '?'} / ${sc.upper_body_dressing_dc_goal || '?'}\n`;
        formatted += `- Lower Body Dressing: ${sc.lower_body_dressing_soc || '?'} / ${sc.lower_body_dressing_dc_goal || '?'}\n`;
        formatted += `- Footwear: ${sc.footwear_soc || '?'} / ${sc.footwear_dc_goal || '?'}\n`;
      }
      
      if (data.gg_functional_abilities.gg0170_mobility) {
        formatted += `\nGG0170 Mobility (SOC/DC Goal):\n`;
        const mob = data.gg_functional_abilities.gg0170_mobility;
        formatted += `- Sit to Lying: ${mob.sit_to_lying_soc || '?'} / ${mob.sit_to_lying_dc_goal || '?'}\n`;
        formatted += `- Lying to Sitting: ${mob.lying_to_sitting_soc || '?'} / ${mob.lying_to_sitting_dc_goal || '?'}\n`;
        formatted += `- Sit to Stand: ${mob.sit_to_stand_soc || '?'} / ${mob.sit_to_stand_dc_goal || '?'}\n`;
        formatted += `- Chair/Bed Transfer: ${mob.chair_bed_transfer_soc || '?'} / ${mob.chair_bed_transfer_dc_goal || '?'}\n`;
        formatted += `- Toilet Transfer: ${mob.toilet_transfer_soc || '?'} / ${mob.toilet_transfer_dc_goal || '?'}\n`;
        formatted += `- Walk 10 feet: ${mob.walk_10_feet_soc || '?'} / ${mob.walk_10_feet_dc_goal || '?'}\n`;
        formatted += `- Walk 50 feet: ${mob.walk_50_feet_soc || '?'} / ${mob.walk_50_feet_dc_goal || '?'}\n`;
        formatted += `- Walk 150 feet: ${mob.walk_150_feet_soc || '?'} / ${mob.walk_150_feet_dc_goal || '?'}\n`;
        formatted += `- 4 Steps: ${mob.four_steps_soc || '?'} / ${mob.four_steps_dc_goal || '?'}\n`;
        formatted += `- 12 Steps: ${mob.twelve_steps_soc || '?'} / ${mob.twelve_steps_dc_goal || '?'}\n`;
      }
    }
    
    if (data.discharge_info) {
      formatted += `\nDISCHARGE INFO:\n`;
      formatted += `- M2301 Emergent Care: ${data.discharge_info.m2301_emergent_care || 'N/A'}\n`;
      formatted += `- M2410 Discharge Disposition: ${data.discharge_info.m2410_discharge_disposition || 'N/A'}\n`;
    }
    
    formatted += '\n=== END UPLOADED OASIS DATA ===\n';
    
    return formatted;
  };

  const runOASISScrubber = async () => {
    setIsScrubbing(true);
    setShowDialog(true);
    setExpandedCategories(['underscoring', 'overscoring', 'critical']); // Auto-expand important sections
    
    try {
      await logSecurityEvent('OASIS_SCRUBBER_STARTED', { visit_id: visit?.id });

      const visitType = visit?.visit_type?.replace(/_/g, ' ').toUpperCase() || 'VISIT';

      // extractPhrases / getSentencesContaining are imported from the shared
      // factExtraction module (single source of truth).

      // === ENHANCED CLINICAL INDICATOR EXTRACTION ===
      const clinicalIndicators = {
        // Assistive Devices - detailed categorization
        assistDevices: {
          detected: /walker|cane|wheelchair|rollator|crutch|grab bar|shower chair|commode|quad cane|hemi-walker|gait belt|bedside commode|raised toilet seat|reacher|hospital bed|hoyer lift|transfer board|sliding board/gi.test(narrativeText),
          walkers: extractPhrases(narrativeText, /(?:uses?|requires?|ambulates? with|utilizing)?\s*(?:front[- ]?wheel(?:ed)?|four[- ]?wheel(?:ed)?|standard|rolling)?\s*walker[^.]*\./gi),
          canes: extractPhrases(narrativeText, /(?:uses?|requires?|ambulates? with)?\s*(?:quad|single[- ]?point|straight|offset)?\s*cane[^.]*\./gi),
          wheelchairs: extractPhrases(narrativeText, /(?:uses?|requires?|dependent on)?\s*(?:manual|power|electric|transport)?\s*wheelchair[^.]*\./gi),
          bathroom: extractPhrases(narrativeText, /(?:grab bar|shower chair|tub bench|raised toilet|commode|bath seat)[^.]*\./gi),
          transfers: extractPhrases(narrativeText, /(?:hoyer|mechanical lift|transfer board|gait belt|sliding board)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /walker|cane|wheelchair|rollator|crutch|grab bar|shower chair|commode|gait belt|lift/gi)
        },

        // Oxygen Usage - with specifics
        oxygenUse: {
          detected: /oxygen|o2|liters|lpm|l\/min|nasal cannula|concentrator|portable oxygen|bipap|cpap|nebulizer|pulse ox|spo2|saturation/gi.test(narrativeText),
          flowRate: extractPhrases(narrativeText, /(\d+\.?\d*)\s*(l|liters?|lpm|l\/min)[^.]*\./gi),
          deliveryMethod: extractPhrases(narrativeText, /(nasal cannula|non-?rebreather|face ?mask|venturi|high[- ]?flow|concentrator|portable tank)[^.]*\./gi),
          frequency: extractPhrases(narrativeText, /(continuous|prn|as needed|with exertion|at rest|during sleep|24\/7|around the clock)\s*(?:oxygen|o2)[^.]*\./gi),
          saturation: extractPhrases(narrativeText, /(spo2|saturation|pulse ox|oxygen sat)[^.]*(\d+%?)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /oxygen|o2 at|liters|lpm|nasal cannula|concentrator|saturation|spo2/gi)
        },

        // Wound Presence - detailed typing
        woundPresent: {
          detected: /wound|ulcer|incision|surgical site|dressing|staging|granulation|pressure injury|skin tear|laceration|dehiscence|necrotic|slough|eschar|drainage|exudate/gi.test(narrativeText),
          pressureUlcers: extractPhrases(narrativeText, /(pressure (?:ulcer|injury|sore)|stage\s*[1-4IiVv]+|unstageable|dti|deep tissue injury)[^.]*\./gi),
          surgicalWounds: extractPhrases(narrativeText, /(surgical (?:wound|site|incision)|post[- ]?op|staples|sutures|steri[- ]?strips|incision)[^.]*\./gi),
          venousUlcers: extractPhrases(narrativeText, /(venous|stasis|arterial|vascular)\s*(?:ulcer|wound)[^.]*\./gi),
          diabeticWounds: extractPhrases(narrativeText, /(diabetic (?:ulcer|wound|foot)|neuropathic ulcer)[^.]*\./gi),
          skinTears: extractPhrases(narrativeText, /(skin tear|laceration|abrasion|bruise|hematoma)[^.]*\./gi),
          woundCharacteristics: extractPhrases(narrativeText, /(granulation|epithelialization|necrotic|slough|eschar|drainage|exudate|purulent|serous|sanguinous|undermining|tunneling)[^.]*\./gi),
          dressingTypes: extractPhrases(narrativeText, /(dressing|gauze|foam|hydrocolloid|alginate|silver|antimicrobial|wound vac|negative pressure)[^.]*\./gi),
          measurements: extractPhrases(narrativeText, /(\d+\.?\d*\s*(?:cm|mm|x)\s*\d+\.?\d*)[^.]*(?:wound|ulcer|incision)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /wound|ulcer|incision|dressing|stage|granulation|drainage/gi)
        },

        // Fall Risk Factors - comprehensive
        fallRisk: {
          detected: /fall|unsteady|balance|gait|weak|dizziness|vertigo|syncope|near[- ]?fall|history of falls?|high[- ]?risk|morse|tinetti/gi.test(narrativeText),
          history: extractPhrases(narrativeText, /(history of falls?|fell\s+\d+|previous fall|recent fall|multiple falls)[^.]*\./gi),
          balanceIssues: extractPhrases(narrativeText, /(unsteady|balance (?:impair|deficit|problem|issue)|poor balance|balance difficulty)[^.]*\./gi),
          gaitProblems: extractPhrases(narrativeText, /(gait (?:impair|deficit|unsteady|abnormal|ataxic|shuffling|antalgic)|abnormal gait)[^.]*\./gi),
          weakness: extractPhrases(narrativeText, /(weakness|weak(?:ened)?|(?:lower|upper) extremity weakness|generalized weakness|muscle weakness)[^.]*\./gi),
          dizziness: extractPhrases(narrativeText, /(dizz(?:y|iness)|vertigo|lightheaded|syncope|orthostatic|presyncope)[^.]*\./gi),
          medications: extractPhrases(narrativeText, /(sedativ|benzodiazepine|opioid|antihypertensive|diuretic)[^.]*(?:fall|risk)[^.]*\./gi),
          environmental: extractPhrases(narrativeText, /(throw rug|clutter|poor lighting|stairs|uneven|tripping hazard)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /fall|unsteady|balance|gait|weak|dizz|vertigo/gi)
        },

        // Pain Indicators - detailed
        painMentioned: {
          detected: /pain|discomfort|ache|aching|soreness|tender|hurt|burning|sharp|dull|throbbing|radiating|cramping/gi.test(narrativeText),
          location: extractPhrases(narrativeText, /((?:back|neck|shoulder|knee|hip|leg|arm|chest|abdominal|head|joint|muscle|nerve)\s*pain)[^.]*\./gi),
          intensity: extractPhrases(narrativeText, /(pain\s*(?:level|scale|score|rating)?[:\s]*\d+(?:\/10)?|(?:mild|moderate|severe|excruciating)\s*pain)[^.]*\./gi),
          quality: extractPhrases(narrativeText, /(sharp|dull|aching|burning|throbbing|stabbing|shooting|radiating|cramping|constant|intermittent)\s*(?:pain|discomfort)[^.]*\./gi),
          triggers: extractPhrases(narrativeText, /(pain (?:with|during|upon|after)|(?:worse|better) with)[^.]*\./gi),
          management: extractPhrases(narrativeText, /(pain (?:management|control|medication|relief)|(?:takes?|prescribed)\s+\w+\s+for pain)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /pain|discomfort|ache|soreness|tender|hurt/gi)
        },

        // Cognitive Concerns - detailed
        cognitiveIssues: {
          detected: /confused|forgetful|dementia|alzheimer|cognitive|memory|orientation|disoriented|impaired judgment|poor recall|short[- ]?term memory|long[- ]?term memory|alert and oriented|a&ox|bims/gi.test(narrativeText),
          orientation: extractPhrases(narrativeText, /(oriented (?:x|to)\s*\d|a&ox?\d|alert and oriented|disoriented|oriented to (?:person|place|time|situation))[^.]*\./gi),
          memoryIssues: extractPhrases(narrativeText, /(memory (?:loss|impair|deficit|problem)|short[- ]?term memory|long[- ]?term memory|forgetful|poor recall)[^.]*\./gi),
          diagnosis: extractPhrases(narrativeText, /(dementia|alzheimer|cognitive impairment|mild cognitive|vascular dementia|lewy body)[^.]*\./gi),
          judgment: extractPhrases(narrativeText, /(impaired judgment|poor (?:judgment|insight|decision)|safety awareness)[^.]*\./gi),
          screening: extractPhrases(narrativeText, /(bims|mmse|moca|mini[- ]?mental|cognitive screening|score(?:d)?[:\s]*\d+)[^.]*\./gi),
          behaviors: extractPhrases(narrativeText, /(wandering|agitation|sundowning|confusion|repetitive|exit[- ]?seeking)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /confused|memory|dementia|alzheimer|cognitive|orientation|oriented|bims/gi)
        },

        // Diabetic Management - detailed
        diabetic: {
          detected: /diabetes|diabetic|insulin|blood sugar|glucose|a1c|hba1c|hypoglycemia|hyperglycemia|fingerstick|glucometer|sliding scale|diabetic diet|carb counting/gi.test(narrativeText),
          type: extractPhrases(narrativeText, /(type\s*[12]\s*diabet|iddm|niddm|insulin[- ]?dependent|non[- ]?insulin)[^.]*\./gi),
          medications: extractPhrases(narrativeText, /(insulin|metformin|glipizide|januvia|lantus|humalog|novolog|ozempic|trulicity|jardiance)[^.]*\./gi),
          glucoseReadings: extractPhrases(narrativeText, /(blood (?:sugar|glucose)|bs|bg|fingerstick|glucometer)[:\s]*(\d+)[^.]*\./gi),
          a1c: extractPhrases(narrativeText, /(a1c|hba1c|hemoglobin a1c)[:\s]*(\d+\.?\d*)[^.]*\./gi),
          hypoglycemia: extractPhrases(narrativeText, /(hypoglycemi|low blood sugar|bs\s*(?:below|under|<)\s*\d+)[^.]*\./gi),
          complications: extractPhrases(narrativeText, /(diabetic (?:neuropathy|retinopathy|nephropathy|foot|ulcer)|peripheral neuropathy)[^.]*\./gi),
          management: extractPhrases(narrativeText, /(sliding scale|carb counting|diabetic diet|glucose monitoring|insulin administration)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /diabetes|insulin|blood sugar|glucose|a1c|hypoglycemia|diabetic/gi)
        },

        // Cardiac Symptoms - detailed
        cardiacIssues: {
          detected: /heart|cardiac|chf|afib|pacemaker|edema|shortness of breath|dyspnea|sob|chest pain|palpitation|arrhythmia|angina|mi|cad|heart failure/gi.test(narrativeText),
          heartFailure: extractPhrases(narrativeText, /(heart failure|chf|congestive|hfref|hfpef|ef\s*(?:of)?\s*\d+%?|ejection fraction)[^.]*\./gi),
          arrhythmias: extractPhrases(narrativeText, /(afib|atrial fibrillation|arrhythmia|palpitation|irregular (?:heart|pulse)|tachycardia|bradycardia)[^.]*\./gi),
          edema: extractPhrases(narrativeText, /(edema|swelling|(?:\d+\+?)\s*pitting|peripheral edema|bilateral (?:leg|lower extremity) (?:edema|swelling)|ankle swelling)[^.]*\./gi),
          dyspnea: extractPhrases(narrativeText, /(shortness of breath|sob|dyspnea|breathless|winded|orthopnea|pnd|paroxysmal nocturnal)[^.]*\./gi),
          chestPain: extractPhrases(narrativeText, /(chest (?:pain|discomfort|pressure|tightness)|angina|substernal)[^.]*\./gi),
          devices: extractPhrases(narrativeText, /(pacemaker|icd|defibrillator|aicd|loop recorder|cardiac monitor)[^.]*\./gi),
          vitals: extractPhrases(narrativeText, /(bp|blood pressure|hr|heart rate|pulse)[:\s]*\d+[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /heart|cardiac|chf|afib|edema|shortness of breath|dyspnea|pacemaker|chest pain/gi)
        },

        // Assistance Level Indicators
        assistanceNeeded: {
          detected: /assist|help|require|dependent|unable|cannot|difficulty|needs help|supervision|standby|contact guard|min assist|mod assist|max assist|total assist|cga|sba/gi.test(narrativeText),
          levelOfAssist: extractPhrases(narrativeText, /((?:min(?:imal)?|mod(?:erate)?|max(?:imal)?|total|complete)\s*assist|independent|supervision|standby|contact guard|cga|sba|1[- ]?person|2[- ]?person)[^.]*\./gi),
          dependency: extractPhrases(narrativeText, /(dependent|unable to|cannot|requires assistance|needs help)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /assist|dependent|unable|requires|needs help|supervision|standby/gi)
        },

        // Independence Indicators
        independentMentioned: {
          detected: /independent|independently|without assist|self|able to|performs? own|no assist|unassisted/gi.test(narrativeText),
          activities: extractPhrases(narrativeText, /(independent(?:ly)?|without assist(?:ance)?|able to|performs? (?:own|independently)|self[- ]?care|unassisted)[^.]*\./gi),
          sentences: getSentencesContaining(narrativeText, /independent|without assist|able to|performs? own|self|unassisted/gi)
        }
      };

      // === ENHANCED ADL/IADL PHRASE EXTRACTION ===
      const functionalPhrases = {
        // Bathing - comprehensive
        bathing: {
          allPhrases: getSentencesContaining(narrativeText, /bath|shower|wash|tub|sponge bath|bed bath|hygiene/gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total|complete)\s*assist(?:ance)?|independent(?:ly)?|supervision|standby)\s*(?:with|for|during)?\s*(?:bath|shower|wash)[^.]*\./gi),
          equipment: extractPhrases(narrativeText, /(shower chair|tub bench|grab bar|hand[- ]?held shower|bath seat|transfer bench)[^.]*\./gi),
          limitations: extractPhrases(narrativeText, /(unable to|difficulty|cannot|requires help)\s*(?:with)?\s*(?:bath|shower|wash)[^.]*\./gi)
        },

        // Dressing - comprehensive  
        dressing: {
          allPhrases: getSentencesContaining(narrativeText, /dress|cloth|button|zipper|put(?:ting)? on|don(?:ning)?|doff/gi),
          upperBody: extractPhrases(narrativeText, /(upper (?:body|extremity)|shirt|blouse|bra|jacket)\s*(?:dress)[^.]*\./gi),
          lowerBody: extractPhrases(narrativeText, /(lower (?:body|extremity)|pants|shorts|underwear|socks|shoes|footwear)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision|setup)\s*(?:with|for)?\s*(?:dress)[^.]*\./gi),
          limitations: extractPhrases(narrativeText, /(unable to|difficulty|cannot|requires help)\s*(?:with)?\s*(?:dress|button|zipper|reach)[^.]*\./gi)
        },

        // Ambulation/Mobility - comprehensive
        ambulation: {
          allPhrases: getSentencesContaining(narrativeText, /walk|ambul|mobil|gait|step|stair|feet|distance|weight[- ]?bear/gi),
          distance: extractPhrases(narrativeText, /(walk(?:s|ed|ing)?|ambulate(?:s|d)?)\s*(?:up to|approximately|about)?\s*\d+\s*(?:feet|ft|meters|yards)[^.]*\./gi),
          assistDevice: extractPhrases(narrativeText, /(ambulate(?:s|d)?|walk(?:s|ed)?)\s*(?:with|using)\s*(?:walker|cane|wheelchair|rollator)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision|standby|cga|sba)\s*(?:with|for)?\s*(?:ambul|walk|mobil)[^.]*\./gi),
          weightBearing: extractPhrases(narrativeText, /((?:non|partial|toe[- ]?touch|full|weight[- ]?bearing)[- ]?(?:weight[- ]?bearing)?|nwb|pwb|ttwb|fwb|wbat)[^.]*\./gi),
          stairs: extractPhrases(narrativeText, /(stair|step|flight|ascend|descend|rail)[^.]*\./gi),
          surfaces: extractPhrases(narrativeText, /(uneven|carpet|tile|outdoor|indoor|curb|ramp)[^.]*(?:surface|floor|ground)?[^.]*\./gi)
        },

        // Transfers - comprehensive
        transfer: {
          allPhrases: getSentencesContaining(narrativeText, /transfer|bed|chair|toilet|car|stand|sit|position/gi),
          types: extractPhrases(narrativeText, /(bed[- ]?to[- ]?chair|chair[- ]?to[- ]?bed|toilet transfer|car transfer|stand[- ]?pivot|sit[- ]?to[- ]?stand|supine[- ]?to[- ]?sit)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision|standby|1[- ]?person|2[- ]?person)\s*(?:with|for)?\s*(?:transfer)[^.]*\./gi),
          equipment: extractPhrases(narrativeText, /(hoyer|mechanical lift|transfer board|gait belt|slide board|trapeze)[^.]*(?:transfer)?[^.]*\./gi),
          weightBearing: extractPhrases(narrativeText, /(weight[- ]?bear|nwb|pwb|fwb|wbat)[^.]*(?:transfer)?[^.]*\./gi)
        },

        // Toileting - comprehensive
        toileting: {
          allPhrases: getSentencesContaining(narrativeText, /toilet|bathroom|urinal|bedpan|commode|continence|incontinence|void|bowel|bladder|catheter/gi),
          transfers: extractPhrases(narrativeText, /(toilet transfer|on(?:to)?\/off toilet|commode transfer)[^.]*\./gi),
          hygiene: extractPhrases(narrativeText, /(toileting hygiene|perineal care|self[- ]?wipe|clean(?:ing)? self)[^.]*\./gi),
          continence: extractPhrases(narrativeText, /((?:in)?continent|urinary|bowel|bladder|accident|leakage|urgency|frequency)[^.]*\./gi),
          equipment: extractPhrases(narrativeText, /(commode|bedpan|urinal|raised toilet|grab bar|catheter|brief|diaper)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision)\s*(?:with|for)?\s*(?:toilet|bathroom|continence)[^.]*\./gi)
        },

        // Grooming - comprehensive
        grooming: {
          allPhrases: getSentencesContaining(narrativeText, /groom|hygiene|oral|teeth|dental|brush|comb|hair|shav|nail|make[- ]?up/gi),
          oralCare: extractPhrases(narrativeText, /(oral (?:care|hygiene)|brush(?:ing)? teeth|denture(?:s)?|dental)[^.]*\./gi),
          hairCare: extractPhrases(narrativeText, /(comb(?:ing)?|brush(?:ing)? hair|hair care|wash(?:ing)? hair)[^.]*\./gi),
          shaving: extractPhrases(narrativeText, /(shav(?:e|ing)|razor|electric shaver|facial hair)[^.]*\./gi),
          nailCare: extractPhrases(narrativeText, /(nail (?:care|trim)|fingernail|toenail|podiatr)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision|setup)\s*(?:with|for)?\s*(?:groom|hygiene|oral care)[^.]*\./gi)
        },

        // Eating/Feeding - comprehensive
        eating: {
          allPhrases: getSentencesContaining(narrativeText, /eat|feed|meal|diet|swallow|chew|nutrition|appetite|intake/gi),
          selfFeeding: extractPhrases(narrativeText, /(self[- ]?feed|feed(?:s|ing)? self|independent(?:ly)? eat)[^.]*\./gi),
          assistLevel: extractPhrases(narrativeText, /((?:min|mod|max|total)\s*assist|independent|supervision|setup)\s*(?:with|for)?\s*(?:eat|feed|meal)[^.]*\./gi),
          swallowing: extractPhrases(narrativeText, /(swallow|dysphagia|aspiration|chok(?:e|ing)|thickened liquid|mechanical soft|pureed)[^.]*\./gi),
          diet: extractPhrases(narrativeText, /(diet|nutrition|appetite|intake|npo|tube feed|peg|g[- ]?tube)[^.]*\./gi)
        },

        // Medication Management
        medications: {
          allPhrases: getSentencesContaining(narrativeText, /medic|pill|tablet|dose|prescri|pharma|inject|insulin/gi),
          oralMeds: extractPhrases(narrativeText, /(oral med(?:ication)?s?|pill(?:s)?|tablet(?:s)?|capsule(?:s)?)[^.]*\./gi),
          injectables: extractPhrases(narrativeText, /(inject(?:able|ion)?s?|insulin|subcutaneous|im|iv)[^.]*\./gi),
          management: extractPhrases(narrativeText, /(med(?:ication)? management|pill box|med planner|self[- ]?administer|caregiver (?:gives|administers))[^.]*\./gi),
          compliance: extractPhrases(narrativeText, /(complian(?:t|ce)|adherence|miss(?:ed|ing) doses?|non[- ]?complian)[^.]*\./gi)
        }
      };

      // === PDGM CLINICAL GROUP DETERMINATION ===
      const determineClinicalGroup = (primaryDx, secondaryDx = []) => {
        const allDx = [primaryDx, ...secondaryDx].filter(Boolean).map(d => d.toLowerCase());
        const dxText = allDx.join(' ');

        // MMTA Clinical Groups based on ICD-10 patterns
        const clinicalGroups = {
          // Musculoskeletal Rehabilitation
          'MMTA-01': {
            name: 'Musculoskeletal Rehabilitation',
            patterns: [/fracture/, /arthroplasty/, /joint replacement/, /hip replacement/, /knee replacement/, /spinal fusion/, /amputation/, /orthopedic/],
            keywords: ['fracture', 'arthroplasty', 'THR', 'TKR', 'joint replacement', 'hip surgery', 'knee surgery']
          },
          // Neuro Rehabilitation  
          'MMTA-02': {
            name: 'Neuro Rehabilitation',
            patterns: [/stroke/, /cva/, /cerebrovascular/, /hemiplegia/, /hemiparesis/, /parkinson/, /multiple sclerosis/, /brain injury/, /spinal cord/],
            keywords: ['stroke', 'CVA', 'TIA', 'hemiplegia', 'parkinson', 'MS', 'brain injury']
          },
          // Wounds
          'MMTA-03': {
            name: 'Wounds',
            patterns: [/wound/, /ulcer/, /pressure injury/, /surgical wound/, /dehiscence/, /skin graft/, /debridement/],
            keywords: ['wound', 'ulcer', 'pressure injury', 'surgical wound', 'skin breakdown']
          },
          // Complex Nursing Interventions
          'MMTA-04': {
            name: 'Complex Nursing Interventions',
            patterns: [/ostomy/, /tracheostomy/, /ventilator/, /tube feeding/, /iv therapy/, /infusion/, /dialysis/],
            keywords: ['ostomy', 'trach', 'ventilator', 'TPN', 'IV therapy', 'PICC', 'dialysis']
          },
          // Medication Management
          'MMTA-05': {
            name: 'Medication Management, Teaching, Assessment (MMTA)',
            patterns: [/diabetes/, /heart failure/, /chf/, /copd/, /hypertension/, /anticoagul/, /cardiac/, /respiratory/],
            keywords: ['diabetes', 'CHF', 'COPD', 'HTN', 'cardiac', 'respiratory', 'medication management']
          },
          // Behavioral Health
          'MMTA-06': {
            name: 'Behavioral Health',
            patterns: [/depression/, /anxiety/, /bipolar/, /schizophrenia/, /dementia/, /alzheimer/, /psychiatric/, /mental/],
            keywords: ['depression', 'anxiety', 'dementia', 'Alzheimer', 'psychiatric', 'behavioral']
          }
        };

        let bestMatch = { group: 'MMTA-05', name: 'Medication Management, Teaching, Assessment (MMTA)', confidence: 'low', matchedPatterns: [] };
        let highestScore = 0;

        for (const [groupCode, group] of Object.entries(clinicalGroups)) {
          let score = 0;
          const matchedPatterns = [];

          for (const pattern of group.patterns) {
            if (pattern.test(dxText)) {
              score += 2;
              matchedPatterns.push(pattern.source);
            }
          }
          for (const keyword of group.keywords) {
            if (dxText.includes(keyword.toLowerCase())) {
              score += 1;
              if (!matchedPatterns.includes(keyword)) matchedPatterns.push(keyword);
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              group: groupCode,
              name: group.name,
              confidence: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low',
              matchedPatterns
            };
          }
        }

        return bestMatch;
      };

      // === COMORBIDITY ADJUSTMENT IDENTIFICATION ===
      const identifyComorbidities = (primaryDx, secondaryDx = [], narrativeText) => {
        const allText = [primaryDx, ...secondaryDx, narrativeText].filter(Boolean).join(' ').toLowerCase();

        // CMS-recognized comorbidities for PDGM adjustment
        const comorbidityCategories = {
          high: [
            { name: 'Diabetes with Complications', patterns: [/diabetes.*complication/, /diabetic.*neuropathy/, /diabetic.*nephropathy/, /diabetic.*retinopathy/, /diabetic.*foot/], icd10: ['E11.2', 'E11.4', 'E11.5', 'E11.6'] },
            { name: 'Heart Failure', patterns: [/heart failure/, /chf/, /congestive heart/, /hfref/, /hfpef/], icd10: ['I50', 'I50.1', 'I50.2', 'I50.9'] },
            { name: 'COPD', patterns: [/copd/, /chronic obstructive/, /emphysema/, /chronic bronchitis/], icd10: ['J44', 'J43', 'J42'] },
            { name: 'Chronic Kidney Disease', patterns: [/chronic kidney/, /ckd/, /renal failure/, /esrd/], icd10: ['N18', 'N18.3', 'N18.4', 'N18.5'] },
            { name: 'Malignant Neoplasm', patterns: [/cancer/, /malignant/, /neoplasm/, /carcinoma/, /metast/], icd10: ['C00-C96'] },
            { name: 'Stroke/CVA', patterns: [/stroke/, /cva/, /cerebrovascular accident/, /hemiplegia/], icd10: ['I63', 'I69'] }
          ],
          low: [
            { name: 'Hypertension', patterns: [/hypertension/, /htn/, /high blood pressure/], icd10: ['I10', 'I11', 'I12'] },
            { name: 'Atrial Fibrillation', patterns: [/atrial fibrillation/, /afib/, /a-fib/], icd10: ['I48'] },
            { name: 'Diabetes (uncomplicated)', patterns: [/diabetes mellitus/, /type 2 diabetes/, /type 1 diabetes/], icd10: ['E11.9', 'E10.9'] },
            { name: 'Osteoarthritis', patterns: [/osteoarthritis/, /degenerative joint/, /oa /], icd10: ['M15', 'M16', 'M17'] },
            { name: 'Anxiety/Depression', patterns: [/anxiety/, /depression/, /depressive/], icd10: ['F41', 'F32', 'F33'] },
            { name: 'Obesity', patterns: [/obesity/, /obese/, /bmi.*3[0-9]/, /bmi.*4[0-9]/], icd10: ['E66'] }
          ]
        };

        const foundComorbidities = { high: [], low: [], count: 0, adjustment: 'none' };

        for (const category of ['high', 'low']) {
          for (const comorbidity of comorbidityCategories[category]) {
            for (const pattern of comorbidity.patterns) {
              if (pattern.test(allText)) {
                foundComorbidities[category].push({
                  name: comorbidity.name,
                  icd10_codes: comorbidity.icd10,
                  matched: pattern.source
                });
                foundComorbidities.count++;
                break;
              }
            }
          }
        }

        // Determine adjustment level per CMS rules
        if (foundComorbidities.high.length >= 1) {
          foundComorbidities.adjustment = 'high';
        } else if (foundComorbidities.low.length >= 2) {
          foundComorbidities.adjustment = 'low';
        }

        return foundComorbidities;
      };

      // Run clinical group and comorbidity analysis
      const clinicalGroupAnalysis = determineClinicalGroup(
        patient.primary_diagnosis,
        patient.secondary_diagnoses
      );

      const comorbidityAnalysis = identifyComorbidities(
        patient.primary_diagnosis,
        patient.secondary_diagnoses,
        narrativeText
      );

      // Store extracted indicators for UI display
      setExtractedIndicators({
        clinical: clinicalIndicators,
        functional: functionalPhrases,
        clinicalGroup: clinicalGroupAnalysis,
        comorbidities: comorbidityAnalysis
      });

      // Generate clinical decision support alerts based on detected indicators
      const alerts = [];
      
      if (clinicalIndicators.woundPresent.detected) {
        alerts.push({
          type: 'wound',
          severity: 'high',
          title: 'Wound Care Best Practices',
          guideline: 'Document weekly measurements (length × width × depth in cm), staging, wound bed characteristics (granulation/slough/necrotic %), drainage type/amount, periwound condition, and treatment effectiveness. Consider specialist referral if no healing progress in 2 weeks.',
          cmsReference: 'M1306-M1342 Integumentary Status',
          actions: ['Measure wound weekly', 'Document staging per NPUAP', 'Assess infection signs', 'Review pressure redistribution'],
          revenueNote: 'Proper wound documentation supports MMTA-03 clinical group and may qualify for higher case-mix weight.'
        });
      }

      if (clinicalIndicators.cardiacIssues.detected) {
        const hasHF = clinicalIndicators.cardiacIssues.heartFailure.length > 0;
        const _hasEdema = clinicalIndicators.cardiacIssues.edema.length > 0;
        alerts.push({
          type: 'cardiac',
          severity: hasHF ? 'high' : 'medium',
          title: hasHF ? 'Heart Failure Management' : 'Cardiac Monitoring',
          guideline: hasHF 
            ? 'Document daily weights, I&O if applicable, edema assessment (location, pitting scale, circumference), dyspnea at rest vs. exertion, medication compliance, and dietary sodium restriction adherence. Report weight gain >2 lbs in 24hrs or >5 lbs in week to MD.'
            : 'Monitor vital signs, document cardiac rhythm if irregular, assess for chest pain/palpitations, review medication compliance, and educate on symptom recognition.',
          cmsReference: 'M1033 Risk for Hospitalization, M1400 Dyspnea',
          actions: hasHF 
            ? ['Daily weights', 'Assess edema (scale 1-4+)', 'Document dyspnea level', 'Review diuretic compliance', 'Dietary counseling']
            : ['Monitor BP/HR', 'Assess peripheral pulses', 'Review cardiac meds', 'Educate on warning signs'],
          revenueNote: 'CHF is a high-impact comorbidity for PDGM adjustment. Ensure ICD-10 specifies HFrEF (I50.2x) or HFpEF (I50.3x) with EF% if known.'
        });
      }

      if (clinicalIndicators.diabetic.detected) {
        const hasComplications = clinicalIndicators.diabetic.complications.length > 0;
        alerts.push({
          type: 'diabetes',
          severity: hasComplications ? 'high' : 'medium',
          title: hasComplications ? 'Diabetic Complications Management' : 'Diabetes Monitoring',
          guideline: 'Document glucose readings with time/context (fasting, pre/post-meal), insulin administration technique, hypoglycemia episodes, foot inspection findings, neuropathy symptoms, dietary compliance, and A1C if available. Assess for complications: neuropathy, nephropathy, retinopathy.',
          cmsReference: 'M2020/M2030 Medication Management, M1860 Ambulation',
          actions: ['Check blood glucose', 'Inspect feet for ulcers', 'Assess sensation (monofilament)', 'Review insulin technique', 'Educate on hypoglycemia'],
          revenueNote: 'Diabetic complications (neuropathy E11.4x, nephropathy E11.2x) qualify as high-impact comorbidities. Document separately from uncomplicated diabetes (E11.9).'
        });
      }

      if (clinicalIndicators.fallRisk.detected) {
        alerts.push({
          type: 'fall_risk',
          severity: 'high',
          title: 'Fall Risk Mitigation',
          guideline: 'Complete fall risk assessment using validated tool (Morse, Tinetti). Document specific risk factors: gait/balance impairment, assistive device use, environmental hazards, high-risk medications (sedatives, antihypertensives), orthostatic vitals, footwear safety, vision issues. Implement interventions: PT referral, medication review, home safety modifications.',
          cmsReference: 'M1033 Risk for Hospitalization, M1850/M1860 Functional Status',
          actions: ['Assess gait and balance', 'Environmental safety check', 'Review fall-risk meds', 'Educate on fall prevention', 'Consider PT evaluation'],
          revenueNote: 'Fall risk with functional limitations supports higher M1850/M1860 scores. Document specific assistance needed to prevent falls.'
        });
      }

      if (clinicalIndicators.cognitiveIssues.detected) {
        alerts.push({
          type: 'cognitive',
          severity: 'medium',
          title: 'Cognitive Assessment Requirements',
          guideline: 'Administer BIMS (Brief Interview for Mental Status) or CAM (Confusion Assessment Method) at SOC/ROC. Document orientation (person/place/time/situation), short-term memory (3-item recall), judgment/decision-making ability, safety awareness, behavioral symptoms (wandering, agitation), and caregiver support needs.',
          cmsReference: 'M1700-M1740 Cognitive/Behavioral Status, BIMS',
          actions: ['Perform BIMS screening', 'Assess orientation (A&Ox?)', 'Test 3-item recall', 'Evaluate judgment', 'Safety awareness check'],
          revenueNote: 'Cognitive impairment often affects functional scores (M1800-M1820) due to need for cueing/supervision. Document clearly.'
        });
      }

      if (clinicalIndicators.oxygenUse.detected) {
        alerts.push({
          type: 'respiratory',
          severity: 'medium',
          title: 'Oxygen Therapy Monitoring',
          guideline: 'Document oxygen flow rate (L/min), delivery method (NC, mask, concentrator), frequency (continuous, PRN, with exertion), SpO2 on room air vs. on O2, dyspnea level at rest and with activity (M1400), and patient/caregiver education on equipment safety and maintenance.',
          cmsReference: 'M1400 Dyspnea, M2020 Medication Management',
          actions: ['Check SpO2 on RA and on O2', 'Document flow rate/delivery', 'Assess dyspnea scale', 'Inspect equipment', 'Fire safety education'],
          revenueNote: 'Oxygen use must correlate with M1400 dyspnea score (cannot be 0 if on O2). COPD/respiratory conditions may support higher clinical group.'
        });
      }

      if (clinicalIndicators.painMentioned.detected && clinicalIndicators.painMentioned.intensity.length === 0) {
        alerts.push({
          type: 'pain',
          severity: 'medium',
          title: 'Comprehensive Pain Assessment',
          guideline: 'Use 0-10 numeric scale or FACES for intensity. Document location, quality (sharp/dull/aching), frequency (constant/intermittent), triggers/relieving factors, impact on function/sleep, current pain management (meds, non-pharm), and effectiveness. Reassess after interventions.',
          cmsReference: 'M1242 Pain Frequency, Quality Measures',
          actions: ['Rate pain 0-10', 'Describe quality/location', 'Assess medication effectiveness', 'Document functional impact', 'Non-pharm interventions'],
          revenueNote: 'Pain affecting ADLs should be reflected in functional scores (M1830-M1860). Uncontrolled pain impacts quality measures.'
        });
      }

      setClinicalAlerts(alerts);

      let prompt = `You are a CMS-certified OASIS-E compliance auditor with 15+ years expertise in 2024 Medicare home health CoP regulations and PDGM optimization. Perform RIGOROUS, EVIDENCE-BASED completeness and accuracy check for ${visitType}.

CRITICAL INSTRUCTIONS FOR ACCURACY:
1. ONLY score based on EXPLICIT documentation - do not infer or assume
2. When documentation is vague, flag as "insufficient documentation" not as a specific score
3. Compare narrative descriptions against OASIS scoring definitions EXACTLY
4. Identify CONTRADICTIONS between different parts of documentation
5. Calculate functional points using CMS methodology precisely

PATIENT CONTEXT:
- Visit Type: ${visitType}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None documented'}
- Visit Date: ${visit.visit_date}

=== PRE-ANALYZED PDGM CLINICAL GROUP ===
**Determined Clinical Group:** ${clinicalGroupAnalysis.group} - ${clinicalGroupAnalysis.name}
**Confidence Level:** ${clinicalGroupAnalysis.confidence.toUpperCase()}
**Matched Patterns:** ${clinicalGroupAnalysis.matchedPatterns.join(', ') || 'Default assignment'}

=== PRE-ANALYZED COMORBIDITIES ===
**Total Qualifying Comorbidities Found:** ${comorbidityAnalysis.count}
**Recommended Adjustment Level:** ${comorbidityAnalysis.adjustment.toUpperCase()}

**High-Impact Comorbidities (1 needed for HIGH adjustment):**
${comorbidityAnalysis.high.length > 0 ? comorbidityAnalysis.high.map(c => `- ${c.name} (ICD-10: ${c.icd10_codes.join(', ')})`).join('\n') : '- None identified'}

**Low-Impact Comorbidities (2+ needed for LOW adjustment):**
${comorbidityAnalysis.low.length > 0 ? comorbidityAnalysis.low.map(c => `- ${c.name} (ICD-10: ${c.icd10_codes.join(', ')})`).join('\n') : '- None identified'}

IMPORTANT: Use the above pre-analyzed clinical group and comorbidities as your baseline. Validate against the narrative and adjust confidence/findings if narrative contradicts or supports differently.

=== CLINICAL INDICATORS EXTRACTED FROM NARRATIVE ===

**ASSISTIVE DEVICES:**
- Detected: ${clinicalIndicators.assistDevices.detected ? 'YES' : 'No'}
${clinicalIndicators.assistDevices.detected ? `- Walker mentions: ${clinicalIndicators.assistDevices.walkers.join(' | ') || 'None'}
- Cane mentions: ${clinicalIndicators.assistDevices.canes.join(' | ') || 'None'}
- Wheelchair mentions: ${clinicalIndicators.assistDevices.wheelchairs.join(' | ') || 'None'}
- Bathroom equipment: ${clinicalIndicators.assistDevices.bathroom.join(' | ') || 'None'}
- Transfer equipment: ${clinicalIndicators.assistDevices.transfers.join(' | ') || 'None'}
- Context sentences: ${clinicalIndicators.assistDevices.sentences.join(' | ') || 'None'}` : ''}

**OXYGEN USE:**
- Detected: ${clinicalIndicators.oxygenUse.detected ? 'YES' : 'No'}
${clinicalIndicators.oxygenUse.detected ? `- Flow rate: ${clinicalIndicators.oxygenUse.flowRate.join(' | ') || 'Not specified'}
- Delivery method: ${clinicalIndicators.oxygenUse.deliveryMethod.join(' | ') || 'Not specified'}
- Frequency: ${clinicalIndicators.oxygenUse.frequency.join(' | ') || 'Not specified'}
- Saturation readings: ${clinicalIndicators.oxygenUse.saturation.join(' | ') || 'Not documented'}
- Context sentences: ${clinicalIndicators.oxygenUse.sentences.join(' | ') || 'None'}` : ''}

**WOUND PRESENCE:**
- Detected: ${clinicalIndicators.woundPresent.detected ? 'YES' : 'No'}
${clinicalIndicators.woundPresent.detected ? `- Pressure ulcers: ${clinicalIndicators.woundPresent.pressureUlcers.join(' | ') || 'None'}
- Surgical wounds: ${clinicalIndicators.woundPresent.surgicalWounds.join(' | ') || 'None'}
- Venous/stasis ulcers: ${clinicalIndicators.woundPresent.venousUlcers.join(' | ') || 'None'}
- Diabetic wounds: ${clinicalIndicators.woundPresent.diabeticWounds.join(' | ') || 'None'}
- Skin tears: ${clinicalIndicators.woundPresent.skinTears.join(' | ') || 'None'}
- Wound characteristics: ${clinicalIndicators.woundPresent.woundCharacteristics.join(' | ') || 'None'}
- Dressing types: ${clinicalIndicators.woundPresent.dressingTypes.join(' | ') || 'None'}
- Measurements: ${clinicalIndicators.woundPresent.measurements.join(' | ') || 'None'}
- Context sentences: ${clinicalIndicators.woundPresent.sentences.join(' | ') || 'None'}` : ''}

**FALL RISK:**
- Detected: ${clinicalIndicators.fallRisk.detected ? 'YES' : 'No'}
${clinicalIndicators.fallRisk.detected ? `- Fall history: ${clinicalIndicators.fallRisk.history.join(' | ') || 'None documented'}
- Balance issues: ${clinicalIndicators.fallRisk.balanceIssues.join(' | ') || 'None'}
- Gait problems: ${clinicalIndicators.fallRisk.gaitProblems.join(' | ') || 'None'}
- Weakness: ${clinicalIndicators.fallRisk.weakness.join(' | ') || 'None'}
- Dizziness/vertigo: ${clinicalIndicators.fallRisk.dizziness.join(' | ') || 'None'}
- Environmental hazards: ${clinicalIndicators.fallRisk.environmental.join(' | ') || 'None'}
- Context sentences: ${clinicalIndicators.fallRisk.sentences.join(' | ') || 'None'}` : ''}

**PAIN:**
- Detected: ${clinicalIndicators.painMentioned.detected ? 'YES' : 'No'}
${clinicalIndicators.painMentioned.detected ? `- Location: ${clinicalIndicators.painMentioned.location.join(' | ') || 'Not specified'}
- Intensity: ${clinicalIndicators.painMentioned.intensity.join(' | ') || 'Not specified'}
- Quality: ${clinicalIndicators.painMentioned.quality.join(' | ') || 'Not specified'}
- Triggers: ${clinicalIndicators.painMentioned.triggers.join(' | ') || 'Not specified'}
- Management: ${clinicalIndicators.painMentioned.management.join(' | ') || 'Not specified'}
- Context sentences: ${clinicalIndicators.painMentioned.sentences.join(' | ') || 'None'}` : ''}

**COGNITIVE STATUS:**
- Detected: ${clinicalIndicators.cognitiveIssues.detected ? 'YES' : 'No'}
${clinicalIndicators.cognitiveIssues.detected ? `- Orientation: ${clinicalIndicators.cognitiveIssues.orientation.join(' | ') || 'Not documented'}
- Memory issues: ${clinicalIndicators.cognitiveIssues.memoryIssues.join(' | ') || 'None'}
- Diagnoses: ${clinicalIndicators.cognitiveIssues.diagnosis.join(' | ') || 'None'}
- Judgment: ${clinicalIndicators.cognitiveIssues.judgment.join(' | ') || 'Not assessed'}
- Screening scores: ${clinicalIndicators.cognitiveIssues.screening.join(' | ') || 'None'}
- Behaviors: ${clinicalIndicators.cognitiveIssues.behaviors.join(' | ') || 'None'}
- Context sentences: ${clinicalIndicators.cognitiveIssues.sentences.join(' | ') || 'None'}` : ''}

**DIABETIC MANAGEMENT:**
- Detected: ${clinicalIndicators.diabetic.detected ? 'YES' : 'No'}
${clinicalIndicators.diabetic.detected ? `- Type: ${clinicalIndicators.diabetic.type.join(' | ') || 'Not specified'}
- Medications: ${clinicalIndicators.diabetic.medications.join(' | ') || 'None listed'}
- Glucose readings: ${clinicalIndicators.diabetic.glucoseReadings.join(' | ') || 'None'}
- A1C: ${clinicalIndicators.diabetic.a1c.join(' | ') || 'Not documented'}
- Hypoglycemia: ${clinicalIndicators.diabetic.hypoglycemia.join(' | ') || 'None'}
- Complications: ${clinicalIndicators.diabetic.complications.join(' | ') || 'None'}
- Management: ${clinicalIndicators.diabetic.management.join(' | ') || 'Not specified'}
- Context sentences: ${clinicalIndicators.diabetic.sentences.join(' | ') || 'None'}` : ''}

**CARDIAC STATUS:**
- Detected: ${clinicalIndicators.cardiacIssues.detected ? 'YES' : 'No'}
${clinicalIndicators.cardiacIssues.detected ? `- Heart failure: ${clinicalIndicators.cardiacIssues.heartFailure.join(' | ') || 'None'}
- Arrhythmias: ${clinicalIndicators.cardiacIssues.arrhythmias.join(' | ') || 'None'}
- Edema: ${clinicalIndicators.cardiacIssues.edema.join(' | ') || 'None'}
- Dyspnea/SOB: ${clinicalIndicators.cardiacIssues.dyspnea.join(' | ') || 'None'}
- Chest pain: ${clinicalIndicators.cardiacIssues.chestPain.join(' | ') || 'None'}
- Cardiac devices: ${clinicalIndicators.cardiacIssues.devices.join(' | ') || 'None'}
- Context sentences: ${clinicalIndicators.cardiacIssues.sentences.join(' | ') || 'None'}` : ''}

**ASSISTANCE LEVELS:**
- Assistance mentioned: ${clinicalIndicators.assistanceNeeded.detected ? 'YES' : 'No'}
${clinicalIndicators.assistanceNeeded.detected ? `- Levels of assist: ${clinicalIndicators.assistanceNeeded.levelOfAssist.join(' | ') || 'Not specified'}
- Dependencies: ${clinicalIndicators.assistanceNeeded.dependency.join(' | ') || 'None'}` : ''}
- Independence mentioned: ${clinicalIndicators.independentMentioned.detected ? 'YES' : 'No'}
${clinicalIndicators.independentMentioned.detected ? `- Independent activities: ${clinicalIndicators.independentMentioned.activities.join(' | ') || 'None'}` : ''}

=== ADL/IADL FUNCTIONAL PHRASES EXTRACTED ===

**BATHING (M1830, GG0130E):**
- All phrases: ${functionalPhrases.bathing.allPhrases.join(' | ') || 'None found'}
- Assist levels: ${functionalPhrases.bathing.assistLevel.join(' | ') || 'Not specified'}
- Equipment: ${functionalPhrases.bathing.equipment.join(' | ') || 'None'}
- Limitations: ${functionalPhrases.bathing.limitations.join(' | ') || 'None'}

**DRESSING (M1810/M1820, GG0130F/G):**
- All phrases: ${functionalPhrases.dressing.allPhrases.join(' | ') || 'None found'}
- Upper body: ${functionalPhrases.dressing.upperBody.join(' | ') || 'Not specified'}
- Lower body: ${functionalPhrases.dressing.lowerBody.join(' | ') || 'Not specified'}
- Assist levels: ${functionalPhrases.dressing.assistLevel.join(' | ') || 'Not specified'}
- Limitations: ${functionalPhrases.dressing.limitations.join(' | ') || 'None'}

**AMBULATION/MOBILITY (M1860, GG0170):**
- All phrases: ${functionalPhrases.ambulation.allPhrases.join(' | ') || 'None found'}
- Distance: ${functionalPhrases.ambulation.distance.join(' | ') || 'Not specified'}
- Devices: ${functionalPhrases.ambulation.assistDevice.join(' | ') || 'None'}
- Assist levels: ${functionalPhrases.ambulation.assistLevel.join(' | ') || 'Not specified'}
- Weight bearing: ${functionalPhrases.ambulation.weightBearing.join(' | ') || 'Not specified'}
- Stairs: ${functionalPhrases.ambulation.stairs.join(' | ') || 'Not documented'}
- Surfaces: ${functionalPhrases.ambulation.surfaces.join(' | ') || 'Not specified'}

**TRANSFERS (M1850, GG0170):**
- All phrases: ${functionalPhrases.transfer.allPhrases.join(' | ') || 'None found'}
- Transfer types: ${functionalPhrases.transfer.types.join(' | ') || 'Not specified'}
- Assist levels: ${functionalPhrases.transfer.assistLevel.join(' | ') || 'Not specified'}
- Equipment: ${functionalPhrases.transfer.equipment.join(' | ') || 'None'}
- Weight bearing: ${functionalPhrases.transfer.weightBearing.join(' | ') || 'Not specified'}

**TOILETING (M1840, GG0130C, GG0170F):**
- All phrases: ${functionalPhrases.toileting.allPhrases.join(' | ') || 'None found'}
- Transfers: ${functionalPhrases.toileting.transfers.join(' | ') || 'Not specified'}
- Hygiene: ${functionalPhrases.toileting.hygiene.join(' | ') || 'Not specified'}
- Continence: ${functionalPhrases.toileting.continence.join(' | ') || 'Not assessed'}
- Equipment: ${functionalPhrases.toileting.equipment.join(' | ') || 'None'}
- Assist levels: ${functionalPhrases.toileting.assistLevel.join(' | ') || 'Not specified'}

**GROOMING (M1800, GG0130B):**
- All phrases: ${functionalPhrases.grooming.allPhrases.join(' | ') || 'None found'}
- Oral care: ${functionalPhrases.grooming.oralCare.join(' | ') || 'Not specified'}
- Hair care: ${functionalPhrases.grooming.hairCare.join(' | ') || 'Not specified'}
- Shaving: ${functionalPhrases.grooming.shaving.join(' | ') || 'Not specified'}
- Nail care: ${functionalPhrases.grooming.nailCare.join(' | ') || 'Not specified'}
- Assist levels: ${functionalPhrases.grooming.assistLevel.join(' | ') || 'Not specified'}

**EATING (GG0130A):**
- All phrases: ${functionalPhrases.eating.allPhrases.join(' | ') || 'None found'}
- Self-feeding: ${functionalPhrases.eating.selfFeeding.join(' | ') || 'Not specified'}
- Assist levels: ${functionalPhrases.eating.assistLevel.join(' | ') || 'Not specified'}
- Swallowing: ${functionalPhrases.eating.swallowing.join(' | ') || 'Not assessed'}
- Diet: ${functionalPhrases.eating.diet.join(' | ') || 'Not specified'}

**MEDICATION MANAGEMENT (M2020, M2030):**
- All phrases: ${functionalPhrases.medications.allPhrases.join(' | ') || 'None found'}
- Oral meds: ${functionalPhrases.medications.oralMeds.join(' | ') || 'Not specified'}
- Injectables: ${functionalPhrases.medications.injectables.join(' | ') || 'Not specified'}
- Management: ${functionalPhrases.medications.management.join(' | ') || 'Not specified'}
- Compliance: ${functionalPhrases.medications.compliance.join(' | ') || 'Not assessed'}

VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'None documented'}

FULL CLINICAL DOCUMENTATION:
${narrativeText || '[No documentation provided]'}

${extractedOasisData ? formatExtractedOasisForPrompt(extractedOasisData) : ''}

---

OASIS-E 2024 REQUIRED ELEMENTS (${visitType}):

**SECTION GG: FUNCTIONAL ABILITIES (PDGM CRITICAL - affects payment)**
GG0130: Self-Care
- A. Eating (01-06, 07=refused, 09=NA, 10=not attempted, 88=prior)
- B. Oral hygiene (01-06)
- C. Toileting hygiene (01-06)
- E. Shower/bathe self (01-06)
- F. Upper body dressing (01-06)
- G. Lower body dressing (01-06)
- H. Putting on/taking off footwear (01-06)

GG0170: Mobility
- B. Sit to lying (01-06)
- C. Lying to sitting (01-06)
- D. Sit to stand (01-06)
- E. Chair/bed-to-chair transfer (01-06)
- F. Toilet transfer (01-06)
- I. Walk 10 feet (01-06)
- J. Walk 50 feet with 2 turns (01-06)
- K. Walk 150 feet (01-06)
- L. Walk 10 feet uneven (01-06)
- M. 1 step curb (01-06)
- N. 4 steps (01-06)
- O. 12 steps (01-06)
- P. Picking up object (01-06)
- R. Wheel 50 feet (01-06)
- RR. Wheel 150 feet (01-06)

**GG SCORING SCALE** (use exact codes):
06=Independent, 05=Setup/cleanup, 04=Supervision/touching, 03=Partial/moderate, 02=Substantial/maximal, 01=Dependent

**M1800-M1860 FUNCTIONAL STATUS (Legacy - still required)**
- M1800 Grooming (0-3): 0=Indep, 1=Setup, 2=Assist, 3=Dependent
- M1810 Dress Upper (0-3)
- M1820 Dress Lower (0-3)
- M1830 Bathing (0-6): Higher=more impaired
- M1840 Toilet Transfer (0-4)
- M1850 Transferring (0-5)
- M1860 Ambulation (0-6)

**CLINICAL ITEMS (ICD-10 Required)**
- M1021: Primary Dx (must be valid ICD-10, symptom-level)
- M1023: Secondary Dx (up to 24, affects comorbidity adjustment)
- M1028: Active Dx list
- M1030: Therapy need at SOC/ROC
- M1033: Risk for hospitalization (LACE score factors)

**INTEGUMENTARY (Wound documentation)**
- M1306: Unhealed pressure ulcers (Yes/No)
- M1311: Current number of stage 2-4 PU
- M1322: Stage of most problematic PU
- M1324: Stage 2 PU that was present at SOC/ROC
- M1330: Stasis ulcer present
- M1340: Surgical wound present
- M1342: Surgical wound status

**MEDICATIONS (High-risk drug review)**
- M2001: Drug regimen review conducted
- M2003: Medication follow-up (if issues found)
- M2005: Medication intervention (education provided)
- M2010: Patient receiving HIGH-RISK drugs
- M2020: Management of oral meds
- M2030: Management of injectable meds

---

**${visitType} SPECIFIC REQUIREMENTS:**
`;

      if (visit.visit_type === 'admission') {
        prompt += `
SOC/ROC MANDATORY:
- ALL GG items with admission AND discharge goal scores
- Complete medication reconciliation with HIGH-RISK drug identification
- Baseline functional scores (M1800-M1860) - DOCUMENT WORST ABILITY
- BIMS or CAM for cognitive screening
- PHQ-2/PHQ-9 depression screening
- Fall risk assessment with interventions
- Homebound status with 2+ criteria documented
- Primary caregiver capability assessment
- 60-day prognosis statement
`;
      } else if (visit.visit_type === 'recertification') {
        prompt += `
RECERTIFICATION MANDATORY:
- Functional status COMPARISON to prior assessment (improved/same/declined)
- Updated GG scores with goal progress
- Continued homebound justification (re-document criteria)
- Skilled need justification (why services still needed)
- Updated medication list with reconciliation
- Wound healing progress (if applicable)
- Fall risk re-assessment
- Care plan goal achievement status
`;
      } else if (visit.visit_type === 'discharge') {
        prompt += `
DISCHARGE MANDATORY:
- M2410: Discharge disposition (specific destination)
- Final GG scores (actual vs goal comparison)
- M2301: Emergent care since last assessment
- Outcome summary for each care plan goal
- Final functional status M1800-M1860
- Discharge medication list
- Patient/caregiver education completed
- Follow-up appointments scheduled
`;
      }

      prompt += `

---

**ACCURACY VALIDATION RULES (APPLY RIGOROUSLY):**

FUNCTIONAL SCORING ACCURACY:
1. M1800 Grooming (0-3): 
   - 0=Independently grooms; 1=Grooms with setup only; 2=Someone must assist; 3=Dependent
   - "Needs reminders" = 1 (setup); "Assistance with shaving" = 2; "Unable to groom" = 3
   
2. M1810/M1820 Dressing (0-3):
   - 0=Independent; 1=Setup/retrieval only; 2=Physical assistance needed; 3=Dependent
   - "Difficulty with buttons" = 2; "Cannot reach feet" = 2-3 for lower
   
3. M1830 Bathing (0-6):
   - 0=Independent shower/tub; 1=With devices only; 2=Intermittent assistance; 
   - 3=Assistance throughout; 4=Transferred in/out only; 5=Assistance throughout + transfer; 6=Unable
   - Shower chair use without human help = 1; CNA helps with back = 2-3
   
4. M1840 Toilet Transfer (0-4):
   - 0=Independent; 1=Device only; 2=Human standby; 3=Assistance needed; 4=Unable
   
5. M1850 Transferring (0-5):
   - 0=Independent; 1=Device; 2=Supervision; 3=Assistance; 4=Bears no weight; 5=Bedfast
   
6. M1860 Ambulation (0-6):
   - 0=Independent any surface; 1=Device on all surfaces; 2=Assist on stairs only;
   - 3=Assist on all surfaces; 4=Wheelchair; 5=Bedfast; 6=N/A

=== MANDATORY CROSS-VALIDATION RULES (FLAG ALL VIOLATIONS) ===

**FUNCTIONAL ITEM CROSS-VALIDATION:**
1. M1860 Ambulation ↔ M1850 Transferring:
   - If M1860 ≥ 4 (wheelchair/bedfast), then M1850 must be ≥ 3 (needs assist or bears no weight)
   - If M1850 = 5 (bedfast), then M1860 must = 5 or 6
   - If patient "walks with walker independently" (M1860=1), M1850 should be ≤ 2

2. M1850 Transferring ↔ M1840 Toilet Transfer:
   - M1840 cannot be lower than M1850 (toilet transfer is more demanding)
   - If M1850 = 4-5, M1840 must be ≥ 3

3. M1830 Bathing ↔ M1850 Transferring:
   - If M1830 ≥ 4 (needs transfer assist for bathing), M1850 must be ≥ 2
   - If patient "independent with shower chair" (M1830=1), transfers likely ≤ 2

4. M1800-M1820 Grooming/Dressing ↔ Cognitive Status:
   - If M1700 cognitive ≥ 2 (impaired), grooming/dressing typically ≥ 1
   - "Needs cueing" indicates cognitive issue AND grooming assistance

5. M1860 ↔ M1033 Hospitalization Risk:
   - High fall risk + impaired ambulation = higher hospitalization risk
   - Non-ambulatory patients have inherently higher M1033 risk

**CLINICAL CROSS-VALIDATION:**
6. Oxygen Use ↔ M1400 Dyspnea:
   - If oxygen documented, M1400 MUST show dyspnea level (cannot be 0)
   - Continuous O2 = M1400 should be ≥ 2

7. Wounds ↔ M1306-M1342:
   - ANY wound mention requires complete wound section documentation
   - Pressure ulcer stage must match narrative description
   - "Healed" wounds still need M1340/M1342 documentation

8. High-Risk Medications ↔ M2010:
   - Anticoagulants (warfarin, eliquis, etc.) = M2010 YES
   - Insulin = M2010 YES  
   - Opioids (scheduled) = M2010 YES
   - If ANY high-risk med in narrative, M2010 must be checked

9. Diabetes ↔ Related Items:
   - Diabetic patient with neuropathy should affect M1860 ambulation
   - Diabetic foot ulcer requires wound section completion
   - Insulin use requires M2030 injectable med management

10. Cognitive Diagnosis ↔ M1700-M1740:
    - Dementia/Alzheimer diagnosis requires impaired M1700
    - Memory complaints should align with M1710-M1720
    - BIMS score must match cognitive function rating

**GG ↔ M-ITEM CROSS-VALIDATION:**
11. GG0130 Self-Care ↔ M1800-M1830:
    - GG0130E (shower/bathe) should align with M1830
    - GG0130F/G (dressing) should align with M1810/M1820
    - Scores cannot contradict (e.g., GG=06 independent but M1830=4)

12. GG0170 Mobility ↔ M1850/M1860:
    - GG0170E (bed-chair transfer) aligns with M1850
    - GG0170I-K (walking distances) align with M1860
    - GG0170F (toilet transfer) aligns with M1840

PDGM FUNCTIONAL POINTS CALCULATION:
- M1800 + M1810 + M1820 + M1830 + M1840 + M1850 + M1860 = Total Points
- Low: 0-5 points (lowest reimbursement)
- Medium: 6-11 points
- High: 12+ points (highest reimbursement)
- Each point increase can add $50-150 to episode payment

UPLOADED OASIS VALIDATION (if OASIS data was uploaded):
- Compare uploaded OASIS scores against clinical narrative for consistency
- Flag any M-item scores that DON'T match the narrative description
- Identify GG scores that conflict with M1800-M1860 scores
- Check if diagnosis codes support the documented functional limitations
- Validate that discharge goals are realistic based on current status

=== ANALYSIS CATEGORIES ===

Analyze for these 7 categories:
1. MISSING required items - Be specific about M-number and visit type requirement
2. INCONSISTENCIES - Quote exact conflicting phrases from documentation AND compare against uploaded OASIS if available
3. CROSS-VALIDATION FAILURES - Identify specific rule violations from the list above
4. UNDERSCORING - Where documentation CLEARLY supports higher impairment; include CMS scoring reference
5. OVERSCORING - Where claimed scores exceed narrative support; include audit vulnerability and recommended adjustment
6. VAGUE DOCUMENTATION - Items where language is not specific enough for defensible scoring; provide improved language examples
7. OASIS-NARRATIVE MISMATCHES - Where uploaded OASIS scores don't align with clinical narrative

Return JSON:

{
  "overall_score": 0-100,
  "completeness_percentage": 0-100,
  "ready_for_submission": true|false,
  "reimbursement_risk_level": "low|medium|high|critical",
  "documentation_quality": {
    "specificity_score": 0-100,
    "defensibility_score": 0-100,
    "key_weaknesses": ["list of documentation gaps that reduce defensibility"]
  },
  "pdgm_analysis": {
            "clinical_group": "${clinicalGroupAnalysis.group} - ${clinicalGroupAnalysis.name}",
            "clinical_group_confidence": "${clinicalGroupAnalysis.confidence}",
            "clinical_group_rationale": "explanation of why this clinical group was assigned based on primary diagnosis",
            "primary_dx_icd10_suggested": "ICD-10 code that best matches the primary diagnosis for this clinical group",
            "alternative_clinical_groups": ["list other possible clinical groups if diagnosis is ambiguous"],
            "functional_level": "low|medium|high",
            "functional_points_calculated": "exact number 0-30",
            "functional_points_breakdown": {
              "m1800": "0-3",
              "m1810": "0-3", 
              "m1820": "0-3",
              "m1830": "0-6",
              "m1840": "0-4",
              "m1850": "0-5",
              "m1860": "0-6"
            },
            "comorbidity_adjustment": "${comorbidityAnalysis.adjustment}",
            "comorbidity_count": ${comorbidityAnalysis.count},
            "qualifying_comorbidities": {
              "high_impact": [${comorbidityAnalysis.high.map(c => `"${c.name}"`).join(', ')}],
              "low_impact": [${comorbidityAnalysis.low.map(c => `"${c.name}"`).join(', ')}],
              "missing_documentation": ["list comorbidities mentioned but not properly coded"],
              "potential_additions": ["list conditions in narrative that could qualify if properly documented"]
            },
            "estimated_case_mix_weight": "X.XXXX",
            "case_mix_weight_breakdown": {
              "clinical_component": "X.XX",
              "functional_component": "X.XX", 
              "comorbidity_component": "X.XX"
            },
            "optimization_potential": "$XXX-$XXX per episode",
            "optimization_strategies": ["specific actions to improve case-mix weight"],
            "calculation_notes": "detailed explanation of PDGM calculation methodology"
          },
  "functional_score_analysis": {
    "m1800_grooming": {
      "documented_value": "0-3 or null if not documented",
      "supported_by": "exact quote from documentation",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "what score the documentation actually supports",
      "scoring_rationale": "why this score based on CMS definitions"
    },
    "m1810_dress_upper": {
      "documented_value": "0-3 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "m1820_dress_lower": {
      "documented_value": "0-3 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "m1830_bathing": {
      "documented_value": "0-6 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "m1840_toilet_transfer": {
      "documented_value": "0-4 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "m1850_transferring": {
      "documented_value": "0-5 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "m1860_ambulation": {
      "documented_value": "0-6 or null",
      "supported_by": "exact quote",
      "accuracy": "accurate|underscored|overscored|insufficient_documentation",
      "recommended_value": "supported score",
      "scoring_rationale": "rationale"
    },
    "total_functional_points": "calculated sum 0-30",
    "functional_level_result": "low|medium|high",
    "cross_validation_issues": ["any logical inconsistencies between functional items"]
  },
  "critical_missing": [
    {
      "oasis_item": "M-number: Full Name",
      "category": "Functional|Clinical|Medications|Wounds|GG|Cognitive|Safety",
      "pdgm_impact": "Specific impact: Affects clinical group|functional level|comorbidity adjustment",
      "why_critical": "CMS requirement citation and audit risk",
      "documentation_guidance": "Exact language and elements needed",
      "example": "Patient requires moderate assistance (1 person) for shower transfers due to lower extremity weakness (R/T CVA residual) and balance impairment. Uses shower chair and grab bars.",
      "reimbursement_impact": "high|medium|low",
      "estimated_revenue_impact": "$XXX per episode"
    }
  ],
  "cross_validation_failures": [
    {
      "rule_violated": "specific cross-validation rule number and name from list",
      "items_involved": ["M-numbers involved in the conflict"],
      "current_values": "current documented/implied values for each item",
      "expected_relationship": "what the relationship should be per CMS guidelines",
      "narrative_evidence": "exact quotes showing the conflict",
      "resolution": "specific fix - either adjust scores or add documentation",
      "pdgm_impact": "how this affects functional level/reimbursement",
      "audit_risk": "high|medium|low"
    }
  ],
  "underscoring_opportunities": [
    {
      "oasis_item": "M-number: Full Name",
      "current_implied_score": "what current documentation suggests (numeric)",
      "supported_score": "higher value supported by narrative (numeric)",
      "score_difference": "+X points",
      "narrative_evidence": "EXACT QUOTE from documentation that supports higher score",
      "cms_scoring_definition": "CMS OASIS-E 2024 definition for the supported score level",
      "cms_reference": "Specific CMS guidance manual chapter/section",
      "why_higher_score_applies": "detailed explanation matching narrative to CMS definition",
      "revenue_impact": "$XXX-XXX per episode difference",
      "functional_level_change": "whether this changes low→medium or medium→high",
      "documentation_enhancement": "specific wording to add to strengthen the score justification",
      "example_compliant_language": "model documentation that fully supports the higher score"
    }
  ],
  "overscoring_risks": [
    {
      "oasis_item": "M-number: Full Name",
      "claimed_score": "implied/documented value (numeric)",
      "supported_score": "lower value actually supported by evidence (numeric)",
      "score_difference": "-X points",
      "narrative_evidence": "EXACT QUOTE that contradicts higher score",
      "cms_scoring_definition": "CMS definition showing why lower score applies",
      "audit_vulnerability": {
        "type": "ADR|TPE|SMRC|RAC",
        "specific_risk": "detailed description of what auditors would flag",
        "potential_recoupment": "$XXX estimated if audited",
        "documentation_that_contradicts": "specific phrases auditors would cite"
      },
      "audit_risk": "high|medium",
      "recommended_action": "EITHER add documentation: [specific text] OR adjust score to X",
      "if_keeping_score": "documentation needed to defend current score",
      "if_lowering_score": "how to properly document the lower functional level"
    }
  ],
  "inconsistencies": [
    {
      "issue": "Clear description of conflict",
      "inconsistency_type": "internal_narrative|narrative_vs_oasis|cross_item|diagnosis_vs_function",
      "location_1": "exact quote 1 with context",
      "location_2": "exact quote 2 that conflicts",
      "oasis_items_affected": ["M-numbers affected"],
      "why_problematic": "specific audit/compliance concern",
      "resolution": "specific documentation change to resolve",
      "audit_risk": "high|medium|low"
    }
  ],
  "vague_documentation": [
    {
      "oasis_item": "M-number: Full Name",
      "current_language": "exact vague phrase from documentation",
      "problem": "why this is not defensible - what's missing",
      "cms_requirement": "what CMS requires for defensible scoring",
      "defensibility_issue": "how an auditor would challenge this",
      "score_range_ambiguity": "which scores this vague language could support (e.g., could be 1, 2, or 3)",
      "improved_language": "specific wording that would be defensible",
      "key_elements_to_add": ["list of specific elements missing"],
      "example_for_score_X": "if intending score X, document: [specific text]",
      "example_for_score_Y": "if intending score Y, document: [specific text]"
    }
  ],
  "compliant_items": [
    {
      "oasis_item": "M-number: Name",
      "category": "category",
      "evidence": "exact supporting quote",
      "score_supported": "specific score this documentation supports"
    }
  ],
  "recommendations": ["Top 5-7 actionable items ranked by revenue impact with specific actions"],
  "quality_measures_impact": ["Specific HH-CAHPS and HHQI measures affected with explanation"],
  "audit_defense_summary": {
    "strongest_documentation": ["well-documented areas"],
    "weakest_documentation": ["areas most vulnerable to audit"],
    "recommended_priority_fixes": ["top 3 items to fix before submission"]
  },
  "oasis_narrative_mismatches": [
    {
      "oasis_item": "M-number",
      "uploaded_score": "score from uploaded OASIS",
      "narrative_suggests": "what the narrative documentation actually supports",
      "discrepancy": "explanation of the mismatch",
      "recommendation": "specific action to resolve",
      "audit_risk": "high|medium|low"
    }
  ],
  "gg_section_analysis": {
    "gg0130_self_care_summary": "overview of self-care scores and any issues",
    "gg0170_mobility_summary": "overview of mobility scores and any issues",
    "goal_appropriateness": "whether DC goals are realistic",
    "functional_improvement_potential": "assessment of improvement potential"
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            completeness_percentage: { type: "number" },
            ready_for_submission: { type: "boolean" },
            reimbursement_risk_level: { type: "string" },
            pdgm_analysis: {
              type: "object",
              properties: {
                clinical_group: { type: "string" },
                functional_level: { type: "string" },
                comorbidity_adjustment: { type: "string" },
                estimated_case_mix_weight: { type: "string" },
                optimization_potential: { type: "string" }
              }
            },
            documentation_quality: {
              type: "object",
              properties: {
                specificity_score: { type: "number" },
                defensibility_score: { type: "number" },
                key_weaknesses: { type: "array", items: { type: "string" } }
              }
            },
            functional_score_analysis: {
              type: "object",
              properties: {
                m1800_grooming: { type: "object" },
                m1810_dress_upper: { type: "object" },
                m1820_dress_lower: { type: "object" },
                m1830_bathing: { type: "object" },
                m1840_toilet_transfer: { type: "object" },
                m1850_transferring: { type: "object" },
                m1860_ambulation: { type: "object" },
                total_functional_points: { type: "number" },
                functional_level_result: { type: "string" },
                cross_validation_issues: { type: "array", items: { type: "string" } }
              }
            },
            critical_missing: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  category: { type: "string" },
                  pdgm_impact: { type: "string" },
                  why_critical: { type: "string" },
                  documentation_guidance: { type: "string" },
                  example: { type: "string" },
                  reimbursement_impact: { type: "string" },
                  estimated_revenue_impact: { type: "string" }
                }
              }
            },
            cross_validation_failures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_violated: { type: "string" },
                  items_involved: { type: "array", items: { type: "string" } },
                  current_values: { type: "string" },
                  expected_relationship: { type: "string" },
                  narrative_evidence: { type: "string" },
                  resolution: { type: "string" },
                  pdgm_impact: { type: "string" },
                  audit_risk: { type: "string" }
                }
              }
            },
            underscoring_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  current_implied_score: { type: "string" },
                  supported_score: { type: "string" },
                  score_difference: { type: "string" },
                  narrative_evidence: { type: "string" },
                  cms_scoring_definition: { type: "string" },
                  cms_reference: { type: "string" },
                  why_higher_score_applies: { type: "string" },
                  revenue_impact: { type: "string" },
                  functional_level_change: { type: "string" },
                  documentation_enhancement: { type: "string" },
                  example_compliant_language: { type: "string" }
                }
              }
            },
            overscoring_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  claimed_score: { type: "string" },
                  supported_score: { type: "string" },
                  score_difference: { type: "string" },
                  narrative_evidence: { type: "string" },
                  cms_scoring_definition: { type: "string" },
                  audit_vulnerability: { type: "object" },
                  audit_risk: { type: "string" },
                  recommended_action: { type: "string" },
                  if_keeping_score: { type: "string" },
                  if_lowering_score: { type: "string" }
                }
              }
            },
            inconsistencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  inconsistency_type: { type: "string" },
                  location_1: { type: "string" },
                  location_2: { type: "string" },
                  oasis_items_affected: { type: "array", items: { type: "string" } },
                  why_problematic: { type: "string" },
                  resolution: { type: "string" },
                  audit_risk: { type: "string" }
                }
              }
            },
            vague_documentation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  current_language: { type: "string" },
                  problem: { type: "string" },
                  cms_requirement: { type: "string" },
                  defensibility_issue: { type: "string" },
                  score_range_ambiguity: { type: "string" },
                  improved_language: { type: "string" },
                  key_elements_to_add: { type: "array", items: { type: "string" } },
                  example_for_higher_score: { type: "string" },
                  example_for_lower_score: { type: "string" }
                }
              }
            },
            compliant_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  category: { type: "string" },
                  evidence: { type: "string" },
                  score_supported: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } },
            quality_measures_impact: { type: "array", items: { type: "string" } },
            audit_defense_summary: {
              type: "object",
              properties: {
                strongest_documentation: { type: "array", items: { type: "string" } },
                weakest_documentation: { type: "array", items: { type: "string" } },
                recommended_priority_fixes: { type: "array", items: { type: "string" } }
              }
            },
            oasis_narrative_mismatches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  uploaded_score: { type: "string" },
                  narrative_suggests: { type: "string" },
                  discrepancy: { type: "string" },
                  recommendation: { type: "string" },
                  audit_risk: { type: "string" }
                }
              }
            },
            gg_section_analysis: {
              type: "object",
              properties: {
                gg0130_self_care_summary: { type: "string" },
                gg0170_mobility_summary: { type: "string" },
                goal_appropriateness: { type: "string" },
                functional_improvement_potential: { type: "string" }
              }
            }
          }
        }
      });

      setOasisResults(result);
      
      await logSecurityEvent('OASIS_SCRUBBER_COMPLETED', { 
        visit_id: visit.id,
        score: result.overall_score,
        ready_for_submission: result.ready_for_submission,
        reimbursement_risk: result.reimbursement_risk_level
      });

    } catch (error) {
      console.error("Error running OASIS scrubber:", error);
      setOasisResults({
        overall_score: 0,
        completeness_percentage: 0,
        ready_for_submission: false,
        reimbursement_risk_level: 'critical',
        error_message: error.message || 'Failed to analyze documentation. Please try again.',
        recommendations: ['Ensure documentation is complete before running analysis', 'Check network connection and try again']
      });
      await logSecurityEvent('OASIS_SCRUBBER_ERROR', { 
        visit_id: visit?.id,
        error: error.message 
      });
    }
    
    setIsScrubbing(false);
  };

  const toggleCategory = (category) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const handleQuickFix = (guidance, example) => {
    const fixText = `\n\n${guidance}\n\nExample: ${example}`;
    if (onFixSuggestion) {
      onFixSuggestion(fixText);
    }
  };

  const handleSuggestionAccept = (suggestion, suggestionType) => {
    setAcceptedSuggestions(prev => [...prev, { ...suggestion, type: suggestionType }]);
    setFeedbackStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
    if (suggestion.example || suggestion.documentation_guidance) {
      handleQuickFix(suggestion.documentation_guidance || '', suggestion.example || '');
    }
  };

  const handleSuggestionReject = (_reason) => {
    setFeedbackStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
  };

  const handleSuggestionModify = (modifiedText) => {
    setFeedbackStats(prev => ({ ...prev, modified: prev.modified + 1 }));
    if (onFixSuggestion) {
      onFixSuggestion(`\n\n${modifiedText}`);
    }
  };

  const handleInsertGuidance = (itemKey, item) => {
    if (onFixSuggestion && item) {
      let guidance = `\n\n[${itemKey}: ${item.name}]\n`;
      if (item.description) guidance += `${item.description}\n`;
      if (item.scoringScale) {
        guidance += "Scoring: ";
        guidance += Object.entries(item.scoringScale).map(([k, v]) => `${k}=${v}`).join(', ');
      }
      onFixSuggestion(guidance);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getImpactBadge = (impact) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[impact] || 'bg-slate-500';
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const exportResults = () => {
    if (!oasisResults) return;
    const dataStr = JSON.stringify(oasisResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oasis-analysis-${visit?.id || 'report'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const _getFilteredResults = () => {
    if (!oasisResults || analysisFilter === 'all') return oasisResults;
    
    const filtered = { ...oasisResults };
    switch (analysisFilter) {
      case 'revenue':
        filtered.critical_missing = filtered.critical_missing?.filter(i => i.reimbursement_impact === 'high');
        filtered.overscoring_risks = [];
        filtered.inconsistencies = [];
        filtered.vague_documentation = [];
        break;
      case 'audit':
        filtered.underscoring_opportunities = [];
        filtered.critical_missing = filtered.critical_missing?.filter(i => i.reimbursement_impact !== 'low');
        break;
      case 'functional':
        filtered.oasis_narrative_mismatches = [];
        filtered.inconsistencies = [];
        break;
      case 'clinical':
        filtered.underscoring_opportunities = [];
        filtered.overscoring_risks = [];
        break;
    }
    return filtered;
  };

  const _getCategoryIcon = (category) => {
    const icons = {
      'Functional': Footprints,
      'Clinical': Stethoscope,
      'Medications': Pill,
      'Wounds': Activity,
      'GG': Hand,
      'Cognitive': Brain,
      'Safety': AlertTriangle,
      'Cardiac': Heart,
      'Respiratory': Wind
    };
    return icons[category] || FileCheck;
  };

  // Don't show for hospice patients
  if (!isHomeHealth) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  OASIS Compliance Scrubber
                  {isOASISVisit && (
                    <Badge className="bg-blue-600">OASIS Visit</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-600">
                  Check for missing OASIS data elements and reimbursement risks
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* OASIS PDF Upload Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowUploader(!showUploader)}
                className={extractedOasisData ? 'border-green-500 bg-green-50' : ''}
              >
                {extractedOasisData ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                    OASIS Loaded
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload OASIS PDFs
                  </>
                )}
              </Button>
              
              <Button
                onClick={runOASISScrubber}
                disabled={isScrubbing || (!narrativeText && !extractedOasisData)}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isScrubbing ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing OASIS...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Run OASIS Check
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* OASIS PDF Uploader Component */}
          {showUploader && (
            <div className="mt-4">
              <OASISPDFUploader
                visitId={visit?.id}
                patientId={patient?.id}
                onDataExtracted={handleOasisDataExtracted}
                initialData={extractedOasisData}
              />
            </div>
          )}

          {/* Show extracted OASIS data summary (compact view when uploader is hidden) */}
          {extractedOasisData && !showUploader && (
            <OASISPDFUploader
              visitId={visit?.id}
              patientId={patient?.id}
              onDataExtracted={handleOasisDataExtracted}
              initialData={extractedOasisData}
              compact={true}
            />
          )}

          {!isOASISVisit && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                This is a {visit?.visit_type?.replace(/_/g, ' ')} visit. OASIS comprehensive assessment is required for Start of Care, Recertification, and Discharge visits only. However, this scrubber can still help ensure complete clinical documentation.
              </AlertDescription>
            </Alert>
          )}

          {/* Extracted Indicators Preview */}
          {extractedIndicators && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExtractedIndicators(!showExtractedIndicators)}
                className="text-slate-600 hover:text-slate-900"
              >
                {showExtractedIndicators ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showExtractedIndicators ? 'Hide' : 'Show'} Extracted Clinical Indicators
              </Button>
              
              {showExtractedIndicators && (
                <div className="mt-3 bg-white rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Pre-Analysis Extraction Results
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Auto-extracted from narrative
                    </Badge>
                  </div>

                  {/* Clinical Group Preview */}
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-900">PDGM Clinical Group</span>
                      <Badge className={`${
                        extractedIndicators.clinicalGroup.confidence === 'high' ? 'bg-green-600' :
                        extractedIndicators.clinicalGroup.confidence === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        {extractedIndicators.clinicalGroup.confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-indigo-800 font-semibold">
                      {extractedIndicators.clinicalGroup.group} - {extractedIndicators.clinicalGroup.name}
                    </p>
                    {extractedIndicators.clinicalGroup.matchedPatterns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {extractedIndicators.clinicalGroup.matchedPatterns.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-white">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clinical Indicators Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(() => {
                      const colorStyles = {
                        blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'text-blue-900', badge: 'bg-blue-500' },
                        cyan: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-600', label: 'text-cyan-900', badge: 'bg-cyan-500' },
                        red: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'text-red-900', badge: 'bg-red-500' },
                        orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', label: 'text-orange-900', badge: 'bg-orange-500' },
                        purple: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', label: 'text-purple-900', badge: 'bg-purple-500' },
                        pink: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-600', label: 'text-pink-900', badge: 'bg-pink-500' },
                        amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: 'text-amber-900', badge: 'bg-amber-500' },
                        rose: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-600', label: 'text-rose-900', badge: 'bg-rose-500' },
                        teal: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-600', label: 'text-teal-900', badge: 'bg-teal-500' },
                        indigo: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600', label: 'text-indigo-900', badge: 'bg-indigo-500' },
                        green: { bg: 'bg-green-50 border-green-200', text: 'text-green-600', label: 'text-green-900', badge: 'bg-green-500' },
                      };
                      return [
                      { key: 'assistDevices', label: 'Assistive Devices', icon: Footprints, color: 'blue' },
                      { key: 'oxygenUse', label: 'Oxygen Use', icon: Wind, color: 'cyan' },
                      { key: 'woundPresent', label: 'Wounds', icon: Activity, color: 'red' },
                      { key: 'fallRisk', label: 'Fall Risk', icon: AlertTriangle, color: 'orange' },
                      { key: 'painMentioned', label: 'Pain', icon: Thermometer, color: 'purple' },
                      { key: 'cognitiveIssues', label: 'Cognitive', icon: Brain, color: 'pink' },
                      { key: 'diabetic', label: 'Diabetic', icon: Pill, color: 'amber' },
                      { key: 'cardiacIssues', label: 'Cardiac', icon: Heart, color: 'rose' }
                    ].map(({ key, label, icon: Icon, color }) => {
                      const indicator = extractedIndicators.clinical[key];
                      const cs = colorStyles[color] || colorStyles.blue;
                      return (
                        <TooltipProvider key={key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`p-2 rounded border ${
                                indicator?.detected
                                  ? cs.bg
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${indicator?.detected ? cs.text : 'text-slate-400'}`} />
                                  <span className={`text-xs font-medium ${indicator?.detected ? cs.label : 'text-slate-500'}`}>
                                    {label}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  {indicator?.detected ? (
                                    <Badge className={`${cs.badge} text-white text-xs`}>Detected</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">Not found</Badge>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              {indicator?.sentences?.length > 0 ? (
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">Relevant phrases:</p>
                                  {indicator.sentences.slice(0, 3).map((s, i) => (
                                    <p key={i} className="text-slate-600">"{s.substring(0, 100)}..."</p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs">No mentions found in narrative</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    });
                    })()}
                  </div>

                  {/* Clinical Decision Support Alerts */}
                  {clinicalAlerts.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-300">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          Clinical Decision Support
                        </h4>
                        <Badge variant="outline" className="text-xs bg-white">
                          {clinicalAlerts.length} active alert{clinicalAlerts.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {clinicalAlerts.map((alert, idx) => (
                          <div key={idx} className={`bg-white p-2 rounded border ${
                            alert.severity === 'high' ? 'border-red-300' : 'border-blue-200'
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold text-slate-900">{alert.title}</p>
                              <Badge className={`${
                                alert.severity === 'high' ? 'bg-red-500' : 'bg-blue-500'
                              } text-white text-xs flex-shrink-0`}>
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-700 mb-2">{alert.guideline}</p>
                            <div className="flex flex-wrap gap-1 mb-1">
                              {alert.actions.slice(0, 3).map((action, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-blue-50">✓ {action}</Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                              <p className="text-xs text-slate-500">
                                <strong>CMS:</strong> {alert.cmsReference}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveTab('reference')}
                                className="h-5 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                Details
                              </Button>
                            </div>
                            {alert.revenueNote && (
                              <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-800">
                                  <DollarSign className="w-3 h-3 inline mr-1" />
                                  <strong>PDGM:</strong> {alert.revenueNote}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comorbidities Summary */}
                  {extractedIndicators.comorbidities.count > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">Identified Comorbidities</span>
                        <Badge className={`${
                          extractedIndicators.comorbidities.adjustment === 'high' ? 'bg-green-600' :
                          extractedIndicators.comorbidities.adjustment === 'low' ? 'bg-yellow-600' : 'bg-slate-500'
                        }`}>
                          {extractedIndicators.comorbidities.adjustment} adjustment
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {extractedIndicators.comorbidities.high.map((c, i) => (
                          <Badge key={`h-${i}`} className="bg-green-600 text-white text-xs">{c.name}</Badge>
                        ))}
                        {extractedIndicators.comorbidities.low.map((c, i) => (
                          <Badge key={`l-${i}`} variant="outline" className="text-xs">{c.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Functional Phrases Summary */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    {[
                      { key: 'bathing', label: 'Bathing', icon: '🚿' },
                      { key: 'dressing', label: 'Dressing', icon: '👕' },
                      { key: 'ambulation', label: 'Ambulation', icon: '🚶' },
                      { key: 'transfer', label: 'Transfers', icon: '🔄' },
                      { key: 'toileting', label: 'Toileting', icon: '🚽' },
                      { key: 'grooming', label: 'Grooming', icon: '🪥' }
                    ].map(({ key, label, icon }) => {
                      const phrases = extractedIndicators.functional[key];
                      const count = phrases?.allPhrases?.length || 0;
                      return (
                        <div key={key} className={`p-2 rounded border text-center ${count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="text-lg">{icon}</span>
                          <p className={`font-medium ${count > 0 ? 'text-blue-900' : 'text-slate-500'}`}>{label}</p>
                          <p className={count > 0 ? 'text-blue-700' : 'text-slate-400'}>{count} phrases</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <FileCheck className="w-7 h-7 text-green-600" />
              OASIS Compliance Report
            </DialogTitle>
            <DialogDescription>
              Comprehensive OASIS data completeness check for Medicare home health reimbursement
            </DialogDescription>
          </DialogHeader>

          {isScrubbing ? (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-green-600 animate-pulse" />
              <div>
                <p className="text-lg font-semibold text-slate-900">Analyzing OASIS Compliance...</p>
                <p className="text-sm text-slate-600 mt-2">
                  Checking against CMS OASIS-E 2024 requirements for {visit?.visit_type?.replace(/_/g, ' ')} visits
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Badge variant="outline">Functional Scores</Badge>
                  <Badge variant="outline">GG Items</Badge>
                  <Badge variant="outline">PDGM Impact</Badge>
                </div>
              </div>
            </div>
          ) : oasisResults?.error_message ? (
            <div className="py-8">
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Analysis Error:</strong> {oasisResults.error_message}
                </AlertDescription>
              </Alert>
              <Button onClick={runOASISScrubber} className="mt-4 w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Retry Analysis
              </Button>
            </div>
          ) : oasisResults ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="results" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="indicators" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Indicators
                </TabsTrigger>
                <TabsTrigger value="reference" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  CMS Reference
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback ({feedbackStats.accepted + feedbackStats.rejected + feedbackStats.modified})
                </TabsTrigger>
              </TabsList>

              {/* Filter and Export Controls */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Filter results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Findings</SelectItem>
                      <SelectItem value="revenue">Revenue Focus</SelectItem>
                      <SelectItem value="audit">Audit Risk</SelectItem>
                      <SelectItem value="functional">Functional Scores</SelectItem>
                      <SelectItem value="clinical">Clinical Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportResults} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>

              <TabsContent value="indicators">
                <ScrollArea className="h-[60vh]">
                  {extractedIndicators ? (
                    <div className="space-y-6 p-1">
                      {/* Clinical Decision Support Alerts - Expanded View */}
                      {clinicalAlerts.length > 0 && (
                        <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
                          <CardHeader className="py-3 bg-blue-100">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-blue-700" />
                              AI Clinical Decision Support ({clinicalAlerts.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {clinicalAlerts.map((alert, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border-2 border-blue-200">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        alert.severity === 'high' ? 'bg-red-500' : 'bg-blue-500'
                                      }`} />
                                      <h5 className="font-bold text-slate-900">{alert.title}</h5>
                                    </div>
                                    <Badge className={`${
                                      alert.severity === 'high' ? 'bg-red-500' : 'bg-blue-500'
                                    } text-white text-xs`}>
                                      {alert.severity} priority
                                    </Badge>
                                  </div>
                                  
                                  <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-2">
                                    <p className="text-xs font-semibold text-blue-900 mb-1">📋 Evidence-Based Guideline:</p>
                                    <p className="text-sm text-blue-800">{alert.guideline}</p>
                                  </div>

                                  <div className="mb-2">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">Recommended Actions:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                      {alert.actions.map((action, i) => (
                                        <div key={i} className="flex items-center gap-1 text-xs text-slate-700">
                                          <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                          {action}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {alert.revenueNote && (
                                    <div className="bg-green-50 p-2 rounded border border-green-200 mb-2">
                                      <p className="text-xs text-green-800">
                                        <DollarSign className="w-3 h-3 inline mr-1" />
                                        <strong>PDGM Impact:</strong> {alert.revenueNote}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <p className="text-xs text-slate-500">
                                      <strong>CMS Reference:</strong> {alert.cmsReference}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setActiveTab('reference')}
                                      className="h-6 text-xs"
                                    >
                                      <BookOpen className="w-3 h-3 mr-1" />
                                      View CMS Guidance
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Alert className="mt-3 bg-cyan-50 border-cyan-200">
                              <Info className="w-4 h-4 text-cyan-600" />
                              <AlertDescription className="text-cyan-900 text-xs">
                                These evidence-based alerts are triggered by clinical indicators detected in your documentation. 
                                Following these guidelines improves patient outcomes, strengthens OASIS defensibility, and optimizes reimbursement.
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      )}

                      {/* Clinical Group Determination */}
                      <Card className="border-indigo-200">
                        <CardHeader className="py-3 bg-indigo-50">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-indigo-600" />
                            PDGM Clinical Group Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-lg font-bold text-indigo-900">
                                {extractedIndicators.clinicalGroup.group}
                              </p>
                              <p className="text-sm text-indigo-700">{extractedIndicators.clinicalGroup.name}</p>
                            </div>
                            <Badge className={`${
                              extractedIndicators.clinicalGroup.confidence === 'high' ? 'bg-green-600' :
                              extractedIndicators.clinicalGroup.confidence === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                            } text-white`}>
                              {extractedIndicators.clinicalGroup.confidence?.toUpperCase()} CONFIDENCE
                            </Badge>
                          </div>
                          {extractedIndicators.clinicalGroup.matchedPatterns.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Matched Patterns:</p>
                              <div className="flex flex-wrap gap-1">
                                {extractedIndicators.clinicalGroup.matchedPatterns.map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Comorbidities */}
                      <Card className="border-green-200">
                        <CardHeader className="py-3 bg-green-50">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-600" />
                            Comorbidity Analysis
                            <Badge className={`ml-auto ${
                              extractedIndicators.comorbidities.adjustment === 'high' ? 'bg-green-600' :
                              extractedIndicators.comorbidities.adjustment === 'low' ? 'bg-yellow-600' : 'bg-slate-500'
                            }`}>
                              {extractedIndicators.comorbidities.adjustment?.toUpperCase()} Adjustment
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-800 mb-2">High-Impact (1 = HIGH adj)</p>
                              {extractedIndicators.comorbidities.high.length > 0 ? (
                                <ul className="space-y-1">
                                  {extractedIndicators.comorbidities.high.map((c, i) => (
                                    <li key={i} className="text-sm flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                                      <span className="text-green-900">{c.name}</span>
                                      <span className="text-xs text-green-600">({c.icd10_codes?.join(', ')})</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-500">None identified</p>
                              )}
                            </div>
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                              <p className="text-xs font-semibold text-yellow-800 mb-2">Low-Impact (2+ = LOW adj)</p>
                              {extractedIndicators.comorbidities.low.length > 0 ? (
                                <ul className="space-y-1">
                                  {extractedIndicators.comorbidities.low.map((c, i) => (
                                    <li key={i} className="text-sm flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3 text-yellow-600" />
                                      <span className="text-yellow-900">{c.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-500">None identified</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Clinical Indicators Detail */}
                      <Card>
                        <CardHeader className="py-3 bg-slate-50">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="w-4 h-4 text-slate-600" />
                            Clinical Indicators Extracted
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(() => {
                              const colorStyles = {
                                blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
                                cyan: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-600' },
                                red: { bg: 'bg-red-50 border-red-200', text: 'text-red-600' },
                                orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
                                purple: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
                                pink: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-600' },
                                amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
                                rose: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-600' },
                                indigo: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
                                green: { bg: 'bg-green-50 border-green-200', text: 'text-green-600' },
                              };
                              return Object.entries({
                              assistDevices: { label: 'Assistive Devices', icon: Footprints, color: 'blue' },
                              oxygenUse: { label: 'Oxygen Usage', icon: Wind, color: 'cyan' },
                              woundPresent: { label: 'Wound Presence', icon: Activity, color: 'red' },
                              fallRisk: { label: 'Fall Risk Factors', icon: AlertTriangle, color: 'orange' },
                              painMentioned: { label: 'Pain Indicators', icon: Thermometer, color: 'purple' },
                              cognitiveIssues: { label: 'Cognitive Concerns', icon: Brain, color: 'pink' },
                              diabetic: { label: 'Diabetic Management', icon: Pill, color: 'amber' },
                              cardiacIssues: { label: 'Cardiac Symptoms', icon: Heart, color: 'rose' },
                              assistanceNeeded: { label: 'Assistance Levels', icon: Hand, color: 'indigo' },
                              independentMentioned: { label: 'Independence', icon: CheckCircle2, color: 'green' }
                            }).map(([key, { label, icon: Icon, color }]) => {
                              const indicator = extractedIndicators.clinical[key];
                              const cs = colorStyles[color] || colorStyles.blue;
                              if (!indicator) return null;
                              return (
                                <div key={key} className={`p-3 rounded border ${indicator.detected ? cs.bg : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className={`w-4 h-4 ${indicator.detected ? cs.text : 'text-slate-400'}`} />
                                      <span className="font-medium text-sm">{label}</span>
                                    </div>
                                    {indicator.detected ? (
                                      <Badge className="bg-green-500 text-xs">Detected</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Not found</Badge>
                                    )}
                                  </div>
                                  {indicator.detected && indicator.sentences?.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                                      {indicator.sentences.slice(0, 3).map((s, i) => (
                                        <div key={i} className="flex items-start gap-1 group">
                                          <p className="text-xs text-slate-600 italic flex-1">"{s.substring(0, 150)}{s.length > 150 ? '...' : ''}"</p>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => copyToClipboard(s, `${key}-${i}`)}
                                          >
                                            {copiedText === `${key}-${i}` ? (
                                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Functional Phrases Detail */}
                      <Card>
                        <CardHeader className="py-3 bg-blue-50">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-blue-600" />
                            ADL/IADL Functional Phrases
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries({
                              bathing: { label: 'Bathing (M1830)', icon: '🚿', items: ['M1830', 'GG0130E'] },
                              dressing: { label: 'Dressing (M1810/20)', icon: '👕', items: ['M1810', 'M1820'] },
                              ambulation: { label: 'Ambulation (M1860)', icon: '🚶', items: ['M1860', 'GG0170'] },
                              transfer: { label: 'Transfers (M1850)', icon: '🔄', items: ['M1850'] },
                              toileting: { label: 'Toileting (M1840)', icon: '🚽', items: ['M1840'] },
                              grooming: { label: 'Grooming (M1800)', icon: '🪥', items: ['M1800'] },
                              eating: { label: 'Eating (GG0130A)', icon: '🍽️', items: ['GG0130A'] },
                              medications: { label: 'Medications (M2020)', icon: '💊', items: ['M2020', 'M2030'] }
                            }).map(([key, { label, icon, items }]) => {
                              const phrases = extractedIndicators.functional[key];
                              const count = phrases?.allPhrases?.length || 0;
                              return (
                                <div key={key} className={`p-3 rounded border ${count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{icon}</span>
                                      <span className="font-medium text-sm">{label}</span>
                                    </div>
                                    <Badge variant={count > 0 ? 'default' : 'outline'} className="text-xs">
                                      {count} phrases
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {items.map(item => (
                                      <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
                                    ))}
                                  </div>
                                  {count > 0 && phrases.allPhrases?.slice(0, 2).map((s, i) => (
                                    <p key={i} className="text-xs text-slate-600 italic mb-1">"{s.substring(0, 80)}..."</p>
                                  ))}
                                  {phrases?.assistLevel?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-xs text-slate-500">Assist Levels Found:</p>
                                      {phrases.assistLevel.slice(0, 2).map((a, i) => (
                                        <Badge key={i} variant="outline" className="text-xs mr-1 mt-1">{a.substring(0, 40)}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Run the OASIS analysis to see extracted indicators</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="reference">
                <CMSComplianceReference onInsertGuidance={handleInsertGuidance} />
              </TabsContent>

              <TabsContent value="feedback">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Feedback Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                        <p className="text-3xl font-bold text-green-700">{feedbackStats.accepted}</p>
                        <p className="text-sm text-green-600">Accepted</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                        <p className="text-3xl font-bold text-blue-700">{feedbackStats.modified}</p>
                        <p className="text-sm text-blue-600">Modified</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                        <p className="text-3xl font-bold text-red-700">{feedbackStats.rejected}</p>
                        <p className="text-sm text-red-600">Rejected</p>
                      </div>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        Your feedback helps improve AI accuracy for reimbursement impact assessments and documentation suggestions. All feedback is used to enhance future recommendations.
                      </AlertDescription>
                    </Alert>
                    {acceptedSuggestions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-slate-900 mb-2">Applied Suggestions:</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {acceptedSuggestions.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-900">{s.oasis_item || s.type}: Applied</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <ScrollArea className="h-[60vh]">
                <div className="space-y-6 py-4 pr-2">
              {/* Quick Summary Banner */}
              <div className={`p-4 rounded-lg border-2 ${
                oasisResults.ready_for_submission 
                  ? 'bg-green-50 border-green-300' 
                  : oasisResults.reimbursement_risk_level === 'critical' 
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {oasisResults.ready_for_submission ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-bold text-lg">
                        {oasisResults.ready_for_submission ? 'Ready for Submission' : 'Action Required'}
                      </p>
                      <p className="text-sm text-slate-600">
                        {oasisResults.critical_missing?.length || 0} missing items • 
                        {oasisResults.underscoring_opportunities?.length || 0} revenue opportunities • 
                        {oasisResults.overscoring_risks?.length || 0} audit risks
                      </p>
                    </div>
                  </div>
                  {oasisResults.pdgm_analysis?.optimization_potential && (
                    <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {oasisResults.pdgm_analysis.optimization_potential}
                    </Badge>
                  )}
                </div>
                {/* Quick Actions for Top Optimization */}
                {(oasisResults.underscoring_opportunities?.length > 0 || oasisResults.critical_missing?.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab('results');
                        setExpandedCategories(['underscoring', 'critical']);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      View {oasisResults.underscoring_opportunities?.length || 0} Revenue Opportunities
                    </Button>
                    {oasisResults.critical_missing?.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab('results');
                          setExpandedCategories(['critical']);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Fix {oasisResults.critical_missing.length} Critical Items
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Overall Score Card */}
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      Completeness: {oasisResults.completeness_percentage}%
                    </h3>
                    <p className="text-sm text-slate-600">OASIS data elements documented</p>
                    <Progress value={oasisResults.completeness_percentage} className="h-3 mt-2" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      Quality Score: {oasisResults.overall_score}/100
                    </h3>
                    <p className="text-sm text-slate-600">Documentation quality rating</p>
                    <Progress value={oasisResults.overall_score} className="h-3 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Reimbursement Risk</p>
                    <Badge className={getRiskColor(oasisResults.reimbursement_risk_level)}>
                      {oasisResults.reimbursement_risk_level?.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Submission Status</p>
                    {oasisResults.ready_for_submission ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        READY
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        NOT READY
                      </Badge>
                    )}
                  </div>
                </div>

                {/* PDGM Analysis Section */}
                {oasisResults.pdgm_analysis && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                    <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      PDGM Case-Mix Analysis
                    </h4>

                    {/* Clinical Group with Confidence */}
                    <div className="bg-white p-3 rounded border mb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <p className="text-xs text-slate-500">Clinical Group (MMTA)</p>
                          <p className="font-bold text-slate-900">{oasisResults.pdgm_analysis.clinical_group}</p>
                        </div>
                        <Badge className={`${
                          oasisResults.pdgm_analysis.clinical_group_confidence === 'high' ? 'bg-green-600' :
                          oasisResults.pdgm_analysis.clinical_group_confidence === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          {oasisResults.pdgm_analysis.clinical_group_confidence?.toUpperCase()} Confidence
                        </Badge>
                      </div>
                      {oasisResults.pdgm_analysis.clinical_group_rationale && (
                        <p className="text-xs text-slate-600 mt-1">{oasisResults.pdgm_analysis.clinical_group_rationale}</p>
                      )}
                      {oasisResults.pdgm_analysis.primary_dx_icd10_suggested && (
                        <p className="text-xs text-blue-700 mt-1">
                          <strong>Suggested ICD-10:</strong> {oasisResults.pdgm_analysis.primary_dx_icd10_suggested}
                        </p>
                      )}
                      {oasisResults.pdgm_analysis.alternative_clinical_groups?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-slate-500">Alternatives:</span>
                          {oasisResults.pdgm_analysis.alternative_clinical_groups.map((alt, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{alt}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Functional Level</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.functional_level === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.functional_level === 'medium' ? 'text-yellow-700' : 'text-red-700'
                        }`}>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</p>
                        {oasisResults.pdgm_analysis.functional_points_calculated && (
                          <p className="text-xs text-slate-500 mt-1">{oasisResults.pdgm_analysis.functional_points_calculated} points</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Comorbidity Adj.</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.comorbidity_adjustment === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' ? 'text-yellow-700' : 'text-slate-700'
                        }`}>{oasisResults.pdgm_analysis.comorbidity_adjustment?.toUpperCase()}</p>
                        {oasisResults.pdgm_analysis.comorbidity_count > 0 && (
                          <p className="text-xs text-slate-500 mt-1">{oasisResults.pdgm_analysis.comorbidity_count} qualifying</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-slate-500">Case-Mix Weight</p>
                        <p className="font-bold text-green-700 text-lg">{oasisResults.pdgm_analysis.estimated_case_mix_weight}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <p className="text-xs text-green-700">Optimization</p>
                        <p className="font-semibold text-green-800">{oasisResults.pdgm_analysis.optimization_potential}</p>
                      </div>
                    </div>

                    {/* Qualifying Comorbidities Detail */}
                    {oasisResults.pdgm_analysis.qualifying_comorbidities && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Qualifying Comorbidities:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {oasisResults.pdgm_analysis.qualifying_comorbidities.high_impact?.length > 0 && (
                            <div>
                              <p className="text-xs text-green-700 font-medium">✓ High-Impact (1 = HIGH adj):</p>
                              <ul className="text-xs text-green-900">
                                {oasisResults.pdgm_analysis.qualifying_comorbidities.high_impact.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {oasisResults.pdgm_analysis.qualifying_comorbidities.low_impact?.length > 0 && (
                            <div>
                              <p className="text-xs text-yellow-700 font-medium">○ Low-Impact (2+ = LOW adj):</p>
                              <ul className="text-xs text-yellow-900">
                                {oasisResults.pdgm_analysis.qualifying_comorbidities.low_impact.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions?.length > 0 && (
                          <div className="mt-2 bg-yellow-100 p-2 rounded">
                            <p className="text-xs text-yellow-800 font-medium">💡 Potential Additional Comorbidities (needs documentation):</p>
                            <ul className="text-xs text-yellow-900">
                              {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions.map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Case-Mix Weight Breakdown */}
                    {oasisResults.pdgm_analysis.case_mix_weight_breakdown && (
                      <div className="bg-white p-2 rounded border mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Case-Mix Weight Breakdown:</p>
                        <div className="flex gap-4 text-xs">
                          <span>Clinical: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.clinical_component}</strong></span>
                          <span>Functional: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.functional_component}</strong></span>
                          <span>Comorbidity: <strong>{oasisResults.pdgm_analysis.case_mix_weight_breakdown.comorbidity_component}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Optimization Strategies */}
                    {oasisResults.pdgm_analysis.optimization_strategies?.length > 0 && (
                      <Alert className="bg-green-100 border-green-300">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Optimization Strategies:</strong>
                          <ul className="mt-1 text-xs">
                            {oasisResults.pdgm_analysis.optimization_strategies.map((strategy, idx) => (
                              <li key={idx}>• {strategy}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Automated Optimization Suggestions */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-amber-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          Automated Optimization Suggestions
                        </h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOptimizationPanel(!showOptimizationPanel)}
                          className="h-6 text-xs"
                        >
                          {showOptimizationPanel ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {showOptimizationPanel ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                      
                      {showOptimizationPanel && (
                        <div className="space-y-3">
                        {oasisResults.pdgm_analysis.clinical_group_confidence !== 'high' && (
                          <div className="bg-white p-3 rounded border border-amber-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-amber-500 text-white text-xs flex-shrink-0">Clinical Group</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-amber-900">Strengthen Clinical Group Assignment</p>
                                <p className="text-xs text-amber-800 mt-1">
                                  Current confidence is <strong>{oasisResults.pdgm_analysis.clinical_group_confidence}</strong>. 
                                  Document specific ICD-10 codes and clinical conditions that align with {oasisResults.pdgm_analysis.clinical_group?.split(' - ')[0]}.
                                </p>
                                <div className="mt-2 bg-amber-50 p-2 rounded text-xs">
                                  <p className="font-medium text-amber-800">💡 Suggestion:</p>
                                  <p className="text-amber-700">
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Musculoskeletal') && 
                                      'Document specific orthopedic procedure codes, weight-bearing status, and surgical details to strengthen MMTA-01 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Neuro') && 
                                      'Document specific CVA laterality, affected extremities, and cognitive/motor deficits to strengthen MMTA-02 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Wounds') && 
                                      'Document wound etiology, staging, measurements, and treatment plan to strengthen MMTA-03 assignment.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Complex') && 
                                      'Document specific complex care interventions, equipment, and skilled nursing requirements.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('MMTA') && 
                                      'Document medication complexity, teaching needs, and disease management requirements.'}
                                    {oasisResults.pdgm_analysis.clinical_group?.includes('Behavioral') && 
                                      'Document psychiatric diagnoses, behavioral interventions, and safety concerns.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Functional Score Optimization */}
                        {oasisResults.pdgm_analysis.functional_level !== 'high' && (
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">Functional Level</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">Maximize Functional Score Documentation</p>
                                <p className="text-xs text-blue-800 mt-1">
                                  Current level: <strong>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</strong> 
                                  ({oasisResults.pdgm_analysis.functional_points_calculated || '?'} points). 
                                  {oasisResults.pdgm_analysis.functional_level === 'low' ? ' Need 6+ points for MEDIUM, 12+ for HIGH.' : ' Need 12+ points for HIGH.'}
                                </p>
                                <div className="mt-2 space-y-2">
                                  {/* Specific M-item suggestions based on current scores */}
                                  {oasisResults.functional_score_analysis && (
                                    <>
                                      {(oasisResults.functional_score_analysis.m1830_bathing?.documented_value < 3 || !oasisResults.functional_score_analysis.m1830_bathing?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                              <p className="font-medium text-blue-800">🚿 M1830 Bathing (0-6 scale):</p>
                                              <p className="text-blue-700">Document need for assistance throughout bathing, transfer assistance, or inability to bathe. Include safety concerns, equipment needs, and caregiver involvement.</p>
                                            </div>
                                            {extractedIndicators?.functional?.bathing?.allPhrases?.length > 0 && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyToClipboard(extractedIndicators.functional.bathing.allPhrases[0], 'bathing-suggestion')}
                                                className="h-6 px-2 flex-shrink-0"
                                              >
                                                {copiedText === 'bathing-suggestion' ? (
                                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                ) : (
                                                  <Copy className="w-3 h-3" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {(oasisResults.functional_score_analysis.m1860_ambulation?.documented_value < 3 || !oasisResults.functional_score_analysis.m1860_ambulation?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <p className="font-medium text-blue-800">🚶 M1860 Ambulation (0-6 scale):</p>
                                          <p className="text-blue-700">Document assistive device dependence, distance limitations, surface restrictions, and assistance requirements. Include gait abnormalities and fall risk factors.</p>
                                        </div>
                                      )}
                                      {(oasisResults.functional_score_analysis.m1850_transferring?.documented_value < 2 || !oasisResults.functional_score_analysis.m1850_transferring?.documented_value) && (
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <p className="font-medium text-blue-800">🔄 M1850 Transferring (0-5 scale):</p>
                                          <p className="text-blue-700">Document supervision or physical assistance needed, weight-bearing restrictions, and equipment use (grab bars, transfer boards, mechanical lifts).</p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="bg-green-50 p-2 rounded text-xs border border-green-200">
                                    <p className="font-medium text-green-800">📈 Revenue Impact:</p>
                                    <p className="text-green-700">
                                      Each functional level increase (Low→Medium→High) can add $200-$500 per 30-day episode.
                                      {oasisResults.pdgm_analysis.functional_level === 'low' && ' Moving from LOW to MEDIUM = +$200-300/episode.'}
                                      {oasisResults.pdgm_analysis.functional_level === 'medium' && ' Moving from MEDIUM to HIGH = +$300-500/episode.'}
                                    </p>
                                  </div>
                                  <div className="bg-blue-50 p-2 rounded text-xs border border-blue-200 mt-2">
                                    <p className="font-medium text-blue-800">🎯 Next Steps to Increase Score:</p>
                                    <ol className="text-blue-700 list-decimal list-inside mt-1 space-y-1">
                                      <li>Review narrative for ANY mention of assistance needs not captured in M-items</li>
                                      <li>Document specific level of assist (min/mod/max) with observable details</li>
                                      <li>Cross-check GG scores align with M1800-1860 functional documentation</li>
                                      <li>Consider PT/OT referral for objective functional assessment</li>
                                    </ol>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comorbidity Optimization */}
                        {oasisResults.pdgm_analysis.comorbidity_adjustment !== 'high' && (
                          <div className="bg-white p-3 rounded border border-purple-200">
                            <div className="flex items-start gap-2">
                              <Badge className="bg-purple-500 text-white text-xs flex-shrink-0">Comorbidity Adj.</Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-purple-900">Improve Comorbidity Adjustment</p>
                                <p className="text-xs text-purple-800 mt-1">
                                  Current adjustment: <strong>{oasisResults.pdgm_analysis.comorbidity_adjustment?.toUpperCase() || 'NONE'}</strong>.
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && ' Document qualifying comorbidities to increase reimbursement.'}
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' && ' Document ONE high-impact comorbidity for HIGH adjustment.'}
                                </p>
                                <div className="mt-2 space-y-2">
                                  {/* High-impact comorbidity suggestions */}
                                  <div className="bg-purple-50 p-2 rounded text-xs">
                                    <p className="font-medium text-purple-800 mb-1">🎯 High-Impact Comorbidities (1 = HIGH adjustment):</p>
                                    <ul className="text-purple-700 space-y-1">
                                      <li>• <strong>Diabetes with complications</strong> - neuropathy, nephropathy, retinopathy (E11.2x, E11.4x, E11.5x, E11.6x)</li>
                                      <li>• <strong>Heart Failure</strong> - CHF, HFrEF, HFpEF (I50.x)</li>
                                      <li>• <strong>COPD</strong> - chronic bronchitis, emphysema (J44.x, J43.x)</li>
                                      <li>• <strong>Chronic Kidney Disease</strong> - Stage 3-5 (N18.3-N18.5)</li>
                                      <li>• <strong>Malignancy</strong> - active cancer with treatment (C00-C96)</li>
                                    </ul>
                                  </div>
                                  {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && (
                                    <div className="bg-yellow-50 p-2 rounded text-xs border border-yellow-200">
                                      <p className="font-medium text-yellow-800 mb-1">💡 Low-Impact Alternative (need 2+ for LOW adjustment):</p>
                                      <ul className="text-yellow-700">
                                        <li>• Hypertension (I10), Atrial Fibrillation (I48), Uncomplicated Diabetes (E11.9)</li>
                                        <li>• Osteoarthritis (M15-M17), Anxiety/Depression (F41, F32), Obesity (E66)</li>
                                      </ul>
                                    </div>
                                  )}
                                  {oasisResults.pdgm_analysis.qualifying_comorbidities?.potential_additions?.length > 0 && (
                                    <div className="bg-green-50 p-2 rounded text-xs border border-green-200">
                                      <p className="font-medium text-green-800">✓ Identified in Narrative (needs proper coding):</p>
                                      <ul className="text-green-700 space-y-1">
                                        {oasisResults.pdgm_analysis.qualifying_comorbidities.potential_additions.map((c, i) => (
                                          <li key={i} className="flex items-center gap-1">
                                            <span>• {c}</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => copyToClipboard(c, `comorbid-${i}`)}
                                              className="h-4 w-4 p-0 ml-auto"
                                            >
                                              {copiedText === `comorbid-${i}` ? (
                                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </Button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="bg-indigo-50 p-2 rounded text-xs border border-indigo-200 mt-2">
                                    <p className="font-medium text-indigo-800">💰 Comorbidity Impact:</p>
                                    <p className="text-indigo-700">
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'none' && 'Adding LOW adjustment = +$100-200/episode. Adding HIGH adjustment = +$300-500/episode.'}
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'low' && 'Upgrading to HIGH adjustment = additional +$200-300/episode.'}
                                      {oasisResults.pdgm_analysis.comorbidity_adjustment === 'high' && 'Currently maximized - excellent work!'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Documentation Gaps */}
                        <div className="bg-white p-3 rounded border border-rose-200">
                          <div className="flex items-start gap-2">
                            <Badge className="bg-rose-500 text-white text-xs flex-shrink-0">Documentation Gaps</Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-rose-900">Key Documentation Gaps Identified</p>
                              <div className="mt-2 space-y-2 text-xs">
                                {/* Check for specific gaps based on analysis */}
                                {(!extractedIndicators?.clinical?.assistDevices?.detected && oasisResults.functional_score_analysis?.m1860_ambulation?.documented_value > 0) && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>🦯 Assistive Device Gap:</strong> Ambulation limitations documented but no assistive device mentioned. 
                                      Document specific devices (walker, cane, wheelchair) if used.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.fallRisk?.detected) && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>⚠️ Fall Risk Gap:</strong> No fall risk documentation found. 
                                      Document fall history, risk factors, environmental hazards, and interventions implemented.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.painMentioned?.detected) && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>💊 Pain Assessment Gap:</strong> No pain documentation found. 
                                      Document pain level (0-10), location, quality, frequency, and management plan.
                                    </p>
                                  </div>
                                )}
                                {(!extractedIndicators?.clinical?.cognitiveIssues?.detected && patient?.primary_diagnosis?.toLowerCase().includes('dementia')) && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>🧠 Cognitive Assessment Gap:</strong> Dementia diagnosis but limited cognitive documentation. 
                                      Document orientation status, BIMS score, memory deficits, and safety concerns.
                                    </p>
                                  </div>
                                )}
                                {oasisResults.vague_documentation?.length > 0 && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>📝 Vague Language:</strong> {oasisResults.vague_documentation.length} items have vague documentation 
                                      that could support multiple scores. See "Vague Documentation" section for specific improvements.
                                    </p>
                                  </div>
                                )}
                                {oasisResults.cross_validation_failures?.length > 0 && (
                                  <div className="bg-rose-50 p-2 rounded">
                                    <p className="text-rose-800">
                                      <strong>🔗 Cross-Validation:</strong> {oasisResults.cross_validation_failures.length} item relationships 
                                      don't align per CMS rules. Fix these to avoid audit flags.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Care Plan Modification Suggestions */}
                        <div className="bg-white p-3 rounded border border-teal-200">
                          <div className="flex items-start gap-2">
                            <Badge className="bg-teal-500 text-white text-xs flex-shrink-0">Care Plan</Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-teal-900">Care Plan Modification Suggestions</p>
                              <div className="mt-2 space-y-2 text-xs">
                                {oasisResults.pdgm_analysis.functional_level !== 'high' && (
                                  <div className="bg-teal-50 p-2 rounded">
                                    <p className="text-teal-800">
                                      <strong>🎯 Therapy Referral:</strong> Consider PT/OT evaluation to document objective functional limitations 
                                      and establish measurable goals. Therapy assessments often capture functional deficits more precisely.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.diabetic?.detected && (
                                  <div className="bg-teal-50 p-2 rounded">
                                    <p className="text-teal-800">
                                      <strong>🩺 Diabetic Care Plan:</strong> Ensure diabetic complications are documented as separate diagnoses 
                                      (neuropathy, nephropathy, retinopathy) with specific ICD-10 codes for comorbidity credit.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.cardiacIssues?.detected && (
                                  <div className="bg-teal-50 p-2 rounded">
                                    <p className="text-teal-800">
                                      <strong>❤️ Cardiac Care Plan:</strong> Document EF% if known, specific CHF type (HFrEF/HFpEF), 
                                      and daily weight monitoring plan for optimal coding and care coordination.
                                    </p>
                                  </div>
                                )}
                                {extractedIndicators?.clinical?.woundPresent?.detected && (
                                  <div className="bg-teal-50 p-2 rounded">
                                    <p className="text-teal-800">
                                      <strong>🩹 Wound Care Plan:</strong> Ensure weekly wound measurements are documented with healing trajectory. 
                                      Non-healing wounds may indicate need for specialist referral and support higher clinical group assignment.
                                    </p>
                                  </div>
                                )}
                                <div className="bg-green-50 p-2 rounded border border-green-200">
                                  <p className="font-medium text-green-800">💰 Total Optimization Potential:</p>
                                  <p className="text-green-700">
                                    Implementing these suggestions could increase case-mix weight by 
                                    <strong> 0.05-0.15</strong>, translating to approximately 
                                    <strong> $150-$450</strong> additional per 30-day episode.
                                  </p>
                                  <div className="mt-2 pt-2 border-t border-green-200">
                                    <p className="text-green-800 font-medium">Annual Impact (60 episodes/year):</p>
                                    <p className="text-2xl font-bold text-green-900">$9,000 - $27,000</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 mt-2"
                                  onClick={() => {
                                    const allSuggestions = [
                                      ...(oasisResults.underscoring_opportunities || []),
                                      ...(oasisResults.critical_missing || []),
                                      ...(oasisResults.vague_documentation || [])
                                    ];
                                    const topSuggestion = allSuggestions[0];
                                    if (topSuggestion) {
                                      handleSuggestionAccept(topSuggestion, 'optimization');
                                    }
                                  }}
                                  disabled={!oasisResults.underscoring_opportunities?.length && !oasisResults.critical_missing?.length}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Top Suggestion Now
                                </Button>
                                </div>
                                </div>
                                </div>
                                </div>
                                </div>
                                )}

                                {/* Quick Action Buttons */}
                                {!showOptimizationPanel && (
                                <div className="flex flex-wrap gap-2">
                                <Badge className="bg-amber-600 text-white">
                                {[
                                oasisResults.pdgm_analysis.clinical_group_confidence !== 'high' ? 1 : 0,
                                oasisResults.pdgm_analysis.functional_level !== 'high' ? 1 : 0,
                                oasisResults.pdgm_analysis.comorbidity_adjustment !== 'high' ? 1 : 0
                                ].reduce((a, b) => a + b, 0)} optimization areas available
                                </Badge>
                                </div>
                                )}
                                </div>
                  </div>
                )}

                {/* Functional Score Analysis */}
                {oasisResults.functional_score_analysis && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3">Functional Score Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {['m1800_grooming', 'm1810_dress_upper', 'm1820_dress_lower', 'm1830_bathing', 'm1840_toilet_transfer', 'm1850_transferring', 'm1860_ambulation'].map(key => {
                        const item = oasisResults.functional_score_analysis[key];
                        if (!item) return null;
                        return (
                          <div key={key} className={`p-2 rounded border ${
                            item.accuracy === 'underscored' ? 'bg-yellow-100 border-yellow-300' :
                            item.accuracy === 'overscored' ? 'bg-red-100 border-red-300' :
                            'bg-white border-slate-200'
                          }`}>
                            <p className="font-medium text-slate-700">{key.replace('m', 'M').replace(/_/g, ' ')}</p>
                            <p className="text-lg font-bold">{item.documented_value ?? '?'}</p>
                            {item.accuracy !== 'accurate' && (
                              <Badge className={`text-xs ${item.accuracy === 'underscored' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                {item.accuracy}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      <div className="p-2 rounded border bg-indigo-100 border-indigo-300">
                        <p className="font-medium text-indigo-700">Total Points</p>
                        <p className="text-lg font-bold text-indigo-900">{oasisResults.functional_score_analysis.total_functional_points ?? '?'}</p>
                        <Badge className="bg-indigo-600 text-xs">{oasisResults.functional_score_analysis.functional_level_result}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* OASIS-Narrative Mismatches (from uploaded OASIS) */}
              {oasisResults.oasis_narrative_mismatches && oasisResults.oasis_narrative_mismatches.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-purple-50 p-4 rounded-lg border-2 border-purple-200"
                    onClick={() => toggleCategory('mismatches')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                      <div>
                        <h4 className="font-bold text-purple-900 text-lg">
                          🔍 OASIS vs Narrative Mismatches ({oasisResults.oasis_narrative_mismatches.length})
                        </h4>
                        <p className="text-xs text-purple-700">Uploaded OASIS scores don't match clinical documentation</p>
                      </div>
                    </div>
                    {expandedCategories.includes('mismatches') ? (
                      <ChevronUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-purple-600" />
                    )}
                  </div>

                  {expandedCategories.includes('mismatches') && (
                    <div className="space-y-3">
                      {oasisResults.oasis_narrative_mismatches.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-purple-500 bg-purple-50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-purple-900">{item.oasis_item}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Uploaded OASIS Score</p>
                                <p className="font-semibold text-red-800">{item.uploaded_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-700">Narrative Suggests</p>
                                <p className="font-semibold text-green-800">{item.narrative_suggests}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-500">Discrepancy:</p>
                              <p className="text-slate-900">{item.discrepancy}</p>
                            </div>
                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Recommendation:</strong> {item.recommendation}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cross-Validation Failures */}
              {oasisResults.cross_validation_failures && oasisResults.cross_validation_failures.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-orange-50 p-4 rounded-lg border-2 border-orange-200"
                    onClick={() => toggleCategory('crossvalidation')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="font-bold text-orange-900 text-lg">
                          🔗 Cross-Validation Issues ({oasisResults.cross_validation_failures.length})
                        </h4>
                        <p className="text-xs text-orange-700">Related OASIS items don't align per CMS rules</p>
                      </div>
                    </div>
                    {expandedCategories.includes('crossvalidation') ? (
                      <ChevronUp className="w-5 h-5 text-orange-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-orange-600" />
                    )}
                  </div>

                  {expandedCategories.includes('crossvalidation') && (
                    <div className="space-y-3">
                      {oasisResults.cross_validation_failures.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-orange-900">{item.rule_violated}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.items_involved?.map((mi, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white text-orange-800 border-orange-300 text-xs">
                                  {mi}
                                </Badge>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700 font-medium">Current Values</p>
                                <p className="text-red-900">{item.current_values}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-700 font-medium">Expected Relationship</p>
                                <p className="text-green-900">{item.expected_relationship}</p>
                              </div>
                            </div>
                            {item.narrative_evidence && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-500">Evidence:</p>
                                <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                              </div>
                            )}
                            {item.pdgm_impact && (
                              <div className="bg-purple-50 p-2 rounded border border-purple-200 text-sm">
                                <p className="text-xs text-purple-700 font-medium">PDGM Impact:</p>
                                <p className="text-purple-900">{item.pdgm_impact}</p>
                              </div>
                            )}
                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Resolution:</strong> {item.resolution}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* GG Section Analysis */}
              {oasisResults.gg_section_analysis && (
                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Section GG Functional Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {oasisResults.gg_section_analysis.gg0130_self_care_summary && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">GG0130 Self-Care</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.gg0130_self_care_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.gg0170_mobility_summary && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">GG0170 Mobility</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.gg0170_mobility_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.goal_appropriateness && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Discharge Goal Assessment</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.goal_appropriateness}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.functional_improvement_potential && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Improvement Potential</p>
                        <p className="text-slate-700">{oasisResults.gg_section_analysis.functional_improvement_potential}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Underscoring Opportunities */}
              {oasisResults.underscoring_opportunities && oasisResults.underscoring_opportunities.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-green-50 p-4 rounded-lg border-2 border-green-200"
                    onClick={() => toggleCategory('underscoring')}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">
                          💰 Underscoring Opportunities ({oasisResults.underscoring_opportunities.length})
                        </h4>
                        <p className="text-xs text-green-700">Documentation supports higher scores - potential revenue increase</p>
                      </div>
                    </div>
                    {expandedCategories.includes('underscoring') ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {expandedCategories.includes('underscoring') && (
                    <div className="space-y-3">
                      {oasisResults.underscoring_opportunities.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-green-500 bg-green-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-green-900">{item.oasis_item}</h5>
                              <div className="flex gap-2">
                                {item.score_difference && (
                                  <Badge className="bg-blue-600">{item.score_difference}</Badge>
                                )}
                                <Badge className="bg-green-600">{item.revenue_impact}</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-slate-500">Current Implied Score</p>
                                <p className="font-semibold text-slate-700">{item.current_implied_score || item.current_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-300">
                                <p className="text-xs text-green-700">Supported Score</p>
                                <p className="font-semibold text-green-800">{item.supported_score}</p>
                              </div>
                            </div>
                            {item.functional_level_change && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300">
                                {item.functional_level_change}
                              </Badge>
                            )}
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-500 font-medium">📝 Evidence from Narrative:</p>
                              <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                            </div>
                            {item.cms_scoring_definition && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Scoring Definition:</p>
                                <p className="text-blue-900">{item.cms_scoring_definition}</p>
                                {item.cms_reference && (
                                  <p className="text-xs text-blue-600 mt-1">Ref: {item.cms_reference}</p>
                                )}
                              </div>
                            )}
                            {item.why_higher_score_applies && (
                              <div className="bg-green-100 p-2 rounded border border-green-200 text-sm">
                                <p className="text-xs text-green-700 font-medium">✓ Why Higher Score Applies:</p>
                                <p className="text-green-900">{item.why_higher_score_applies}</p>
                              </div>
                            )}
                            {item.documentation_enhancement && (
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-sm">
                                <p className="text-xs text-yellow-700 font-medium">💡 Documentation Enhancement:</p>
                                <p className="text-yellow-900">{item.documentation_enhancement}</p>
                              </div>
                            )}
                            {item.example_compliant_language && (
                              <div className="bg-emerald-50 p-3 rounded border border-emerald-200 text-sm">
                                <p className="text-xs text-emerald-700 font-medium">✓ Example Compliant Language:</p>
                                <p className="text-emerald-900 italic">"{item.example_compliant_language}"</p>
                              </div>
                            )}
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="underscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'underscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.revenue_impact}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Overscoring Risks */}
              {oasisResults.overscoring_risks && oasisResults.overscoring_risks.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-red-50 p-4 rounded-lg border-2 border-red-200"
                    onClick={() => toggleCategory('overscoring')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <div>
                        <h4 className="font-bold text-red-900 text-lg">
                          ⚠️ Overscoring Risks ({oasisResults.overscoring_risks.length})
                        </h4>
                        <p className="text-xs text-red-700">Claimed scores not fully supported - audit risk</p>
                      </div>
                    </div>
                    {expandedCategories.includes('overscoring') ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {expandedCategories.includes('overscoring') && (
                    <div className="space-y-3">
                      {oasisResults.overscoring_risks.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                              <div className="flex gap-2">
                                {item.score_difference && (
                                  <Badge className="bg-slate-600">{item.score_difference}</Badge>
                                )}
                                <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : 'bg-orange-500'}`}>
                                  {item.audit_risk} audit risk
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Claimed/Implied Score</p>
                                <p className="font-semibold text-red-800">{item.claimed_score}</p>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-slate-500">Actually Supported</p>
                                <p className="font-semibold text-slate-700">{item.supported_score}</p>
                              </div>
                            </div>
                            {item.narrative_evidence && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-500 font-medium">📝 Contradicting Evidence:</p>
                                <p className="text-slate-900 italic">"{item.narrative_evidence}"</p>
                              </div>
                            )}
                            {item.cms_scoring_definition && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Definition (Supported Score):</p>
                                <p className="text-blue-900">{item.cms_scoring_definition}</p>
                              </div>
                            )}
                            {item.audit_vulnerability && typeof item.audit_vulnerability === 'object' && (
                              <div className="bg-red-100 p-3 rounded border border-red-300 text-sm space-y-2">
                                <p className="text-xs text-red-700 font-bold">⚠️ AUDIT VULNERABILITY:</p>
                                {item.audit_vulnerability.type && (
                                  <Badge variant="outline" className="bg-red-200 text-red-800 border-red-400 text-xs">
                                    {item.audit_vulnerability.type} Review Risk
                                  </Badge>
                                )}
                                {item.audit_vulnerability.specific_risk && (
                                  <p className="text-red-900"><strong>Risk:</strong> {item.audit_vulnerability.specific_risk}</p>
                                )}
                                {item.audit_vulnerability.potential_recoupment && (
                                  <p className="text-red-800 font-semibold">💰 Potential Recoupment: {item.audit_vulnerability.potential_recoupment}</p>
                                )}
                                {item.audit_vulnerability.documentation_that_contradicts && (
                                  <p className="text-red-900"><strong>Auditor Would Cite:</strong> "{item.audit_vulnerability.documentation_that_contradicts}"</p>
                                )}
                              </div>
                            )}
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
                              <p className="text-xs text-yellow-700 font-medium mb-2">🔧 Recommended Action:</p>
                              <p className="text-yellow-900 font-medium">{item.recommended_action || item.recommendation}</p>
                            </div>
                            {(item.if_keeping_score || item.if_lowering_score) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {item.if_keeping_score && (
                                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                    <p className="text-xs text-blue-700 font-medium">If Keeping Score:</p>
                                    <p className="text-blue-900 text-xs">{item.if_keeping_score}</p>
                                  </div>
                                )}
                                {item.if_lowering_score && (
                                  <div className="bg-green-50 p-2 rounded border border-green-200">
                                    <p className="text-xs text-green-700 font-medium">If Lowering Score:</p>
                                    <p className="text-green-900 text-xs">{item.if_lowering_score}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="overscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'overscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Critical Missing Items */}
              {oasisResults.critical_missing && oasisResults.critical_missing.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-red-50 p-4 rounded-lg border-2 border-red-200"
                    onClick={() => toggleCategory('critical')}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <div>
                        <h4 className="font-bold text-red-900 text-lg">
                          Critical Missing OASIS Items ({oasisResults.critical_missing.length})
                        </h4>
                        <p className="text-xs text-red-700">These items are REQUIRED for submission and reimbursement</p>
                      </div>
                    </div>
                    {expandedCategories.includes('critical') ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {expandedCategories.includes('critical') && (
                    <div className="space-y-3">
                      {oasisResults.critical_missing.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                                    {item.category}
                                  </Badge>
                                  <Badge className={`${getImpactBadge(item.reimbursement_impact)} text-white text-xs`}>
                                    {item.reimbursement_impact?.toUpperCase()} IMPACT
                                  </Badge>
                                </div>
                                <p className="text-sm text-red-800 mb-2">
                                  <strong>Why Critical:</strong> {item.why_critical}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-red-200">
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                <Info className="w-3 h-3 inline mr-1" />
                                Documentation Guidance:
                              </p>
                              <p className="text-sm text-slate-900">{item.documentation_guidance}</p>
                            </div>

                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-1">
                                ✓ Example of Compliant Documentation:
                              </p>
                              <p className="text-sm text-green-900 italic">"{item.example}"</p>
                            </div>

                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="missing_item"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'missing_item')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.estimated_revenue_impact}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Incomplete Assessments */}
              {oasisResults.incomplete_assessments && oasisResults.incomplete_assessments.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200"
                    onClick={() => toggleCategory('incomplete')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      <div>
                        <h4 className="font-bold text-yellow-900 text-lg">
                          Incomplete Assessments ({oasisResults.incomplete_assessments.length})
                        </h4>
                        <p className="text-xs text-yellow-700">These items need more specific detail</p>
                      </div>
                    </div>
                    {expandedCategories.includes('incomplete') ? (
                      <ChevronUp className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  {expandedCategories.includes('incomplete') && (
                    <div className="space-y-3">
                      {oasisResults.incomplete_assessments.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                          <CardContent className="p-4 space-y-2">
                            <h5 className="font-semibold text-yellow-900">{item.oasis_item}</h5>
                            
                            {item.current_documentation && (
                              <div className="bg-white p-2 rounded border border-yellow-200">
                                <p className="text-xs text-slate-600">Current documentation:</p>
                                <p className="text-sm text-slate-900 italic">"{item.current_documentation}"</p>
                              </div>
                            )}

                            <div className="bg-red-50 p-2 rounded border border-red-200">
                              <p className="text-xs text-red-900">
                                <strong>Issue:</strong> {item.issue}
                              </p>
                            </div>

                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <p className="text-xs text-blue-900">
                                <strong>Guidance:</strong> {item.guidance}
                              </p>
                            </div>

                            {item.example && (
                              <div className="bg-green-50 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-900">
                                  <strong>Better:</strong> "{item.example}"
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Vague Documentation */}
              {oasisResults.vague_documentation && oasisResults.vague_documentation.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-amber-50 p-4 rounded-lg border-2 border-amber-200"
                    onClick={() => toggleCategory('vague')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-lg">
                          📝 Vague Documentation ({oasisResults.vague_documentation.length})
                        </h4>
                        <p className="text-xs text-amber-700">Language not specific enough for defensible OASIS scoring</p>
                      </div>
                    </div>
                    {expandedCategories.includes('vague') ? (
                      <ChevronUp className="w-5 h-5 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-amber-600" />
                    )}
                  </div>

                  {expandedCategories.includes('vague') && (
                    <div className="space-y-3">
                      {oasisResults.vague_documentation.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-amber-500 bg-amber-50">
                          <CardContent className="p-4 space-y-3">
                            <h5 className="font-bold text-amber-900">{item.oasis_item}</h5>
                            
                            <div className="bg-red-100 p-2 rounded border border-red-200 text-sm">
                              <p className="text-xs text-red-700 font-medium">❌ Current Vague Language:</p>
                              <p className="text-red-900 italic">"{item.current_language}"</p>
                            </div>

                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-slate-600 font-medium">Problem:</p>
                              <p className="text-slate-900">{item.problem}</p>
                            </div>

                            {item.cms_requirement && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                                <p className="text-xs text-blue-700 font-medium">📋 CMS Requirement:</p>
                                <p className="text-blue-900">{item.cms_requirement}</p>
                              </div>
                            )}

                            {item.defensibility_issue && (
                              <div className="bg-orange-100 p-2 rounded border border-orange-200 text-sm">
                                <p className="text-xs text-orange-700 font-medium">⚠️ Defensibility Issue:</p>
                                <p className="text-orange-900">{item.defensibility_issue}</p>
                              </div>
                            )}

                            {item.score_range_ambiguity && (
                              <div className="bg-purple-50 p-2 rounded border border-purple-200 text-sm">
                                <p className="text-xs text-purple-700 font-medium">🎯 Score Ambiguity:</p>
                                <p className="text-purple-900">{item.score_range_ambiguity}</p>
                              </div>
                            )}

                            {item.key_elements_to_add && item.key_elements_to_add.length > 0 && (
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-sm">
                                <p className="text-xs text-yellow-700 font-medium">✚ Key Elements to Add:</p>
                                <ul className="list-disc list-inside text-yellow-900 text-xs mt-1">
                                  {item.key_elements_to_add.map((el, idx) => (
                                    <li key={idx}>{el}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="bg-green-100 p-3 rounded border border-green-200 text-sm">
                              <p className="text-xs text-green-700 font-medium">✓ Improved Language:</p>
                              <p className="text-green-900 italic">"{item.improved_language}"</p>
                            </div>

                            {(item.example_for_higher_score || item.example_for_lower_score) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {item.example_for_higher_score && (
                                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                                    <p className="text-xs text-emerald-700 font-medium">For Higher Score:</p>
                                    <p className="text-emerald-900 text-xs italic">"{item.example_for_higher_score}"</p>
                                  </div>
                                )}
                                {item.example_for_lower_score && (
                                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                    <p className="text-xs text-slate-600 font-medium">For Lower Score:</p>
                                    <p className="text-slate-800 text-xs italic">"{item.example_for_lower_score}"</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleQuickFix(item.cms_requirement || item.problem, item.improved_language)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Insert Improved Language
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Inconsistencies */}
              {oasisResults.inconsistencies && oasisResults.inconsistencies.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-orange-50 p-4 rounded-lg border-2 border-orange-200"
                    onClick={() => toggleCategory('inconsistencies')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="font-bold text-orange-900 text-lg">
                          Inconsistencies Found ({oasisResults.inconsistencies.length})
                        </h4>
                        <p className="text-xs text-orange-700">Conflicting information that needs resolution</p>
                      </div>
                    </div>
                    {expandedCategories.includes('inconsistencies') ? (
                      <ChevronUp className="w-5 h-5 text-orange-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-orange-600" />
                    )}
                  </div>

                  {expandedCategories.includes('inconsistencies') && (
                    <div className="space-y-3">
                      {oasisResults.inconsistencies.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h5 className="font-bold text-orange-900">{item.issue}</h5>
                              <div className="flex gap-2">
                                {item.inconsistency_type && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                                    {item.inconsistency_type?.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {item.audit_risk && (
                                  <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : item.audit_risk === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                    {item.audit_risk} risk
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {item.location_1 && (
                                <div className="bg-red-100 p-2 rounded border border-red-200">
                                  <p className="text-xs text-red-700 font-medium">Statement 1:</p>
                                  <p className="text-red-900 italic text-xs">"{item.location_1}"</p>
                                </div>
                              )}
                              {item.location_2 && (
                                <div className="bg-red-100 p-2 rounded border border-red-200">
                                  <p className="text-xs text-red-700 font-medium">Statement 2 (Conflicts):</p>
                                  <p className="text-red-900 italic text-xs">"{item.location_2}"</p>
                                </div>
                              )}
                            </div>
                            
                            {item.oasis_items_affected && item.oasis_items_affected.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-slate-600 mr-1">Affects:</span>
                                {item.oasis_items_affected.map((mi, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-white text-orange-800 border-orange-300 text-xs">
                                    {mi}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {item.why_problematic && (
                              <div className="bg-white p-2 rounded border text-sm">
                                <p className="text-xs text-slate-600 font-medium">Why This Is Problematic:</p>
                                <p className="text-slate-900">{item.why_problematic}</p>
                              </div>
                            )}

                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-sm">
                                <strong>Resolution:</strong> {item.resolution}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compliant Items */}
              {oasisResults.compliant_items && oasisResults.compliant_items.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-green-50 p-4 rounded-lg border-2 border-green-200"
                    onClick={() => toggleCategory('compliant')}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">
                          Compliant OASIS Items ({oasisResults.compliant_items.length})
                        </h4>
                        <p className="text-xs text-green-700">These items are properly documented</p>
                      </div>
                    </div>
                    {expandedCategories.includes('compliant') ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {expandedCategories.includes('compliant') && (
                    <div className="grid grid-cols-2 gap-2">
                      {oasisResults.compliant_items.map((item, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-green-900">{item.oasis_item}</p>
                              <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                              {item.evidence && (
                                <p className="text-xs text-green-700 mt-1 truncate" title={item.evidence}>
                                  "{item.evidence}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {oasisResults.recommendations && oasisResults.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    OASIS Documentation Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="font-bold text-blue-600 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quality Measures Impact */}
              {oasisResults.quality_measures_impact && oasisResults.quality_measures_impact.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quality Measures & Star Rating Impact
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.quality_measures_impact.map((measure, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-purple-900">
                        <span className="font-bold text-purple-600 mt-0.5">★</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                  </div>
                )}

                {/* Audit Defense Summary */}
                {oasisResults.audit_defense_summary && (
                  <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Audit Defense Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {oasisResults.audit_defense_summary.strongest_documentation?.length > 0 && (
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Strongest Documentation
                          </p>
                          <ul className="text-xs text-green-700 space-y-1">
                            {oasisResults.audit_defense_summary.strongest_documentation.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {oasisResults.audit_defense_summary.weakest_documentation?.length > 0 && (
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Weakest Documentation
                          </p>
                          <ul className="text-xs text-red-700 space-y-1">
                            {oasisResults.audit_defense_summary.weakest_documentation.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {oasisResults.audit_defense_summary.recommended_priority_fixes?.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Priority Fixes
                          </p>
                          <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                            {oasisResults.audit_defense_summary.recommended_priority_fixes.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* High-Risk Audit Scenarios */}
                    {oasisResults.audit_defense_summary.weakest_documentation?.length > 0 && (
                      <div className="bg-red-100 p-4 rounded-lg border border-red-300 mb-4">
                        <h5 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          High-Risk Audit Scenarios
                        </h5>
                        <div className="space-y-3">
                          {oasisResults.audit_defense_summary.weakest_documentation.slice(0, 3).map((weakness, idx) => {
                            const auditScenarios = {
                              functional: {
                                interpretation: "Surveyor may determine functional scores are inflated without objective evidence of assistance levels. Terms like 'some help' or 'needs assistance' lack specificity required by CMS.",
                                financialImpact: "$1,500-$3,000 per episode recoupment if functional level downgraded",
                                auditType: "ADR/TPE Review"
                              },
                              bathing: {
                                interpretation: "Without documented shower chair use, grab bar locations, or specific caregiver actions during bathing, surveyor will default to lowest defensible score.",
                                financialImpact: "$200-$500 per episode if M1830 downscored by 2+ points",
                                auditType: "SMRC Targeted Review"
                              },
                              ambulation: {
                                interpretation: "Vague ambulation documentation (e.g., 'walks with difficulty') doesn't specify distance, surface, or device requirements per OASIS definitions.",
                                financialImpact: "$300-$600 per episode for M1860 adjustments",
                                auditType: "RAC Audit"
                              },
                              transfer: {
                                interpretation: "Missing weight-bearing status or transfer technique details make scores indefensible. Surveyor will question any score above 1 without specific assistance documentation.",
                                financialImpact: "$150-$400 per episode recoupment risk",
                                auditType: "ADR Review"
                              },
                              cognitive: {
                                interpretation: "Without BIMS score or specific orientation testing, cognitive impairment claims are unsupported. May affect multiple M-items and care plan justification.",
                                financialImpact: "$500-$1,200 episode impact across affected items",
                                auditType: "Comprehensive Review"
                              },
                              wound: {
                                interpretation: "Incomplete wound measurements or staging documentation violates M1306-M1342 requirements. Surveyor will question clinical group assignment.",
                                financialImpact: "$800-$2,000 clinical group reclassification risk",
                                auditType: "TPE/SMRC Review"
                              },
                              medication: {
                                interpretation: "Missing high-risk drug identification or drug regimen review documentation creates immediate compliance flag.",
                                financialImpact: "$200-$500 per episode + quality measure penalties",
                                auditType: "Quality Review"
                              },
                              homebound: {
                                interpretation: "Insufficient homebound criteria documentation may result in entire episode denial. Must document 2+ criteria with taxing effort details.",
                                financialImpact: "100% episode denial risk ($2,500-$4,000+)",
                                auditType: "Medical Necessity Review"
                              }
                            };
                            
                            const weaknessLower = weakness.toLowerCase();
                            let scenario = auditScenarios.functional;
                            if (weaknessLower.includes('bath') || weaknessLower.includes('shower')) scenario = auditScenarios.bathing;
                            else if (weaknessLower.includes('ambul') || weaknessLower.includes('walk') || weaknessLower.includes('mobil')) scenario = auditScenarios.ambulation;
                            else if (weaknessLower.includes('transfer')) scenario = auditScenarios.transfer;
                            else if (weaknessLower.includes('cogn') || weaknessLower.includes('mental') || weaknessLower.includes('bims')) scenario = auditScenarios.cognitive;
                            else if (weaknessLower.includes('wound') || weaknessLower.includes('ulcer') || weaknessLower.includes('skin')) scenario = auditScenarios.wound;
                            else if (weaknessLower.includes('med') || weaknessLower.includes('drug')) scenario = auditScenarios.medication;
                            else if (weaknessLower.includes('homebound') || weaknessLower.includes('home bound')) scenario = auditScenarios.homebound;

                            return (
                              <div key={idx} className="bg-white p-3 rounded border border-red-200">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-red-900 text-sm">{idx + 1}. {weakness}</p>
                                  <Badge className="bg-red-600 text-white text-xs flex-shrink-0">{scenario.auditType}</Badge>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <p className="text-orange-800">
                                      <strong>🔍 Surveyor Interpretation:</strong> {scenario.interpretation}
                                    </p>
                                  </div>
                                  <div className="bg-red-50 p-2 rounded border border-red-300">
                                    <p className="text-red-900 font-semibold">
                                      <DollarSign className="w-3 h-3 inline mr-1" />
                                      Financial Impact: {scenario.financialImpact}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 bg-red-200 p-2 rounded text-center">
                          <p className="text-red-900 font-bold text-sm">
                            ⚠️ Combined Maximum Risk Exposure: $2,000-$7,000+ per episode
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pre-Audit Checklist */}
                    <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                      <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Pre-Audit Checklist
                        <Badge variant="outline" className="ml-auto bg-blue-200 text-blue-800 text-xs">Complete Before Submission</Badge>
                      </h5>
                      <div className="space-y-2">
                        {(oasisResults.audit_defense_summary.recommended_priority_fixes?.slice(0, 3) || [
                          "Verify all functional scores have specific assistance level documentation",
                          "Confirm homebound status with 2+ documented criteria",
                          "Ensure medication reconciliation and high-risk drug review documented"
                        ]).map((fix, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded border border-blue-200">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-blue-900 font-medium">{fix}</p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    const relatedIssue = oasisResults.critical_missing?.[idx] || 
                                                         oasisResults.vague_documentation?.[idx] ||
                                                         oasisResults.underscoring_opportunities?.[idx];
                                    if (relatedIssue?.example || relatedIssue?.improved_language) {
                                      handleQuickFix(fix, relatedIssue.example || relatedIssue.improved_language);
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Fix
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs text-blue-600"
                                  onClick={() => copyToClipboard(fix, `checklist-${idx}`)}
                                >
                                  {copiedText === `checklist-${idx}` ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 bg-green-100 p-3 rounded border border-green-200">
                        <p className="text-green-800 text-xs">
                          <strong>✓ Audit-Ready Tip:</strong> Completing these 3 items addresses approximately 
                          <strong> 70-80%</strong> of common audit findings. Document changes with timestamps 
                          and clinician signatures for maximum defensibility.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documentation Quality Score */}
                {oasisResults.documentation_quality && (
                  <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      Documentation Quality Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Specificity Score</p>
                        <p className="text-2xl font-bold text-slate-900">{oasisResults.documentation_quality.specificity_score || 'N/A'}</p>
                        <Progress value={oasisResults.documentation_quality.specificity_score || 0} className="h-2 mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Defensibility Score</p>
                        <p className="text-2xl font-bold text-slate-900">{oasisResults.documentation_quality.defensibility_score || 'N/A'}</p>
                        <Progress value={oasisResults.documentation_quality.defensibility_score || 0} className="h-2 mt-1" />
                      </div>
                    </div>
                    {oasisResults.documentation_quality.key_weaknesses?.length > 0 && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Key Weaknesses:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {oasisResults.documentation_quality.key_weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : null}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
            {oasisResults && !oasisResults.ready_for_submission && (
              <Button
                onClick={() => {
                  setShowDialog(false);
                  document.querySelector('textarea')?.focus();
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Fix Issues in Documentation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}