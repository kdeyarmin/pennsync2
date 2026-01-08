import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, BookOpen, TrendingUp, Globe, User, Sparkles, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import ClinicalLibraryAIAssistant from "./ClinicalLibraryAIAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClinicalLibraryAnalytics from "./ClinicalLibraryAnalytics";

export default function ClinicalLibraryManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMode, setAIMode] = useState('generate'); // 'generate', 'improve', 'refine'
  const [formData, setFormData] = useState({
    phrase: '',
    category: 'education',
    template_type: 'generic',
    expanded_text: '',
    ai_prompt_instructions: '',
    requires_patient_data: false,
    patient_data_fields: [],
    is_agency_wide: false
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['clinical-templates'],
    queryFn: () => base44.entities.ClinicalLibraryTemplate.list('-usage_count', 200),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClinicalLibraryTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clinical-templates']);
      toast.success('Template created successfully');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClinicalLibraryTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clinical-templates']);
      toast.success('Template updated successfully');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClinicalLibraryTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clinical-templates']);
      toast.success('Template deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      phrase: '',
      category: 'education',
      template_type: 'generic',
      expanded_text: '',
      ai_prompt_instructions: '',
      requires_patient_data: false,
      patient_data_fields: [],
      is_agency_wide: false
    });
    setEditingTemplate(null);
    setIsDialogOpen(false);
    setShowAIAssistant(false);
    setAIMode('generate');
  };

  const handleAISuggestion = (suggestion) => {
    setFormData({
      ...formData,
      phrase: suggestion.phrase || formData.phrase,
      category: suggestion.category || formData.category,
      template_type: suggestion.template_type || formData.template_type,
      expanded_text: suggestion.expanded_text || formData.expanded_text,
      ai_prompt_instructions: suggestion.ai_prompt_instructions || formData.ai_prompt_instructions,
      patient_data_fields: suggestion.patient_data_fields || formData.patient_data_fields,
      requires_patient_data: suggestion.template_type === 'patient_specific'
    });
    setShowAIAssistant(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      phrase: formData.phrase.toLowerCase().trim(),
      created_by: currentUser?.email
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      phrase: template.phrase,
      category: template.category,
      template_type: template.template_type,
      expanded_text: template.expanded_text || '',
      ai_prompt_instructions: template.ai_prompt_instructions || '',
      requires_patient_data: template.requires_patient_data || false,
      patient_data_fields: template.patient_data_fields || [],
      is_agency_wide: template.is_agency_wide || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const userTemplates = templates.filter(t => t.created_by === currentUser?.email || t.is_agency_wide);

  return (
    <Tabs defaultValue="templates" className="space-y-4">
      <TabsList>
        <TabsTrigger value="templates">
          <BookOpen className="w-4 h-4 mr-2" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Clinical Phrase Library
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Create quick phrases that expand into full compliant documentation
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No templates yet. Create your first quick phrase!</p>
              </div>
            ) : (
              userTemplates.map((template) => (
                <Card key={template.id} className="border-l-4 border-l-indigo-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {template.phrase}
                          </code>
                          <Badge variant="outline">{template.category}</Badge>
                          {template.template_type === 'patient_specific' && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <User className="w-3 h-3 mr-1" />
                              Patient-Specific
                            </Badge>
                          )}
                          {template.is_agency_wide && (
                            <Badge className="bg-green-100 text-green-800">
                              <Globe className="w-3 h-3 mr-1" />
                              Agency-Wide
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {template.expanded_text || template.ai_prompt_instructions}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Used {template.usage_count || 0} times
                          </span>
                          <span>Created by: {template.created_by}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {(template.created_by === currentUser?.email || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto sm:max-h-[85vh] fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-[100]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* AI Assistant Section */}
            <div className="border-b pb-3">
              {!showAIAssistant ? (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAIMode('generate');
                      setShowAIAssistant(true);
                    }}
                    className="border-purple-300 text-purple-700"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generate
                  </Button>
                  {(formData.phrase || editingTemplate) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAIMode('improve');
                        setShowAIAssistant(true);
                      }}
                      className="border-purple-300 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Suggestions
                    </Button>
                  )}
                  {formData.template_type === 'patient_specific' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAIMode('refine');
                        setShowAIAssistant(true);
                      }}
                      className="border-purple-300 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Refine Instructions
                    </Button>
                  )}
                </div>
              ) : (
                <ClinicalLibraryAIAssistant
                  mode={aiMode}
                  currentTemplate={editingTemplate || formData}
                  onApplySuggestion={handleAISuggestion}
                />
              )}
            </div>

            <div>
              <Label className="text-sm">Quick Phrase</Label>
              <Input
                value={formData.phrase}
                onChange={(e) => setFormData({ ...formData, phrase: e.target.value })}
                placeholder="e.g., diabetic education"
                className="text-base"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This is what you'll type to trigger the expansion
              </p>
            </div>

            <div>
              <Label className="text-sm">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="intervention">Intervention</SelectItem>
                  <SelectItem value="wound_care">Wound Care</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="vital_signs">Vital Signs</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Template Type</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) => setFormData({ ...formData, template_type: value })}
              >
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic (All Patients)</SelectItem>
                  <SelectItem value="patient_specific">Patient-Specific</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.template_type === 'generic' 
                  ? 'Same text for all patients' 
                  : 'Uses patient-specific data to generate personalized text'}
              </p>
            </div>

            {formData.template_type === 'generic' ? (
              <div>
                <Label className="text-sm">Expanded Text</Label>
                <Textarea
                  value={formData.expanded_text}
                  onChange={(e) => setFormData({ ...formData, expanded_text: e.target.value })}
                  placeholder="Full Medicare-compliant documentation text..."
                  rows={4}
                  className="text-base"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-sm">AI Instructions</Label>
                  <Textarea
                    value={formData.ai_prompt_instructions}
                    onChange={(e) => setFormData({ ...formData, ai_prompt_instructions: e.target.value })}
                    placeholder="Instructions for AI..."
                    rows={3}
                    className="text-base"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm">Patient Data Fields</Label>
                  <Input
                    value={formData.patient_data_fields.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      patient_data_fields: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="wounds, medications"
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated field names
                  </p>
                </div>
              </>
            )}

            {isAdmin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="agency-wide"
                  checked={formData.is_agency_wide}
                  onChange={(e) => setFormData({ ...formData, is_agency_wide: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="agency-wide">Make available agency-wide</Label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="analytics">
        <ClinicalLibraryAnalytics />
      </TabsContent>
    </Tabs>
  );
}