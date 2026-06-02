import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2 } from "lucide-react";

export default function SkillsObservationForm({ employee, competency, checklist, observations = [], currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [filesByItem, setFilesByItem] = useState({});

  const itemCounts = useMemo(() => {
    const counts = {};
    observations.forEach((observation) => {
      if (!observation.met_criteria) return;
      counts[observation.checklist_item_id] = (counts[observation.checklist_item_id] || 0) + 1;
    });
    return counts;
  }, [observations]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = checklist?.checklist_items_json || [];
      for (const item of items) {
        const itemId = item.id || item.item || item.criteria || `item-${items.indexOf(item)}`;
        const itemForm = form[itemId];
        if (!itemForm?.observed) continue;

        let uploadedUrls = [];
        const files = filesByItem[itemId] || [];
        if (files.length > 0) {
          uploadedUrls = await Promise.all(files.map(async (file) => {
            const result = await base44.integrations.Core.UploadFile({ file });
            return result.file_url;
          }));
        }

        await base44.entities.SkillObservation.create({
          user_id: employee.email,
          user_name: employee.full_name,
          supervisor_id: currentUser.email,
          supervisor_name: currentUser.full_name,
          competency_id: competency.id,
          checklist_id: checklist.id,
          checklist_item_id: itemId,
          patient_id: itemForm.patient_id || '',
          patient_name: itemForm.patient_name || '',
          observed: true,
          met_criteria: !!itemForm.met_criteria,
          notes: itemForm.notes || '',
          observation_note_urls: uploadedUrls,
          observed_at: new Date().toISOString(),
          signature_data: itemForm.signature || currentUser.full_name,
          observation_number: (itemCounts[itemId] || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-observations"] });
      setForm({});
      setFilesByItem({});
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clinical skills sign-off</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(checklist?.checklist_items_json || []).map((item, index) => {
          const itemId = item.id || item.item || item.criteria || `item-${index}`;
          const completedCount = itemCounts[itemId] || 0;
          const targetCount = checklist?.required_observations_count || 1;
          return (
            <div key={itemId} className="rounded-2xl border p-4 bg-white space-y-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.item || item.title || `Checklist Item ${index + 1}`}</h3>
                  <p className="text-sm text-slate-500">{item.criteria || item.description || "Supervisor validates performance and related documentation."}</p>
                </div>
                <Badge className={completedCount >= targetCount ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {completedCount}/{targetCount} completed
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient name (optional)</Label>
                  <Input
                    value={form[itemId]?.patient_name || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [itemId]: { ...prev[itemId], patient_name: e.target.value } }))}
                    placeholder="Patient observed during care"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supervisor signature</Label>
                  <Input
                    value={form[itemId]?.signature || currentUser.full_name || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [itemId]: { ...prev[itemId], signature: e.target.value } }))}
                    placeholder="Type full name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 rounded-xl border p-3">
                  <Checkbox
                    checked={!!form[itemId]?.observed}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [itemId]: { ...prev[itemId], observed: !!checked } }))}
                  />
                  <span className="text-sm">Observed in practice</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border p-3">
                  <Checkbox
                    checked={!!form[itemId]?.met_criteria}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [itemId]: { ...prev[itemId], met_criteria: !!checked } }))}
                  />
                  <span className="text-sm">Met competency criteria</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Observation notes</Label>
                <Textarea
                  rows={4}
                  value={form[itemId]?.notes || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [itemId]: { ...prev[itemId], notes: e.target.value } }))}
                  placeholder="Document what was observed, patient context, technique used, and follow-up feedback."
                />
              </div>

              <div className="space-y-2">
                <Label>Upload observation notes / files</Label>
                <div className="rounded-xl border border-dashed p-4">
                  <input
                    type="file"
                    multiple
                    id={`files-${itemId}`}
                    className="hidden"
                    onChange={(event) => {
                      const nextFiles = Array.from(event.target.files || []);
                      setFilesByItem((prev) => ({ ...prev, [itemId]: nextFiles }));
                    }}
                  />
                  <label htmlFor={`files-${itemId}`} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                    <Upload className="w-4 h-4" />
                    {filesByItem[itemId]?.length ? `${filesByItem[itemId].length} file(s) selected` : "Choose files"}
                  </label>
                </div>
              </div>
            </div>
          );
        })}

        <Button className="w-full" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving sign-off..." : "Save supervisor sign-off"}
        </Button>
      </CardContent>
    </Card>
  );
}