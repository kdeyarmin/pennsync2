import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPhoneDisplay } from "@/components/voice/phoneUtils";
import { smsSegments } from "@/components/messaging/smsUtils";
import { getQuickReplies } from "@/components/messaging/smsQuickReplies";

/**
 * SmsThreadView — renders one SMS conversation (message bubbles) and a compose
 * box that sends through the nurse's work number via the sendSms function.
 */
export default function SmsThreadView({ thread, otherPartyLabel, otherPartyNumber, patientId, optedOut, onSent }) {
  const [draft, setDraft] = useState("");

  const sendMutation = useMutation({
    mutationFn: (body) =>
      base44.functions.invoke("sendSms", { to_number: otherPartyNumber, body, patient_id: patientId || undefined }),
    onSuccess: () => {
      setDraft("");
      toast.success("Message sent");
      onSent?.();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to send message");
    },
  });

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => base44.entities.AgencySettings.list("-created_date", 1),
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });
  const quickReplies = getQuickReplies(settingsArr[0]);

  if (!thread) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-12 text-center text-gray-500">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p>Select a conversation to view messages.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMutation.mutate(draft.trim());
  };

  const insertReply = (text) =>
    setDraft((d) => (d.trim() ? `${d.replace(/\s*$/, "")} ${text}` : text));

  const meta = smsSegments(draft);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {otherPartyLabel}
          </span>
          <span className="text-xs font-normal text-gray-500">{formatPhoneDisplay(otherPartyNumber)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {thread.messages.map((msg) => {
            const outbound = msg.direction === "outbound";
            return (
              <div key={msg.id} className={`p-3 rounded-lg ${outbound ? "bg-blue-100 ml-8" : "bg-gray-100 mr-8"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-900">{outbound ? "You" : otherPartyLabel}</p>
                  <div className="flex items-center gap-2">
                    {msg.status === "failed" && <Badge className="bg-red-600 text-white text-xs">failed</Badge>}
                    {outbound && msg.status && msg.status !== "failed" && (
                      <span className="text-xs text-gray-400">{msg.status}</span>
                    )}
                    <p className="text-xs text-gray-500">{format(new Date(msg.created_date), "MMM d, h:mm a")}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
              </div>
            );
          })}
        </div>

        {optedOut ? (
          <Alert className="bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900 text-sm">
              This patient has opted out of text messages (replied STOP). You cannot text them until they reply START.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 border-t pt-3">
            {quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => insertReply(q.text)}
                    title={q.text}
                    className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              placeholder="Type a text message… (avoid clinical details / PHI)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between items-center gap-2">
              <span className={`text-xs ${meta.segments > 1 ? "text-amber-600" : "text-gray-400"}`}>
                {meta.chars > 0
                  ? `${meta.chars} chars · ${meta.segments} SMS${meta.segments > 1 ? ` (${meta.encoding})` : ""}`
                  : ""}
              </span>
              <Button
                onClick={handleSend}
                disabled={!draft.trim() || sendMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Text
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
