import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

import RequestTimeOffForm from "@/components/timeoff/RequestTimeOffForm";
import MyTimeOffList from "@/components/timeoff/MyTimeOffList";
import TimeOffSummaryCards from "@/components/timeoff/TimeOffSummaryCards";
import PendingApprovalsQueue from "@/components/timeoff/PendingApprovalsQueue";
import TeamTimeOffCalendar from "@/components/timeoff/TeamTimeOffCalendar";
import TeamRequestsTable from "@/components/timeoff/TeamRequestsTable";
import WhoIsOffPanel from "@/components/timeoff/WhoIsOffPanel";

export default function TimeOff() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";
  const isApprover = isAdmin || currentUser?.is_manager === true;

  // The current user's own requests (for the "My Time Off" tab).
  const { data: myRequests = [] } = useQuery({
    queryKey: ["timeoff", "mine", currentUser?.email],
    queryFn: () =>
      base44.entities.TimeOffRequest.filter({ employee_email: currentUser.email }, "-start_date", 200),
    initialData: [],
    enabled: !!currentUser?.email,
  });

  // Requests this user can review/oversee. RLS scopes the result automatically:
  // admins see everything; managers see their direct reports' (plus their own).
  const { data: teamRequests = [] } = useQuery({
    queryKey: ["timeoff", "team", currentUser?.email],
    queryFn: () => base44.entities.TimeOffRequest.list("-start_date", 1000),
    initialData: [],
    enabled: !!currentUser?.email && isApprover,
  });

  // Candidate approvers for the request form. User listing is admin-oriented;
  // if it's not permitted for this user we fall back gracefully to "route to admins".
  const { data: approvers = [] } = useQuery({
    queryKey: ["timeoff", "approvers"],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list("full_name", 500);
        return users
          .filter((u) => u.email && (u.role === "admin" || u.is_manager === true))
          .filter((u) => u.email !== currentUser?.email)
          .map((u) => ({ email: u.email, name: u.full_name || u.email, role: u.role }));
      } catch {
        return [];
      }
    },
    initialData: [],
    enabled: !!currentUser?.email,
  });

  // For managers, scope the calendar/who's-off views to requests they oversee
  // (their reports) rather than their own. Admins see all.
  const teamForViews = useMemo(
    () =>
      isAdmin
        ? teamRequests
        : teamRequests.filter((r) => r.employee_email !== currentUser?.email),
    [teamRequests, isAdmin, currentUser?.email]
  );

  const pendingCount = teamRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="modern-card border-l-4 border-l-blue-500 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Time Off</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              Request time off, track approvals, and {isApprover ? "manage your team's coverage" : "see where your requests stand"}.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={isApprover ? "approvals" : "mine"} className="space-y-6">
        <TabsList className={`grid w-full ${isApprover ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"}`}>
          <TabsTrigger value="mine" className="min-h-[44px]">
            My Time Off
          </TabsTrigger>
          {isApprover && (
            <>
              <TabsTrigger value="approvals" className="min-h-[44px] relative">
                Approvals
                {pendingCount > 0 && (
                  <Badge className="ml-2 bg-amber-500 text-white h-5 min-w-[20px] px-1.5">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="min-h-[44px]">
                Team Calendar
              </TabsTrigger>
              <TabsTrigger value="all" className="min-h-[44px]">
                All Requests
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="mine" className="space-y-6">
          <TimeOffSummaryCards requests={myRequests} />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 items-start">
            <RequestTimeOffForm
              currentUser={currentUser}
              approvers={approvers}
              defaultManagerEmail={currentUser?.manager_email || ""}
            />
            <MyTimeOffList requests={myRequests} />
          </div>
        </TabsContent>

        {isApprover && (
          <>
            <TabsContent value="approvals">
              <PendingApprovalsQueue
                requests={teamRequests}
                allRequests={teamRequests}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6 items-start">
                <TeamTimeOffCalendar requests={teamForViews} />
                <WhoIsOffPanel requests={teamForViews} />
              </div>
            </TabsContent>

            <TabsContent value="all">
              <TeamRequestsTable requests={teamForViews} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
