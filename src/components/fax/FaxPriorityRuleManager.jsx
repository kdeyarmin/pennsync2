import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Edit2, Save, X, Brain } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function FaxPriorityRuleManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    rule_type: "keyword",
    keywords: "",
    sender_patterns: "",
    priority_level: "normal",
    notify_users: ""
  });

  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['fax-priority-rules'],
    queryFn: () => base44.entities.FaxPriorityRule.list('-created_date', 100),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FaxPriorityRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fax-priority-rules']);
      toast.success("Rule created");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FaxPriorityRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fax-priority-rules']);
      toast.success("Rule updated");
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FaxPriorityRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fax-priority-rules']);
      toast.success("Rule deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      rule_type: "keyword",
      keywords: "",
      sender_patterns: "",
      priority_level: "normal",
      notify_users: ""
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    const ruleData = {
      name: formData.name,
      rule_type: formData.rule_type,
      priority_level: formData.priority_level,
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      sender_patterns: formData.sender_patterns ? formData.sender_patterns.split(',').map(p => p.trim()).filter(Boolean) : [],
      notify_users: formData.notify_users ? formData.notify_users.split(',').map(u => u.trim()).filter(Boolean) : [],
      is_active: true
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: ruleData });
    } else {
      createMutation.mutate(ruleData);
    }
  };

  const handleEdit = (rule) => {
    setFormData({
      name: rule.name,
      rule_type: rule.rule_type,
      keywords: rule.keywords?.join(', ') || '',
      sender_patterns: rule.sender_patterns?.join(', ') || '',
      priority_level: rule.priority_level,
      notify_users: rule.notify_users?.join(', ') || ''
    });
    setEditingId(rule.id);
    setIsCreating(true);
  };

  const toggleActive = (rule) => {
    updateMutation.mutate({
      id: rule.id,
      data: { is_active: !rule.is_active }
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Priority Rules
          </h3>
          <p className="text-sm text-gray-600">Define rules to automatically prioritize faxes</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
          {isCreating ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isCreating ? "Cancel" : "Add Rule"}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g., Urgent Medical Results"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={formData.rule_type} onValueChange={(value) => setFormData({ ...formData, rule_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword Match</SelectItem>
                    <SelectItem value="sender">Sender Match</SelectItem>
                    <SelectItem value="recipient">Recipient Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.rule_type === 'keyword' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    placeholder="STAT, emergency, urgent, critical"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>
              )}

              {(formData.rule_type === 'sender' || formData.rule_type === 'recipient') && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Patterns (comma-separated)</Label>
                  <Input
                    placeholder="Hospital Name, +1234567890"
                    value={formData.sender_patterns}
                    onChange={(e) => setFormData({ ...formData, sender_patterns: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select value={formData.priority_level} onValueChange={(value) => setFormData({ ...formData, priority_level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notify Users (emails, comma-separated)</Label>
                <Input
                  placeholder="admin@example.com, nurse@example.com"
                  value={formData.notify_users}
                  onChange={(e) => setFormData({ ...formData, notify_users: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Update Rule" : "Create Rule"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No priority rules defined yet</p>
              <p className="text-sm text-gray-400 mt-1">AI will use default analysis</p>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                      <Badge className={getPriorityColor(rule.priority_level)}>
                        {rule.priority_level}
                      </Badge>
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      {rule.match_count > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          {rule.match_count} matches
                        </Badge>
                      )}
                    </div>
                    {rule.keywords?.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Keywords: {rule.keywords.join(', ')}
                      </p>
                    )}
                    {rule.sender_patterns?.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Patterns: {rule.sender_patterns.join(', ')}
                      </p>
                    )}
                    {rule.notify_users?.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Notify: {rule.notify_users.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleActive(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}