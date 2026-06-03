/**
 * nav.manifest.js — Single source of truth for app navigation.
 *
 * Each entry drives three consumers:
 *  1. Sidebar / mobile nav  (Layout.jsx  → navCategories / adminItems)
 *  2. Breadcrumb trails     (Breadcrumbs.jsx)
 *  3. Command palette       (CommandPalette.jsx  — Ctrl/Cmd+K)
 *
 * Schema:
 *  page             – matches a page file in src/pages, routed via src/routes.jsx
 *  label            – human-readable name used in breadcrumbs & palette
 *  navLabel         – shorter sidebar label (falls back to label when omitted)
 *  icon             – Lucide icon component
 *  category         – sidebar section heading; null = not in sidebar
 *  adminOnly        – hide from non-admin users
 *  breadcrumbParent – page key of the logical parent (builds the crumb chain)
 *  keywords         – extra search terms for the command palette
 *  badge            – runtime badge key resolved in Layout: "messages" | "sms" | "notifications"
 *  action           – runtime action key resolved in Layout: "openNotifications"
 *
 * Adding a new page: add ONE entry here — sidebar, breadcrumbs and palette all update.
 */

import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Bell, BookOpen, WifiOff,
  Mail, BookUser, Video, HelpCircle, AlertTriangle, CheckCircle2,
  Phone, Send, Heart, Activity, Layers, Database, Lock, Award,
  Calendar, Clipboard, Download, Eye, Filter, Globe, MessageSquare,
  Monitor, PieChart, Radio, RefreshCw, Search, Star, Stethoscope,
  Tablet, TrendingUp, Upload, UserCheck, Zap, Package, Archive,
  LifeBuoy, Map, Mic, Pen, Printer
} from "lucide-react";

/**
 * The manifest.  Order within the same category determines sidebar order.
 * Non-sidebar pages (category: null) still provide breadcrumb + palette data.
 */
