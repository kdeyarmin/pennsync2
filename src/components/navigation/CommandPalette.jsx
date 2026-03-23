import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Bell, Mail, BookUser,
  Video, HelpCircle, AlertTriangle, BookOpen, WifiOff, Search,
  Send, Heart, Stethoscope, Activity, Pill, Calendar
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

const PAGE_REGISTRY = [
  // Overview
  { name: "Dashboard", icon: Home, category: "Overview", keywords: ["home", "main", "overview"] },

  // Patient Care
  { name: "Patients", icon: Users, category: "Patient Care", keywords: ["roster", "directory", "list"] },
  { name: "PatientDetails", icon: Users, category: "Patient Care", keywords: ["record", "chart"] },
  { name: "CarePlanManagement", icon: Target, category: "Patient Care", keywords: ["care plan", "goals"] },
  { name: "SmartOASISAssessment", icon: Brain, category: "Patient Care", keywords: ["oasis", "assessment"] },
  { name: "IncidentReporting", icon: AlertTriangle, category: "Patient Care", keywords: ["incident", "report", "safety"] },
  { name: "MedicationReconciliation", icon: Pill, category: "Patient Care", keywords: ["medication", "meds", "drugs", "reconciliation"] },
  { name: "PatientAlerts", icon: Bell, category: "Patient Care", keywords: ["alerts", "warnings"] },

  // Documentation
  { name: "SmartNoteAssistant", icon: Brain, category: "Documentation", keywords: ["smart note", "clinical note", "documentation", "ai"] },
  { name: "DocumentHub", icon: FileText, category: "Documentation", keywords: ["documents", "files"] },
  { name: "ReferralIntake", icon: FileText, category: "Documentation", keywords: ["referral", "intake", "admission"] },
  { name: "VisitScribe", icon: FileText, category: "Documentation", keywords: ["scribe", "dictation", "voice"] },
  { name: "DischargeSummaries", icon: FileText, category: "Documentation", keywords: ["discharge", "summary"] },
  { name: "TemplateLibrary", icon: FileText, category: "Documentation", keywords: ["template", "templates"] },

  // Communication
  { name: "Messages", icon: Mail, category: "Communication", keywords: ["messages", "inbox", "chat"] },
  { name: "SendFax", icon: Send, category: "Communication", keywords: ["fax", "send fax"] },
  { name: "PhysicianDirectory", icon: BookUser, category: "Communication", keywords: ["physician", "provider", "doctor", "directory"] },
  { name: "Telehealth", icon: Video, category: "Communication", keywords: ["telehealth", "video", "call"] },

  // Compliance & Quality
  { name: "ComplianceCenter", icon: Shield, category: "Compliance", keywords: ["compliance", "audit", "quality"] },
  { name: "ComplianceDashboard", icon: Shield, category: "Compliance", keywords: ["compliance", "metrics"] },
  { name: "OASISReview", icon: ClipboardList, category: "Compliance", keywords: ["oasis", "review"] },
  { name: "SecurityCompliance", icon: Shield, category: "Compliance", keywords: ["security", "hipaa"] },

  // Analytics & Reports
  { name: "AnalyticsDashboard", icon: BarChart3, category: "Analytics", keywords: ["analytics", "metrics", "data"] },
  { name: "Reports", icon: BarChart3, category: "Analytics", keywords: ["reports", "export"] },
  { name: "PredictiveAnalytics", icon: Activity, category: "Analytics", keywords: ["predictive", "forecast", "risk"] },
  { name: "NursePerformanceDashboard", icon: BarChart3, category: "Analytics", keywords: ["performance", "nurse", "staff"] },

  // Training & Learning
  { name: "MyLearning", icon: GraduationCap, category: "Learning", keywords: ["training", "learning", "courses", "education"] },
  { name: "ClinicalSkillsChecklist", icon: GraduationCap, category: "Learning", keywords: ["skills", "checklist", "competency"] },
  { name: "EducationLibrary", icon: BookOpen, category: "Learning", keywords: ["education", "library", "resources"] },
  { name: "PatientEducationHub", icon: Heart, category: "Learning", keywords: ["patient education", "handout"] },

  // Admin
  { name: "AdminOperations", icon: Settings, category: "Admin", keywords: ["admin", "operations", "manage"] },
  { name: "UserManagement", icon: Users, category: "Admin", keywords: ["users", "accounts", "roles"] },
  { name: "UserSettings", icon: Settings, category: "Admin", keywords: ["settings", "preferences", "profile"] },
  { name: "PatientDataManagement", icon: Users, category: "Admin", keywords: ["data", "management", "import"] },

  // Tools
  { name: "OfflineMode", icon: WifiOff, category: "Tools", keywords: ["offline", "sync"] },
  { name: "Help", icon: HelpCircle, category: "Tools", keywords: ["help", "support", "guide"] },
  { name: "PDFTools", icon: FileText, category: "Tools", keywords: ["pdf", "export"] },
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

export default function CommandPalette({ isAdmin }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback((pageName) => {
    setOpen(false);
    navigate(`/${pageName}`);
  }, [navigate]);

  const pages = PAGE_REGISTRY.filter(p => {
    if (p.category === "Admin" && p.name !== "UserSettings") return isAdmin;
    return true;
  });

  const categories = [...new Set(pages.map(p => p.category))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-lg border shadow-2xl overflow-hidden">
        <div className="sr-only"><DialogTitle>Quick Navigation</DialogTitle></div>
        <Command className="rounded-lg" loop>
          <CommandInput placeholder="Search pages... (Ctrl+K)" />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No pages found.</CommandEmpty>
            {categories.map((category, idx) => (
              <div key={category}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={category}>
                  {pages
                    .filter(p => p.category === category)
                    .map((page) => {
                      const Icon = page.icon;
                      return (
                        <CommandItem
                          key={page.name}
                          value={`${formatPageName(page.name)} ${page.keywords.join(" ")}`}
                          onSelect={() => handleSelect(page.name)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{formatPageName(page.name)}</span>
                        </CommandItem>
                      );
                    })}
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
