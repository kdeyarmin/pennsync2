import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Sparkles, Star, Rocket, Zap, Heart, Gift } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const iconMap = {
  sparkles: Sparkles,
  star: Star,
  rocket: Rocket,
  zap: Zap,
  heart: Heart,
  gift: Gift
};

export default function ManageNewFeatures() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'sparkles',
    link: '',
    is_active: true,
    priority: 0
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: features = [] } = useQuery({
    queryKey: ['newFeatures'],
    queryFn: () => base44.entities.NewFeature.list('-priority'),
  });

  const createFeatureMutation = useMutation({
    mutationFn: (data) => base44.entities.NewFeature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newFeatures'] });
      handleCloseDialog();
    },
  });

  const updateFeatureMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NewFeature.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newFeatures'] });
      handleCloseDialog();
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: (id) => base44.entities.NewFeature.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newFeatures'] });
    },
  });

  const handleOpenDialog = (feature = null) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        title: feature.title,
        description: feature.description,
        icon: feature.icon,
        link: feature.link || '',
        is_active: feature.is_active,
        priority: feature.priority || 0
      });
    } else {
      setEditingFeature(null);
      setFormData({
        title: '',
        description: '',
        icon: 'sparkles',
        link: '',
        is_active: true,
        priority: 0
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFeature(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingFeature) {
      updateFeatureMutation.mutate({ id: editingFeature.id, data: formData });
    } else {
      createFeatureMutation.mutate(formData);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Admin access required to manage new features.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage New Features</h1>
          <p className="text-gray-600 mt-1">Add and manage features to display on the dashboard</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <div className="grid gap-4">
        {features.map((feature) => {
          const Icon = iconMap[feature.icon] || Sparkles;
          return (
            <Card key={feature.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-indigo-100 rounded-full p-3">
                      <Icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{feature.title}</h3>
                        {!feature.is_active && <Badge variant="outline">Inactive</Badge>}
                        <Badge variant="outline" className="text-xs">Priority: {feature.priority}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{feature.description}</p>
                      {feature.link && (
                        <p className="text-xs text-blue-600">Link: {feature.link}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDialog(feature)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this feature?')) {
                          deleteFeatureMutation.mutate(feature.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {features.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No features added yet</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Feature
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? 'Edit Feature' : 'Add New Feature'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(iconMap).map((iconKey) => {
                    const Icon = iconMap[iconKey];
                    return (
                      <SelectItem key={iconKey} value={iconKey}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {iconKey}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="link">Link (Page Name - Optional)</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g., SmartNoteAssistant"
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">Higher priority features appear first</p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingFeature ? 'Update' : 'Create'} Feature
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}