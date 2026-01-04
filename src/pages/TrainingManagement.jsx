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
import StaffTrainingOverview from "../components/training/StaffTrainingOverview";
import TrainingMaterialUploader from "../components/training/TrainingMaterialUploader";
import AIQuizGenerator from "../components/training/AIQuizGenerator";
import CompletionTracker from "../components/training/CompletionTracker";
import NurseTrainingNeedsAnalyzer from "../components/training/NurseTrainingNeedsAnalyzer";

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
  const [selectedModuleForView, setSelectedModuleForView] = useState(null);
  const [viewingQuiz, setViewingQuiz] = useState(false);

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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Training Management</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Create modules, assign training, and track staff completion</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-h-[44px]">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Create Training Module</span>
          <span className="sm:hidden">Create Module</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Total Modules</p>
                <p className="text-xl sm:text-2xl font-bold">{trainingModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Completions</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {completions.filter(c => c.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {completions.filter(c => c.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Active Nurses</p>
                <p className="text-xl sm:text-2xl font-bold">{nurses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Module Form */}
      {(showCreateForm || editingModule) && (
        <Card className="mb-4 sm:mb-6 border-2 border-blue-300">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">{editingModule ? 'Edit' : 'Create'} Training Module</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
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

            {/* Enhanced File Upload */}
            <TrainingMaterialUploader
              moduleId={editingModule?.id}
              existingContent={newModule.content?.materials || []}
              onUploadComplete={(materials) => {
                setNewModule({
                  ...newModule,
                  content: {
                    ...newModule.content,
                    materials
                  }
                });
              }}
            />

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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={() => { setShowCreateForm(false); setEditingModule(null); }} variant="outline" className="min-h-[44px] w-full sm:flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateModule} className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:flex-1">
                {editingModule ? 'Update' : 'Create'} Module
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Modules List */}
      <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-6 gap-1 min-w-max h-auto">
            <TabsTrigger value="overview" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Staff Overview</TabsTrigger>
            <TabsTrigger value="needs" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Training Needs
            </TabsTrigger>
            <TabsTrigger value="all" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">All Modules ({trainingModules.length})</TabsTrigger>
            <TabsTrigger value="required" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Required ({trainingModules.filter(m => m.is_required).length})</TabsTrigger>
            <TabsTrigger value="clinical" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Clinical</TabsTrigger>
            <TabsTrigger value="compliance" className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">Compliance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <StaffTrainingOverview />
        </TabsContent>

        <TabsContent value="needs">
          <NurseTrainingNeedsAnalyzer />
        </TabsContent>

        {/* Module Detail View */}
        {selectedModuleForView && (
          <div className="mb-6">
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50">
                <div className="flex items-center justify-between">
                  <CardTitle>Module Details: {selectedModuleForView.title}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedModuleForView(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="tracking">
                  <TabsList className="grid grid-cols-3 w-full mb-4">
                    <TabsTrigger value="tracking">Completion Tracking</TabsTrigger>
                    <TabsTrigger value="quiz">Generate Quiz</TabsTrigger>
                    <TabsTrigger value="materials">Materials</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tracking">
                    <CompletionTracker
                      moduleId={selectedModuleForView.id}
                      moduleTitle={selectedModuleForView.title}
                    />
                  </TabsContent>

                  <TabsContent value="quiz">
                    <AIQuizGenerator
                      trainingContent={selectedModuleForView.description + '\n\n' + (selectedModuleForView.content?.text || '')}
                      moduleTitle={selectedModuleForView.title}
                      onComplete={(result) => console.log('Quiz completed:', result)}
                    />
                  </TabsContent>

                  <TabsContent value="materials">
                    <Card>
                      <CardContent className="p-6">
                        {selectedModuleForView.content?.materials?.length > 0 ? (
                          <div className="space-y-2">
                            {selectedModuleForView.content.materials.map((material, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                {material.type === 'video' ? (
                                  <Video className="w-5 h-5 text-purple-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-blue-600" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{material.name}</p>
                                  <p className="text-xs text-gray-500">{material.type}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(material.url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-8">
                            No materials uploaded yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

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
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedModuleForView(module)}
                          title="View details and tracking"
                          className="min-h-[44px] p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignToAll(module.id)}
                          title="Assign to all nurses"
                          className="min-h-[44px] p-2"
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
                          className="min-h-[44px] p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 min-h-[44px] p-2"
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