import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Send, UserPlus, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AdminTrainingAssignment() {
  const queryClient = useQueryClient();
  const [selectedNurse, setSelectedNurse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [_assignmentType, _setAssignmentType] = useState("manual");

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  // Fetch training modules
  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.filter({ is_active: true }),
  });

  // Fetch compliance audits to identify low performers
  const { data: audits = [] } = useQuery({
    queryKey: ['complianceAudits'],
    queryFn: () => base44.entities.ComplianceAudit.list('-created_date', 100),
  });

  // Calculate performance metrics per nurse
  const nursePerformance = users.map(user => {
    const userAudits = audits.filter(a => a.nurse_email === user.email);
    const avgCompliance = userAudits.length > 0
      ? userAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / userAudits.length
      : 100;
    
    return {
      ...user,
      avgCompliance: Math.round(avgCompliance),
      auditCount: userAudits.length,
      needsTraining: avgCompliance < 85
    };
  }).filter(u => u.role !== 'admin');

  // Assign training mutation
  const assignTrainingMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TrainingCompletion.create({
        nurse_email: data.nurse_email,
        training_module_id: data.module_id,
        status: 'assigned',
        due_date: data.due_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
      toast.success('Training assigned successfully');
      setSelectedNurse("");
      setSelectedModule("");
      setDueDate("");
      setReason("");
    },
    onError: (error) => {
      toast.error('Failed to assign training');
      console.error(error);
    }
  });

  const handleAssign = () => {
    if (!selectedNurse || !selectedModule) {
      toast.error('Please select both nurse and module');
      return;
    }

    const _module = modules.find(m => m.id === selectedModule);
    
    assignTrainingMutation.mutate({
      nurse_email: selectedNurse,
      module_id: selectedModule,
      due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  const handleAutoAssignByPerformance = () => {
    const lowPerformers = nursePerformance.filter(n => n.needsTraining);
    
    lowPerformers.forEach(nurse => {
      // Assign compliance-focused module
      const complianceModule = modules.find(m => 
        m.category === 'compliance' || m.title.toLowerCase().includes('compliance')
      );
      
      if (complianceModule) {
        assignTrainingMutation.mutate({
          nurse_email: nurse.email,
          module_id: complianceModule.id,
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }
    });

    toast.success(`Assigned training to ${lowPerformers.length} nurses with compliance scores below 85%`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Training Assignment</h2>
        <p className="text-slate-600">Assign training modules to nurses based on performance or compliance needs</p>
      </div>

      {/* Auto-Assign by Performance */}
      <Card className="border-2 border-orange-300 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="w-5 h-5" />
            Auto-Assign Based on Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-800">
            {nursePerformance.filter(n => n.needsTraining).length} nurses have compliance scores below 85%
          </p>
          <Button
            onClick={handleAutoAssignByPerformance}
            disabled={assignTrainingMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Auto-Assign Compliance Training
          </Button>
        </CardContent>
      </Card>

      {/* Manual Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Manual Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select Nurse */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Select Nurse
            </label>
            <Select value={selectedNurse} onValueChange={setSelectedNurse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a nurse..." />
              </SelectTrigger>
              <SelectContent>
                {nursePerformance.map((nurse) => (
                  <SelectItem key={nurse.email} value={nurse.email}>
                    <div className="flex items-center justify-between w-full">
                      <span>{nurse.full_name}</span>
                      {nurse.needsTraining && (
                        <Badge className="ml-2 bg-red-600 text-xs">
                          {nurse.avgCompliance}%
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Module */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Training Module
            </label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a module..." />
              </SelectTrigger>
              <SelectContent>
                {modules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    <div>
                      <p className="font-medium">{module.title}</p>
                      <p className="text-xs text-slate-500">{module.category} • {module.duration_minutes}min</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Assignment Reason (optional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Low compliance score, new policy requirement..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleAssign}
            disabled={assignTrainingMutation.isPending || !selectedNurse || !selectedModule}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Assign Training
          </Button>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Nurse Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nursePerformance.map((nurse) => (
              <div
                key={nurse.email}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  nurse.needsTraining ? 'bg-red-50 border border-red-200' : 'bg-slate-50'
                }`}
              >
                <div>
                  <p className="font-medium text-slate-900">{nurse.full_name}</p>
                  <p className="text-xs text-slate-600">{nurse.auditCount} audits</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={nurse.needsTraining ? 'bg-red-600' : 'bg-green-600'}>
                    {nurse.avgCompliance}%
                  </Badge>
                  {nurse.needsTraining && (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}