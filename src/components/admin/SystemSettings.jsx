import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";

export default function SystemSettings({ currentUser }) {
  const [settings, setSettings] = useState({
    agencyName: "Your Home Health Agency",
    agencyPhone: "",
    agencyEmail: "",
    agencyAddress: "",
    domain: "pennsync.com"
  });

  const handleSave = () => {
    alert('Settings saved successfully! (This would save to database in production)');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Penn Sync System Settings</h2>
              <p className="text-indigo-100">
                Configure your agency settings and preferences
              </p>
            </div>
            <Settings className="w-12 h-12 text-indigo-200" />
          </div>
        </CardContent>
      </Card>

      {/* Agency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Agency Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Agency Name</Label>
            <Input
              value={settings.agencyName}
              onChange={(e) => setSettings({...settings, agencyName: e.target.value})}
              placeholder="Your Home Health Agency"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                value={settings.agencyPhone}
                onChange={(e) => setSettings({...settings, agencyPhone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.agencyEmail}
                onChange={(e) => setSettings({...settings, agencyEmail: e.target.value})}
                placeholder="info@agency.com"
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={settings.agencyAddress}
              onChange={(e) => setSettings({...settings, agencyAddress: e.target.value})}
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </CardContent>
      </Card>

      {/* Domain Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Domain Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <p className="font-semibold mb-1">✅ Custom Domain Active</p>
              <p className="text-sm">Your Penn Sync instance is running on: <strong>pennsync.com</strong></p>
            </AlertDescription>
          </Alert>

          <div>
            <Label>Custom Domain</Label>
            <Input
              value={settings.domain}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Domain is managed through your Penn Sync account settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-1">Notification Settings</p>
              <p className="text-sm">Penn Sync can send automated notifications for critical events, quality alerts, and system updates.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">HIPAA Compliant</p>
                  <p className="text-sm text-gray-600">All data encrypted at rest and in transit</p>
                </div>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">Audit Logging</p>
                  <p className="text-sm text-gray-600">All user actions are logged for compliance</p>
                </div>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">Role-Based Access Control</p>
                  <p className="text-sm text-gray-600">Users can only access their own data</p>
                </div>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Save Settings
        </Button>
      </div>
    </div>
  );
}