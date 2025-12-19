import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Plus, 
  FileText, 
  Video, 
  BookOpen, 
  Users, 
  Award,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye,
  UserPlus,
  Sparkles
} from "lucide-react";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";

export default function TrainingManagement() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newModule, setNewModule] = useState({
    title: "",
    description: "",
    category: "clinical",
    module_type: "ongoing",
    content_type: "document",
    difficulty_level: "beginner",
    duration_minutes: 30,
    passing_score: 80,
    is_required: false,
    is_active: true,
    content: {}
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('-created_date'),
    initialData: [],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['trainingCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list('-completion_date'),
    initialData: [],
  });

  const nurses = allUsers.filter(u => u.role === 'user');

  const createModuleMutation = useMutation({
    mutationFn: (moduleData) => base44.entities.TrainingModule.create(moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      setShowCreateForm(false);
      setNewModule({
        title: "",
        description: "",
        category: "clinical",
        module_type: "ongoing",
        content_type: "document",
        difficulty_level: "beginner",
        duration_minutes: 30,
        passing_score: 80,
        is_required: false,
        is_active: true,
        content: {}
      });
      logActivity(ActivityActions.CREATE, {
        entity_type: 'TrainingModule',
        page: 'TrainingManagement'
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      setEditingModule(null);
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
    },
  });

  const assignModuleMutation = useMutation({
    mutationFn: (assignments) => base44.entities.TrainingCompletion.bulkCreate(assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
      logActivity(ActivityActions.CREATE, {
        entity_type: 'TrainingCompletion',
        details: { action: 'bulk_assign' },
        page: 'TrainingManagement'
      });
    },
  });

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewModule(prev => ({
        ...prev,
        content: {
          ...prev.content,
          [newModule.content_type === 'document' ? 'document_url' : 'video_url']: file_url
        }
      }));
      setSelectedFile(null);
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    }
    setIsUploading(false);
  };

  const handleCreateModule = () => {
    if (!newModule.title || !newModule.description) {
      alert('Please fill in title and description');
      return;
    }
    createModuleMutation.mutate(newModule);
  };

  const handleAssignToAll = (moduleId) => {
    const assignments = nurses.map(nurse => ({
      nurse_email: nurse.email,
      training_module_id: moduleId,
      status: 'assigned',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
    assignModuleMutation.mutate(assignments);
  };

  const getModuleStats = (moduleId) => {
    const moduleCompletions = completions.filter(c => c.training_module_id === moduleId);
    const completed = moduleCompletions.filter(c => c.status === 'completed').length;
    const assigned = moduleCompletions.length;
    return { completed, assigned };
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Management</h1>
          <p className="text-gray-600">Upload, assign, and track training materials</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Training Module
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Modules</p>
                <p className="text-2xl font-bold">{trainingModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completions</p>
                <p className="text-2xl font-bold">
                  {completions.filter(c => c.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">
                  {completions.filter(c => c.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Nurses</p>
                <p className="text-2xl font-bold">{nurses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Module Form */}
      {(showCreateForm || editingModule) && (
        <Card className="mb-6 border-2 border-blue-300">
          <CardHeader>
            <CardTitle>{editingModule ? 'Edit' : 'Create'} Training Module</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newModule.title}
                  onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                  placeholder="e.g., OASIS Documentation Best Practices"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newModule.category} onValueChange={(v) => setNewModule({...newModule, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="specialty">Specialty</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newModule.description}
                onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                placeholder="Detailed description of what this training covers..."
                className="h-24"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select value={newModule.content_type} onValueChange={(v) => setNewModule({...newModule, content_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={newModule.difficulty_level} onValueChange={(v) => setNewModule({...newModule, difficulty_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newModule.duration_minutes}
                  onChange={(e) => setNewModule({...newModule, duration_minutes: parseInt(e.target.value)})}
                />
              </div>
            </div>

            {/* File Upload */}
            {(newModule.content_type === 'document' || newModule.content_type === 'video') && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="training-file"
                  className="hidden"
                  accept={newModule.content_type === 'video' ? 'video/*' : '.pdf,.doc,.docx'}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedFile(file);
                      handleFileUpload(file);
                    }
                  }}
                />
                <label htmlFor="training-file" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    {isUploading ? 'Uploading...' : 'Click to upload ' + newModule.content_type}
                  </p>
                  {newModule.content.document_url || newModule.content.video_url ? (
                    <Badge className="mt-2 bg-green-600">File uploaded ✓</Badge>
                  ) : null}
                </label>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newModule.is_required}
                  onChange={(e) => setNewModule({...newModule, is_required: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Required Training</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newModule.is_active}
                  onChange={(e) => setNewModule({...newModule, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => { setShowCreateForm(false); setEditingModule(null); }} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateModule} className="bg-blue-600 hover:bg-blue-700">
                {editingModule ? 'Update' : 'Create'} Module
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Modules List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Modules ({trainingModules.length})</TabsTrigger>
          <TabsTrigger value="required">Required ({trainingModules.filter(m => m.is_required).length})</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          <ScrollArea className="h-[600px]">
            {trainingModules.map((module) => {
              const stats = getModuleStats(module.id);
              return (
                <Card key={module.id} className="mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{module.title}</h3>
                          {module.is_required && <Badge className="bg-red-600">Required</Badge>}
                          <Badge variant="outline">{module.category}</Badge>
                          {!module.is_active && <Badge variant="outline" className="bg-gray-200">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {module.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {stats.completed}/{stats.assigned} completed
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3" /> {module.difficulty_level}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignToAll(module.id)}
                          title="Assign to all nurses"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingModule(module);
                            setNewModule(module);
                            setShowCreateForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Delete this training module?')) {
                              deleteModuleMutation.mutate(module.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="required">
          {trainingModules.filter(m => m.is_required).map((module) => {
            const stats = getModuleStats(module.id);
            return (
              <Card key={module.id} className="mb-3">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>{stats.completed}/{stats.assigned} completed</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="clinical">
          {trainingModules.filter(m => m.category === 'clinical').map((module) => (
            <Card key={module.id} className="mb-3">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900">{module.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="compliance">
          {trainingModules.filter(m => m.category === 'compliance').map((module) => (
            <Card key={module.id} className="mb-3">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900">{module.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}