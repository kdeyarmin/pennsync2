import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Wand2,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
  Calendar,
  Bell
} from "lucide-react";
import { format, addDays } from "date-fns";
import { trainingModuleMap } from "./RecommendationTracker";

export default function AutoAssignTraining({ recommendations = [], users = [] }) {
  const queryClient = useQueryClient();
  const [selectedNurses, setSelectedNurses] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [dueInDays, setDueInDays] = useState("14");
  const [isAssigning, setIsAssigning] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState(null);

  // Analyze recommendations to suggest training assignments
  const analyzeAndSuggest = () => {
    const nurseAnalysis = {};

    // Group recommendations by nurse
    recommendations.forEach(rec => {
      if (!nurseAnalysis[rec.nurse_email]) {
        nurseAnalysis[rec.nurse_email] = {
          email: rec.nurse_email,
          total: 0,
          critical: 0,
          high: 0,
          byType: {},
          unaddressed: 0
        };
      }
      const nurse = nurseAnalysis[rec.nurse_email];
      nurse.total++;
      if (rec.severity === 'critical') nurse.critical++;
      if (rec.severity === 'high') nurse.high++;
      if (!rec.addressed) nurse.unaddressed++;
      nurse.byType[rec.recommendation_type] = (nurse.byType[rec.recommendation_type] || 0) + 1;
    });

    // Generate suggestions
    const suggestions = Object.values(nurseAnalysis)
      .filter(n => n.total >= 3 || n.critical > 0 || n.high >= 2)
      .map(nurse => {
        const user = users.find(u => u.email === nurse.email);
        const topTypes = Object.entries(nurse.byType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([type]) => type);

        const suggestedModules = [];
        topTypes.forEach(type => {
          const modules = trainingModuleMap[type] || [];
          modules.slice(0, 2).forEach(m => {
            if (!suggestedModules.find(sm => sm.title === m.title)) {
              suggestedModules.push({ ...m, category: type });
            }
          });
        });

        return {
          ...nurse,
          name: user?.full_name || nurse.email.split('@')[0],
          suggestedModules,
          priority: nurse.critical > 0 ? 'critical' : nurse.high >= 2 ? 'high' : 'medium'
        };
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    setAutoSuggestions(suggestions);
    
    // Auto-select nurses with critical issues
    const criticalNurses = suggestions.filter(s => s.priority === 'critical').map(s => s.email);
    setSelectedNurses(criticalNurses);
    
    setShowDialog(true);
  };

  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment) => {
      return base44.entities.TrainingCompletion.create(assignment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
    }
  });

  const handleAssign = async () => {
    if (selectedNurses.length === 0 || selectedModules.length === 0) return;
    
    setIsAssigning(true);
    const dueDate = format(addDays(new Date(), parseInt(dueInDays)), 'yyyy-MM-dd');

    try {
      const assignments = [];
      for (const nurseEmail of selectedNurses) {
        for (const moduleTitle of selectedModules) {
          assignments.push({
            nurse_email: nurseEmail,
            training_module_id: moduleTitle,
            status: 'assigned',
            due_date: dueDate
          });
        }
      }

      await Promise.all(assignments.map(a => createAssignmentMutation.mutateAsync(a)));

      // Send notification emails
      for (const nurseEmail of selectedNurses) {
        const user = users.find(u => u.email === nurseEmail);
        await base44.integrations.Core.SendEmail({
          to: nurseEmail,
          subject: "New Training Assigned",
          body: `Hi ${user?.full_name || 'there'},\n\nYou have been assigned ${selectedModules.length} new training module(s) based on your recent performance review.\n\nModules:\n${selectedModules.map(m => `- ${m}`).join('\n')}\n\nDue Date: ${format(new Date(dueDate), 'MMMM d, yyyy')}\n\nPlease complete these modules by the due date.\n\nBest regards,\nPenn Sync Training Team`
        });
      }

      setShowDialog(false);
      setSelectedNurses([]);
      setSelectedModules([]);
    } catch (error) {
      console.error("Error assigning training:", error);
    }
    setIsAssigning(false);
  };

  const toggleNurse = (email) => {
    setSelectedNurses(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const toggleModule = (title) => {
    setSelectedModules(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get all unique modules from suggestions
  const allSuggestedModules = useMemo(() => {
    if (!autoSuggestions) return [];
    const modules = new Map();
    autoSuggestions.forEach(nurse => {
      nurse.suggestedModules.forEach(m => {
        if (!modules.has(m.title)) {
          modules.set(m.title, m);
        }
      });
    });
    return Array.from(modules.values());
  }, [autoSuggestions]);

  return (
    <>
      <Button onClick={analyzeAndSuggest} className="bg-indigo-600 hover:bg-indigo-700">
        <Wand2 className="w-4 h-4 mr-2" />
        Auto-Assign Training
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              Auto-Assign Training Based on Performance
            </DialogTitle>
          </DialogHeader>

          {autoSuggestions && (
            <div className="space-y-6">
              {/* Nurses needing training */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Nurses Needing Training ({autoSuggestions.length} identified)
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {autoSuggestions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No nurses currently need assigned training
                    </p>
                  ) : (
                    autoSuggestions.map(nurse => (
                      <div 
                        key={nurse.email}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          selectedNurses.includes(nurse.email) ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedNurses.includes(nurse.email)}
                          onCheckedChange={() => toggleNurse(nurse.email)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{nurse.name}</span>
                            <Badge className={getPriorityColor(nurse.priority)}>
                              {nurse.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {nurse.total} recommendations • {nurse.unaddressed} unaddressed
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {Object.entries(nurse.byType).slice(0, 3).map(([type, count]) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {autoSuggestions.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedNurses(autoSuggestions.map(n => n.email))}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedNurses([])}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Suggested Training Modules */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Suggested Training Modules
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {allSuggestedModules.map(module => (
                    <div 
                      key={module.title}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        selectedModules.includes(module.title) ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedModules.includes(module.title)}
                        onCheckedChange={() => toggleModule(module.title)}
                      />
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{module.title}</span>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs capitalize">{module.category}</Badge>
                          <span className="text-xs text-gray-500">{module.duration} min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Due Date</Label>
                <Select value={dueInDays} onValueChange={setDueInDays}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">In 7 days</SelectItem>
                    <SelectItem value="14">In 14 days</SelectItem>
                    <SelectItem value="30">In 30 days</SelectItem>
                    <SelectItem value="60">In 60 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Due: {format(addDays(new Date(), parseInt(dueInDays)), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-indigo-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-indigo-900">
                  Assignment Summary
                </p>
                <p className="text-sm text-indigo-700">
                  {selectedNurses.length} nurse(s) × {selectedModules.length} module(s) = {selectedNurses.length * selectedModules.length} assignment(s)
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  Email notifications will be sent to assigned nurses
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={isAssigning || selectedNurses.length === 0 || selectedModules.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isAssigning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Assign & Notify</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}