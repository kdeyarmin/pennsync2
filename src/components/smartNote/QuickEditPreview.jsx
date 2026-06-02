import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Check, X } from "lucide-react";

export default function QuickEditPreview({
  open,
  onOpenChange,
  title,
  content,
  onConfirm,
  onCancel
}) {
  const [editedContent, setEditedContent] = useState(content);

  React.useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleConfirm = () => {
    onConfirm(editedContent);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-indigo-600" />
            {title || 'Edit Before Inserting'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Edit content here..."
          />
          <p className="text-xs text-slate-500 mt-2">
            Make any edits needed, then click Insert to add to your note.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="w-4 h-4 mr-2" />
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}