import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Mail, BookUser,
  Video, HelpCircle, AlertTriangle, BookOpen, WifiOff,
  Send, Heart, Activity, Phone, FileSignature, ShieldCheck,
  DollarSign, Award, ClipboardCheck, TrendingUp, Database,
  LifeBuoy, FileCheck, Stethoscope, ScrollText, Route
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

// Every entry here MUST correspond to a real route in src/App.jsx so the palette
// never offers a dead link. Pages in the "Admin" category are shown to admins
// only; every other page enforces its own access control on load.
const PAGE_REGISTRY = [
  // Overview
  { name: "Dashboard", icon: Home, category: "Overview", keywords: ["home", "main", "overview", "start"] },

  // Patient Care
  { name: "Patients", icon: Users, category: "Patient Care", keywords: ["roster", "directory", "list", "census"] },
  { name: "PatientDetails", icon: Users, category: "Patient Care", keywords: ["record", "profile"] },
  { name: "ClinicalChart", icon: Activity, category: "Patient Care", keywords: ["chart", "clinical", "patient chart"] },
  { name: "CarePlanManagement", icon: Target, category: "Patient Care", keywords: ["care plan", "goals", "485"] },
  { name: "PatientAlerts", icon: AlertTriangle, category: "Patient Care", keywords: ["alerts", "risk", "warnings"] },
  { name: "Incidents", icon: AlertTriangle, category: "Patient Care", keywords: ["incident", "report", "safety", "event"] },
  { name: "PatientEducationHub", icon: Heart, category: "Patient Care", keywords: ["patient education", "handout", "teaching"] },

  // OASIS
  { name: "SmartOASISAssessment", icon: Brain, category: "OASIS", keywords: ["oasis", "assessment", "start of care", "soc"] },
  { name: "OASISAnalyzer", icon: Brain, category: "OASIS", keywords: ["oasis", "analyze", "scrubber", "coding"] },
  { name: "OASISComplianceReview", icon: ClipboardCheck, category: "OASIS", keywords: ["oasis", "compliance", "review", "qa"] },
  { name: "OASISDocumentationReview", icon: FileCheck, category: "OASIS", keywords: ["oasis", "documentation", "review"] },
  { name: "OASISRevenueAnalysis", icon: DollarSign, category: "OASIS", keywords: ["oasis", "revenue", "pdgm", "reimbursement"] },

  // Documentation
  { name: "SmartNoteAssistant", icon: Brain, category: "Documentation", keywords: ["smart note", "clinical note", "documentation", "ai"] },
  { name: "ClinicalDocumentation", icon: FileText, category: "Documentation", keywords: ["clinical", "documentation", "notes"] },
  { name: "VisitScribe", icon: Stethoscope, category: "Documentation", keywords: ["scribe", "dictation", "voice", "ambient"] },
  { name: "DocumentVisit", icon: FileText, category: "Documentation", keywords: ["document visit", "visit note", "charting"] },
  { name: "EventReport", icon: FileText, category: "Documentation", keywords: ["event", "report", "incident report"] },
  { name: "IncidentReporting", icon: AlertTriangle, category: "Documentation", keywords: ["incident", "reporting", "occurrence"] },
  { name: "ReferralIntake", icon: FileText, category: "Documentation", keywords: ["referral", "intake", "admission", "new patient"] },

  // Documents & Signatures
  { name: "DocumentHub", icon: FileText, category: "Documents", keywords: ["documents", "files", "hub"] },
  { name: "DocumentSignatures", icon: FileSignature, category: "Documents", keywords: ["signatures", "sign", "esign"] },
  { name: "CreateSignatureRequest", icon: FileSignature, category: "Documents", keywords: ["request signature", "send for signature"] },
  { name: "BulkSignatureRequests", icon: FileSignature, category: "Documents", keywords: ["bulk", "batch", "signatures"] },
  { name: "TemplateManagement", icon: ScrollText, category: "Documents", keywords: ["templates", "forms", "document templates"] },
  { name: "DocumentAuditLogs", icon: FileCheck, category: "Documents", keywords: ["audit", "logs", "history", "document trail"] },

  // Communication
  { name: "Messages", icon: Mail, category: "Communication", keywords: ["messages", "inbox", "chat"] },
  { name: "PhoneCenter", icon: Phone, category: "Communication", keywords: ["phone", "calls", "sms", "text", "voice"] },
  { name: "SendFax", icon: Send, category: "Communication", keywords: ["fax", "send fax"] },
  { name: "FaxAnalytics", icon: BarChart3, category: "Communication", keywords: ["fax", "analytics", "fax logs"] },
  { name: "PhysicianDirectory", icon: BookUser, category: "Communication", keywords: ["physician", "provider", "doctor", "directory"] },
  { name: "Telehealth", icon: Video, category: "Communication", keywords: ["telehealth", "video", "call", "virtual visit"] },

  // Compliance & Quality
  { name: "ComplianceCenter", icon: Shield, category: "Compliance", keywords: ["compliance", "audit", "quality", "metrics"] },
  { name: "ComplianceDashboard", icon: ShieldCheck, category: "Compliance", keywords: ["compliance", "dashboard", "overview"] },
  { name: "RegulatoryCompliance", icon: ClipboardList, category: "Compliance", keywords: ["regulatory", "cms", "state requirements"] },
  { name: "QualityDashboard", icon: TrendingUp, category: "Compliance", keywords: ["quality", "qapi", "outcomes", "metrics"] },
  { name: "SecurityCompliance", icon: ShieldCheck, category: "Compliance", keywords: ["security", "hipaa", "privacy"] },
  { name: "AIComplianceInServices", icon: GraduationCap, category: "Compliance", keywords: ["in-service", "ai compliance", "training compliance"] },

  // Analytics & Reports
  { name: "ReportsAnalytics", icon: BarChart3, category: "Analytics", keywords: ["reports", "analytics", "metrics", "export", "data"] },
  { name: "Reports", icon: BarChart3, category: "Analytics", keywords: ["reports", "report builder"] },
  { name: "NursePerformanceDashboard", icon: TrendingUp, category: "Analytics", keywords: ["nurse performance", "productivity", "scorecard"] },
  { name: "ManagerSkillGapDashboard", icon: BarChart3, category: "Analytics", keywords: ["skill gap", "manager", "competency analytics"] },

  // Learning & Training
  { name: "LearningCenter", icon: GraduationCap, category: "Learning", keywords: ["learning", "courses", "catalog", "browse"] },
  { name: "MyLearning", icon: GraduationCap, category: "Learning", keywords: ["my courses", "progress", "education"] },
  { name: "MyTraining", icon: GraduationCap, category: "Learning", keywords: ["my training", "assignments"] },
  { name: "NurseTraining", icon: Stethoscope, category: "Learning", keywords: ["nurse training", "clinical training"] },
  { name: "ClinicalSkillsChecklist", icon: ClipboardCheck, category: "Learning", keywords: ["skills", "checklist", "competency"] },
  { name: "TrainingCoursePlayer", icon: Video, category: "Learning", keywords: ["course", "player", "lesson", "module"] },
  { name: "StaffTrainingHub", icon: GraduationCap, category: "Learning", keywords: ["staff training", "hub"] },
  { name: "AnnualMandatoryEducation", icon: Award, category: "Learning", keywords: ["annual", "mandatory", "education", "compliance training"] },
  { name: "MyAnnualEducation", icon: Award, category: "Learning", keywords: ["my annual education", "yearly"] },
  { name: "AnnualEducationTranscript", icon: ScrollText, category: "Learning", keywords: ["transcript", "annual education record"] },
  { name: "EmployeeTranscript", icon: ScrollText, category: "Learning", keywords: ["employee transcript", "training record"] },

  // Admin (gated to admins)
  { name: "AdminOperations", icon: Settings, category: "Admin", keywords: ["admin", "operations", "manage", "operations center"] },
  { name: "AdminDashboard", icon: BarChart3, category: "Admin", keywords: ["admin", "dashboard", "overview"] },
  { name: "AdminTraining", icon: GraduationCap, category: "Admin", keywords: ["training manager", "assign training"] },
  { name: "ClinicalPathwayManager", icon: Route, category: "Admin", keywords: ["pathways", "clinical pathways", "protocols"] },
  { name: "UserManagement", icon: Users, category: "Admin", keywords: ["users", "accounts", "roles", "permissions"] },
  { name: "PatientDataManagement", icon: Database, category: "Admin", keywords: ["data", "management", "import", "duplicates"] },

  // Tools & Resources
  { name: "ResourceLibrary", icon: BookOpen, category: "Tools", keywords: ["library", "resources", "guidelines"] },
  { name: "OfflineMode", icon: WifiOff, category: "Tools", keywords: ["offline", "sync"] },
  { name: "Help", icon: HelpCircle, category: "Tools", keywords: ["help", "guide", "manual"] },
  { name: "Support", icon: LifeBuoy, category: "Tools", keywords: ["support", "contact", "ticket", "faq"] },

  // Settings
  { name: "UserSettings", icon: Settings, category: "Settings", keywords: ["settings", "preferences", "profile", "notifications"] },
];

