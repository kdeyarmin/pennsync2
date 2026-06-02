import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pill, Plus, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

import MedicationReconciliationInterface from '../components/medication/MedicationReconciliationInterface';

export default function MedicationReconciliation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showInterface, setShowInterface] = useState(false);

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ['medication-reconciliations'],
    queryFn: () => base44.entities.MedicationReconciliation.list('-reconciliation_date', 50),
    initialData: []
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-active'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
    initialData: []
  });

  const filteredPatients = patients.filter(p =>
    searchTerm === '' ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: reconciliations.length,
    // Active = not yet completed/notified. Previously only counted
    // 'pending_review', so 'in_progress' reconciliations were invisible.
    pending: reconciliations.filter(r => r.status === 'pending_review' || r.status === 'in_progress').length,
    completed: reconciliations.filter(r => r.status === 'completed').length,
    critical: reconciliations.filter(r => r.critical_discrepancies > 0).length
  };

  const statusConfig = {
    pending_review: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'In Progress' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
    physician_notified: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Notified' }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Medication Reconciliation</h1>
        <p className="text-slate-600">Compare discharge orders with current medications and resolve discrepancies</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Total Reconciliations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
<<<<<<< HEAD
            <p className="text-sm text-slate-600">Pending Review</p>
=======
            <p className="text-sm text-slate-600">Pending / In Progress</p>
>>>>>>> origin/main
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-sm text-slate-600">Critical Discrepancies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-slate-600">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Start New Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {searchTerm && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setShowInterface(true);
                    setSearchTerm('');
                  }}
                >
                  <div>
                    <p className="font-semibold">{patient.first_name} {patient.last_name}</p>
                    <p className="text-sm text-slate-600">{patient.primary_diagnosis}</p>
                  </div>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Reconcile
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reconciliations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reconciliations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : reconciliations.length === 0 ? (
            <div className="py-8 text-center">
              <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No reconciliations yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map(recon => {
                const config = statusConfig[recon.status] || statusConfig.pending_review;
                const Icon = config.icon;

                return (
                  <div key={recon.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{recon.patient_name}</h3>
                        <p className="text-sm text-slate-600">
                          {new Date(recon.reconciliation_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={config.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="flex gap-4 text-sm mb-3">
                      <span className="text-slate-600">
                        {recon.total_discrepancies} discrepancies
                      </span>
                      {recon.critical_discrepancies > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-semibold">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {recon.critical_discrepancies} critical
                          </span>
                        </>
                      )}
                    </div>

                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showInterface && selectedPatientId && (
        <MedicationReconciliationInterface
          patientId={selectedPatientId}
          onClose={() => {
            setShowInterface(false);
            setSelectedPatientId(null);
          }}
          onComplete={() => {
            setShowInterface(false);
            setSelectedPatientId(null);
          }}
        />
      )}
    </div>
  );
}