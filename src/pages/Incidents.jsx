import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import IncidentForm from "@/components/incident/IncidentForm";
import StateReportableForm from "@/components/incident/StateReportableForm";
import IncidentRecentList from "@/components/incident/IncidentRecentList";
import GuidedIncidentReporting from "@/components/incident/GuidedIncidentReporting";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";

export default function Incidents() {
  const queryClient = useQueryClient();
  const [guidedPatientId, setGuidedPatientId] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["incident-patients"],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list("-updated_date", 500);
      return allPatients.filter((patient) => !patient.is_archived && patient.status === "active");
    },
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["my-incidents"],
    queryFn: () => base44.entities.Incident.list("-created_date", 10),
    initialData: [],
  });

  const _isAdmin = currentUser?.role === 'admin';

  const guidedPatient = useMemo(
    () => patients.find((patient) => patient.id === guidedPatientId),
    [patients, guidedPatientId]
  );

  return (
    <PageContainer>
      <PageHeader
        icon={AlertTriangle}
        eyebrow="Patient Care"
        title="Incidents"
        description="Capture wound photos, report safety events, and notify clinical admins immediately"
        favoritePage="Incidents"
      />

      <Tabs defaultValue="report" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="report" className="min-h-[44px]">Report Incident</TabsTrigger>
          <TabsTrigger value="guided" className="min-h-[44px]">Guided Form</TabsTrigger>
          <TabsTrigger value="state-reportable" className="min-h-[44px] text-red-600 data-[state=active]:bg-red-600 data-[state=active]:text-white">State Reportable</TabsTrigger>
          <TabsTrigger value="recent" className="min-h-[44px]">Recent Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
            <IncidentForm
              patients={patients}
              currentUser={currentUser}
              onSubmitted={() => {
                queryClient.invalidateQueries({ queryKey: ["my-incidents"] });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
            />
            <IncidentRecentList incidents={incidents} />
          </div>
        </TabsContent>

        <TabsContent value="guided">
          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
              <label className="text-sm font-medium text-slate-700">Patient (required)</label>
              <SearchablePatientSelect
                patients={patients}
                value={guidedPatientId}
                onValueChange={setGuidedPatientId}
                placeholder="Select patient before reporting"
              />
              {!guidedPatientId && (
                <p className="text-xs text-amber-700">
                  Select a patient to enable the guided incident report.
                </p>
              )}
            </div>
            <GuidedIncidentReporting
              patientId={guidedPatientId}
              patientName={
                guidedPatient
                  ? `${guidedPatient.first_name || ""} ${guidedPatient.last_name || ""}`.trim()
                  : ""
              }
              physicianEmail={guidedPatient?.physician_email}
              caregiverEmail={guidedPatient?.emergency_contact_email || guidedPatient?.caregiver_email}
              onIncidentCreated={() => {
                queryClient.invalidateQueries({ queryKey: ["my-incidents"] });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="state-reportable">
          <div className="max-w-3xl mx-auto">
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">State Reportable Event</p>
                <p className="text-sm text-red-700 mt-0.5">
                  This form is for events that must be reported to the state. All required fields must be completed before submission.
                  Upon submission, agency administrators will be notified immediately.
                </p>
              </div>
            </div>
            <StateReportableForm patients={patients} currentUser={currentUser} />
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <IncidentRecentList incidents={incidents} detailed />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}