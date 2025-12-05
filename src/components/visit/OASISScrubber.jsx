import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  FileText,
  Loader2
} from "lucide-react";
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

      // Helper function to extract matching phrases with context
      const extractPhrases = (text, pattern) => {
        if (!text) return [];
        const matches = text.match(pattern) || [];
        return matches.map(m => m.trim()).filter(m => m.length > 5);
      };

      // Helper to get sentence containing match
      const getSentencesContaining = (text, pattern) => {
        if (!text) return [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences
          .filter(s => pattern.test(s))
          .map(s => s.trim() + '.')
          .slice(0, 5); // Limit to 5 most relevant
      };

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
    "clinical_group": "MMTA category based on primary diagnosis",
    "clinical_group_confidence": "high|medium|low",
    "functional_level": "low|medium|high",
    "functional_points_calculated": "exact number 0-30",
    "comorbidity_adjustment": "none|low|high",
    "comorbidity_count": "number of qualifying comorbidities found",
    "estimated_case_mix_weight": "X.XXXX",
    "optimization_potential": "$XXX-$XXX per episode",
    "calculation_notes": "explanation of how PDGM was determined"
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

  const handleSuggestionReject = (reason) => {
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
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getImpactBadge = (impact) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[impact] || 'bg-gray-500';
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
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  OASIS Compliance Scrubber
                  {isOASISVisit && (
                    <Badge className="bg-blue-600">OASIS Visit</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
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
                <p className="text-lg font-semibold text-gray-900">Analyzing OASIS Compliance...</p>
                <p className="text-sm text-gray-600 mt-2">
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
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="results" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  Results
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
                        <h4 className="font-semibold text-gray-900 mb-2">Applied Suggestions:</h4>
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
                <div className="space-y-6 py-4">
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
                      <p className="text-sm text-gray-600">
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
              </div>

              {/* Overall Score Card */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Completeness: {oasisResults.completeness_percentage}%
                    </h3>
                    <p className="text-sm text-gray-600">OASIS data elements documented</p>
                    <Progress value={oasisResults.completeness_percentage} className="h-3 mt-2" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Quality Score: {oasisResults.overall_score}/100
                    </h3>
                    <p className="text-sm text-gray-600">Documentation quality rating</p>
                    <Progress value={oasisResults.overall_score} className="h-3 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reimbursement Risk</p>
                    <Badge className={getRiskColor(oasisResults.reimbursement_risk_level)}>
                      {oasisResults.reimbursement_risk_level?.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Submission Status</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Clinical Group</p>
                        <p className="font-semibold text-gray-900">{oasisResults.pdgm_analysis.clinical_group}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Functional Level</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.functional_level === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.functional_level === 'medium' ? 'text-yellow-700' : 'text-red-700'
                        }`}>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Comorbidity Adj.</p>
                        <p className="font-semibold text-gray-900">{oasisResults.pdgm_analysis.comorbidity_adjustment}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Case-Mix Weight</p>
                        <p className="font-semibold text-green-700">{oasisResults.pdgm_analysis.estimated_case_mix_weight}</p>
                      </div>
                    </div>
                    {oasisResults.pdgm_analysis.optimization_potential && (
                      <Alert className="mt-3 bg-green-100 border-green-300">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Optimization Potential:</strong> {oasisResults.pdgm_analysis.optimization_potential}
                        </AlertDescription>
                      </Alert>
                    )}
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
                            'bg-white border-gray-200'
                          }`}>
                            <p className="font-medium text-gray-700">{key.replace('m', 'M').replace(/_/g, ' ')}</p>
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
                              <p className="text-xs text-gray-500">Discrepancy:</p>
                              <p className="text-gray-900">{item.discrepancy}</p>
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
                                <p className="text-xs text-gray-500">Evidence:</p>
                                <p className="text-gray-900 italic">"{item.narrative_evidence}"</p>
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
                        <p className="text-gray-700">{oasisResults.gg_section_analysis.gg0130_self_care_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.gg0170_mobility_summary && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">GG0170 Mobility</p>
                        <p className="text-gray-700">{oasisResults.gg_section_analysis.gg0170_mobility_summary}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.goal_appropriateness && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Discharge Goal Assessment</p>
                        <p className="text-gray-700">{oasisResults.gg_section_analysis.goal_appropriateness}</p>
                      </div>
                    )}
                    {oasisResults.gg_section_analysis.functional_improvement_potential && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Improvement Potential</p>
                        <p className="text-gray-700">{oasisResults.gg_section_analysis.functional_improvement_potential}</p>
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
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-green-900">{item.oasis_item}</h5>
                              <Badge className="bg-green-600">{item.revenue_impact}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-gray-500">Current Score</p>
                                <p className="font-semibold text-gray-700">{item.current_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-300">
                                <p className="text-xs text-green-700">Supported Score</p>
                                <p className="font-semibold text-green-800">{item.supported_score}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-gray-500">Evidence from Narrative:</p>
                              <p className="text-gray-900 italic">"{item.narrative_evidence}"</p>
                            </div>
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
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : 'bg-orange-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Claimed Score</p>
                                <p className="font-semibold text-red-800">{item.claimed_score}</p>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-gray-500">Supported Score</p>
                                <p className="font-semibold text-gray-700">{item.supported_score}</p>
                              </div>
                            </div>
                            <Alert className="bg-white border-red-200">
                              <AlertDescription className="text-red-900 text-sm">
                                <strong>Recommendation:</strong> {item.recommendation}
                              </AlertDescription>
                            </Alert>
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
                              <p className="text-xs font-semibold text-gray-700 mb-1">
                                <Info className="w-3 h-3 inline mr-1" />
                                Documentation Guidance:
                              </p>
                              <p className="text-sm text-gray-900">{item.documentation_guidance}</p>
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
                                <p className="text-xs text-gray-600">Current documentation:</p>
                                <p className="text-sm text-gray-900 italic">"{item.current_documentation}"</p>
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
                    <div className="bg-orange-50 p-4 rounded border border-orange-200 space-y-3">
                      {oasisResults.inconsistencies.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-orange-300">
                          <p className="font-semibold text-orange-900 mb-2">{item.issue}</p>
                          <div className="space-y-1 mb-2">
                            {item.conflicting_info?.map((info, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                • "{info}"
                              </p>
                            ))}
                          </div>
                          <p className="text-sm text-orange-900">
                            <strong>Resolution:</strong> {item.resolution}
                          </p>
                        </div>
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
                </div>
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