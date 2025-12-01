import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TextExpander({ onExpand }) {
  const [showDialog, setShowDialog] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState([]);

  const defaultShortcuts = [
    { trigger: "wnl", expansion: "within normal limits" },
    { trigger: "sob", expansion: "shortness of breath" },
    { trigger: "nkda", expansion: "no known drug allergies" },
    { trigger: "aox3", expansion: "alert and oriented to person, place, and time" },
    { trigger: "perl", expansion: "pupils equal, round, and reactive to light" },
    { trigger: "rom", expansion: "range of motion" },
    { trigger: "amb", expansion: "ambulation" },
    { trigger: "adl", expansion: "activities of daily living" },
    { trigger: "bs", expansion: "breath sounds" },
    { trigger: "bm", expansion: "bowel movement" },
  ];

  const allShortcuts = [...defaultShortcuts, ...customShortcuts];

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-medium text-gray-700">
            Penn Sync Text Expanders
          </span>
          <Badge variant="outline" className="text-xs">
            {allShortcuts.length} shortcuts
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="text-xs"
        >
          View All
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Penn Sync Text Expander Shortcuts</DialogTitle>
            <DialogDescription>
              Type these shortcuts while documenting for instant expansion. Penn Sync recognizes common medical abbreviations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {allShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {shortcut.trigger}
                  </Badge>
                  <span className="text-xs text-gray-500">→</span>
                </div>
                <p className="text-sm text-gray-700">{shortcut.expansion}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Penn Sync Pro Tip:</strong> Just type the shortcut and press space or tab. Penn Sync will automatically expand it in your documentation.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}