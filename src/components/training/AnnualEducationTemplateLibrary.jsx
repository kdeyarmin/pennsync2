import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Shield, Heart, AlertTriangle, FileText, Users,
  Stethoscope, ShieldCheck, Flame, Bug, Scale, Lock,
  Baby, Siren, Pill, HandHeart, Building, ChevronDown, ChevronUp
} from "lucide-react";

// ───────────────────────────────────────────────────────────
// COMPREHENSIVE REGULATORY ANNUAL IN-SERVICE REQUIREMENTS
// for Home Health and Hospice agencies
// ───────────────────────────────────────────────────────────

const REGULATORY_CATEGORIES = [
  {
    id: "infection_control",
    name: "Infection Control & Prevention",
    icon: Bug,
    color: "bg-red-100 text-red-800 border-red-200",
    iconColor: "text-red-600",
    templates: [
      {
        name: "Annual Infection Control & Prevention",
        topic: "Infection prevention and control practices for home health and hospice staff, including hand hygiene, PPE use, standard precautions, bloodborne pathogen exposure, and cleaning/disinfection of equipment in the home setting",
        regulation: "42 CFR §484.70 / §418.106",
        regulation_detail: "CMS Condition of Participation — Infection Prevention and Control",
        training_category: "safety",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All clinical and non-clinical staff",
      },
      {
        name: "Bloodborne Pathogen Exposure Control",
        topic: "OSHA Bloodborne Pathogens Standard compliance including exposure control plan, hepatitis B vaccination, post-exposure procedures, sharps safety, and proper disposal of regulated waste in home settings",
        regulation: "29 CFR §1910.1030",
        regulation_detail: "OSHA Bloodborne Pathogen Standard",
        training_category: "safety",
        business_line: "all",
        audience_roles: ["clinical staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All staff with occupational exposure risk",
      },
    ]
  },
  {
    id: "hipaa_privacy",
    name: "HIPAA Privacy & Security",
    icon: Lock,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
    templates: [
      {
        name: "HIPAA Privacy & Security Annual Training",
        topic: "HIPAA Privacy Rule and Security Rule compliance for healthcare staff, including protected health information (PHI) handling, minimum necessary standard, patient rights, breach notification, mobile device security, social media policies, and telehealth privacy in home health and hospice settings",
        regulation: "45 CFR §164.530(b)",
        regulation_detail: "HIPAA Privacy Rule — Administrative Requirements for Training",
        training_category: "compliance",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All workforce members",
      },
    ]
  },
  {
    id: "abuse_neglect",
    name: "Abuse, Neglect & Exploitation",
    icon: Shield,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    iconColor: "text-purple-600",
    templates: [
      {
        name: "Recognizing and Reporting Abuse, Neglect & Exploitation",
        topic: "Identification, documentation, and mandatory reporting of patient abuse, neglect, mistreatment, and exploitation in home health and hospice settings, including elder abuse signs, financial exploitation, Pennsylvania mandatory reporting requirements under the Older Adults Protective Services Act, and agency reporting procedures",
        regulation: "42 CFR §484.12(c) / §418.52(c) / PA Act 169",
        regulation_detail: "CMS CoP Compliance & PA Older Adults Protective Services Act",
        training_category: "compliance",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All staff",
      },
    ]
  },
  {
    id: "emergency_preparedness",
    name: "Emergency Preparedness",
    icon: Siren,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    iconColor: "text-orange-600",
    templates: [
      {
        name: "Emergency Preparedness & Disaster Response",
        topic: "Agency emergency preparedness plan, communication plan, continuity of operations, staff roles during emergencies, natural disaster protocols, pandemic response procedures, patient prioritization and evacuation in home settings, and coordination with local emergency management agencies",
        regulation: "42 CFR §484.102 / §418.113",
        regulation_detail: "CMS Emergency Preparedness Requirements for Home Health & Hospice",
        training_category: "safety",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 20,
        required_for: "All staff",
      },
    ]
  },
  {
    id: "patient_rights",
    name: "Patient Rights & Advance Directives",
    icon: Scale,
    color: "bg-teal-100 text-teal-800 border-teal-200",
    iconColor: "text-teal-600",
    templates: [
      {
        name: "Patient Rights, Responsibilities & Advance Directives",
        topic: "Patient Bill of Rights for home health and hospice patients, informed consent, advance directives (living wills, healthcare power of attorney, POLST/POST forms), DNR orders, right to refuse treatment, grievance procedures, cultural and spiritual sensitivity, and privacy rights under Pennsylvania law",
        regulation: "42 CFR §484.50 / §418.52",
        regulation_detail: "CMS Condition of Participation — Patient Rights",
        training_category: "compliance",
        business_line: "all",
        audience_roles: ["clinical staff", "intake staff"],
        frequency: "Annual",
        typical_duration: 25,
        required_for: "All patient-facing staff",
      },
    ]
  },
  {
    id: "osha_safety",
    name: "Workplace Safety (OSHA)",
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconColor: "text-yellow-600",
    templates: [
      {
        name: "Workplace Safety & Hazard Communication",
        topic: "OSHA Hazard Communication Standard (HazCom/GHS), Safety Data Sheets, workplace violence prevention in home settings, ergonomics and body mechanics for patient handling, personal safety during home visits, driving safety, and injury/incident reporting procedures",
        regulation: "29 CFR §1910.1200 / General Duty Clause",
        regulation_detail: "OSHA Hazard Communication Standard & General Duty Clause",
        training_category: "safety",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 25,
        required_for: "All staff",
      },
      {
        name: "Fire Safety & Life Safety in the Home",
        topic: "Fire prevention in the home setting, oxygen safety, space heater hazards, fire extinguisher use, evacuation of homebound patients, emergency exit planning for patients with limited mobility, and documentation of home safety assessments",
        regulation: "29 CFR §1910.38 / §1910.157",
        regulation_detail: "OSHA Emergency Action Plans & Fire Protection",
        training_category: "safety",
        business_line: "all",
        audience_roles: ["clinical staff"],
        frequency: "Annual",
        typical_duration: 15,
        required_for: "All field staff",
      },
    ]
  },
  {
    id: "hospice_specific",
    name: "Hospice-Specific Requirements",
    icon: Heart,
    color: "bg-pink-100 text-pink-800 border-pink-200",
    iconColor: "text-pink-600",
    templates: [
      {
        name: "Hospice Philosophy, Levels of Care & Eligibility",
        topic: "Hospice philosophy and interdisciplinary team approach, four levels of hospice care (routine, continuous, inpatient respite, general inpatient), hospice eligibility criteria, 6-month prognosis certification, recertification requirements, revocation and discharge, and the role of the hospice medical director",
        regulation: "42 CFR §418.22 / §418.52 / §418.54",
        regulation_detail: "CMS Hospice Conditions of Participation",
        training_category: "hospice",
        business_line: "hospice",
        audience_roles: ["all hospice staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All hospice staff",
      },
      {
        name: "Pain Management & Symptom Control in Hospice",
        topic: "Comprehensive pain assessment and management in hospice, opioid prescribing and monitoring, non-pharmacological pain interventions, symptom management for dyspnea, nausea, anxiety, and agitation, comfort care at end of life, and documentation of pain and symptom management interventions",
        regulation: "42 CFR §418.54(c) / §418.106",
        regulation_detail: "CMS Hospice CoP — Initial and Comprehensive Assessment & Clinical Records",
        training_category: "hospice",
        business_line: "hospice",
        audience_roles: ["RN", "LPN", "hospice aide"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All hospice clinical staff",
      },
      {
        name: "Hospice Aide Competency & Supervision",
        topic: "Hospice aide training requirements, 12-hour annual in-service requirement, competency evaluation procedures, aide care plan and task documentation, supervisory visit requirements (every 14 days), patient satisfaction assessment during supervisory visits, and scope of services hospice aides may provide",
        regulation: "42 CFR §418.76",
        regulation_detail: "CMS Hospice CoP — Condition of Participation: Hospice Aide and Homemaker Services",
        training_category: "hospice",
        business_line: "hospice",
        audience_roles: ["hospice aide", "home health aide"],
        frequency: "Annual (12 hours)",
        typical_duration: 60,
        required_for: "Hospice aides",
      },
    ]
  },
  {
    id: "home_health_specific",
    name: "Home Health-Specific Requirements",
    icon: Building,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    iconColor: "text-indigo-600",
    templates: [
      {
        name: "Home Health Aide Competency & In-Service",
        topic: "Home health aide training requirements, 12-hour annual in-service requirement, competency evaluation for each aide skill, supervisory visit requirements (every 14 days by RN, every 60 days if PT/OT/SLP primary), aide care plan implementation, scope of home health aide services, and documentation requirements",
        regulation: "42 CFR §484.80",
        regulation_detail: "CMS Home Health CoP — Condition of Participation: Home Health Aide Services",
        training_category: "home_health",
        business_line: "home_health",
        audience_roles: ["home health aide"],
        frequency: "Annual (12 hours)",
        typical_duration: 60,
        required_for: "Home health aides",
      },
      {
        name: "OASIS Documentation & Assessment",
        topic: "OASIS-E2 assessment requirements, comprehensive assessment timing and completion, clinical documentation to support OASIS responses, start of care and resumption of care assessments, transfer and discharge assessments, quality measure impact, and common OASIS documentation errors",
        regulation: "42 CFR §484.55 / §484.250",
        regulation_detail: "CMS Home Health CoP — Comprehensive Assessment & OASIS Data Collection",
        training_category: "documentation",
        business_line: "home_health",
        audience_roles: ["RN", "PT", "OT", "SLP"],
        frequency: "Annual",
        typical_duration: 45,
        required_for: "All clinicians completing OASIS assessments",
      },
      {
        name: "Homebound Status Documentation",
        topic: "Medicare homebound eligibility criteria, documenting homebound status at each visit, absences from home that do not affect homebound status, examples of adequate and inadequate homebound documentation, and the connection between homebound status and claim denials",
        regulation: "42 CFR §409.42",
        regulation_detail: "CMS Medicare Benefit Policy Manual — Homebound Requirement",
        training_category: "documentation",
        business_line: "home_health",
        audience_roles: ["RN", "PT", "OT", "SLP", "MSW"],
        frequency: "Annual",
        typical_duration: 20,
        required_for: "All clinicians documenting visits",
      },
    ]
  },
  {
    id: "medication_safety",
    name: "Medication Safety",
    icon: Pill,
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    iconColor: "text-cyan-600",
    templates: [
      {
        name: "Medication Management & Safety",
        topic: "Safe medication administration, storage, and disposal in the home setting, medication reconciliation procedures, high-alert medications, look-alike/sound-alike drugs, controlled substance management, patient and caregiver medication education, and documentation of medication administration",
        regulation: "42 CFR §484.60(b) / §418.106(a)",
        regulation_detail: "CMS CoP — Care Planning & Drug Therapy",
        training_category: "clinical",
        business_line: "all",
        audience_roles: ["RN", "LPN"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "Licensed nursing staff",
      },
    ]
  },
  {
    id: "cultural_sensitivity",
    name: "Cultural Competency & Sensitivity",
    icon: HandHeart,
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600",
    templates: [
      {
        name: "Cultural Competency & Health Equity",
        topic: "Culturally sensitive care delivery, health literacy assessment, language access services and interpreter use, implicit bias awareness, health disparities in home health and hospice populations, LGBTQ+ inclusive care, religious and spiritual care preferences, and documentation of cultural and spiritual assessments",
        regulation: "42 CFR §484.50(a) / §418.52(a)",
        regulation_detail: "CMS CoP — Patient Rights (nondiscrimination, cultural sensitivity)",
        training_category: "compliance",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 20,
        required_for: "All patient-facing staff",
      },
    ]
  },
  {
    id: "compliance_ethics",
    name: "Corporate Compliance & Ethics",
    icon: ShieldCheck,
    color: "bg-slate-100 text-slate-800 border-slate-200",
    iconColor: "text-slate-600",
    templates: [
      {
        name: "Corporate Compliance, Fraud & Abuse Prevention",
        topic: "Agency compliance program overview, False Claims Act, Anti-Kickback Statute, Stark Law, OIG compliance guidance for home health and hospice, whistleblower protections, duty to report suspected fraud, proper documentation to support claims, and common billing compliance risks in home health and hospice",
        regulation: "OIG Compliance Guidance / 31 USC §3729-3733",
        regulation_detail: "OIG Compliance Program Guidance & Federal False Claims Act",
        training_category: "compliance",
        business_line: "all",
        audience_roles: ["all staff"],
        frequency: "Annual",
        typical_duration: 25,
        required_for: "All staff",
      },
    ]
  },
  {
    id: "documentation_standards",
    name: "Clinical Documentation Standards",
    icon: FileText,
    color: "bg-violet-100 text-violet-800 border-violet-200",
    iconColor: "text-violet-600",
    templates: [
      {
        name: "Clinical Documentation Standards & Best Practices",
        topic: "Clinical documentation requirements for home health and hospice, skilled nursing documentation, therapy documentation, visit note requirements, physician order management, verbal order procedures, plan of care documentation, coordination of care documentation, and documentation to support medical necessity",
        regulation: "42 CFR §484.110 / §418.104",
        regulation_detail: "CMS CoP — Clinical Records",
        training_category: "documentation",
        business_line: "all",
        audience_roles: ["clinical staff"],
        frequency: "Annual",
        typical_duration: 30,
        required_for: "All clinical staff",
      },
    ]
  },
];

export default function AnnualEducationTemplateLibrary({ onUseTemplate }) {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [businessLineFilter, setBusLineFilter] = useState("all");

  const filteredCategories = REGULATORY_CATEGORIES.map(cat => ({
    ...cat,
    templates: cat.templates.filter(t => {
      const matchesSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.topic.toLowerCase().includes(search.toLowerCase()) ||
        t.regulation.toLowerCase().includes(search.toLowerCase());
      const matchesBL = businessLineFilter === "all" ||
        t.business_line === "all" ||
        t.business_line === businessLineFilter;
      return matchesSearch && matchesBL;
    })
  })).filter(cat => cat.templates.length > 0);

  const totalTemplates = REGULATORY_CATEGORIES.reduce((sum, c) => sum + c.templates.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Regulatory In-Service Template Library</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {totalTemplates} pre-built templates mapped to CMS, OSHA, HIPAA, and state regulations
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBusLineFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${businessLineFilter === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >All</button>
              <button
                onClick={() => setBusLineFilter("home_health")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${businessLineFilter === "home_health" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >Home Health</button>
              <button
                onClick={() => setBusLineFilter("hospice")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${businessLineFilter === "hospice" ? "bg-pink-600 text-white border-pink-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >Hospice</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by topic, regulation code, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filteredCategories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCategory === category.id;
        return (
          <Card key={category.id} className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category.color}`}>
                  <Icon className={`w-5 h-5 ${category.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{category.name}</h3>
                  <p className="text-xs text-slate-500">{category.templates.length} template{category.templates.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-3">
                {category.templates.map((template, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900">{template.name}</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{template.topic.substring(0, 150)}...</p>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {template.business_line === 'all' ? 'All' : template.business_line === 'home_health' ? 'HH' : 'Hospice'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">{template.regulation}</Badge>
                      <span className="text-slate-500">{template.frequency}</span>
                      <span className="text-slate-500">{template.typical_duration} min</span>
                      <span className="text-slate-500">{template.required_for}</span>
                    </div>
                    <p className="text-xs text-slate-400">{template.regulation_detail}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onUseTemplate?.({
                        ...template,
                        lesson_length: template.typical_duration,
                        purpose_of_training: `${template.frequency} required training per ${template.regulation_detail}. ${template.required_for}.`,
                        custom_instructions: `This is a regulatory-required annual in-service. Map content to ${template.regulation}. Include specific examples relevant to ${template.business_line === 'all' ? 'home health and hospice' : template.business_line} settings in Pennsylvania.`
                      })}
                    >
                      Generate This In-Service
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No templates match your search. Try different keywords.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
