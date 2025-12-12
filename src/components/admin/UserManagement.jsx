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
  Users,
  Loader2,
  Clock
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
    full_name: "",
    role: "user",
    care_scope: "home_health",
    phone: "",
    credentials: ""
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

  // Create user with temp password mutation
  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const { createUserWithTempPassword } = await import('@/functions/createUserWithTempPassword');
      const response = await createUserWithTempPassword(data);
      return response.data;
    },
    onSuccess: (data) => {
      alert(`User created successfully! Welcome email sent to ${inviteData.email}\n\nTemporary Password: ${data.temp_password}\n\n(Also sent via email with user manual attached)`);
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowInviteDialog(false);
      setInviteData({ 
        email: "", 
        full_name: "", 
        role: "user", 
        care_scope: "home_health",
        phone: "",
        credentials: ""
      });
    },
    onError: (error) => {
      alert('Failed to create user: ' + error.message);
    }
  });

  const handleCreateUser = () => {
    if (!inviteData.email || !inviteData.full_name) {
      alert('Please enter email and full name');
      return;
    }
    createUserMutation.mutate(inviteData);
  };

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      full_name: user.full_name || '',
      phone: user.phone || '',
      credentials: user.credentials || '',
      license_number: user.license_number || '',
      care_scope: user.care_scope || 'home_health',
      role: user.role,
      is_approved: user.is_approved ?? false
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    
    const { id, ...userData } = editingUser;
    updateUserMutation.mutate({ userId: id, data: userData });
  };

  const handleApproveUser = (userId) => {
    if (confirm('Approve this user to access the system?')) {
      updateUserMutation.mutate({ userId, data: { is_approved: true } });
    }
  };

  const handleRevokeAccess = (userId) => {
    if (confirm('Revoke access for this user? They will no longer be able to use the system.')) {
      updateUserMutation.mutate({ userId, data: { is_approved: false } });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingUsers = users.filter(u => !u.is_approved && u.role !== 'admin');
  const approvedUsers = users.filter(u => u.is_approved || u.role === 'admin');

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
              Create New User
            </Button>
          </div>

          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-1">Penn Sync User Management</p>
              <p className="text-sm">Manage user roles, permissions, and care scope assignments. Care scope determines which Medicare compliance templates users see.</p>
            </AlertDescription>
          </Alert>

          {/* Pending Approvals Alert */}
          {pendingUsers.length > 0 && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-300">
              <Clock className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <p className="font-semibold">
                  {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-sm mt-1">New users cannot access the system until approved by an administrator.</p>
              </AlertDescription>
            </Alert>
          )}

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
                  <TableHead>Approval</TableHead>
                  <TableHead>Profile</TableHead>
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
                      {user.is_approved || user.role === 'admin' ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
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
                        {!user.is_approved && user.role !== 'admin' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                            title="Approve user"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {user.is_approved && user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeAccess(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Revoke access"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
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

      {/* Create User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User Account</DialogTitle>
            <DialogDescription>
              Create a new user account with temporary password. User will receive a welcome email with login credentials and user manual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={inviteData.full_name}
                  onChange={(e) => setInviteData({...inviteData, full_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="credentials">Credentials</Label>
                <Input
                  id="credentials"
                  placeholder="RN, LPN, MSW, etc."
                  value={inviteData.credentials}
                  onChange={(e) => setInviteData({...inviteData, credentials: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Select value={inviteData.care_scope} onValueChange={(value) => setInviteData({...inviteData, care_scope: value})}>
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

            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-1">What happens next:</p>
                <ul className="text-sm space-y-1">
                  <li>✓ Account created with secure temporary password</li>
                  <li>✓ Welcome email sent with login credentials</li>
                  <li>✓ User manual attached to email (PDF)</li>
                  <li>✓ User required to change password on first login</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createUserMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating User...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Create User & Send Email</>
              )}
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

              {editingUser.role !== 'admin' && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Account Approval</Label>
                    <p className="text-sm text-gray-600">Allow this user to access the system</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={editingUser.is_approved ? 'bg-green-500' : 'bg-yellow-500'}>
                      {editingUser.is_approved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant={editingUser.is_approved ? "outline" : "default"}
                      onClick={() => setEditingUser({...editingUser, is_approved: !editingUser.is_approved})}
                      className={editingUser.is_approved ? '' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {editingUser.is_approved ? 'Revoke Access' : 'Approve User'}
                    </Button>
                  </div>
                </div>
              )}
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