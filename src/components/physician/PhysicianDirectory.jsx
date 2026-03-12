import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, Plus, Edit, Trash2, Phone, Mail, MapPin, 
  UserPlus, Star, Send, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import PhysicianForm from './PhysicianForm';

export default function PhysicianDirectory({ onSelectPhysician, mode = 'directory' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPhysician, setEditingPhysician] = useState(null);
  const queryClient = useQueryClient();

  const { data: physicians = [], isLoading } = useQuery({
    queryKey: ['physicians'],
    queryFn: () => base44.entities.Physician.filter({ is_active: true }, '-referral_count', 500),
    initialData: [],
  });

  const deletePhysicianMutation = useMutation({
    mutationFn: (id) => base44.entities.Physician.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physicians'] });
      toast.success('Physician removed from directory');
    },
  });

  const incrementReferralMutation = useMutation({
    mutationFn: ({ id, count }) => 
      base44.entities.Physician.update(id, { 
        referral_count: count + 1,
        last_referral_date: new Date().toISOString().split('T')[0]
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physicians'] });
    },
  });

  const filteredPhysicians = useMemo(() => {
    return physicians.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.practice_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSpecialty = specialtyFilter === 'all' || doc.specialty === specialtyFilter;
      
      return matchesSearch && matchesSpecialty;
    });
  }, [physicians, searchTerm, specialtyFilter]);

  const handleSelectPhysician = (physician) => {
    if (onSelectPhysician) {
      incrementReferralMutation.mutate({ 
        id: physician.id, 
        count: physician.referral_count || 0 
      });
      onSelectPhysician(physician);
    }
  };

  const getSpecialtyLabel = (specialty) => {
    return specialty?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A';
  };

  const specialties = [
    'primary_care', 'cardiology', 'endocrinology', 'pulmonology', 
    'nephrology', 'neurology', 'orthopedics', 'psychiatry',
    'gastroenterology', 'oncology', 'dermatology', 'rheumatology',
    'infectious_disease', 'physical_medicine', 'pain_management',
    'wound_care', 'palliative_care', 'hospice', 'other'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading physician directory...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Physician Directory
            </CardTitle>
            {mode === 'directory' && (
              <Button onClick={() => { setEditingPhysician(null); setShowForm(true); }} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Physician
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, practice, specialty, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>
                      {getSpecialtyLabel(spec)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredPhysicians.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No physicians found</p>
              </div>
            ) : (
              filteredPhysicians.map((physician) => (
                <Card 
                  key={physician.id} 
                  className={`hover:shadow-md transition-shadow ${
                    mode === 'selector' ? 'cursor-pointer hover:border-indigo-300' : ''
                  }`}
                  onClick={() => mode === 'selector' && handleSelectPhysician(physician)}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {physician.full_name}
                              {physician.credentials && <span className="text-sm text-gray-600 ml-1">{physician.credentials}</span>}
                            </h3>
                            {(physician.referral_count || 0) > 10 && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <Star className="w-3 h-3 mr-1" />
                                Frequent
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="mb-2">
                            {getSpecialtyLabel(physician.specialty)}
                          </Badge>
                          {physician.subspecialty && (
                            <Badge variant="outline" className="ml-1 mb-2">
                              {physician.subspecialty}
                            </Badge>
                          )}
                          {physician.practice_name && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                              <FileText className="w-3 h-3" />
                              {physician.practice_name}
                            </p>
                          )}
                        </div>
                        {mode === 'directory' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPhysician(physician);
                                setShowForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove this physician from the directory?')) {
                                  deletePhysicianMutation.mutate(physician.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        {physician.fax_number && (
                          <div className="flex items-center gap-2">
                            <Send className="w-3 h-3" />
                            <span className="font-medium">Fax:</span> {physician.fax_number}
                          </div>
                        )}
                        {physician.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span className="font-medium">Phone:</span> {physician.phone_number}
                          </div>
                        )}
                        {physician.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="font-medium">Email:</span> {physician.email}
                          </div>
                        )}
                        {physician.office_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>{physician.office_address}, {physician.office_city}, {physician.office_state} {physician.office_zip}</span>
                          </div>
                        )}
                      </div>

                      {physician.tags && physician.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {physician.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {physician.referral_count > 0 && (
                        <div className="text-xs text-gray-500 pt-1">
                          {physician.referral_count} referral{physician.referral_count !== 1 ? 's' : ''}
                          {physician.last_referral_date && ` • Last: ${new Date(physician.last_referral_date).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="text-sm text-gray-500 text-center pt-2">
            {filteredPhysicians.length} physician{filteredPhysicians.length !== 1 ? 's' : ''} found
          </div>
        </CardContent>
      </Card>

      {/* Physician Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPhysician ? 'Edit Physician' : 'Add New Physician'}
            </DialogTitle>
          </DialogHeader>
          <PhysicianForm
            physician={editingPhysician}
            onClose={() => {
              setShowForm(false);
              setEditingPhysician(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}