export const NAV_MANIFEST = [
  // ─── Overview ───────────────────────────────────────────────────────────────
  {
    page: "Dashboard",
    label: "Dashboard",
    icon: Home,
    category: "Overview",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["home", "main", "overview", "welcome"],
  },

  // ─── Patient Care ────────────────────────────────────────────────────────────
  {
    page: "Patients",
    label: "Patients",
    icon: Users,
    category: "Patient Care",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["roster", "directory", "list", "census"],
  },
  {
    page: "PatientDetails",
    label: "Patient Details",
    icon: Users,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Patients",
    keywords: ["record", "chart", "profile"],
  },
  {
    page: "ClinicalChart",
    label: "Clinical Chart",
    icon: Activity,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Patients",
    keywords: ["chart", "clinical", "patient chart"],
  },
  {
    page: "PatientAlerts",
    label: "Patient Alerts",
    icon: AlertTriangle,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Patients",
    keywords: ["alert", "warning", "notification"],
  },
  {
    page: "PatientRecordDashboard",
    label: "Patient Record Dashboard",
    icon: Clipboard,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Patients",
    keywords: ["record", "patient dashboard"],
  },
  {
    page: "DuplicatePatients",
    label: "Duplicate Patients",
    icon: Users,
    category: null,
    adminOnly: true,
    breadcrumbParent: "Patients",
    keywords: ["duplicate", "merge", "deduplicate"],
  },
  {
    page: "CarePlanManagement",
    label: "Care Plans",
    icon: Target,
    category: "Patient Care",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["care plan", "goals", "treatment plan"],
  },
  {
    page: "CarePlanBuilder",
    label: "Care Plan Builder",
    icon: Target,
    category: null,
    adminOnly: false,
    breadcrumbParent: "CarePlanManagement",
    keywords: ["care plan", "builder", "create"],
  },
  {
    page: "AutomaticCarePlans",
    label: "Automatic Care Plans",
    icon: Zap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "CarePlanManagement",
    keywords: ["auto care plan", "ai care plan"],
  },
  {
    page: "SmartOASISAssessment",
    label: "OASIS Assessment",
    icon: Brain,
    category: "Patient Care",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["oasis", "assessment", "hha"],
  },
  {
    page: "Incidents",
    label: "Incidents",
    icon: AlertTriangle,
    category: "Patient Care",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["incident", "report", "safety", "event"],
  },
  {
    page: "IncidentReportingModule",
    label: "Incident Module",
    icon: AlertTriangle,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Incidents",
    keywords: ["incident", "module"],
  },
  {
    page: "PatientEducationHub",
    label: "Patient Education",
    icon: Heart,
    category: "Patient Care",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["patient education", "handout", "teaching"],
  },
  {
    page: "PatientEducation",
    label: "Patient Education",
    icon: Heart,
    category: null,
    adminOnly: false,
    breadcrumbParent: "PatientEducationHub",
    keywords: ["patient education"],
  },
  {
    page: "PatientEducationPortal",
    label: "Patient Education Portal",
    icon: Heart,
    category: null,
    adminOnly: false,
    breadcrumbParent: "PatientEducationHub",
    keywords: ["patient portal", "education portal"],
  },
  {
    page: "MedicationReconciliation",
    label: "Medication Reconciliation",
    icon: Package,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Patients",
    keywords: ["medication", "reconciliation", "meds", "drug"],
  },

  // ─── Documentation ───────────────────────────────────────────────────────────
  {
    page: "ClinicalDocumentation",
    label: "Clinical Notes",
    icon: Brain,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["clinical", "documentation", "notes", "charting"],
  },
  {
    page: "SmartNoteAssistant",
    label: "Smart Notes",
    icon: Brain,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["smart note", "ai note", "documentation", "ai"],
  },
  {
    page: "VisitScribe",
    label: "Visit Scribe",
    icon: Mic,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["scribe", "dictation", "voice", "visit"],
  },
  {
    page: "DocumentVisit",
    label: "Document Visit",
    icon: FileText,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["document visit", "visit note"],
  },
  {
    page: "DocumentHub",
    label: "Documents",
    icon: FileText,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["documents", "files", "hub"],
  },
  {
    page: "DocumentManagement",
    label: "Document Management",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["document management", "files"],
  },
  {
    page: "DocumentIngestion",
    label: "Document Ingestion",
    icon: Upload,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["ingest", "import", "upload", "document"],
  },
  {
    page: "DocumentSignatures",
    label: "Document Signatures",
    icon: Pen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["signature", "sign", "document"],
  },
  {
    page: "DocumentAuditLogs",
    label: "Document Audit Logs",
    icon: Archive,
    category: null,
    adminOnly: true,
    breadcrumbParent: "DocumentHub",
    keywords: ["audit", "log", "document history"],
  },
  {
    page: "DischargeSummaries",
    label: "Discharge Summaries",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["discharge", "summary", "transition"],
  },
  {
    page: "EventReport",
    label: "Event Report",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Incidents",
    keywords: ["event", "report", "incident report"],
  },
  {
    page: "MedicalScribe",
    label: "Medical Scribe",
    icon: Mic,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ClinicalDocumentation",
    keywords: ["scribe", "medical", "ai scribe"],
  },
  {
    page: "OfflineVisitDocumentation",
    label: "Offline Visit Documentation",
    icon: WifiOff,
    category: null,
    adminOnly: false,
    breadcrumbParent: "OfflineMode",
    keywords: ["offline", "visit", "documentation"],
  },
  {
    page: "OfflineDocumentation",
    label: "Offline Documentation",
    icon: WifiOff,
    category: null,
    adminOnly: false,
    breadcrumbParent: "OfflineMode",
    keywords: ["offline", "documentation"],
  },
  {
    page: "ReferralAdmissionNote",
    label: "Referral Admission Note",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ReferralIntake",
    keywords: ["referral", "admission", "note"],
  },
  {
    page: "ReferralProcessor",
    label: "Referral Processor",
    icon: RefreshCw,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ReferralIntake",
    keywords: ["referral", "process", "workflow"],
  },
  {
    page: "ReferralTriage",
    label: "Referral Triage",
    icon: Filter,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ReferralIntake",
    keywords: ["referral", "triage", "priority"],
  },
  {
    page: "SignDocument",
    label: "Sign Document",
    icon: Pen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentSignatures",
    keywords: ["sign", "signature"],
  },
  {
    page: "BulkSignatureRequests",
    label: "Bulk Signature Requests",
    icon: Pen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentSignatures",
    keywords: ["bulk", "signature", "request"],
  },
  {
    page: "CreateSignatureRequest",
    label: "Create Signature Request",
    icon: Pen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentSignatures",
    keywords: ["create", "signature", "request"],
  },

  // ─── Referrals ───────────────────────────────────────────────────────────────
  {
    page: "ReferralIntake",
    label: "Referrals",
    icon: FileText,
    category: "Documentation",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["referral", "intake", "admission"],
  },

  // ─── Communication ───────────────────────────────────────────────────────────
  {
    page: "Messages",
    label: "Messages",
    icon: Mail,
    category: "Communication",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["messages", "inbox", "chat", "email"],
    badge: "messages",
  },
  {
    page: "PhoneCenter",
    label: "Phone Center",
    icon: Phone,
    category: "Communication",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["phone", "call", "sms", "text"],
    badge: "sms",
  },
  {
    page: "SendFax",
    label: "Fax",
    icon: Send,
    category: "Communication",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["fax", "send fax"],
  },
  {
    page: "PhysicianDirectory",
    label: "Providers",
    navLabel: "Providers",
    icon: BookUser,
    category: "Communication",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["physician", "provider", "doctor", "directory"],
  },
  {
    page: "Telehealth",
    label: "Telehealth",
    icon: Video,
    category: "Communication",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["telehealth", "video", "call", "virtual visit"],
  },
  {
    page: "FaxDashboard",
    label: "Fax Dashboard",
    icon: Send,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SendFax",
    keywords: ["fax", "dashboard"],
  },
  {
    page: "FaxLogsDashboard",
    label: "Fax Logs",
    icon: Archive,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SendFax",
    keywords: ["fax", "logs", "history"],
  },
  {
    page: "FaxContacts",
    label: "Fax Contacts",
    icon: BookUser,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SendFax",
    keywords: ["fax", "contacts", "address book"],
  },
  {
    page: "FaxAddressBook",
    label: "Fax Address Book",
    icon: BookUser,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SendFax",
    keywords: ["fax", "address book"],
  },
  {
    page: "FaxAnalytics",
    label: "Fax Analytics",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SendFax",
    keywords: ["fax", "analytics", "metrics"],
  },

  // ─── OASIS ───────────────────────────────────────────────────────────────────
  {
    page: "OASISReview",
    label: "OASIS Review",
    icon: ClipboardList,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "review", "assessment"],
  },
  {
    page: "OASISAnalyzer",
    label: "OASIS Analyzer",
    icon: Search,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "analyzer", "analysis"],
  },
  {
    page: "OASISAuditDashboard",
    label: "OASIS Audit",
    icon: Eye,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "audit", "review"],
  },
  {
    page: "OASISClinicalReview",
    label: "OASIS Clinical Review",
    icon: ClipboardList,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "clinical", "review"],
  },
  {
    page: "OASISComplianceReview",
    label: "OASIS Compliance Review",
    icon: Shield,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "compliance", "review"],
  },
  {
    page: "OASISDocumentationReview",
    label: "OASIS Documentation Review",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "documentation", "review"],
  },
  {
    page: "OASISRevenueAnalysis",
    label: "OASIS Revenue Analysis",
    icon: TrendingUp,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "revenue", "analysis", "billing"],
  },
  {
    page: "OASISAnalyticsDashboard",
    label: "OASIS Analytics",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SmartOASISAssessment",
    keywords: ["oasis", "analytics", "dashboard"],
  },

  // ─── PDF / Templates ─────────────────────────────────────────────────────────
  {
    page: "PDFTools",
    label: "PDF Tools",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["pdf", "tools"],
  },
  {
    page: "PDFSearch",
    label: "PDF Search",
    icon: Search,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["pdf", "search"],
  },
  {
    page: "PDFTemplateLibrary",
    label: "PDF Template Library",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["pdf", "template", "library"],
  },
  {
    page: "TemplateLibrary",
    label: "Template Library",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "DocumentHub",
    keywords: ["template", "library"],
  },
  {
    page: "TemplateManagement",
    label: "Template Management",
    icon: FileText,
    category: null,
    adminOnly: true,
    breadcrumbParent: "DocumentHub",
    keywords: ["template", "management"],
  },

  // ─── Resources ───────────────────────────────────────────────────────────────
  {
    page: "ResourceLibrary",
    label: "Library",
    icon: BookOpen,
    category: "Resources",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["library", "resources", "guidelines", "reference"],
  },
  {
    page: "ClinicalLibrary",
    label: "Clinical Library",
    icon: BookOpen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ResourceLibrary",
    keywords: ["clinical library", "reference"],
  },
  {
    page: "MedicareGuidelinesLibrary",
    label: "Medicare Guidelines",
    icon: BookOpen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "ResourceLibrary",
    keywords: ["medicare", "guidelines", "library"],
  },
  {
    page: "UserGuides",
    label: "User Guides",
    icon: BookOpen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "Help",
    keywords: ["guide", "user guide", "help"],
  },

  // ─── My Learning ─────────────────────────────────────────────────────────────
  {
    page: "LearningCenter",
    label: "Learning Center",
    icon: GraduationCap,
    category: "My Learning",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["learning", "courses", "catalog", "browse", "education"],
  },
  {
    page: "MyLearning",
    label: "My Courses",
    icon: BookOpen,
    category: "My Learning",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["training", "my courses", "progress", "education"],
  },
  {
    page: "ClinicalSkillsChecklist",
    label: "Skills Checklists",
    icon: CheckCircle2,
    category: "My Learning",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["skills", "checklist", "competency", "evaluation"],
  },
  {
    page: "TrainingCoursePlayer",
    label: "Course Player",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "MyLearning",
    keywords: ["course", "player", "training", "video"],
  },
  {
    page: "MyTraining",
    label: "My Training",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["training", "my training", "assigned"],
  },
  {
    page: "MyAnnualEducation",
    label: "Annual Education",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["annual education", "mandatory", "compliance training"],
  },
  {
    page: "AnnualMandatoryEducation",
    label: "Mandatory Education",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["annual", "mandatory", "education"],
  },
  {
    page: "AnnualEducationTranscript",
    label: "Education Transcript",
    icon: Award,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["transcript", "education", "completion"],
  },
  {
    page: "EmployeeTranscript",
    label: "Employee Transcript",
    icon: Award,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["transcript", "employee", "training history"],
  },
  {
    page: "LearningReports",
    label: "Learning Reports",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "LearningCenter",
    keywords: ["learning", "reports", "training analytics"],
  },
  {
    page: "EducationLibrary",
    label: "Education Library",
    icon: BookOpen,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["education", "library", "courses"],
  },
  {
    page: "NurseEducationVideos",
    label: "Nurse Education Videos",
    icon: Video,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["nurse", "education", "video", "training"],
  },
  {
    page: "DocumentationTraining",
    label: "Documentation Training",
    icon: FileText,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["documentation", "training"],
  },
  {
    page: "NurseTraining",
    label: "Nurse Training",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["nurse", "training"],
  },
  {
    page: "NurseTrainingHub",
    label: "Nurse Training Hub",
    icon: GraduationCap,
    category: null,
    adminOnly: false,
    breadcrumbParent: "LearningCenter",
    keywords: ["nurse", "training", "hub"],
  },
  {
    page: "AITrainingGenerator",
    label: "AI Training Generator",
    icon: Brain,
    category: null,
    adminOnly: true,
    breadcrumbParent: "LearningCenter",
    keywords: ["ai", "training", "generator", "content"],
  },
  {
    page: "AIComplianceInServices",
    label: "AI Compliance In-Services",
    icon: Brain,
    category: null,
    adminOnly: true,
    breadcrumbParent: "LearningCenter",
    keywords: ["ai", "compliance", "in-service", "training"],
  },

  // ─── Compliance ───────────────────────────────────────────────────────────────
  {
    page: "MedicareComplianceDashboard",
    label: "Medicare Compliance",
    icon: Shield,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["medicare", "compliance", "dashboard"],
  },
  {
    page: "RegulatoryCompliance",
    label: "Regulatory Compliance",
    icon: ClipboardList,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["regulatory", "cms", "state requirements", "compliance"],
  },
  {
    page: "SecurityCompliance",
    label: "Security & Compliance",
    icon: Lock,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["security", "hipaa", "compliance"],
  },
  {
    page: "SecurityPolicy",
    label: "Security Policy",
    icon: Lock,
    category: null,
    adminOnly: true,
    breadcrumbParent: "SecurityCompliance",
    keywords: ["security", "policy"],
  },
  {
    page: "ComplianceMonitoringDashboard",
    label: "Compliance Monitoring",
    icon: Monitor,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["compliance", "monitoring", "dashboard"],
  },
  {
    page: "RealTimeComplianceDashboard",
    label: "Real-Time Compliance",
    icon: Radio,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["compliance", "real time", "live"],
  },
  {
    page: "ComplianceRegulatory",
    label: "Compliance & Regulatory",
    icon: Shield,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ComplianceCenter",
    keywords: ["compliance", "regulatory"],
  },

  // ─── Admin ────────────────────────────────────────────────────────────────────
  {
    page: "AdminOperations",
    label: "Operations Center",
    icon: BarChart3,
    category: "Admin",
    adminOnly: true,
    breadcrumbParent: null,
    keywords: ["admin", "operations", "manage", "control"],
  },
  {
    page: "UserManagement",
    label: "Users",
    icon: Users,
    category: "Manage",
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["users", "accounts", "roles", "staff"],
  },
  {
    page: "AdminUserSetup",
    label: "User Setup",
    icon: UserCheck,
    category: null,
    adminOnly: true,
    breadcrumbParent: "UserManagement",
    keywords: ["user setup", "onboarding", "admin"],
  },
  {
    page: "AdminTraining",
    label: "Training Manager",
    icon: GraduationCap,
    category: "Manage",
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["training manager", "assign training", "admin training"],
  },
  {
    page: "TrainingManagement",
    label: "Training Management",
    icon: GraduationCap,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminTraining",
    keywords: ["training", "management", "admin"],
  },
  {
    page: "AdminTrainingAnalytics",
    label: "Training Analytics",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminTraining",
    keywords: ["training", "analytics", "reports"],
  },
  {
    page: "ManagerSkillGapDashboard",
    label: "Skill Gap Dashboard",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminTraining",
    keywords: ["skill gap", "training gap", "competency"],
  },
  {
    page: "NursePerformanceDashboard",
    label: "Nurse Performance",
    icon: TrendingUp,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["nurse", "performance", "metrics"],
  },
  {
    page: "ClinicalPathwayManager",
    label: "Clinical Pathways",
    icon: ClipboardList,
    category: "Manage",
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["pathways", "clinical pathways", "protocols"],
  },
  {
    page: "ClinicalInsightsDashboard",
    label: "Clinical Insights",
    icon: Brain,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["clinical insights", "analytics", "ai"],
  },
  {
    page: "PatientDataManagement",
    label: "Data Management",
    icon: Database,
    category: "Configuration",
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["data", "management", "import", "patients"],
  },
  {
    page: "DataQualityMonitor",
    label: "Data Quality Monitor",
    icon: Monitor,
    category: null,
    adminOnly: true,
    breadcrumbParent: "PatientDataManagement",
    keywords: ["data quality", "monitor", "validation"],
  },
  {
    page: "UserActivityLog",
    label: "User Activity Log",
    icon: Archive,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["activity", "log", "audit", "users"],
  },
  {
    page: "UserActivityReport",
    label: "User Activity Report",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["activity", "report", "users"],
  },
  {
    page: "PersonnelFile",
    label: "Personnel File",
    icon: Users,
    category: null,
    adminOnly: true,
    breadcrumbParent: "UserManagement",
    keywords: ["personnel", "file", "employee", "hr"],
  },
  {
    page: "PullRequests",
    label: "Pull Requests",
    icon: RefreshCw,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["pull requests", "updates", "sync"],
  },

  // ─── Analytics ────────────────────────────────────────────────────────────────
  {
    page: "ReportsAnalytics",
    label: "Reports & Analytics",
    icon: BarChart3,
    category: "Analytics",
    adminOnly: true,
    breadcrumbParent: null,
    keywords: ["reports", "analytics", "metrics", "export", "data"],
  },
  {
    page: "AgencyAnalytics",
    label: "Agency Analytics",
    icon: BarChart3,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ReportsAnalytics",
    keywords: ["agency", "analytics", "metrics"],
  },
  {
    page: "AnalyticsDashboard",
    label: "Analytics Dashboard",
    icon: PieChart,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ReportsAnalytics",
    keywords: ["analytics", "dashboard"],
  },
  {
    page: "PredictiveAnalytics",
    label: "Predictive Analytics",
    icon: TrendingUp,
    category: null,
    adminOnly: true,
    breadcrumbParent: "ReportsAnalytics",
    keywords: ["predictive", "analytics", "ai", "forecast"],
  },

  // ─── Compliance Center (Admin Analytics) ─────────────────────────────────────
  {
    page: "ComplianceCenter",
    label: "Compliance Center",
    icon: Shield,
    category: "Analytics",
    adminOnly: true,
    breadcrumbParent: null,
    keywords: ["compliance", "audit", "quality", "metrics"],
    // Note: adminItems shows this in Analytics category alongside Alerts
  },

  // ─── System / Admin Config ───────────────────────────────────────────────────
  {
    page: "SystemMonitoring",
    label: "System Monitoring",
    icon: Monitor,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["system", "monitoring", "health"],
  },
  {
    page: "SystemHealthMonitor",
    label: "System Health Monitor",
    icon: Monitor,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["system", "health", "monitor"],
  },
  {
    page: "SystemJobMonitor",
    label: "System Job Monitor",
    icon: Monitor,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["system", "jobs", "monitor"],
  },
  {
    page: "AgencySettings",
    label: "Agency Settings",
    icon: Settings,
    category: "Configuration",
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["agency", "settings", "configuration"],
  },
  {
    page: "ManageNewFeatures",
    label: "Manage Features",
    icon: Zap,
    category: null,
    adminOnly: true,
    breadcrumbParent: "AdminOperations",
    keywords: ["features", "manage", "flags"],
  },

  // ─── Tools / Settings ────────────────────────────────────────────────────────
  {
    page: "TimeOff",
    label: "Time Off",
    icon: Calendar,
    category: null,
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["time off", "pto", "leave", "vacation", "request"],
  },
  {
    page: "UserSettings",
    label: "Settings",
    icon: Settings,
    category: "Tools",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["settings", "preferences", "profile", "account"],
  },
  {
    page: "NotificationSettings",
    label: "Notification Settings",
    icon: Bell,
    category: null,
    adminOnly: false,
    breadcrumbParent: "UserSettings",
    keywords: ["notifications", "settings", "alerts"],
  },
  {
    page: "OfflineMode",
    label: "Offline Mode",
    icon: WifiOff,
    category: "Tools",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["offline", "sync", "cache"],
  },
  {
    page: "Help",
    label: "Help",
    icon: HelpCircle,
    category: "Tools",
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["help", "support", "guide", "faq"],
  },
  {
    page: "Features",
    label: "Features",
    icon: Zap,
    category: null,
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["features", "what's new", "changelog"],
  },
  {
    page: "About",
    label: "About",
    icon: Globe,
    category: null,
    adminOnly: false,
    breadcrumbParent: null,
    keywords: ["about", "version", "info"],
  },
];

