import { useState, useEffect, useCallback } from "react";
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

  const pages = buildPaletteEntries(NAV_MANIFEST, isAdmin);
  const categories = [...new Set(pages.map(p => p.category).filter(Boolean))];

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

