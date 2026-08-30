import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import EmployeeCompetencyProfile from "@/components/training/EmployeeCompetencyProfile";

const canSupervise = (user) => user?.role === 'admin' || user?.account_type === 'agency_admin' || user?.account_type === 'super_admin' || user?.training_role === 'supervisor' || /manager|director|supervisor|lead/i.test(user?.job_title || '');

export default function ClinicalSkillsChecklist() {
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useQuery({ queryKey: ["clinical-skills-users"], queryFn: () => base44.entities.User.list('-created_date', 500), initialData: [] });
  const teamMembers = useMemo(() => users.filter((user) => {
    if (!currentUser || !user.email || user.role === 'admin') return false;
    if (currentUser.account_type === 'super_admin') return true;
    if (currentUser.account_type === 'agency_admin' && currentUser.agency_name) return user.agency_name === currentUser.agency_name;
    if (currentUser.department && user.department === currentUser.department) return true;
    if (currentUser.location && user.location === currentUser.location) return true;
    if (currentUser.business_line && user.business_line === currentUser.business_line) return true;
    return false;
  }).filter((user) => {
    const query = search.toLowerCase();
    return !query || user.full_name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
  }), [currentUser, users, search]);
  const selectedEmployee = teamMembers.find((user) => user.email === selectedEmail) || teamMembers[0];

  if (currentUser && !canSupervise(currentUser)) return <div className="max-w-3xl mx-auto p-6 text-slate-600">This clinical skills checklist module is available to supervisors, managers, and admins only.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Clinical Skills Checklists</h1>
        <p className="text-blue-100">Supervisors can sign off patient-care competencies, add observation notes, and attach supporting files directly to each employee’s competency record.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9" />
            </div>
            <div className="space-y-2 max-h-[720px] overflow-y-auto">
              {teamMembers.map((member) => (
                <button key={member.email} type="button" onClick={() => setSelectedEmail(member.email)} className={`w-full text-left rounded-2xl border p-4 ${selectedEmployee?.email === member.email ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`}>
                  <p className="font-medium text-slate-900">{member.full_name}</p>
                  <p className="text-sm text-slate-500">{member.job_title || member.credential_type || member.role}</p>
                  <p className="text-xs text-slate-500 mt-1">{member.department || 'No department'} • {member.location || 'No location'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        {selectedEmployee ? <EmployeeCompetencyProfile employee={selectedEmployee} currentUser={currentUser} /> : <Card><CardContent className="p-10 text-center text-slate-500">No employees available for observation.</CardContent></Card>}
      </div>
    </div>
  );
}