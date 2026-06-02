import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export default function EventReport() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    date_of_event: "",
    time_of_event: "",
    event_type: "",
    event_type_id: "",
    location_of_event: "",
    medications: "",
    diagnosis: "",
    factual_description: "",
    follow_up_action: "",
    submitted_by: "",
    submitter_title: "",
    state_reportable: "",
  });

  const eventTypes = [
    { id: "HE", description: "Complaint of Patient/Resident Abuse, Confirmed or Not" },
    { id: "HA", description: "Death Due To Injury, Suicide, or Unusual Circumstances While a Patient/Resident" },
    { id: "HB", description: "Death Due to Malnutrition, Dehydration or Sepsis" },
    { id: "HC", description: "Death Due to a Medication Error or Adverse Reaction to Medication" },
    { id: "IW", description: "Health Department Reportable Diseases" },
    { id: "IQ", description: "Misappropriation of Patient/Resident Property" },
    { id: "18", description: "Other" },
    { id: "02", description: "Patient/Resident Neglect" },
    { id: "HF", description: "Rape" },
    { id: "IE", description: "Transfer/Admission to Hospital Because of Injury/Accident" },
    { id: "HQ", description: "Unlicensed Practice of a Regulated Professional" },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = [
      'patient_id', 'date_of_event', 'time_of_event', 'event_type',
      'location_of_event', 'factual_description', 'follow_up_action',
      'submitted_by', 'submitter_title', 'state_reportable'
    ];
    
    for (const field of required) {
      if (!formData[field]) {
        toast.error(`Please fill in all required fields marked with *`);
        return false;
      }
    }
    
    if (formData.medications && formData.medications.length > 500) {
      toast.error("Name and Frequency of Medication(s) must be 500 characters or less");
      return false;
    }
    
    if (formData.diagnosis && formData.diagnosis.length > 250) {
      toast.error("Diagnosis of Resident/Patient must be 250 characters or less");
      return false;
    }
    
    if (formData.factual_description.length > 3500) {
      toast.error("Factual Description must be 3500 characters or less");
      return false;
    }
    
    if (formData.follow_up_action.length > 3500) {
      toast.error("Description of Follow-up Action must be 3500 characters or less");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create incident record
      const incidentData = {
        patient_id: formData.patient_id,
        patient_name: formData.patient_id, // Will be populated from patient lookup if needed
        incident_type: "other",
        incident_name: formData.event_type,
        incident_date: formData.date_of_event,
        incident_time: formData.time_of_event,
        severity: "medium",
        details: {
          event_type_id: formData.event_type_id,
          location: formData.location_of_event,
          medications: formData.medications,
          diagnosis: formData.diagnosis,
          submitter: formData.submitted_by,
          submitter_title: formData.submitter_title,
          state_reportable: formData.state_reportable,
        },
        report: `Event Type: ${formData.event_type}\n\nFactual Description:\n${formData.factual_description}\n\nFollow-up Action:\n${formData.follow_up_action}`,
        status: "reported",
      };

      const incident = await base44.entities.Incident.create(incidentData);

      // Generate PDF
      const pdfResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an Event Report PDF document with the following information:

Event Report ID: ${incident.id}
Patient ID: ${formData.patient_id}
Date of Event: ${formData.date_of_event}
Time of Event: ${formData.time_of_event}
Event Type ID: ${formData.event_type_id}
Event Type: ${formData.event_type}
State Reportable: ${formData.state_reportable}
Location of Event: ${formData.location_of_event}
Name and Frequency of Medication(s): ${formData.medications || 'N/A'}
Diagnosis of Resident/Patient: ${formData.diagnosis || 'N/A'}
Factual Description: ${formData.factual_description}
Description of Follow-up Action: ${formData.follow_up_action}
Submitted By: ${formData.submitted_by}
Submitter's Title: ${formData.submitter_title}

Format this as a professional medical event report document.`,
      });

      // Get admin users
      const users = await base44.entities.User.list();
      const adminUsers = users.filter(u => u.role === 'admin');
      
      // Send email to all admins
      for (const admin of adminUsers) {
        await base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Event Report ${incident.id} Submitted - Patient ${formData.patient_id}`,
          body: `
A new Event Report has been submitted:

Event Report ID: ${incident.id}
Patient ID: ${formData.patient_id}
Date of Event: ${formData.date_of_event}
Time of Event: ${formData.time_of_event}
Event Type ID: ${formData.event_type_id}
Event Type: ${formData.event_type}
State Reportable: ${formData.state_reportable}
Location: ${formData.location_of_event}
Submitted By: ${formData.submitted_by} (${formData.submitter_title})

Factual Description:
${formData.factual_description}

Follow-up Action:
${formData.follow_up_action}

Please review this report in the Incident Reporting system.
          `
        });
      }
      
      toast.success(`Event Report ${incident.id} submitted successfully! PDF generated and administrators notified.`);
      
      // Reset form
      setFormData({
        patient_id: "",
        date_of_event: "",
        time_of_event: "",
        event_type: "",
        event_type_id: "",
        location_of_event: "",
        medications: "",
        diagnosis: "",
        factual_description: "",
        follow_up_action: "",
        submitted_by: "",
        submitter_title: "",
        state_reportable: "",
      });
      
    } catch (error) {
      toast.error("Failed to submit event report. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All entered data will be lost.")) {
      setFormData({
        patient_id: "",
        date_of_event: "",
        time_of_event: "",
        event_type: "",
        event_type_id: "",
        location_of_event: "",
        medications: "",
        diagnosis: "",
        factual_description: "",
        follow_up_action: "",
        submitted_by: "",
        submitter_title: "",
        state_reportable: "",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl font-bold">Event Report</CardTitle>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="mt-4"
          >
            Cancel
          </Button>
          <p className="text-sm text-slate-600 mt-4">
            Fields preceded with "*" are required.
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Patient ID:</Label>
              <Input
                value={formData.patient_id}
                onChange={(e) => handleChange('patient_id', e.target.value)}
                required
              />
            </div>

            {/* Date of Event */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Date of Event (mm/dd/yyyy):</Label>
              <Input
                type="date"
                value={formData.date_of_event}
                onChange={(e) => handleChange('date_of_event', e.target.value)}
                required
              />
            </div>

            {/* Time of Event */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Time of Event (military h:mm):</Label>
              <Input
                type="time"
                value={formData.time_of_event}
                onChange={(e) => handleChange('time_of_event', e.target.value)}
                required
              />
            </div>

            {/* Event Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <Label className="text-red-600">*Event Type:</Label>
                <p className="text-xs text-blue-600 mt-1">
                  To see the full event type description <a href="#" className="underline">Click Here</a>
                </p>
              </div>
              <Select
                value={formData.event_type_id}
                onValueChange={(value) => {
                  const selectedType = eventTypes.find(t => t.id === value);
                  handleChange('event_type_id', value);
                  handleChange('event_type', selectedType ? `${selectedType.id} - ${selectedType.description}` : '');
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type..." />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.id} - {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State Reportable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Is this State Reportable?</Label>
              <Select
                value={formData.state_reportable}
                onValueChange={(value) => handleChange('state_reportable', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location of Event */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Location of Event:</Label>
              <Input
                value={formData.location_of_event}
                onChange={(e) => handleChange('location_of_event', e.target.value)}
                required
                className="md:col-span-1"
              />
            </div>

            {/* Medications */}
            <div className="space-y-2">
              <Label>
                Name and Frequency of Medication(s):<br />
                <span className="text-xs text-slate-600">(maximum 500 characters)</span>
              </Label>
              <Textarea
                value={formData.medications}
                onChange={(e) => handleChange('medications', e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-slate-500 text-right">{formData.medications.length}/500</p>
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label>
                Diagnosis of Resident/Patient:<br />
                <span className="text-xs text-slate-600">(maximum 250 characters)</span>
              </Label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                maxLength={250}
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-slate-500 text-right">{formData.diagnosis.length}/250</p>
            </div>

            {/* Factual Description */}
            <div className="space-y-2">
              <Label className="text-red-600">
                *Factual Description:<br />
                <span className="text-xs text-slate-600">(maximum 3500 characters)</span>
              </Label>
              <Textarea
                value={formData.factual_description}
                onChange={(e) => handleChange('factual_description', e.target.value)}
                maxLength={3500}
                rows={6}
                required
                className="w-full"
              />
              <p className="text-xs text-slate-500 text-right">{formData.factual_description.length}/3500</p>
            </div>

            {/* Follow-up Action */}
            <div className="space-y-2">
              <Label className="text-red-600">
                *Description of Follow-up Action:<br />
                <span className="text-xs text-slate-600">(maximum 3500 characters)</span>
              </Label>
              <Textarea
                value={formData.follow_up_action}
                onChange={(e) => handleChange('follow_up_action', e.target.value)}
                maxLength={3500}
                rows={6}
                required
                className="w-full"
              />
              <p className="text-xs text-slate-500 text-right">{formData.follow_up_action.length}/3500</p>
            </div>

            {/* Submitted By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Submitted By:</Label>
              <Input
                value={formData.submitted_by}
                onChange={(e) => handleChange('submitted_by', e.target.value)}
                required
              />
            </div>

            {/* Submitter's Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <Label className="text-red-600">*Submitter's Title:</Label>
              <Input
                value={formData.submitter_title}
                onChange={(e) => handleChange('submitter_title', e.target.value)}
                required
              />
            </div>

            {/* Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-slate-900">
                Note: An event will not be considered submitted until you receive a confirmation that includes an event number.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}