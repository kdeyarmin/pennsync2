import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, PhoneOff, Save, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * DutyStatusCard — lets a nurse flip between on-duty and off-duty and edit the
 * off-duty greeting that callers/texters hear (which refers them to the main
 * office). Used on the Phone Center "Duty" tab and the Settings profile tab.
 */
export default function DutyStatusCard() {
  const queryClient = useQueryClient();
  const [offDutyMessage, setOffDutyMessage] = useState("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) setOffDutyMessage(user.off_duty_message || "");
  }, [user]);

  const mutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("setNurseDutyStatus", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update duty status");
    },
  });

  if (isLoading) return null;

  const onDuty = user?.duty_status === "on_duty";
  const hasWorkNumber = !!user?.work_phone_number;

  const handleToggle = (checked) => {
    mutation.mutate(
      { duty_status: checked ? "on_duty" : "off_duty" },
      { onSuccess: () => toast.success(checked ? "You're now on duty" : "You're now off duty") }
    );
  };

  const handleSaveMessage = () => {
    mutation.mutate(
      { off_duty_message: offDutyMessage },
      { onSuccess: () => toast.success("Off-duty message saved") }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {onDuty ? <Phone className="w-5 h-5 text-green-600" /> : <PhoneOff className="w-5 h-5 text-amber-600" />}
          Phone Availability
        </CardTitle>
        <CardDescription>
          Control whether patient calls and texts reach you or get referred to the main office.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasWorkNumber && (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No work number is assigned to your account yet. Ask an administrator to provision one
              so patients can reach you privately.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <Label className="text-base font-semibold flex items-center gap-2">
              {onDuty ? "On Duty" : "Off Duty"}
              <Badge className={onDuty ? "bg-green-600" : "bg-amber-600"}>
                {onDuty ? "Available" : "Unavailable"}
              </Badge>
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              {onDuty
                ? "Patient calls ring your phone (caller ID shows your work number) and texts reach your inbox."
                : "Patient calls hear your off-duty greeting and transfer to the main office; texts get an auto-reply."}
            </p>
          </div>
          <Switch checked={onDuty} onCheckedChange={handleToggle} disabled={mutation.isPending || !hasWorkNumber} />
        </div>

        <div>
          <Label htmlFor="off-duty-message" className="text-sm font-medium">
            Off-duty message
          </Label>
          <p className="text-xs text-gray-500 mb-2">
            Played to callers and sent as a text auto-reply while you're off duty. Avoid clinical details
            (no diagnoses). Use <code className="bg-gray-100 px-1 rounded">{"{office}"}</code> to insert the main office number.
          </p>
          <Textarea
            id="off-duty-message"
            value={offDutyMessage}
            onChange={(e) => setOffDutyMessage(e.target.value)}
            rows={3}
            placeholder="Hi, you've reached your care team's off-hours line. For assistance please call our main office at {office}."
            className="resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button onClick={handleSaveMessage} disabled={mutation.isPending} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Message
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