// ─── Derived helpers ───────────────────────────────────────────────────────────

/** Lookup map by page key */
export const NAV_MAP = Object.fromEntries(NAV_MANIFEST.map(e => [e.page, e]));

/**
 * Build sidebar navCategories array for non-admin users.
 * Dynamic badge values are injected by Layout after this call.
 */
export function buildNavCategories(manifest) {
  const categoryOrder = [
    "Overview", "Patient Care", "Documentation", "Communication",
    "Resources", "My Learning", "Tools",
  ];
  const map = {};
  for (const entry of manifest) {
    if (!entry.category || entry.adminOnly) continue;
    if (!map[entry.category]) map[entry.category] = [];
    map[entry.category].push({
      name: entry.navLabel ?? entry.label,
      icon: entry.icon,
      page: entry.page,
      badge: 0,          // placeholder; Layout fills in runtime values
      _badgeKey: entry.badge ?? null,
    });
  }
  return categoryOrder
    .filter(c => map[c])
    .map(c => ({ category: c, items: map[c] }));
}

/**
 * Build adminItems array (admin-only sidebar sections).
 * Dynamic badge/action values are injected by Layout after this call.
 */
export function buildAdminItems(manifest) {
  const categoryOrder = ["Admin", "Manage", "Analytics", "Configuration"];
  const map = {};
  for (const entry of manifest) {
    if (!entry.category || !entry.adminOnly) continue;
    if (!map[entry.category]) map[entry.category] = [];
    map[entry.category].push({
      name: entry.navLabel ?? entry.label,
      icon: entry.icon,
      page: entry.page,
      badge: 0,
      _badgeKey: entry.badge ?? null,
      _actionKey: entry.action ?? null,
    });
  }
  return categoryOrder
    .filter(c => map[c])
    .map(c => ({ category: c, items: map[c] }));
}

/**
 * Build the breadcrumb trail for a given page.
 * Returns an array of { label, page? } from outermost ancestor to the page itself.
 */
export function buildBreadcrumbs(pageName, navMap = NAV_MAP) {
  const trail = [];
  let current = navMap[pageName];
  if (!current) return trail;

  // Walk up the parent chain (cycle-safe, max 10 hops)
  const visited = new Set();
  let cursor = current;
  while (cursor && !visited.has(cursor.page)) {
    visited.add(cursor.page);
    trail.unshift(cursor);
    cursor = cursor.breadcrumbParent ? navMap[cursor.breadcrumbParent] : null;
  }

  // Build crumb objects — all but the last are links, last is plain text
  return trail.map((entry, i, arr) => ({
    label: entry.label,
    page: i < arr.length - 1 ? entry.page : undefined,
  }));
}

/**
 * Build the flat list used by CommandPalette, filtered by admin access.
 */
export function buildPaletteEntries(manifest, isAdmin) {
  return manifest.filter(e => !e.adminOnly || isAdmin);
}
