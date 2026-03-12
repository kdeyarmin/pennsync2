import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CourseForm({ course, onSuccess }) {
  const [formData, setFormData] = useState(course || {
    title: '',
    description: '',
    category: 'compliance',
    status: 'draft',
    estimated_minutes: 60,
    passing_score: 80,
    is_mandatory: false,
    enable_certificate: true,
  });

  const createMutation = useMutation({
    mutationFn: () => course
      ? base44.entities.TrainingCourse.update(course.id, formData)
      : base44.entities.TrainingCourse.create(formData),
    onSuccess,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Course Title *</Label>
        <Input
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter course title"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Course description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="clinical">Clinical</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="documentation">Documentation</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status *</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Estimated Minutes *</Label>
          <Input
            type="number"
            required
            value={formData.estimated_minutes}
            onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label>Passing Score % *</Label>
          <Input
            type="number"
            required
            min="0"
            max="100"
            value={formData.passing_score}
            onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_mandatory}
            onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
          />
          <span className="text-sm">Mandatory Course</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enable_certificate}
            onChange={(e) => setFormData({ ...formData, enable_certificate: e.target.checked })}
          />
          <span className="text-sm">Issue Certificate</span>
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createMutation.isLoading}>
          {createMutation.isLoading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
        </Button>
      </div>
    </form>
  );
}