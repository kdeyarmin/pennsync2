import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Save, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * EightXEightSecretPanel — the heart of the super admin config page: a SINGLE
 * field for the 8x8 Connect API secret. Saving it stores the secret backend-only
 * (via saveEightXEightSecret) so SMS, voice, and webhook verification all work
 * without anyone touching the Base44 dashboard. The raw secret is never read
 * back — the panel only ever shows whether it's set and the last 4 characters.
 */
export default function EightXEightSecretPanel() {
  const queryClient = useQueryClient();
  const [secret, setSecret] = useState("");
  const [reveal, setReveal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["eightxeight-secret-status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getEightXEightSecretStatus", {});
      return res?.data || res;
    },
    refetchOnWindowFocus: false,
  });

  const save = useMutation({
    mutationFn: (payload) => base44.functions.invoke("saveEightXEightSecret", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eightxeight-secret-status"] });
      setSecret("");
      setWebhookSecret("");
      toast.success("8x8 API secret saved");
    },
    onError: (err) => toast.error(err?.message || "Failed to save the 8x8 API secret"),
  });

  const configured = status?.configured;
  const sourceLabel =
    status?.source === "env" ? "Base44 dashboard env" : status?.source === "config" ? "in-app config" : null;

  const handleSave = () => {
    const payload = { api_secret: secret.trim() };
    if (showAdvanced) payload.webhook_secret = webhookSecret.trim();
    save.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            8x8 API Secret
          </span>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : configured ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Configured{status?.secret_last_four ? ` ••••${status.secret_last_four}` : ""}
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Not configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          One secret runs everything — SMS, voice, and inbound webhook verification. Paste your 8x8 Connect API
          token below and save. It's stored securely on the backend and is never shown again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured && (
          <Alert className="bg-green-50 border-green-200">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              An 8x8 API secret is active (source: {sourceLabel}).
              {status?.updated_by_email ? ` Last set by ${status.updated_by_email}` : ""}
              {status?.updated_at
                ? `${status?.updated_by_email ? " on" : " Last set"} ${new Date(status.updated_at).toLocaleDateString()}.`
                : status?.updated_by_email
                  ? "."
                  : ""}{" "}
              Enter a new value below to rotate it.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label className="text-sm font-medium">8x8 Connect API secret</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                type={reveal ? "text" : "password"}
                placeholder={configured ? "Enter a new secret to rotate…" : "Paste your 8x8 API secret"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                aria-label={reveal ? "Hide secret" : "Show secret"}
                aria-pressed={reveal}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleSave}
              disabled={save.isPending || secret.trim().length < 8}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Find this in 8x8 Connect → API keys. Used as the bearer token for the SMS and Voice APIs.
          </p>
        </div>

        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showAdvanced ? "Hide" : "Advanced:"} separate webhook signing secret (optional)
          </button>
          {showAdvanced && (
            <div className="mt-2">
              <Input
                type="password"
                placeholder="Optional — leave blank to reuse the API secret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Only needed if you sign 8x8 webhooks with a different secret than the API key. When blank, inbound
                webhooks are verified with the API secret above — so a single secret is all you need.
                {status?.webhook_secret_configured ? " A webhook secret is currently active." : ""}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
