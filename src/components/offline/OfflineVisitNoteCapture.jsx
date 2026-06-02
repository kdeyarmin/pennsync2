import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WifiOff,
  Wifi,
  Save,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { OfflineStorageManager } from './OfflineSyncService';

export default function OfflineVisitNoteCapture({ patient, onComplete }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visitData, setVisitData] = useState({
    patient_id: patient?.id,
    patient_name: patient ? `${patient.first_name} ${patient.last_name}` : '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'Skilled Nursing',
    vitals: {
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      respiratory_rate: '',
      temperature: '',
      oxygen_saturation: '',
      pain_level: '',
      weight: ''
    },
    chief_complaint: '',
    assessment: '',
    interventions: '',
    patient_response: '',
    plan: '',
    clinical_notes: '',
    nurse_signature: '',
    visit_duration_minutes: 45
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored - syncing offline data');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline - data will be saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateField = (field, value) => {
    setVisitData(prev => ({ ...prev, [field]: value }));
  };

  const updateVitals = (vitalName, value) => {
    setVisitData(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [vitalName]: value }
    }));
  };

  const saveVisitNote = async () => {
    if (!visitData.patient_id) {
      toast.error('Patient is required');
      return;
    }

    if (!visitData.assessment || !visitData.plan) {
      toast.error('Assessment and Plan are required fields');
      return;
    }

    try {
      // Save to offline queue
      const savedId = OfflineStorageManager.saveToQueue('visit', {
        ...visitData,
        status: 'completed',
        offline_created: !isOnline,
        captured_at: new Date().toISOString()
      });

      toast.success(
        isOnline 
          ? 'Visit note saved and will sync shortly' 
          : 'Visit note saved offline - will sync when online'
      );

      // Reset form
      setVisitData({
        patient_id: patient?.id,
        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : '',
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'Skilled Nursing',
        vitals: {
          blood_pressure_systolic: '',
          blood_pressure_diastolic: '',
          heart_rate: '',
          respiratory_rate: '',
          temperature: '',
          oxygen_saturation: '',
          pain_level: '',
          weight: ''
        },
        chief_complaint: '',
        assessment: '',
        interventions: '',
        patient_response: '',
        plan: '',
        clinical_notes: '',
        nurse_signature: '',
        visit_duration_minutes: 45
      });

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error saving visit note:', error);
      toast.error('Failed to save visit note');
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status Banner */}
      <Card className={`border-2 ${isOnline ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-6 h-6 text-green-600" />
            ) : (
              <WifiOff className="w-6 h-6 text-orange-600" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${isOnline ? 'text-green-900' : 'text-orange-900'}`}>
                {isOnline ? 'Connected' : 'Offline Mode'}
              </p>
              <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-orange-700'}`}>
                {isOnline 
                  ? 'Your notes will sync immediately' 
                  : 'Your notes will be saved locally and synced when connection is restored'}
              </p>
            </div>
            {!isOnline && (
              <Badge className="bg-orange-500">
                <Clock className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Patient</label>
            <Input value={visitData.patient_name} disabled className="bg-slate-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Visit Date</label>
              <Input
                type="date"
                value={visitData.visit_date}
                onChange={(e) => updateField('visit_date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Visit Type</label>
              <Select value={visitData.visit_type} onValueChange={(val) => updateField('visit_type', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Skilled Nursing">Skilled Nursing</SelectItem>
                  <SelectItem value="Physical Therapy">Physical Therapy</SelectItem>
                  <SelectItem value="Occupational Therapy">Occupational Therapy</SelectItem>
                  <SelectItem value="Speech Therapy">Speech Therapy</SelectItem>
                  <SelectItem value="Home Health Aide">Home Health Aide</SelectItem>
                  <SelectItem value="Social Work">Social Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vital Signs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vital Signs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">BP Systolic</label>
              <Input
                type="number"
                placeholder="120"
                value={visitData.vitals.blood_pressure_systolic}
                onChange={(e) => updateVitals('blood_pressure_systolic', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">BP Diastolic</label>
              <Input
                type="number"
                placeholder="80"
                value={visitData.vitals.blood_pressure_diastolic}
                onChange={(e) => updateVitals('blood_pressure_diastolic', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Heart Rate</label>
              <Input
                type="number"
                placeholder="72"
                value={visitData.vitals.heart_rate}
                onChange={(e) => updateVitals('heart_rate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Resp Rate</label>
              <Input
                type="number"
                placeholder="16"
                value={visitData.vitals.respiratory_rate}
                onChange={(e) => updateVitals('respiratory_rate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Temp (°F)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="98.6"
                value={visitData.vitals.temperature}
                onChange={(e) => updateVitals('temperature', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">O2 Sat (%)</label>
              <Input
                type="number"
                placeholder="98"
                value={visitData.vitals.oxygen_saturation}
                onChange={(e) => updateVitals('oxygen_saturation', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Pain (0-10)</label>
              <Input
                type="number"
                min="0"
                max="10"
                placeholder="0"
                value={visitData.vitals.pain_level}
                onChange={(e) => updateVitals('pain_level', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Weight (lbs)</label>
              <Input
                type="number"
                placeholder="150"
                value={visitData.vitals.weight}
                onChange={(e) => updateVitals('weight', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clinical Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Chief Complaint
            </label>
            <Textarea
              placeholder="Patient's primary concern or reason for visit..."
              value={visitData.chief_complaint}
              onChange={(e) => updateField('chief_complaint', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Assessment <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Clinical assessment, findings, and observations..."
              value={visitData.assessment}
              onChange={(e) => updateField('assessment', e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Interventions Performed
            </label>
            <Textarea
              placeholder="Nursing interventions, treatments, education provided..."
              value={visitData.interventions}
              onChange={(e) => updateField('interventions', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Patient Response
            </label>
            <Textarea
              placeholder="How patient responded to interventions..."
              value={visitData.patient_response}
              onChange={(e) => updateField('patient_response', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Plan of Care <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Ongoing plan, follow-up, next visit plan..."
              value={visitData.plan}
              onChange={(e) => updateField('plan', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Additional Clinical Notes
            </label>
            <Textarea
              placeholder="Any additional relevant information..."
              value={visitData.clinical_notes}
              onChange={(e) => updateField('clinical_notes', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-4 bg-white p-4 rounded-lg border-2 border-slate-200 shadow-lg">
        <Button
          onClick={saveVisitNote}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Visit Note
          {!isOnline && <Badge className="ml-2 bg-orange-500">Offline</Badge>}
        </Button>
      </div>
    </div>
  );
}