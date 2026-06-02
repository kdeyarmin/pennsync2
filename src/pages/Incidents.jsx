import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IncidentForm from "@/components/incident/IncidentForm";
import StateReportableForm from "@/components/incident/StateReportableForm";
import IncidentRecentList from "@/components/incident/IncidentRecentList";
import GuidedIncidentReporting from "@/components/incident/GuidedIncidentReporting";

export default function Incidents() {
  const queryClient = useQueryClient();

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

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="modern-card border-l-4 border-l-red-500 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center border border-red-100 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Incident Reporting</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              Capture wound photos, report safety events, and notify clinical admins immediately
            </p>
          </div>
        </div>
      </div>

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
          <GuidedIncidentReporting />
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
    </div>
  );
}