import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/ui/PageHeader";
import { MessageSquare, PhoneCall, UserCheck, Phone, CalendarClock, PhoneForwarded } from "lucide-react";
import SmsConversationList from "@/components/messaging/SmsConversationList";
import ScheduledSmsList from "@/components/messaging/ScheduledSmsList";
import CallHistoryList from "@/components/voice/CallHistoryList";
import CallbackQueue from "@/components/voice/CallbackQueue";
import DutyStatusCard from "@/components/voice/DutyStatusCard";
import { callbackCount } from "@/components/voice/callbackQueue";
import { isOffDutyNow } from "@/components/voice/dutyUtils";
import { formatPhoneDisplay } from "@/components/voice/phoneUtils";
import { cn } from "@/lib/utils";

/**
 * PhoneCenter — a nurse's hub for patient texting, masked call history,
 * callbacks, scheduled texts, and on/off-duty controls. All communication goes
 * through the nurse's 8x8 work number so their personal cell is never exposed.
 */
export default function PhoneCenter() {
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: calls = [] } = useQuery({
    queryKey: ["call-logs", user?.email],
    queryFn: () => base44.entities.CallLog.filter({ nurse_email: user.email }, "-created_date", 200),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: [],
  });
  const callbacks = callbackCount(calls);

  const offNow = isOffDutyNow(user);
  const hasWorkNumber = !!user?.work_phone_number;

  // Live status chips shown in the header so a nurse sees at a glance whether
  // patients can reach them right now, and which work line they're using.
  const headerBadges = !user
    ? []
    : hasWorkNumber
      ? [
          {
            label: (
              <span className="flex items-center gap-1.5">
                <span className={cn("inline-block h-2 w-2 rounded-full", offNow ? "bg-amber-500" : "bg-green-500")} />
                {offNow ? "Off duty" : "On duty"}
              </span>
            ),
            className: offNow
              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
              : "bg-green-100 text-green-800 hover:bg-green-100",
          },
          {
            label: `Work line · ${formatPhoneDisplay(user.work_phone_number)}`,
            className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
          },
        ]
      : [
          {
            label: "No work line assigned",
            className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
          },
        ];

  const tabTriggerClass =
    "min-h-[44px] px-4 text-sm whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white";

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 pb-24 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Phone}
        iconColor="bg-blue-600"
        eyebrow="Communication"
        title="Phone Center"
        description="Text and call patients privately through your work number — your personal cell stays hidden."
        favoritePage="PhoneCenter"
        badges={headerBadges}
      />

      <Tabs defaultValue="texts" className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="texts" className={tabTriggerClass}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Texts
            </TabsTrigger>
            <TabsTrigger value="callbacks" className={tabTriggerClass}>
              <PhoneForwarded className="h-4 w-4 mr-2" />
              Callbacks
              {callbacks > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0">{callbacks}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className={tabTriggerClass}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="calls" className={tabTriggerClass}>
              <PhoneCall className="h-4 w-4 mr-2" />
              Calls
            </TabsTrigger>
            <TabsTrigger value="duty" className={tabTriggerClass}>
              <UserCheck className="h-4 w-4 mr-2" />
              Duty Status
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="texts">
          <SmsConversationList />
        </TabsContent>

        <TabsContent value="callbacks">
          <CallbackQueue />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledSmsList />
        </TabsContent>

        <TabsContent value="calls">
          <CallHistoryList />
        </TabsContent>

        <TabsContent value="duty">
          <DutyStatusCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
