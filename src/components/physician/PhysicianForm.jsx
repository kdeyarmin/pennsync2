import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PhysicianForm({ physician, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: physician?.full_name || '',
    credentials: physician?.credentials || '',
    specialty: physician?.specialty || 'primary_care',
    subspecialty: physician?.subspecialty || '',
    practice_name: physician?.practice_name || '',
    office_address: physician?.office_address || '',
    office_city: physician?.office_city || '',
    office_state: physician?.office_state || '',
    office_zip: physician?.office_zip || '',
    phone_number: physician?.phone_number || '',
    fax_number: physician?.fax_number || '',
    email: physician?.email || '',
    npi_number: physician?.npi_number || '',
    accepts_home_health: physician?.accepts_home_health ?? true,
    accepts_hospice: physician?.accepts_hospice ?? false,
    preferred_contact_method: physician?.preferred_contact_method || 'fax',
    office_hours: physician?.office_hours || '',
    notes: physician?.notes || '',
    tags: physician?.tags || [],
    is_active: physician?.is_active ?? true,
  });

  const [tagInput, setTagInput] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (physician) {
        return base44.entities.Physician.update(physician.id, data);
      }
      return base44.entities.Physician.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physicians'] });
      toast.success(physician ? 'Physician updated' : 'Physician added to directory');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      return toast.error('Physician name is required');
    }
    saveMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const specialties = [
    { value: 'primary_care', label: 'Primary Care' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'endocrinology', label: 'Endocrinology' },
    { value: 'pulmonology', label: 'Pulmonology' },
    { value: 'nephrology', label: 'Nephrology' },
    { value: 'neurology', label: 'Neurology' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'psychiatry', label: 'Psychiatry' },
    { value: 'gastroenterology', label: 'Gastroenterology' },
    { value: 'oncology', label: 'Oncology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'rheumatology', label: 'Rheumatology' },
    { value: 'infectious_disease', label: 'Infectious Disease' },
    { value: 'physical_medicine', label: 'Physical Medicine' },
    { value: 'pain_management', label: 'Pain Management' },
    { value: 'wound_care', label: 'Wound Care' },
    { value: 'palliative_care', label: 'Palliative Care' },
    { value: 'hospice', label: 'Hospice' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label>Full Name *</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Dr. John Smith"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Credentials</Label>
          <Input
            value={formData.credentials}
            onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
            placeholder="MD, DO, NP, PA"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Specialty *</Label>
          <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {specialties.map(spec => (
                <SelectItem key={spec.value} value={spec.value}>
                  {spec.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subspecialty</Label>
          <Input
            value={formData.subspecialty}
            onChange={(e) => setFormData({ ...formData, subspecialty: e.target.value })}
            placeholder="e.g., Interventional Cardiology"
          />
        </div>
      </div>

      <div>
        <Label>Practice/Hospital Name</Label>
        <Input
          value={formData.practice_name}
          onChange={(e) => setFormData({ ...formData, practice_name: e.target.value })}
          placeholder="City Medical Group"
        />
      </div>

      <div>
        <Label>Office Address</Label>
        <Input
          value={formData.office_address}
          onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
          placeholder="123 Main Street"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>City</Label>
          <Input
            value={formData.office_city}
            onChange={(e) => setFormData({ ...formData, office_city: e.target.value })}
          />
        </div>
        <div>
          <Label>State</Label>
          <Input
            value={formData.office_state}
            onChange={(e) => setFormData({ ...formData, office_state: e.target.value })}
            placeholder="CA"
          />
        </div>
        <div>
          <Label>ZIP</Label>
          <Input
            value={formData.office_zip}
            onChange={(e) => setFormData({ ...formData, office_zip: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Phone Number</Label>
          <Input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="+1234567890"
          />
        </div>
        <div>
          <Label>Fax Number</Label>
          <Input
            type="tel"
            value={formData.fax_number}
            onChange={(e) => setFormData({ ...formData, fax_number: e.target.value })}
            placeholder="+1234567890"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="doctor@example.com"
          />
        </div>
        <div>
          <Label>NPI Number</Label>
          <Input
            value={formData.npi_number}
            onChange={(e) => setFormData({ ...formData, npi_number: e.target.value })}
            placeholder="1234567890"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Preferred Contact Method</Label>
          <Select value={formData.preferred_contact_method} onValueChange={(value) => setFormData({ ...formData, preferred_contact_method: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fax">Fax</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Office Hours</Label>
          <Input
            value={formData.office_hours}
            onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
            placeholder="Mon-Fri 9AM-5PM"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.accepts_home_health}
            onChange={(e) => setFormData({ ...formData, accepts_home_health: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Accepts Home Health</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.accepts_hospice}
            onChange={(e) => setFormData({ ...formData, accepts_hospice: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Accepts Hospice</span>
        </label>
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tag (e.g., preferred, wound specialist)"
          />
          <Button type="button" onClick={addTag} variant="outline">Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.tags.map((tag, idx) => (
            <Badge key={idx} variant="outline" className="gap-1">
              {tag}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this physician..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {physician ? 'Update' : 'Add'} Physician
        </Button>
      </div>
    </form>
  );
}