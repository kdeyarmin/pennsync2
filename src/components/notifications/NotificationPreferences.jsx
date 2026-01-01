import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Mail, Clock, Check } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ currentUser }) {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState("");

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences', currentUser?.email],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationPreference.filter({
        user_email: currentUser?.email
      });
      return prefs[0] || {
        user_email: currentUser?.email,
        email_notifications_enabled: true,
        preferences: {
          report_ready: true,
          compliance_alert: true,
          critical_alert: true,
          patient_alert: true,
          task_assigned: true,
          training_due: true,
          system_update: false,
          info: false
        },
        quiet_hours: {
          enabled: false,
          start_time: "22:00",
          end_time: "08:00"
        },
        digest_mode: "instant"
      };
    },
    enabled: !!currentUser?.email,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (updatedPrefs) => {
      if (preferences?.id) {
        return await base44.entities.NotificationPreference.update(preferences.id, updatedPrefs);
      } else {
        return await base44.entities.NotificationPreference.create(updatedPrefs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Notification preferences saved');
      setSaveMessage("Preferences saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    },
    onError: (error) => {
      toast.error('Failed to save preferences');
      setSaveMessage("Failed to save preferences. Please try again.");
    }
  });

  const handleToggle = (key, value) => {
    const updatedPrefs = {
      ...preferences,
      preferences: {
        ...preferences.preferences,
        [key]: value
      }
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleMasterToggle = (value) => {
    const updatedPrefs = {
      ...preferences,
      email_notifications_enabled: value
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleDigestModeChange = (value) => {
    const updatedPrefs = {
      ...preferences,
      digest_mode: value
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleQuietHoursToggle = (value) => {
    const updatedPrefs = {
      ...preferences,
      quiet_hours: {
        ...preferences.quiet_hours,
        enabled: value
      }
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleQuietHoursChange = (field, value) => {
    const updatedPrefs = {
      ...preferences,
      quiet_hours: {
        ...preferences.quiet_hours,
        [field]: value
      }
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    { key: 'report_ready', label: 'Report Generation', description: 'When AI-generated reports are ready' },
    { key: 'compliance_alert', label: 'Compliance Alerts', description: 'Documentation or regulatory compliance issues' },
    { key: 'critical_alert', label: 'Critical Alerts', description: 'Urgent patient or system alerts' },
    { key: 'patient_alert', label: 'Patient Alerts', description: 'Patient risk and monitoring alerts' },
    { key: 'task_assigned', label: 'Task Assignments', description: 'When tasks are assigned to you' },
    { key: 'training_due', label: 'Training Due', description: 'Upcoming or overdue training modules' },
    { key: 'system_update', label: 'System Updates', description: 'Platform updates and new features' },
    { key: 'info', label: 'General Information', description: 'Non-critical informational messages' }
  ];

  return (
    <div className="space-y-6">
      {saveMessage && (
        <Alert className="bg-green-50 border-green-300">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-900">{saveMessage}</AlertDescription>
        </Alert>
      )}

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Control whether you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="master-toggle" className="text-base font-medium">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Turn off to stop all email notifications
              </p>
            </div>
            <Switch
              id="master-toggle"
              checked={preferences?.email_notifications_enabled}
              onCheckedChange={handleMasterToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications to receive via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex-1">
                <Label htmlFor={type.key} className="text-sm font-medium cursor-pointer">
                  {type.label}
                </Label>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </div>
              <Switch
                id={type.key}
                checked={preferences?.preferences?.[type.key]}
                onCheckedChange={(value) => handleToggle(type.key, value)}
                disabled={!preferences?.email_notifications_enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Digest Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Email Delivery Frequency</CardTitle>
          <CardDescription>
            Choose how often to receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences?.digest_mode}
            onValueChange={handleDigestModeChange}
            disabled={!preferences?.email_notifications_enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant (as they happen)</SelectItem>
              <SelectItem value="hourly">Hourly Digest</SelectItem>
              <SelectItem value="daily">Daily Digest</SelectItem>
              <SelectItem value="weekly">Weekly Digest</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours-toggle">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours-toggle"
              checked={preferences?.quiet_hours?.enabled}
              onCheckedChange={handleQuietHoursToggle}
              disabled={!preferences?.email_notifications_enabled}
            />
          </div>

          {preferences?.quiet_hours?.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label htmlFor="start-time" className="text-sm">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={preferences?.quiet_hours?.start_time}
                  onChange={(e) => handleQuietHoursChange('start_time', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-sm">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={preferences?.quiet_hours?.end_time}
                  onChange={(e) => handleQuietHoursChange('end_time', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}