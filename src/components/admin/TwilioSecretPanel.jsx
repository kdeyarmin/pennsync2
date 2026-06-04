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
 * TwilioSecretPanel — the heart of the super admin config page: TWO fields for
 * the Twilio Account SID (shown normally) and Auth Token (password with reveal
 * toggle). Saving them stores the credentials backend-only (via saveTwilioSecret)
 * so SMS, voice, and webhook verification all work without anyone touching the
 * Base44 dashboard. The raw Auth Token is never read back — the panel only ever
 * shows whether it's set and the last 4 characters.
 */
export default function TwilioSecretPanel() {
  const queryClient = useQueryClient();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [revealToken, setRevealToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["twilio-secret-status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTwilioSecretStatus", {});
      return res?.data || res;
    },
    refetchOnWindowFocus: false,
  });

  const save = useMutation({
    mutationFn: (payload) => base44.functions.invoke("saveTwilioSecret", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilio-secret-status"] });
      setAccountSid("");
      setAuthToken("");
      setWebhookSecret("");
      toast.success("Twilio credentials saved");
    },
    onError: (err) => toast.error(err?.message || "Failed to save the Twilio credentials"),
  });

  const configured = status?.configured;
  const sourceLabel =
    status?.source === "env" ? "Base44 dashboard env" : status?.source === "config" ? "in-app config" : null;

  // Account SID must start with "AC" and be at least 10 chars; Auth Token must be >= 16 chars.
  const sidTrimmed = accountSid.trim();
  const tokenTrimmed = authToken.trim();
  const sidValid = sidTrimmed.toUpperCase().startsWith("AC") && sidTrimmed.length >= 10;
  const tokenValid = tokenTrimmed.length >= 16;
  const canSave = sidValid && tokenValid;

  const handleSave = () => {
    const payload = { account_sid: sidTrimmed, auth_token: tokenTrimmed };
    if (showAdvanced && webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();
    save.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            Twilio Credentials
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
          Your Account SID and Auth Token power SMS, voice, and inbound webhook verification.
          They're stored securely on the backend and the Auth Token is never shown again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured && (
          <Alert className="bg-green-50 border-green-200">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              Twilio credentials are active (source: {sourceLabel}).
              {status?.updated_by_email ? ` Last set by ${status.updated_by_email}` : ""}
              {status?.updated_at
                ? `${status?.updated_by_email ? " on" : " Last set"} ${new Date(status.updated_at).toLocaleDateString()}.`
                : status?.updated_by_email
                  ? "."
                  : ""}{" "}
              Enter new values below to rotate them.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label className="text-sm font-medium">Account SID</Label>
          <Input
            type="text"
            placeholder={configured ? "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            autoComplete="off"
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Starts with <code className="bg-slate-100 px-1 rounded">AC</code>. Find these in your Twilio Console → Account Info.
          </p>
        </div>

        <div>
          <Label className="text-sm font-medium">Auth Token</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                type={revealToken ? "text" : "password"}
                placeholder={configured ? "Enter a new Auth Token to rotate…" : "Paste your Auth Token"}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setRevealToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                aria-label={revealToken ? "Hide Auth Token" : "Show Auth Token"}
                aria-pressed={revealToken}
              >
                {revealToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleSave}
              disabled={save.isPending || !canSave}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Used to authenticate every SMS, voice, and webhook verification call. Min 16 characters.
          </p>
        </div>

        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showAdvanced ? "Hide" : "Advanced:"} separate webhook shared-secret (optional)
          </button>
          {showAdvanced && (
            <div className="mt-2">
              <Input
                type="password"
                placeholder="Optional — leave blank to verify with the Auth Token"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Only needed for a custom webhook shared-secret test path. Twilio normally verifies
                inbound webhooks with your Auth Token.
                {status?.webhook_secret_configured ? " A webhook secret is currently active." : ""}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
