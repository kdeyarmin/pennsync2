import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bell, Plus, Edit2, Trash2, Eye, EyeOff, Search, Clock, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatEastern } from "@/components/utils/timezone";

export default function AnnouncementManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    is_active: true,
    priority: 0,
    scheduled_for: null,
    expires_at: null
  });

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const result = await base44.entities.Announcement.list('-priority,-created_date');
      console.log('Fetched announcements:', result);
      return result;
    },
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating announcement with data:', data);
      const result = await base44.entities.Announcement.create(data);
      console.log('Create result:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('Create success, new announcement:', data);
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create error details:', error);
      alert(`Failed to create announcement: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setIsDialogOpen(false);
      resetForm();
      alert('Announcement updated successfully!');
    },
    onError: (error) => {
      console.error('Update error:', error);
      alert(`Failed to update announcement: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      is_active: true,
      priority: 0,
      scheduled_for: null,
      expires_at: null
    });
    setEditingId(null);
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_active: announcement.is_active,
      priority: announcement.priority || 0,
      scheduled_for: announcement.scheduled_for ? new Date(announcement.scheduled_for) : null,
      expires_at: announcement.expires_at ? new Date(announcement.expires_at) : null
    });
    setEditingId(announcement.id);
    setIsDialogOpen(true);
  };

  const getAnnouncementStatus = (announcement) => {
    const now = new Date();
    const scheduledFor = announcement.scheduled_for ? new Date(announcement.scheduled_for) : null;
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null;

    if (!announcement.is_active) return 'inactive';
    if (expiresAt && expiresAt < now) return 'expired';
    if (scheduledFor && scheduledFor > now) return 'scheduled';
    return 'active';
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = 
      announcement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getAnnouncementStatus(announcement);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure priority is a valid number
    const dataToSubmit = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      is_active: formData.is_active,
      priority: parseInt(formData.priority) || 0,
      scheduled_for: formData.scheduled_for ? formData.scheduled_for.toISOString() : null,
      expires_at: formData.expires_at ? formData.expires_at.toISOString() : null
    };
    
    console.log('Submitting announcement:', dataToSubmit);
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const toggleActive = (id, currentStatus) => {
    updateMutation.mutate({ id, data: { is_active: !currentStatus } });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Manage Announcements
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Announcement' : 'Create Announcement'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="Enter announcement title..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    required
                    rows={4}
                    placeholder="Enter announcement content..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select 
                      value={formData.is_active ? "active" : "inactive"} 
                      onValueChange={(v) => setFormData({...formData, is_active: v === "active"})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Schedule For (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.scheduled_for ? format(formData.scheduled_for, 'PPp') : <span>Select date & time</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.scheduled_for}
                          onSelect={(date) => {
                            if (date) {
                              const now = new Date();
                              date.setHours(now.getHours(), now.getMinutes(), 0, 0);
                              setFormData({...formData, scheduled_for: date});
                            } else {
                              setFormData({...formData, scheduled_for: null});
                            }
                          }}
                          initialFocus
                        />
                        {formData.scheduled_for && (
                          <div className="p-3 border-t">
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="time"
                              value={format(formData.scheduled_for, 'HH:mm')}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(formData.scheduled_for);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                setFormData({...formData, scheduled_for: newDate});
                              }}
                              className="mt-1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFormData({...formData, scheduled_for: null})}
                              className="w-full mt-2"
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">Leave empty to publish immediately</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Expires At (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expires_at ? format(formData.expires_at, 'PPp') : <span>Select date & time</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.expires_at}
                          onSelect={(date) => {
                            if (date) {
                              const now = new Date();
                              date.setHours(23, 59, 59, 999);
                              setFormData({...formData, expires_at: date});
                            } else {
                              setFormData({...formData, expires_at: null});
                            }
                          }}
                          initialFocus
                        />
                        {formData.expires_at && (
                          <div className="p-3 border-t">
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="time"
                              value={format(formData.expires_at, 'HH:mm')}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(formData.expires_at);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                setFormData({...formData, expires_at: newDate});
                              }}
                              className="mt-1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFormData({...formData, expires_at: null})}
                              className="w-full mt-2"
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </Button>
                  </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
        ) : filteredAnnouncements.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {searchTerm || statusFilter !== 'all' ? 'No announcements match your filters' : 'No announcements yet'}
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredAnnouncements.map((announcement) => {
                const status = getAnnouncementStatus(announcement);
                return (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-lg border ${
                    status === 'active' ? 'bg-white' : 
                    status === 'scheduled' ? 'bg-blue-50 border-blue-200' :
                    status === 'expired' ? 'bg-gray-50 opacity-60' : 
                    'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                        <Badge className={getTypeColor(announcement.type)}>
                          {announcement.type}
                        </Badge>
                        {status === 'scheduled' && (
                          <Badge className="bg-blue-500 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                        {status === 'expired' && (
                          <Badge variant="outline" className="text-gray-500">
                            Expired
                          </Badge>
                        )}
                        {status === 'inactive' && (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          Created {formatEastern(announcement.created_date, 'MMM d, yyyy')}
                        </p>
                        {announcement.scheduled_for && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Scheduled: {formatEastern(announcement.scheduled_for, 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                        {announcement.expires_at && (
                          <p className="text-xs text-orange-600">
                            Expires: {formatEastern(announcement.expires_at, 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(announcement.id, announcement.is_active)}
                        title={announcement.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Delete this announcement?')) {
                            deleteMutation.mutate(announcement.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}