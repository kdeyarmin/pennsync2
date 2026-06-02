import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send
} from "lucide-react";
import { format, addDays, parseISO, differenceInDays } from "date-fns";

export default function AgencyTrainingManager() {
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [newModule, setNewModule] = useState({
    title: "",
    description: "",
    category: "compliance",
    difficulty_level: "intermediate",
    duration_minutes: 30,
    is_required: false,
    recertification_months: 12
  });

  const queryClient = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list().catch(() => [])
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['allCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list().catch(() => [])
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list().catch(() => [])
  });

  const createModuleMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingModule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainingModules']);
      setShowModuleDialog(false);
      resetModuleForm();
    }
  });

  const assignTrainingMutation = useMutation({
    mutationFn: async ({ moduleId, userEmails, dueDate }) => {
      const promises = userEmails.map(email => 
        base44.entities.TrainingCompletion.create({
          nurse_email: email,
          training_module_id: moduleId,
          status: 'assigned',
          due_date: dueDate
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCompletions']);
      setShowAssignDialog(false);
    }
  });

  const resetModuleForm = () => {
    setNewModule({
      title: "",
      description: "",
      category: "compliance",
      difficulty_level: "intermediate",
      duration_minutes: 30,
      is_required: false,
      recertification_months: 12
    });
  };

  const getModuleStats = (moduleId) => {
    const moduleCompletions = completions.filter(c => c.training_module_id === moduleId);
    const completed = moduleCompletions.filter(c => c.status === 'completed').length;
    const assigned = moduleCompletions.length;
    return { completed, assigned, percentage: assigned > 0 ? Math.round((completed / assigned) * 100) : 0 };
  };

  const getOverdueCount = () => {
    return completions.filter(c => {
      if (c.status === 'completed') return false;
      if (!c.due_date) return false;
      return differenceInDays(new Date(), parseISO(c.due_date)) > 0;
    }).length;
  };

  const requiredModules = modules.filter(m => m.is_required);
  const optionalModules = modules.filter(m => !m.is_required);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Total Modules</p>
                <p className="text-3xl font-bold">{modules.length}</p>
              </div>
              <BookOpen className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completions</p>
                <p className="text-3xl font-bold">{completions.filter(c => c.status === 'completed').length}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">In Progress</p>
                <p className="text-3xl font-bold">{completions.filter(c => c.status === 'in_progress').length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Overdue</p>
                <p className="text-3xl font-bold">{getOverdueCount()}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Agency Training Management
          </CardTitle>
          <Button onClick={() => setShowModuleDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Module
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="required">
            <TabsList>
              <TabsTrigger value="required">Required ({requiredModules.length})</TabsTrigger>
              <TabsTrigger value="optional">Optional ({optionalModules.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="required" className="space-y-3 mt-4">
              {requiredModules.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No required training modules</p>
              ) : (
                requiredModules.map(module => {
                  const stats = getModuleStats(module.id);
                  return (
                    <div key={module.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{module.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{module.category}</Badge>
                            <Badge variant="outline">{module.duration_minutes}min</Badge>
                            <Badge className="bg-red-100 text-red-800">Required</Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => { setSelectedModule(module); setShowAssignDialog(true); }}>
                          <Send className="w-4 h-4 mr-1" /> Assign
                        </Button>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{module.description}</p>
                      <div className="flex items-center gap-3">
                        <Progress value={stats.percentage} className="flex-1" />
                        <span className="text-sm text-slate-600">{stats.completed}/{stats.assigned} complete</span>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="optional" className="space-y-3 mt-4">
              {optionalModules.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No optional training modules</p>
              ) : (
                optionalModules.map(module => {
                  const stats = getModuleStats(module.id);
                  return (
                    <div key={module.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{module.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{module.category}</Badge>
                            <Badge variant="outline">{module.duration_minutes}min</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedModule(module); setShowAssignDialog(true); }}>
                          <Send className="w-4 h-4 mr-1" /> Assign
                        </Button>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{module.description}</p>
                      <div className="flex items-center gap-3">
                        <Progress value={stats.percentage} className="flex-1" />
                        <span className="text-sm text-slate-600">{stats.completed}/{stats.assigned} complete</span>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Module Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Training Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newModule.title}
                onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                placeholder="e.g., Annual HIPAA Compliance"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="Describe the training content and objectives"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newModule.category} onValueChange={(v) => setNewModule({ ...newModule, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="specialty">Specialty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newModule.duration_minutes}
                  onChange={(e) => setNewModule({ ...newModule, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newModule.is_required}
                  onChange={(e) => setNewModule({ ...newModule, is_required: e.target.checked })}
                />
                <span className="text-sm">Required for all staff</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
            <Button onClick={() => createModuleMutation.mutate(newModule)} disabled={!newModule.title}>
              Create Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Training Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Training: {selectedModule?.title}</DialogTitle>
          </DialogHeader>
          <AssignTrainingForm
            users={users}
            onAssign={(emails, dueDate) => {
              assignTrainingMutation.mutate({
                moduleId: selectedModule.id,
                userEmails: emails,
                dueDate
              });
            }}
            onCancel={() => setShowAssignDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignTrainingForm({ users, onAssign, onCancel }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [selectAll, setSelectAll] = useState(false);

  const toggleUser = (email) => {
    setSelectedUsers(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.email));
    }
    setSelectAll(!selectAll);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Due Date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Assign To</Label>
          <Button size="sm" variant="ghost" onClick={handleSelectAll}>
            {selectAll ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
          {users.map(user => (
            <label key={user.email} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.email)}
                onChange={() => toggleUser(user.email)}
              />
              <span className="text-sm">{user.full_name || user.email}</span>
            </label>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onAssign(selectedUsers, dueDate)} disabled={selectedUsers.length === 0}>
          Assign to {selectedUsers.length} User(s)
        </Button>
      </DialogFooter>
    </div>
  );
}