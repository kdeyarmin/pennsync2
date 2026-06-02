import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
<<<<<<< HEAD
import { buildPaletteEntries, NAV_MANIFEST } from "@/lib/nav.manifest";

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
=======
import { NAV_PAGES } from "@/components/navigation/navConfig";

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
>>>>>>> origin/main
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

<<<<<<< HEAD
  const pages = buildPaletteEntries(NAV_MANIFEST, isAdmin);
  const categories = [...new Set(pages.map(p => p.category).filter(Boolean))];
=======
  // The page registry is the shared navConfig manifest (single source of truth).
  const pages = useMemo(
    () => NAV_PAGES.filter((p) => (p.category === "Admin" ? isAdmin : true)),
    [isAdmin],
  );

  const pageByName = useMemo(() => {
    const map = new Map();
    pages.forEach((p) => map.set(p.page, p));
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
        key={`${prefix}${page.page}`}
        value={`${prefix}${page.label} ${page.keywords.join(" ")}`}
        onSelect={() => handleSelect(page.page)}
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>{page.label}</span>
      </CommandItem>
    );
  };
>>>>>>> origin/main

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
<<<<<<< HEAD
                  {pages
                    .filter(p => p.category === category)
                    .map((page) => {
                      const Icon = page.icon;
                      const displayName = page.label || formatPageName(page.page);
                      return (
                        <CommandItem
                          key={page.page}
                          value={`${displayName} ${(page.keywords ?? []).join(" ")}`}
                          onSelect={() => handleSelect(page.page)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{displayName}</span>
                        </CommandItem>
                      );
                    })}
=======
                  {pages.filter((p) => p.category === category).map((page) => renderItem(page))}
>>>>>>> origin/main
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

