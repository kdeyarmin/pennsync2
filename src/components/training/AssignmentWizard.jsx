import React, { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AssignmentWizard({ users = [], onAssign }) {
  const [mode, setMode] = useState("filters");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({ role: "all", discipline: "all", department: "all", business_line: "all", location: "all" });

  const options = useMemo(() => ({
    roles: [...new Set(users.map((user) => user.job_title || user.credential_type || user.role).filter(Boolean))],
    disciplines: [...new Set(users.map((user) => user.discipline || user.credential_type).filter(Boolean))],
    departments: [...new Set(users.map((user) => user.department).filter(Boolean))],
    businessLines: [...new Set(users.map((user) => user.business_line).filter(Boolean))],
    locations: [...new Set(users.map((user) => user.location).filter(Boolean))],
  }), [users]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    if (user.role === 'admin') return false;
    if (filters.role !== 'all' && (user.job_title || user.credential_type || user.role) !== filters.role) return false;
    if (filters.discipline !== 'all' && (user.discipline || user.credential_type) !== filters.discipline) return false;
    if (filters.department !== 'all' && user.department !== filters.department) return false;
    if (filters.business_line !== 'all' && user.business_line !== filters.business_line) return false;
    if (filters.location !== 'all' && user.location !== filters.location) return false;
    return true;
  }), [users, filters]);

  const toggleUser = (email) => {
    setSelectedUsers((prev) => prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Assignment wizard</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="filters">Assign by filters</SelectItem>
              <SelectItem value="selected">Assign selected employees</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-3">
            <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}><SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{options.roles.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.discipline} onValueChange={(value) => setFilters({ ...filters, discipline: value })}><SelectTrigger><SelectValue placeholder="Discipline" /></SelectTrigger><SelectContent><SelectItem value="all">All disciplines</SelectItem>{options.disciplines.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.department} onValueChange={(value) => setFilters({ ...filters, department: value })}><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{options.departments.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.business_line} onValueChange={(value) => setFilters({ ...filters, business_line: value })}><SelectTrigger><SelectValue placeholder="Business line" /></SelectTrigger><SelectContent><SelectItem value="all">All business lines</SelectItem>{options.businessLines.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.location} onValueChange={(value) => setFilters({ ...filters, location: value })}><SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{options.locations.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
          </div>

          <Button className="w-full" onClick={() => onAssign({ userEmails: mode === 'selected' ? selectedUsers : [], filters })}>
            Continue with {mode === 'selected' ? selectedUsers.length : filteredUsers.length} employee{(mode === 'selected' ? selectedUsers.length : filteredUsers.length) === 1 ? '' : 's'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Eligible employees</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-h-[700px] overflow-y-auto">
          {filteredUsers.map((user) => (
            <label key={user.email} className="flex items-start gap-3 rounded-xl border p-3 bg-white">
              <Checkbox checked={selectedUsers.includes(user.email)} onCheckedChange={() => toggleUser(user.email)} />
              <div>
                <p className="font-medium text-slate-900">{user.full_name || user.email}</p>
                <p className="text-sm text-slate-500">{user.job_title || user.credential_type || 'Employee'} • {user.department || 'No department'}</p>
                <p className="text-xs text-slate-500 mt-1">{user.business_line || 'All business lines'} • {user.location || 'No location'}</p>
              </div>
            </label>
          ))}
          {filteredUsers.length === 0 && <div className="text-sm text-slate-500">No employees match the current filters.</div>}
        </CardContent>
      </Card>
    </div>
  );
}