import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  BookOpen,
  CheckCircle2,
  Bell,
  Loader2,
  Calendar,
  User
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";

export default function TrainingCompletionTracker({ users = [] }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingReminder, setSendingReminder] = useState(null);

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['allTrainingCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list('-created_date', 500),
  });

  const updateCompletionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingCompletion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTrainingCompletions'] });
    }
  });

  const sendReminder = async (completion) => {
    setSendingReminder(completion.id);
    try {
      const user = users.find(u => u.email === completion.nurse_email);
      const daysLeft = completion.due_date ? differenceInDays(new Date(completion.due_date), new Date()) : null;
      
      await base44.integrations.Core.SendEmail({
        to: completion.nurse_email,
        subject: "Training Reminder: Action Required",
        body: `Hi ${user?.full_name || 'there'},\n\nThis is a reminder that you have an assigned training module that needs to be completed.\n\nModule: ${completion.training_module_id}\nStatus: ${completion.status}\n${daysLeft !== null ? `Due: ${daysLeft > 0 ? `In ${daysLeft} days` : daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)} days overdue`}` : ''}\n\nPlease log in to complete your training.\n\nBest regards,\nPenn Sync Training Team`
      });

      // Update last reminder sent
      await updateCompletionMutation.mutateAsync({
        id: completion.id,
        data: { last_reminder_sent: new Date().toISOString() }
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
    setSendingReminder(null);
  };

  const filteredCompletions = completions.filter(c => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") {
      return c.due_date && isPast(new Date(c.due_date)) && c.status !== 'completed';
    }
    return c.status === statusFilter;
  });

  const getStatusBadge = (completion) => {
    const isOverdue = completion.due_date && isPast(new Date(completion.due_date)) && completion.status !== 'completed';
    
    if (isOverdue) {
      return <Badge className="bg-red-600 text-white">Overdue</Badge>;
    }
    
    switch (completion.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'assigned':
        return <Badge className="bg-yellow-100 text-yellow-800">Assigned</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{completion.status}</Badge>;
    }
  };

  // Stats
  const stats = {
    total: completions.length,
    completed: completions.filter(c => c.status === 'completed').length,
    inProgress: completions.filter(c => c.status === 'in_progress').length,
    overdue: completions.filter(c => c.due_date && isPast(new Date(c.due_date)) && c.status !== 'completed').length
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Training Completion Tracker
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-gray-600">Total Assigned</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.inProgress}</p>
            <p className="text-xs text-gray-600">In Progress</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-xs text-gray-600">Overdue</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Completion Rate</span>
            <span className="text-sm font-bold text-indigo-600">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nurse</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompletions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No training assignments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompletions.map(completion => {
                  const user = users.find(u => u.email === completion.nurse_email);
                  const daysLeft = completion.due_date 
                    ? differenceInDays(new Date(completion.due_date), new Date())
                    : null;
                  
                  return (
                    <TableRow key={completion.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user?.full_name || completion.nurse_email}</p>
                            <p className="text-xs text-gray-500">{completion.nurse_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{completion.training_module_id}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(completion)}</TableCell>
                      <TableCell>
                        {completion.due_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className={`text-sm ${daysLeft !== null && daysLeft < 0 ? 'text-red-600 font-medium' : ''}`}>
                              {format(new Date(completion.due_date), 'MMM d, yyyy')}
                            </span>
                            {daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
                              <Badge variant="outline" className="text-xs ml-1 text-orange-600">
                                {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {completion.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(completion)}
                            disabled={sendingReminder === completion.id}
                          >
                            {sendingReminder === completion.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <><Bell className="w-3 h-3 mr-1" /> Remind</>
                            )}
                          </Button>
                        )}
                        {completion.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}