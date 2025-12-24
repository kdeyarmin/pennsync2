import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { format } from "date-fns";

export default function AnnouncementsWidget() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const result = await base44.entities.Announcement.filter({ is_active: true }, '-created_date');
      console.log('Active announcements:', result);
      return result || [];
    },
    initialData: [],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="w-4 h-4" />;
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'success': return 'bg-green-100 text-green-800 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  console.log('Announcements to display:', announcements);

  if (announcements.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 text-center">No announcements at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[200px] pr-3">
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-3 rounded-lg border-l-4 ${
                  announcement.type === 'urgent' ? 'border-l-red-500 bg-red-50' :
                  announcement.type === 'success' ? 'border-l-green-500 bg-green-50' :
                  announcement.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <div className={`mt-0.5 ${
                    announcement.type === 'urgent' ? 'text-red-600' :
                    announcement.type === 'success' ? 'text-green-600' :
                    announcement.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {getTypeIcon(announcement.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{announcement.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}