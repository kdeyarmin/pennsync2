import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IncidentForm from "@/components/incident/IncidentForm";
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
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-8 h-8" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Incident Reporting</h1>
            <p className="text-sm sm:text-base text-red-50">
              Capture wound photos, report safety events, and notify clinical admins immediately
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="report" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="report" className="min-h-[44px]">Report Incident</TabsTrigger>
          <TabsTrigger value="guided" className="min-h-[44px]">Guided Form</TabsTrigger>
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

        <TabsContent value="recent">
          <IncidentRecentList incidents={incidents} detailed />
        </TabsContent>
      </Tabs>
    </div>
  );
}