// Convert PascalCase page names to human-readable labels
function formatPageName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/O A S I S/g, 'OASIS')
    .replace(/P D F/g, 'PDF')
    .replace(/A I /g, 'AI ')
    .replace(/I C D/g, 'ICD')
    .trim();
}

const RECENTS_KEY = "pennsync_recent_pages";
const MAX_RECENTS = 5;

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecent(pageName) {
  try {
    const next = [pageName, ...readRecents().filter((n) => n !== pageName)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage failures (private mode, quota, etc.) */
  }
}

export default function CommandPalette({ isAdmin }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState([]);
  const navigate = useNavigate();

  // Cmd/Ctrl+K toggles the palette; a custom `open-command-palette` window event
  // opens it so the sidebar / header search buttons can trigger it while the
  // palette stays self-contained (no lifted state needed).
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const handleOpenEvent = () => setOpen(true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  // Each time the palette opens, refresh recents and reset the query.
  useEffect(() => {
    if (open) {
      setRecents(readRecents());
      setSearch("");
    }
  }, [open]);

  const pages = useMemo(
    () => PAGE_REGISTRY.filter((p) => (p.category === "Admin" ? isAdmin : true)),
    [isAdmin],
  );

  const pageByName = useMemo(() => {
    const map = new Map();
    pages.forEach((p) => map.set(p.name, p));
    return map;
  }, [pages]);

  const handleSelect = useCallback(
    (pageName) => {
      setOpen(false);
      pushRecent(pageName);
      navigate(`/${pageName}`);
    },
    [navigate],
  );

  const categories = useMemo(() => [...new Set(pages.map((p) => p.category))], [pages]);

  // Recents resolve to currently-visible pages and only show when not searching.
  const recentPages = recents.map((name) => pageByName.get(name)).filter(Boolean);
  const showRecents = !search.trim() && recentPages.length > 0;

  const renderItem = (page, prefix = "") => {
    const Icon = page.icon;
    return (
      <CommandItem
        key={`${prefix}${page.name}`}
        value={`${prefix}${formatPageName(page.name)} ${page.keywords.join(" ")}`}
        onSelect={() => handleSelect(page.name)}
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>{formatPageName(page.name)}</span>
      </CommandItem>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-lg border shadow-2xl overflow-hidden">
        <div className="sr-only"><DialogTitle>Quick Navigation</DialogTitle></div>
        <Command className="rounded-lg" loop>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search pages, tools, reports…"
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No pages found.</CommandEmpty>

            {showRecents && (
              <>
                <CommandGroup heading="Recent">
                  {recentPages.map((page) => renderItem(page, "recent "))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {categories.map((category, idx) => (
              <div key={category}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={category}>
                  {pages.filter((p) => p.category === category).map((page) => renderItem(page))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
