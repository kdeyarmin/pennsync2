import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, Megaphone } from "lucide-react";
import NotificationPreferences from "../components/notifications/NotificationPreferences";
import AnnouncementManager from "../components/admin/AnnouncementManager";

export default function NotificationSettings() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
              <p className="text-gray-600">Manage your notification preferences</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} w-full max-w-md`}>
            <TabsTrigger value="preferences" className="gap-2">
              <Mail className="w-4 h-4" />
              Email Preferences
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="announcements" className="gap-2">
                <Megaphone className="w-4 h-4" />
                Announcements
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preferences">
            <NotificationPreferences currentUser={currentUser} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="announcements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    System-Wide Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnnouncementManager />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}