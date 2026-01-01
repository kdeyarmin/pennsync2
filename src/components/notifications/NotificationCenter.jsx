import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  FileText,
  Shield,
  Users,
  GraduationCap,
  X
} from "lucide-react";
import { formatEastern, formatRelativeTime } from "@/components/utils/timezone";
import { Link } from "react-router-dom";

export default function NotificationCenter({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => base44.entities.Notification.filter(
      { user_email: currentUser?.email },
      '-created_date',
      100
    ),
    initialData: [],
    enabled: !!currentUser?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, {
      is_read: true,
      read_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => 
        base44.entities.Notification.update(id, {
          is_read: true,
          read_at: new Date().toISOString()
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotification(null);
    },
  });

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report_ready':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'compliance_alert':
        return <Shield className="w-5 h-5 text-orange-600" />;
      case 'critical_alert':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'patient_alert':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'task_assigned':
        return <CheckCheck className="w-5 h-5 text-green-600" />;
      case 'training_due':
        return <GraduationCap className="w-5 h-5 text-indigo-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    setSelectedNotification(notification);
  };

  const NotificationItem = ({ notification }) => (
    <div
      onClick={() => handleNotificationClick(notification)}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">
              {formatRelativeTime(notification.created_date)}
            </span>
            {notification.priority !== 'low' && notification.priority !== 'medium' && (
              <Badge className={getPriorityColor(notification.priority)}>
                {notification.priority}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadNotifications.length > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {unreadNotifications.length} new
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isLoading}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-hidden">
          <Tabs defaultValue="unread" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-2 rounded-none border-b flex-shrink-0">
              <TabsTrigger value="unread">
                Unread ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="unread" className="m-0">
                {unreadNotifications.length > 0 ? (
                  unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No unread notifications</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="m-0">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getNotificationIcon(selectedNotification.type)}
                {selectedNotification.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  {formatEastern(selectedNotification.created_date, 'PPpp')}
                </p>
                {selectedNotification.priority !== 'low' && selectedNotification.priority !== 'medium' && (
                  <Badge className={getPriorityColor(selectedNotification.priority)}>
                    {selectedNotification.priority} priority
                  </Badge>
                )}
              </div>
              <p className="text-gray-900">{selectedNotification.message}</p>
              <div className="flex gap-2 pt-4 border-t">
                {selectedNotification.action_url && (
                  <Link to={selectedNotification.action_url} onClick={() => setSelectedNotification(null)}>
                    <Button>
                      {selectedNotification.action_label || 'View'}
                    </Button>
                  </Link>
                )}
                {!selectedNotification.is_read && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      markAsReadMutation.mutate(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as read
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => deleteNotificationMutation.mutate(selectedNotification.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}