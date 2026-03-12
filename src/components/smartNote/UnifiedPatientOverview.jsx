import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  X, 
  AlertCircle, 
  FileText, 
  Activity,
  Target,
  Database
} from "lucide-react";
import { format } from "date-fns";
import OASISDataDisplay from "../patient/OASISDataDisplay";
import OASISDataSync from "./OASISDataSync";
import OASISTriggeredTemplates from "./OASISTriggeredTemplates";

export default function UnifiedPatientOverview({
  patient,
  carePlans = [],
  recentVisits = [],
  patientOASIS = [],
  vitalSigns = {},
  onClear,
  onSyncData,
  onInsertTemplate,
  diagnosis
}) {
  const [activeTab, setActiveTab] = useState("info");

  const hasVitals = vitalSigns.bp || vitalSigns.hr || vitalSigns.temp || vitalSigns.o2;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white mb-4 md:mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate">
                {patient.first_name} {patient.last_name}
              </h3>
              <p className="text-sm text-gray-600">
                {patient.primary_diagnosis || 'No primary diagnosis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {patient.allergies && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Allergies
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Info
            </TabsTrigger>
            <TabsTrigger value="visits" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="careplans" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="oasis" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              OASIS
            </TabsTrigger>
            <TabsTrigger value="vitals" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Vitals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-2 mt-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium">{patient.status || 'Active'}</p>
              </div>
              <div>
                <p className="text-gray-500">Care Type</p>
                <p className="font-medium">{patient.care_type || 'Home Health'}</p>
              </div>
              {patient.date_of_birth && (
                <div>
                  <p className="text-gray-500">Date of Birth</p>
                  <p className="font-medium">{format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}</p>
                </div>
              )}
              {patient.admission_date && (
                <div>
                  <p className="text-gray-500">Admission</p>
                  <p className="font-medium">{format(new Date(patient.admission_date), 'MM/dd/yyyy')}</p>
                </div>
              )}
            </div>
            {patient.allergies && (
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-1">⚠️ Allergies</p>
                <p className="text-sm text-red-800">{patient.allergies}</p>
              </div>
            )}
            {patient.secondary_diagnoses?.length > 0 && (
              <div className="p-2 bg-gray-50 rounded border">
                <p className="text-xs font-semibold text-gray-700 mb-1">Secondary Diagnoses</p>
                <p className="text-sm text-gray-700">{patient.secondary_diagnoses.join(', ')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="visits" className="space-y-2 mt-3">
            {recentVisits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent visits</p>
            ) : (
              recentVisits.map((visit, idx) => (
                <div key={visit.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">
                      {visit.visit_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(visit.visit_date), 'MM/dd/yyyy')}
                    </p>
                  </div>
                  {visit.nurse_notes && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {visit.nurse_notes.substring(0, 150)}...
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="careplans" className="space-y-2 mt-3">
            {carePlans.filter(cp => cp.status === 'active').length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active care plans</p>
            ) : (
              carePlans.filter(cp => cp.status === 'active').map((cp) => (
                <div key={cp.id} className="p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-sm font-semibold text-green-900">{cp.problem}</p>
                  <p className="text-xs text-green-700 mt-1">Goal: {cp.goal}</p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="oasis" className="space-y-2 mt-3">
            {patientOASIS.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No OASIS data</p>
            ) : (
              <>
                <OASISDataDisplay oasisData={patientOASIS} compact={true} />
                <OASISDataSync
                  patientId={patient.id}
                  onSyncData={onSyncData}
                  currentDiagnosis={diagnosis}
                  currentVitalSigns={vitalSigns}
                />
                <OASISTriggeredTemplates
                  patientId={patient.id}
                  onInsertTemplate={onInsertTemplate}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="vitals" className="space-y-2 mt-3">
            {!hasVitals ? (
              <p className="text-sm text-gray-500 text-center py-4">No vitals recorded yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {vitalSigns.bp && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Blood Pressure</p>
                    <p className="text-sm font-semibold">{vitalSigns.bp}</p>
                  </div>
                )}
                {vitalSigns.hr && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Heart Rate</p>
                    <p className="text-sm font-semibold">{vitalSigns.hr} bpm</p>
                  </div>
                )}
                {vitalSigns.temp && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-sm font-semibold">{vitalSigns.temp}°F</p>
                  </div>
                )}
                {vitalSigns.o2 && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">O2 Saturation</p>
                    <p className="text-sm font-semibold">{vitalSigns.o2}%</p>
                  </div>
                )}
                {vitalSigns.pain && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Pain Level</p>
                    <p className="text-sm font-semibold">{vitalSigns.pain}/10</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}