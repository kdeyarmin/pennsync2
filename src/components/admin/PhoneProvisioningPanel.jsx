import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Save, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { maskPhone, formatPhoneDisplay } from "@/components/voice/phoneUtils";

/**
 * PhoneProvisioningPanel — admin-only. Assigns 8x8 work numbers + private cell
 * bridge targets to nurses and configures agency-wide phone settings.
 */
export default function PhoneProvisioningPanel() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = currentUser?.role === "admin";

  const { data: users = [] } = useQuery({
    queryKey: ["phone-users"],
    queryFn: () => base44.entities.User.list("full_name", 200),
    enabled: isAdmin,
    initialData: [],
  });

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => base44.entities.AgencySettings.list("-created_date", 1),
    enabled: isAdmin,
    initialData: [],
  });
  const settings = settingsArr[0];

  const [agency, setAgency] = useState({
    main_office_number_e164: "",
    eight_x_eight_sms_subaccount_id: "",
    eight_x_eight_voice_subaccount_id: "",
    eight_x_eight_voice_api_base: "",
    eight_x_eight_region: "us",
    default_off_duty_template: "",
    sms_messaging_enabled: true,
  });
  const [inputs, setInputs] = useState({}); // email -> { work, cell }

  useEffect(() => {
    if (settings) {
      setAgency({
        main_office_number_e164: settings.main_office_number_e164 || "",
        eight_x_eight_sms_subaccount_id: settings.eight_x_eight_sms_subaccount_id || "",
        eight_x_eight_voice_subaccount_id: settings.eight_x_eight_voice_subaccount_id || "",
        eight_x_eight_voice_api_base: settings.eight_x_eight_voice_api_base || "",
        eight_x_eight_region: settings.eight_x_eight_region || "us",
        default_off_duty_template: settings.default_off_duty_template || "",
        sms_messaging_enabled: settings.sms_messaging_enabled ?? true,
      });
    }
  }, [settings]);

  const saveAgency = useMutation({
    mutationFn: () =>
      settings?.id
        ? base44.entities.AgencySettings.update(settings.id, agency)
        : base44.entities.AgencySettings.create(agency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      toast.success("Agency phone settings saved");
    },
    onError: (err) => toast.error(err?.message || "Failed to save settings"),
  });

  const provision = useMutation({
    mutationFn: (payload) => base44.functions.invoke("provisionNurseWorkNumber", payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["phone-users"] });
      setInputs((prev) => ({ ...prev, [vars.target_user_email]: { work: "", cell: "" } }));
      toast.success("Work number provisioned");
    },
    onError: (err) => toast.error(err?.message || "Failed to provision number"),
  });

  if (!isAdmin) return null;

  const setInput = (email, key, value) =>
    setInputs((prev) => ({ ...prev, [email]: { ...prev[email], [key]: value } }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" />
            8x8 Phone — Agency Settings
          </CardTitle>
          <CardDescription>
            Main office number, off-duty defaults, and 8x8 sub-account configuration. API keys and the
            webhook secret are set as backend secrets in the Base44 dashboard, not here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Main office number (E.164)</Label>
              <Input
                placeholder="+12155550100"
                value={agency.main_office_number_e164}
                onChange={(e) => setAgency((a) => ({ ...a, main_office_number_e164: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Off-duty calls transfer here; texts reference it.</p>
            </div>
            <div>
              <Label className="text-sm font-medium">8x8 region</Label>
              <Input
                placeholder="us"
                value={agency.eight_x_eight_region}
                onChange={(e) => setAgency((a) => ({ ...a, eight_x_eight_region: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">SMS sub-account ID</Label>
              <Input
                value={agency.eight_x_eight_sms_subaccount_id}
                onChange={(e) => setAgency((a) => ({ ...a, eight_x_eight_sms_subaccount_id: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Voice sub-account ID</Label>
              <Input
                value={agency.eight_x_eight_voice_subaccount_id}
                onChange={(e) => setAgency((a) => ({ ...a, eight_x_eight_voice_subaccount_id: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Voice API base URL</Label>
              <Input
                placeholder="https://voice.wavecell.com/api/v1"
                value={agency.eight_x_eight_voice_api_base}
                onChange={(e) => setAgency((a) => ({ ...a, eight_x_eight_voice_api_base: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Used for outbound click-to-call origination (from your 8x8 voice sub-account).</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Default off-duty message</Label>
            <Textarea
              rows={2}
              placeholder="Your nurse is currently off duty. Please call our main office at {office} for assistance."
              value={agency.default_off_duty_template}
              onChange={(e) => setAgency((a) => ({ ...a, default_off_duty_template: e.target.value }))}
              className="mt-1 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">Used when a nurse hasn't set their own. {"{office}"} inserts the main office number.</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-semibold">SMS messaging enabled</Label>
              <p className="text-xs text-gray-600">Agency-wide kill switch for outbound texting.</p>
            </div>
            <Switch
              checked={agency.sms_messaging_enabled}
              onCheckedChange={(v) => setAgency((a) => ({ ...a, sms_messaging_enabled: v }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveAgency.mutate()} disabled={saveAgency.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              Save Agency Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" />
            Nurse Work Numbers
          </CardTitle>
          <CardDescription>
            Assign each nurse a dedicated 8x8 work number and the private cell it bridges to. The virtual
            number must already be purchased in 8x8 Connect with its webhooks pointed at this app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Personal cell numbers are never displayed in full — only the last 4 digits are shown once set.
            </AlertDescription>
          </Alert>
          {users.map((u) => (
            <div key={u.email} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.full_name || u.email}</p>
                  <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.work_phone_number ? (
                    <Badge className="bg-green-100 text-green-800">Work: {formatPhoneDisplay(u.work_phone_number)}</Badge>
                  ) : (
                    <Badge variant="outline">No work number</Badge>
                  )}
                  {u.personal_cell_e164 && (
                    <Badge className="bg-gray-200 text-gray-700">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Cell {maskPhone(u.personal_cell_e164)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Work number +1…"
                  value={inputs[u.email]?.work || ""}
                  onChange={(e) => setInput(u.email, "work", e.target.value)}
                />
                <Input
                  placeholder="Personal cell +1…"
                  value={inputs[u.email]?.cell || ""}
                  onChange={(e) => setInput(u.email, "cell", e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={provision.isPending || (!inputs[u.email]?.work && !inputs[u.email]?.cell)}
                  onClick={() =>
                    provision.mutate({
                      target_user_email: u.email,
                      work_phone_number: inputs[u.email]?.work || undefined,
                      personal_cell_e164: inputs[u.email]?.cell || undefined,
                    })
                  }
                >
                  <Save className="w-4 h-4 mr-2" />
                  {u.work_phone_number ? "Update" : "Assign"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
