import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";
import { isValidEmail, isValidPhone, sanitizeObject, handleSecureError, logSecurityEvent } from "../utils/security";

export default function PatientForm({ patient, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    medical_record_number: '',
    address: '',
    phone: '',
    email: '',
    primary_diagnosis: '',
    secondary_diagnoses: [],
    allergies: '',
    care_type: 'home_health',
    status: 'active'
  });

  const [secondaryDiagnosisInput, setSecondaryDiagnosisInput] = useState('');

  useEffect(() => {
    if (patient) {
      setFormData(prev => ({
        ...prev,
        ...patient,
        secondary_diagnoses: patient.secondary_diagnoses || []
      }));
    }
  }, [patient]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSecondaryDiagnosis = () => {
    if (secondaryDiagnosisInput.trim()) {
      setFormData(prev => ({
        ...prev,
        secondary_diagnoses: [...(prev.secondary_diagnoses || []), secondaryDiagnosisInput.trim()]
      }));
      setSecondaryDiagnosisInput('');
    }
  };

  const removeSecondaryDiagnosis = (index) => {
    setFormData(prev => ({
      ...prev,
      secondary_diagnoses: prev.secondary_diagnoses.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation checks before sanitization and submission attempt
    if (formData.email && !isValidEmail(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    if (formData.phone && !isValidPhone(formData.phone)) {
      alert("Please enter a valid phone number (e.g., +1-555-555-5555 or 555-555-5555)");
      return;
    }

    try {
      // Sanitize all input data before submission using the new sanitizeObject
      const sanitizedData = sanitizeObject(formData);
      
      if (patient) {
        // Update existing patient
        await base44.entities.Patient.update(patient.id, sanitizedData);
        await logSecurityEvent('PATIENT_UPDATED', {
          patient_id: patient.id,
          fields_changed: Object.keys(formData)
        });
      } else {
        // Create new patient
        await base44.entities.Patient.create(sanitizedData);
        await logSecurityEvent('PATIENT_CREATED', {
          // Don't log PHI as per outline
        });
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      // Use the new handleSecureError for robust error handling and user feedback
      await handleSecureError(
        error,
        'patient_form_submit',
        (msg) => alert(msg)
      );
    }
  };

  return (
    <Card className="mb-6 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle>{patient ? 'Edit Patient' : 'Add New Patient'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                required
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                required
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="medical_record_number">Medical Record Number</Label>
              <Input
                id="medical_record_number"
                value={formData.medical_record_number}
                onChange={(e) => handleChange('medical_record_number', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="care_type">Care Type *</Label>
              <Select
                value={formData.care_type}
                onValueChange={(value) => handleChange('care_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select care type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_health">Home Health</SelectItem>
                  <SelectItem value="hospice">Hospice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                  <SelectItem value="hospitalized">Hospitalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="primary_diagnosis">Primary Diagnosis</Label>
            <Input
              id="primary_diagnosis"
              value={formData.primary_diagnosis}
              onChange={(e) => handleChange('primary_diagnosis', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="secondary_diagnoses">Secondary Diagnoses</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="secondary_diagnoses"
                value={secondaryDiagnosisInput}
                onChange={(e) => setSecondaryDiagnosisInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSecondaryDiagnosis())}
                placeholder="Type and press Enter"
              />
              <Button type="button" onClick={addSecondaryDiagnosis} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.secondary_diagnoses?.map((diagnosis, index) => (
                <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  <span className="text-sm">{diagnosis}</span>
                  <button
                    type="button"
                    onClick={() => removeSecondaryDiagnosis(index)}
                    className="hover:bg-blue-200 rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              placeholder="NKDA or list allergies"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {patient ? 'Update Patient' : 'Add Patient'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}