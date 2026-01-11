import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchablePatientSelect from "../ui/SearchablePatientSelect";
import { User, CheckCircle2 } from "lucide-react";
import { todayEastern } from "../utils/timezone";

const commonDiagnoses = [
  "CHF (Congestive Heart Failure)",
  "COPD (Chronic Obstructive Pulmonary Disease)",
  "Diabetes Mellitus Type 2",
  "Hypertension",
  "Post-operative care",
  "Wound care",
  "Stroke/CVA",
  "Dementia/Alzheimer's",
  "Custom (type below)"
];

export default function PatientSelectionStep({ 
  patients, selectedPatientId, selectedPatient, 
  visitDate, visitType, diagnosis, customDiagnosis,
  onPatientChange, onVisitDateChange, onVisitTypeChange, onDiagnosisChange, onCustomDiagnosisChange,
  isCollapsed, onToggleCollapse, currentStep
}) {
  return (
    <Card id="step-patient" className={`border-2 transition-all duration-300 ${currentStep === 'patient' ? 'border-blue-500 shadow-lg' : 'border-gray-300'}`}>
      <CardHeader 
        className={`py-4 md:py-5 cursor-pointer ${currentStep === 'patient' ? 'bg-gradient-to-r from-blue-100 to-indigo-100' : 'bg-gray-50'}`}
        onClick={() => isCollapsed && onToggleCollapse()}
      >
        <CardTitle className="text-base md:text-lg flex items-center gap-3">
          <div className={`p-2 rounded-full ${selectedPatient ? 'bg-green-500' : 'bg-blue-500'}`}>
            <User className="w-4 h-4 text-white" />
          </div>
          <span>1. Patient & Visit</span>
          {selectedPatient && (
            <span className="text-sm text-gray-600 ml-2">{selectedPatient.first_name} {selectedPatient.last_name}</span>
          )}
          {selectedPatient && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <Label className="text-sm md:text-base mb-2 block">Patient</Label>
              <SearchablePatientSelect
                patients={patients}
                value={selectedPatientId}
                onValueChange={onPatientChange}
                placeholder="Search patients..."
              />
            </div>
            <div>
              <Label className="text-sm md:text-base mb-2 block">Visit Date</Label>
              <Input 
                type="date" 
                value={visitDate} 
                onChange={(e) => onVisitDateChange(e.target.value)}
                max={todayEastern()}
                className="h-11 md:h-12 text-base"
              />
            </div>
            <div>
              <Label className="text-sm md:text-base mb-2 block">Visit Type</Label>
              <Select value={visitType} onValueChange={onVisitTypeChange}>
                <SelectTrigger className="h-11 md:h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admission" className="text-base py-3">Admission</SelectItem>
                  <SelectItem value="routine_visit" className="text-base py-3">Routine Visit</SelectItem>
                  <SelectItem value="recertification" className="text-base py-3">Recertification</SelectItem>
                  <SelectItem value="discharge" className="text-base py-3">Discharge</SelectItem>
                  <SelectItem value="prn" className="text-base py-3">PRN Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm md:text-base mb-2 block">Diagnosis</Label>
              <Select value={diagnosis} onValueChange={onDiagnosisChange}>
                <SelectTrigger className="h-11 md:h-12 text-base"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {commonDiagnoses.map((dx) => (
                    <SelectItem key={dx} value={dx} className="text-base py-3">{dx}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {diagnosis === "Custom (type below)" && (
            <Input 
              placeholder="Enter custom diagnosis" 
              value={customDiagnosis} 
              onChange={(e) => onCustomDiagnosisChange(e.target.value)}
              className="h-11 md:h-12 text-base"
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}