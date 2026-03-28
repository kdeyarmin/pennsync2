import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Mail, BookUser,
  Video, HelpCircle, AlertTriangle, BookOpen, WifiOff,
  Send, Heart, Activity
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
  { name: "Incidents", icon: AlertTriangle, category: "Patient Care", keywords: ["incident", "report", "safety"] },
  { name: "ClinicalChart", icon: Activity, category: "Patient Care", keywords: ["chart", "clinical", "patient chart"] },

  // Documentation
  { name: "SmartNoteAssistant", icon: Brain, category: "Documentation", keywords: ["smart note", "clinical note", "documentation", "ai"] },
  { name: "ClinicalDocumentation", icon: FileText, category: "Documentation", keywords: ["clinical", "documentation", "notes"] },
  { name: "DocumentHub", icon: FileText, category: "Documentation", keywords: ["documents", "files"] },
  { name: "ReferralIntake", icon: FileText, category: "Documentation", keywords: ["referral", "intake", "admission"] },
  { name: "VisitScribe", icon: FileText, category: "Documentation", keywords: ["scribe", "dictation", "voice"] },
  { name: "EventReport", icon: FileText, category: "Documentation", keywords: ["event", "report", "incident report"] },

  // Communication
  { name: "Messages", icon: Mail, category: "Communication", keywords: ["messages", "inbox", "chat"] },
  { name: "SendFax", icon: Send, category: "Communication", keywords: ["fax", "send fax"] },
  { name: "PhysicianDirectory", icon: BookUser, category: "Communication", keywords: ["physician", "provider", "doctor", "directory"] },
  { name: "Telehealth", icon: Video, category: "Communication", keywords: ["telehealth", "video", "call"] },

  // Compliance & Quality
  { name: "ComplianceCenter", icon: Shield, category: "Compliance", keywords: ["compliance", "audit", "quality", "metrics"] },
  { name: "SecurityCompliance", icon: Shield, category: "Compliance", keywords: ["security", "hipaa"] },
  { name: "RegulatoryCompliance", icon: ClipboardList, category: "Compliance", keywords: ["regulatory", "cms", "state requirements"] },

  // Analytics & Reports
  { name: "ReportsAnalytics", icon: BarChart3, category: "Analytics", keywords: ["reports", "analytics", "metrics", "export", "data"] },

  // Training & Learning
  { name: "LearningCenter", icon: GraduationCap, category: "Learning", keywords: ["learning", "courses", "catalog", "browse"] },
  { name: "MyLearning", icon: GraduationCap, category: "Learning", keywords: ["training", "my courses", "progress", "education"] },
  { name: "ClinicalSkillsChecklist", icon: GraduationCap, category: "Learning", keywords: ["skills", "checklist", "competency"] },
  { name: "PatientEducationHub", icon: Heart, category: "Learning", keywords: ["patient education", "handout"] },

  // Admin
  { name: "AdminOperations", icon: Settings, category: "Admin", keywords: ["admin", "operations", "manage"] },
  { name: "UserManagement", icon: Users, category: "Admin", keywords: ["users", "accounts", "roles"] },
  { name: "AdminTraining", icon: GraduationCap, category: "Admin", keywords: ["training manager", "assign training"] },
  { name: "ClinicalPathwayManager", icon: ClipboardList, category: "Admin", keywords: ["pathways", "clinical pathways"] },
  { name: "PatientDataManagement", icon: Users, category: "Admin", keywords: ["data", "management", "import"] },
  { name: "UserSettings", icon: Settings, category: "Settings", keywords: ["settings", "preferences", "profile"] },

  // Tools & Resources
  { name: "ResourceLibrary", icon: BookOpen, category: "Tools", keywords: ["library", "resources", "guidelines"] },
  { name: "OfflineMode", icon: WifiOff, category: "Tools", keywords: ["offline", "sync"] },
  { name: "Help", icon: HelpCircle, category: "Tools", keywords: ["help", "support", "guide"] },
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
