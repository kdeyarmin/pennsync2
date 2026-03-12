import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RetakeSettingsPanel({ settings, onChange }) {
  return (
    <Card>
      <CardHeader><CardTitle>Retake Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input type="number" value={settings.passingScoreRequired} onChange={(e) => onChange({ ...settings, passingScoreRequired: Number(e.target.value) })} placeholder="Passing score" />
          <Input type="number" value={settings.maxAttempts} onChange={(e) => onChange({ ...settings, maxAttempts: Number(e.target.value) })} placeholder="Max attempts" />
          <Input type="number" value={settings.waitingPeriodHours} onChange={(e) => onChange({ ...settings, waitingPeriodHours: Number(e.target.value) })} placeholder="Waiting period hours" />
          <Select value={settings.priority} onValueChange={(value) => onChange({ ...settings, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><Checkbox checked={settings.regenerateTestOnRetake} onCheckedChange={(checked) => onChange({ ...settings, regenerateTestOnRetake: !!checked })} /><span>Randomize retake questions</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={settings.showCorrectAnswers} onCheckedChange={(checked) => onChange({ ...settings, showCorrectAnswers: !!checked })} /><span>Show correct answers</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={settings.attestationRequired} onCheckedChange={(checked) => onChange({ ...settings, attestationRequired: !!checked })} /><span>Require attestation</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={settings.required} onCheckedChange={(checked) => onChange({ ...settings, required: !!checked })} /><span>Required assignment</span></label>
        </div>
      </CardContent>
    </Card>
  );
}