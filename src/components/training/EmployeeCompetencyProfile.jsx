import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SkillsObservationForm from "@/components/training/SkillsObservationForm";

export default function EmployeeCompetencyProfile({ employee, currentUser }) {
  const [selectedCompetencyId, setSelectedCompetencyId] = useState("");

  const { data: competencies = [] } = useQuery({
    queryKey: ["competencies", employee?.email],
    queryFn: () => base44.entities.Competency.list('-created_date', 300),
    enabled: !!employee?.email,
    initialData: []
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["skills-checklists"],
    queryFn: () => base44.entities.SkillsChecklist.list('-created_date', 300),
    initialData: []
  });

  const { data: observations = [] } = useQuery({
    queryKey: ["skill-observations", employee?.email],
    queryFn: () => base44.entities.SkillObservation.filter({ user_id: employee.email }, '-observed_at', 500),
    enabled: !!employee?.email,
    initialData: []
  });

  const eligibleCompetencies = useMemo(() => competencies.filter((competency) => {
    const targets = competency.role_target || [];
    const employeeRole = employee?.discipline || employee?.job_title || employee?.credential_type || employee?.role;
    return competency.active !== false && (targets.length === 0 || targets.includes(employeeRole) || targets.includes(employee?.role));
  }), [competencies, employee]);

  const selectedCompetency = eligibleCompetencies.find((competency) => competency.id === selectedCompetencyId) || eligibleCompetencies[0];
  const checklist = checklists.find((item) => item.competency_id === selectedCompetency?.id && item.active !== false);
  const competencyObservations = observations.filter((observation) => observation.competency_id === selectedCompetency?.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee competency profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{employee.full_name}</h2>
            <p className="text-sm text-slate-500">{employee.job_title || employee.credential_type || employee.role} • {employee.department || "No department"}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {eligibleCompetencies.map((competency) => {
              const count = observations.filter((observation) => observation.competency_id === competency.id && observation.met_criteria).length;
              return (
                <button key={competency.id} type="button" onClick={() => setSelectedCompetencyId(competency.id)} className={`text-left rounded-2xl border p-4 ${selectedCompetency?.id === competency.id ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{competency.name}</p>
                      <p className="text-sm text-slate-500">{competency.category}</p>
                    </div>
                    <Badge variant="outline">{count}/{competency.required_observations_count || 1}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedCompetency && checklist && (
        <SkillsObservationForm
          employee={employee}
          competency={selectedCompetency}
          checklist={checklist}
          observations={competencyObservations}
          currentUser={currentUser}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent observation notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {observations.length === 0 ? (
            <div className="text-sm text-slate-500">No observation notes recorded yet.</div>
          ) : (
            observations.slice(0, 12).map((observation) => (
              <div key={observation.id} className="rounded-2xl border p-4 bg-white">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{observation.patient_name || "Clinical observation"}</p>
                    <p className="text-sm text-slate-500">Observed by {observation.supervisor_name} on {new Date(observation.observed_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={observation.met_criteria ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {observation.met_criteria ? "met criteria" : "needs follow-up"}
                  </Badge>
                </div>
                {observation.notes && <p className="text-sm text-slate-700">{observation.notes}</p>}
                {observation.observation_note_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {observation.observation_note_urls.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline">Observation file {index + 1}</a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}