import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Users
} from "lucide-react";
import { format } from "date-fns";

export default function UserManagement({ users, currentUser }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "user",
    careScope: "home_health"
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowEditDialog(false);
      setEditingUser(null);
      alert('User updated successfully');
    },
    onError: (error) => {
      alert('Failed to update user: ' + error.message);
    }
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      const careScopeLabel = data.careScope === 'home_health' 
        ? 'Home Health' 
        : data.careScope === 'hospice' 
        ? 'Hospice' 
        : 'Home Health & Hospice';

      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: 'Invitation to Join Penn Sync',
        body: `You have been invited to join Penn Sync as a ${data.role === 'admin' ? 'Administrator' : 'User'}.

Care Scope: ${careScopeLabel}
${data.careScope === 'home_health' ? '\nYou will be documenting Home Health visits and following Home Health Medicare compliance requirements.' : ''}
${data.careScope === 'hospice' ? '\nYou will be documenting Hospice visits and following Hospice Medicare compliance requirements.' : ''}
${data.careScope === 'both' ? '\nYou will be able to document both Home Health and Hospice visits.' : ''}

Please visit Penn Sync to create your account and start documenting patient visits.

Role: ${data.role === 'admin' ? 'Administrator' : 'User'}

IMPORTANT: When you first log in, please complete your profile with:
- Professional credentials (RN, LPN, etc.)
- License number
- Contact phone number

If you have any questions, please contact your administrator.`,
        from_name: 'Penn Sync Admin'
      });
    },
    onSuccess: () => {
      alert(`Invitation sent successfully to ${inviteData.email}!`);
      setShowInviteDialog(false);
      setInviteData({ email: "", role: "user", careScope: "home_health" });
    },
    onError: (error) => {
      alert('Failed to send invitation: ' + error.message);
    }
  });

  const handleInviteUser = () => {
    if (!inviteData.email) {
      alert('Please enter an email address');
      return;
    }
    sendInviteMutation.mutate(inviteData);
  };

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      full_name: user.full_name || '',
      phone: user.phone || '',
      credentials: user.credentials || '',
      license_number: user.license_number || '',
      care_scope: user.care_scope || 'home_health',
      role: user.role
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    
    const { id, ...userData } = editingUser;
    updateUserMutation.mutate({ userId: id, data: userData });
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Invite User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite New User
            </Button>
          </div>

          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-1">Penn Sync User Management</p>
              <p className="text-sm">Manage user roles, permissions, and care scope assignments. Care scope determines which Medicare compliance templates users see.</p>
            </AlertDescription>
          </Alert>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Care Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <span className="font-medium">{user.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.phone || 'Not set'}</TableCell>
                    <TableCell className="text-sm">
                      {user.credentials || 'Not set'}
                      {user.license_number && (
                        <div className="text-xs text-gray-500">Lic: {user.license_number}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.care_scope ? (
                        <Badge
                          variant="outline"
                          className={
                            user.care_scope === 'home_health'
                              ? 'border-blue-300 text-blue-700'
                              : user.care_scope === 'hospice'
                              ? 'border-purple-300 text-purple-700'
                              : 'border-green-300 text-green-700'
                          }
                        >
                          {user.care_scope === 'home_health' ? '🏠 Home Health' : user.care_scope === 'hospice' ? '💜 Hospice' : '🏥 Both'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-300 text-red-700">
                          ⚠️ Not Set
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.phone && user.credentials && user.care_scope ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-yellow-600" title="Incomplete profile" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User to Penn Sync</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to your Penn Sync account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="inviteEmail">Email Address *</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="inviteRole">Role *</Label>
              <Select value={inviteData.role} onValueChange={(value) => setInviteData({...inviteData, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="inviteCareScope">Care Scope *</Label>
              <Select value={inviteData.careScope} onValueChange={(value) => setInviteData({...inviteData, careScope: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_health">🏠 Home Health Only</SelectItem>
                  <SelectItem value="hospice">💜 Hospice Only</SelectItem>
                  <SelectItem value="both">🏥 Both Home Health & Hospice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={sendInviteMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label>Credentials</Label>
                <Input
                  value={editingUser.credentials}
                  onChange={(e) => setEditingUser({...editingUser, credentials: e.target.value})}
                  placeholder="RN, LPN, MSW, etc."
                />
              </div>

              <div>
                <Label>License Number</Label>
                <Input
                  value={editingUser.license_number}
                  onChange={(e) => setEditingUser({...editingUser, license_number: e.target.value})}
                />
              </div>

              <div>
                <Label>Role</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({...editingUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Care Scope</Label>
                <Select value={editingUser.care_scope} onValueChange={(value) => setEditingUser({...editingUser, care_scope: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_health">🏠 Home Health Only</SelectItem>
                    <SelectItem value="hospice">💜 Hospice Only</SelectItem>
                    <SelectItem value="both">🏥 Both Home Health & Hospice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUserMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}