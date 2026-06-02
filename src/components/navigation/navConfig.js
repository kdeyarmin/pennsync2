import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Mail, BookUser, Video,
  HelpCircle, AlertTriangle, BookOpen, WifiOff, Heart, Activity,
  Phone, FileSignature, ShieldCheck, DollarSign, Award, ClipboardCheck,
  TrendingUp, LifeBuoy, FileCheck, Stethoscope, ScrollText, CheckCircle2,
} from "lucide-react";

/**
 * navConfig — the single source of truth for navigation metadata.
 *
 * Every routed page (see src/App.jsx) appears here exactly once with its
 * canonical `label`, `icon`, `category`, and search `keywords`. The desktop
 * sidebar, the command palette, and the breadcrumbs all read from this manifest
 * so they can never drift apart (mismatched labels/icons or, worse, links to a
 * page that isn't routed). To add a page to navigation, add it here and route it
 * in App.jsx — nothing else to keep in sync.
 *
 * `label`/`icon` for pages that also appear in the sidebar match the sidebar's
 * curated values so the primary nav looks identical; the palette/breadcrumbs
 * simply adopt those. Pages in the "Admin" category are shown in the palette to
 * admins only (each page also enforces its own access control).
 */
export const NAV_PAGES = [
  // Overview
  { page: "Dashboard", label: "Dashboard", icon: Home, category: "Overview", keywords: ["home", "main", "overview", "start"] },

  // Patient Care
  { page: "Patients", label: "Patients", icon: Users, category: "Patient Care", keywords: ["roster", "directory", "list", "census"] },
  { page: "PatientDetails", label: "Patient Details", icon: Users, category: "Patient Care", keywords: ["record", "profile"] },
  { page: "ClinicalChart", label: "Clinical Chart", icon: Activity, category: "Patient Care", keywords: ["chart", "clinical", "patient chart"] },
  { page: "CarePlanManagement", label: "Care Plans", icon: Target, category: "Patient Care", keywords: ["care plan", "goals", "485"] },
  { page: "PatientAlerts", label: "Patient Alerts", icon: AlertTriangle, category: "Patient Care", keywords: ["alerts", "risk", "warnings"] },
  { page: "Incidents", label: "Incidents", icon: AlertTriangle, category: "Patient Care", keywords: ["incident", "report", "safety", "event"] },
  { page: "PatientEducationHub", label: "Patient Education", icon: Heart, category: "Patient Care", keywords: ["patient education", "handout", "teaching"] },

  // OASIS
  { page: "SmartOASISAssessment", label: "OASIS Assessment", icon: Brain, category: "OASIS", keywords: ["oasis", "assessment", "start of care", "soc"] },
  { page: "OASISAnalyzer", label: "OASIS Analyzer", icon: Brain, category: "OASIS", keywords: ["oasis", "analyze", "scrubber", "coding"] },
  { page: "OASISComplianceReview", label: "OASIS Compliance Review", icon: ClipboardCheck, category: "OASIS", keywords: ["oasis", "compliance", "review", "qa"] },
  { page: "OASISDocumentationReview", label: "OASIS Documentation Review", icon: FileCheck, category: "OASIS", keywords: ["oasis", "documentation", "review"] },
  { page: "OASISRevenueAnalysis", label: "OASIS Revenue Analysis", icon: DollarSign, category: "OASIS", keywords: ["oasis", "revenue", "pdgm", "reimbursement"] },

  // Documentation
  { page: "SmartNoteAssistant", label: "Smart Note Assistant", icon: Brain, category: "Documentation", keywords: ["smart note", "clinical note", "documentation", "ai"] },
  { page: "ClinicalDocumentation", label: "Clinical Notes", icon: Brain, category: "Documentation", keywords: ["clinical", "documentation", "notes"] },
  { page: "VisitScribe", label: "Visit Scribe", icon: Stethoscope, category: "Documentation", keywords: ["scribe", "dictation", "voice", "ambient"] },
  { page: "DocumentVisit", label: "Document Visit", icon: FileText, category: "Documentation", keywords: ["document visit", "visit note", "charting"] },
  { page: "EventReport", label: "Event Report", icon: FileText, category: "Documentation", keywords: ["event", "report", "incident report"] },
  { page: "IncidentReporting", label: "Incident Reporting", icon: AlertTriangle, category: "Documentation", keywords: ["incident", "reporting", "occurrence"] },
  { page: "ReferralIntake", label: "Referrals", icon: FileText, category: "Documentation", keywords: ["referral", "intake", "admission", "new patient"] },

  // Documents & Signatures
  { page: "DocumentHub", label: "Documents", icon: FileText, category: "Documents", keywords: ["documents", "files", "hub"] },
  { page: "DocumentSignatures", label: "Document Signatures", icon: FileSignature, category: "Documents", keywords: ["signatures", "sign", "esign"] },
  { page: "CreateSignatureRequest", label: "Create Signature Request", icon: FileSignature, category: "Documents", keywords: ["request signature", "send for signature"] },
  { page: "BulkSignatureRequests", label: "Bulk Signature Requests", icon: FileSignature, category: "Documents", keywords: ["bulk", "batch", "signatures"] },
  { page: "TemplateManagement", label: "Template Management", icon: ScrollText, category: "Documents", keywords: ["templates", "forms", "document templates"] },
  { page: "DocumentAuditLogs", label: "Document Audit Logs", icon: FileCheck, category: "Documents", keywords: ["audit", "logs", "history", "document trail"] },

  // Communication
  { page: "Messages", label: "Messages", icon: Mail, category: "Communication", keywords: ["messages", "inbox", "chat"] },
  { page: "PhoneCenter", label: "Phone Center", icon: Phone, category: "Communication", keywords: ["phone", "calls", "sms", "text", "voice"] },
  { page: "SendFax", label: "Fax", icon: BookUser, category: "Communication", keywords: ["fax", "send fax"] },
  { page: "FaxAnalytics", label: "Fax Analytics", icon: BarChart3, category: "Communication", keywords: ["fax", "analytics", "fax logs"] },
  { page: "PhysicianDirectory", label: "Providers", icon: Users, category: "Communication", keywords: ["physician", "provider", "doctor", "directory"] },
  { page: "Telehealth", label: "Telehealth", icon: Video, category: "Communication", keywords: ["telehealth", "video", "call", "virtual visit"] },

  // Compliance & Quality
  { page: "ComplianceCenter", label: "Compliance Center", icon: Shield, category: "Compliance", keywords: ["compliance", "audit", "quality", "metrics"] },
  { page: "ComplianceDashboard", label: "Compliance Dashboard", icon: ShieldCheck, category: "Compliance", keywords: ["compliance", "dashboard", "overview"] },
  { page: "RegulatoryCompliance", label: "Regulatory Compliance", icon: ClipboardList, category: "Compliance", keywords: ["regulatory", "cms", "state requirements"] },
  { page: "QualityDashboard", label: "Quality Dashboard", icon: TrendingUp, category: "Compliance", keywords: ["quality", "qapi", "outcomes", "metrics"] },
  { page: "SecurityCompliance", label: "Security", icon: Shield, category: "Compliance", keywords: ["security", "hipaa", "privacy"] },
  { page: "AIComplianceInServices", label: "AI Compliance In-Services", icon: GraduationCap, category: "Compliance", keywords: ["in-service", "ai compliance", "training compliance"] },

  // Analytics & Reports
  { page: "ReportsAnalytics", label: "Reports & Analytics", icon: BarChart3, category: "Analytics", keywords: ["reports", "analytics", "metrics", "export", "data"] },
  { page: "Reports", label: "Reports", icon: BarChart3, category: "Analytics", keywords: ["reports", "report builder"] },
  { page: "NursePerformanceDashboard", label: "Nurse Performance", icon: TrendingUp, category: "Analytics", keywords: ["nurse performance", "productivity", "scorecard"] },
  { page: "ManagerSkillGapDashboard", label: "Skill Gap Dashboard", icon: BarChart3, category: "Analytics", keywords: ["skill gap", "manager", "competency analytics"] },

  // Learning & Training
  { page: "LearningCenter", label: "Learning Center", icon: GraduationCap, category: "Learning", keywords: ["learning", "courses", "catalog", "browse"] },
  { page: "MyLearning", label: "My Courses", icon: BookOpen, category: "Learning", keywords: ["my courses", "progress", "education"] },
  { page: "MyTraining", label: "My Training", icon: GraduationCap, category: "Learning", keywords: ["my training", "assignments"] },
  { page: "NurseTraining", label: "Nurse Training", icon: Stethoscope, category: "Learning", keywords: ["nurse training", "clinical training"] },
  { page: "ClinicalSkillsChecklist", label: "Skills Checklists", icon: CheckCircle2, category: "Learning", keywords: ["skills", "checklist", "competency"] },
  { page: "TrainingCoursePlayer", label: "Training Course Player", icon: Video, category: "Learning", keywords: ["course", "player", "lesson", "module"] },
  { page: "StaffTrainingHub", label: "Staff Training Hub", icon: GraduationCap, category: "Learning", keywords: ["staff training", "hub"] },
  { page: "AnnualMandatoryEducation", label: "Annual Mandatory Education", icon: Award, category: "Learning", keywords: ["annual", "mandatory", "education", "compliance training"] },
  { page: "MyAnnualEducation", label: "My Annual Education", icon: Award, category: "Learning", keywords: ["my annual education", "yearly"] },
  { page: "AnnualEducationTranscript", label: "Annual Education Transcript", icon: ScrollText, category: "Learning", keywords: ["transcript", "annual education record"] },
  { page: "EmployeeTranscript", label: "Employee Transcript", icon: ScrollText, category: "Learning", keywords: ["employee transcript", "training record"] },

  // Admin (palette: admins only)
  { page: "AdminOperations", label: "Operations Center", icon: BarChart3, category: "Admin", keywords: ["admin", "operations", "manage", "operations center"] },
  { page: "AdminDashboard", label: "Admin Dashboard", icon: BarChart3, category: "Admin", keywords: ["admin", "dashboard", "overview"] },
  { page: "AdminTraining", label: "Training Manager", icon: GraduationCap, category: "Admin", keywords: ["training manager", "assign training"] },
  { page: "ClinicalPathwayManager", label: "Clinical Pathways", icon: ClipboardList, category: "Admin", keywords: ["pathways", "clinical pathways", "protocols"] },
  { page: "UserManagement", label: "Users", icon: Users, category: "Admin", keywords: ["users", "accounts", "roles", "permissions"] },
  { page: "PatientDataManagement", label: "Data Management", icon: Users, category: "Admin", keywords: ["data", "management", "import", "duplicates"] },

  // Tools & Resources
  { page: "ResourceLibrary", label: "Library", icon: BookOpen, category: "Tools", keywords: ["library", "resources", "guidelines"] },
  { page: "OfflineMode", label: "Offline Mode", icon: WifiOff, category: "Tools", keywords: ["offline", "sync"] },
  { page: "Help", label: "Help", icon: HelpCircle, category: "Tools", keywords: ["help", "guide", "manual"] },
  { page: "Support", label: "Support", icon: LifeBuoy, category: "Tools", keywords: ["support", "contact", "ticket", "faq"] },

  // Settings
  { page: "UserSettings", label: "Settings", icon: Settings, category: "Settings", keywords: ["settings", "preferences", "profile", "notifications"] },
];

const NAV_PAGE_BY_NAME = NAV_PAGES.reduce((map, entry) => {
  map[entry.page] = entry;
  return map;
}, {});

/** Convert a PascalCase page name to a human-readable label (fallback only). */
export function formatPageName(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/O A S I S/g, "OASIS")
    .replace(/P D F/g, "PDF")
    .replace(/A I /g, "AI ")
    .replace(/I C D/g, "ICD")
    .trim();
}

/**
 * Resolve a page's nav metadata. Returns the manifest entry when the page is
 * registered, otherwise a sensible derived fallback so unregistered pages still
 * render a readable label.
 */
export function getPageMeta(page) {
  return (
    NAV_PAGE_BY_NAME[page] || {
      page,
      label: formatPageName(page),
      icon: FileText,
      category: "",
      keywords: [],
    }
  );
}
