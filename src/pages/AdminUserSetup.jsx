import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, Shield, AlertTriangle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function AdminUserSetup() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
    enabled: currentUser?.role === 'admin',
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return await base44.functions.invoke('createUserWithTempPassword', { email, full_name: email.split('@')[0], role });
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}. They will be auto-approved when they sign up.`);
      setInviteEmail("");
      setInviteRole("user");
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error) => {
      toast.error(`Failed to invite user: ${error.message}`);
    },
  });

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <p className="font-semibold mb-2">Access Denied</p>
            <p>Only administrators can access this page.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          User Setup & Invitations
        </h1>
        <p className="text-gray-600">Manage user invitations and setup new team members</p>
      </div>

      {/* Invite New User */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Invite New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="role" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleInviteUser}
              disabled={inviteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
            >
              <Mail className="w-4 h-4 mr-2" />
              {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No users yet. Start by inviting your team members above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'outline'}
                    className="ml-4 flex-shrink-0"
                  >
                    {user.role === 'admin' ? (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        User
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}