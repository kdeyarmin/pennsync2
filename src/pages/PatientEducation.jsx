import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  Loader2,
  FileText,
  Heart,
  Pill,
  Activity,
  Brain,
  Utensils,
  Shield,
  CheckCircle2,
  Copy,
  Printer,
  Plus
} from "lucide-react";

import EducationMaterialGenerator from "../components/education/EducationMaterialGenerator";
import TeachBackConfirmation from "../components/education/TeachBackConfirmation";
import EducationLibrary from "../components/education/EducationLibrary";

export default function PatientEducation() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatedMaterial, setGeneratedMaterial] = useState(null);
  const [teachBackRecords, setTeachBackRecords] = useState([]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleMaterialGenerated = (material) => {
    setGeneratedMaterial(material);
  };

  const handleTeachBackRecorded = (record) => {
    setTeachBackRecords(prev => [...prev, record]);
  };

  // Get teach-back history for selected patient
  const patientTeachBackHistory = selectedPatientId 
    ? teachBackRecords.filter(r => r.patientId === selectedPatientId)
    : teachBackRecords;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Patient Education Center
        </h1>
        <p className="text-gray-600">
          Generate patient-friendly educational materials and document understanding
        </p>
      </div>

      {/* Patient Selection */}
      <Card className="mb-6 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Select Patient (Optional)
              </label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No patient selected</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} - {p.primary_diagnosis || 'No diagnosis'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPatient && (
              <div className="flex items-end gap-2">
                <Badge className="bg-blue-100 text-blue-800 h-10 px-4 flex items-center">
                  {selectedPatient.primary_diagnosis || 'No diagnosis'}
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 h-10 px-4 flex items-center">
                  {selectedPatient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="gap-2">
            <Brain className="w-4 h-4" />
            Generate Materials
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Education Library
          </TabsTrigger>
          <TabsTrigger value="teachback" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Teach-Back Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EducationMaterialGenerator
                patient={selectedPatient}
                teachBackHistory={patientTeachBackHistory}
                onMaterialGenerated={handleMaterialGenerated}
              />
            </div>
            <div>
              {generatedMaterial && (
                <TeachBackConfirmation
                  material={generatedMaterial}
                  patient={selectedPatient}
                  onRecorded={handleTeachBackRecorded}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <EducationLibrary
            patient={selectedPatient}
            onSelectMaterial={(material) => setGeneratedMaterial(material)}
          />
        </TabsContent>

        <TabsContent value="teachback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Teach-Back Documentation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teachBackRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No teach-back records yet.</p>
                  <p className="text-sm">Generate educational materials and document patient understanding.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teachBackRecords.map((record, idx) => (
                    <Card key={idx} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{record.topic}</h4>
                            <p className="text-sm text-gray-600">{record.patientName}</p>
                          </div>
                          <Badge className={
                            record.understandingLevel === 'good' ? 'bg-green-100 text-green-800' :
                            record.understandingLevel === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {record.understandingLevel} understanding
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{record.response}</p>
                        <p className="text-xs text-gray-500">
                          Recorded: {new Date(record.timestamp).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}