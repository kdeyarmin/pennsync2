import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, PhoneCall, UserCheck, Phone, CalendarClock, PhoneForwarded } from "lucide-react";
import SmsConversationList from "@/components/messaging/SmsConversationList";
import ScheduledSmsList from "@/components/messaging/ScheduledSmsList";
import CallHistoryList from "@/components/voice/CallHistoryList";
import CallbackQueue from "@/components/voice/CallbackQueue";
import DutyStatusCard from "@/components/voice/DutyStatusCard";
import { callbackCount } from "@/components/voice/callbackQueue";

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

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="page-header-gradient bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 mb-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Phone Center</h1>
            <p className="text-blue-100 mt-1">Text and call patients privately through your work number</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="texts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1">
          <TabsTrigger value="texts" className="min-h-[44px]">
            <MessageSquare className="h-4 w-4 mr-2" />
            Texts
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="min-h-[44px]">
            <PhoneForwarded className="h-4 w-4 mr-2" />
            Callbacks
            {callbacks > 0 && <Badge className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0">{callbacks}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="min-h-[44px]">
            <CalendarClock className="h-4 w-4 mr-2" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="calls" className="min-h-[44px]">
            <PhoneCall className="h-4 w-4 mr-2" />
            Calls
          </TabsTrigger>
          <TabsTrigger value="duty" className="min-h-[44px]">
            <UserCheck className="h-4 w-4 mr-2" />
            Duty Status
          </TabsTrigger>
        </TabsList>

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
