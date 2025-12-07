import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FileOutput, GraduationCap, TrendingUp, Sparkles } from "lucide-react";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import DischargeSummaryGenerator from "../components/documents/DischargeSummaryGenerator";
import ReferralLetterGenerator from "../components/documents/ReferralLetterGenerator";
import PatientEducationGenerator from "../components/documents/PatientEducationGenerator";
import ProgressReportGenerator from "../components/documents/ProgressReportGenerator";

export default function DocumentGenerator() {
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: selectedPatient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => base44.entities.Patient.filter({ id: selectedPatientId }).then(res => res[0]),
    enabled: !!selectedPatientId,
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Document Generator</h1>
            <p className="text-gray-600">Generate compliant healthcare documents instantly</p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchablePatientSelect
            patients={patients}
            value={selectedPatientId}
            onValueChange={setSelectedPatientId}
            placeholder="Search for a patient..."
          />
        </CardContent>
      </Card>

      {selectedPatientId && selectedPatient && (
        <Tabs defaultValue="discharge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="discharge" className="gap-2">
              <FileOutput className="w-4 h-4" />
              Discharge Summary
            </TabsTrigger>
            <TabsTrigger value="referral" className="gap-2">
              <FileText className="w-4 h-4" />
              Referral Letter
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Patient Education
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Progress Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discharge">
            <DischargeSummaryGenerator patientId={selectedPatientId} patient={selectedPatient} />
          </TabsContent>

          <TabsContent value="referral">
            <ReferralLetterGenerator patientId={selectedPatientId} patient={selectedPatient} />
          </TabsContent>

          <TabsContent value="education">
            <PatientEducationGenerator patientId={selectedPatientId} patient={selectedPatient} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressReportGenerator patientId={selectedPatientId} patient={selectedPatient} />
          </TabsContent>
        </Tabs>
      )}

      {!selectedPatientId && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate Documents</h3>
            <p className="text-gray-600">Select a patient above to begin generating healthcare documents</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}