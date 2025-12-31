import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Archive,
  User,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { formatEastern, todayEastern } from "@/components/utils/timezone";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReferralPDFSummarizer from "../components/referral/ReferralPDFSummarizer";
import PatientMatchReview from "../components/referral/PatientMatchReview";

export default function ReferralIntake() {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [processingReferralId, setProcessingReferralId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [matchReviewReferral, setMatchReviewReferral] = useState(null);

  // New referral form state
  const [newReferral, setNewReferral] = useState({
    patient_name: "",
    referral_source: "",
    referral_date: todayEastern(),
    document_type: "pdf",
    priority: "normal",
    estimated_start_date: ""
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date', 200),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF, PNG, JPG, or TIFF file');
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(file_url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    }
    setIsUploading(false);
  };

  const handleCreateReferral = async () => {
    if (!uploadedFile) {
      alert('Please upload a referral document first');
      return;
    }

    setIsUploading(true);
    try {
      const referral = await base44.entities.Referral.create({
        ...newReferral,
        document_url: uploadedFile,
        status: 'new'
      });

      // Automatically start processing
      setProcessingReferralId(referral.id);
      setUploadDialogOpen(false);
      
      // Reset form
      setNewReferral({
        patient_name: "",
        referral_source: "",
        referral_date: todayEastern(),
        document_type: "pdf",
        priority: "normal",
        estimated_start_date: ""
      });
      setUploadedFile(null);

      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    } catch (error) {
      console.error('Error creating referral:', error);
      alert('Failed to create referral. Please try again.');
    }
    setIsUploading(false);
  };

  const handleStatusChange = async (referralId, newStatus) => {
    try {
      await base44.entities.Referral.update(referralId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleNurseAssignment = async (referralId, nurseEmail) => {
    if (nurseEmail === 'unassigned') {
      try {
        await base44.entities.Referral.update(referralId, { assigned_to: null });
        queryClient.invalidateQueries({ queryKey: ['referrals'] });
      } catch (error) {
        console.error('Error unassigning nurse:', error);
      }
      return;
    }

    try {
      const referral = referrals.find(r => r.id === referralId);
      const nurse = users.find(u => u.email === nurseEmail);
      
      await base44.entities.Referral.update(referralId, { assigned_to: nurseEmail });

      // Send secure message to assigned nurse with PROCESSED PDF document (not original upload)
      const attachmentUrl = referral.processed_document_url || referral.document_url;
      const messageData = {
        patient_id: referral.patient_id,
        thread_id: `referral-${referralId}`,
        subject: `New Referral Assignment: ${referral.patient_name || 'Unknown Patient'}`,
        message_text: `You have been assigned a new referral.

Patient: ${referral.patient_name || 'Unknown'}
Referral Source: ${referral.referral_source || 'N/A'}
Priority: ${referral.priority}
Referral Date: ${referral.referral_date ? format(new Date(referral.referral_date), 'MM/dd/yyyy') : 'N/A'}

${referral.extracted_data ? 'Referral has been processed with AI analysis and formatted into an admission packet.' : 'Please process this referral to extract patient information.'}

Actions available:
• View analyzed referral data
• Create admission note in Smart Note (prepopulated with referral info)
• Review patient information

📎 ${referral.processed_document_url ? 'AI-processed admission packet PDF is attached.' : 'Referral document is attached.'}`,
        sender_name: 'System',
        sender_email: currentUser?.email,
        recipients: [nurseEmail],
        priority: referral.priority === 'urgent' ? 'urgent' : 'high',
        attachments: attachmentUrl ? [attachmentUrl] : [],
        related_event_id: referralId,
        related_event_type: 'referral'
      };

      await base44.entities.Message.create(messageData);
      
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      alert(`Referral assigned to ${nurse?.full_name || nurseEmail}. Secure message sent.`);
    } catch (error) {
      console.error('Error assigning nurse:', error);
      alert('Failed to assign nurse');
    }
  };

  const handleProcessingComplete = async (referralId, extractedData, analysisResults, generatedPdfUrl = null) => {
    try {
      // AI-powered priority analysis
      const priorityResponse = await base44.functions.invoke('analyzeReferralPriority', {
        extractedData,
        analysisResults
      });

      const priorityAnalysis = priorityResponse.data?.priorityAnalysis || {};

      // Extract and update referral fields from AI-processed data
      const updates = {
        status: 'ready_for_admission',
        extracted_data: extractedData,
        analysis_results: {
          ...analysisResults,
          priority_analysis: priorityAnalysis
        },
        patient_name: extractedData.demographics?.full_name || null,
        patient_dob: extractedData.demographics?.date_of_birth || null,
        referral_source: extractedData.admission_details?.admission_source || 
                         extractedData.demographics?.referring_physician || 
                         null,
        referral_date: extractedData.admission_details?.referral_date || 
                       extractedData.admission_details?.admission_date || 
                       null,
        diagnosis: extractedData.diagnoses?.primary_diagnosis || null,
        priority: priorityAnalysis.priority || 'normal'
      };

      // Check for missing critical information
      const missingInfo = [];
      if (!extractedData.demographics?.insurance_primary) missingInfo.push('Insurance information');
      if (!extractedData.demographics?.emergency_contact) missingInfo.push('Emergency contact');
      if (!extractedData.medications?.length) missingInfo.push('Current medications');

      if (missingInfo.length > 0) {
        updates.status = 'awaiting_info';
        updates.missing_information = missingInfo;
      }

      // Enhanced patient matching logic
      const fullName = extractedData.demographics?.full_name || '';
      const dob = extractedData.demographics?.date_of_birth;
      const phone = extractedData.demographics?.phone;
      const address = extractedData.demographics?.address;
      
      let existingPatient = null;
      if (fullName || dob || phone) {
        const nameParts = fullName.split(' ').filter(p => p.length > 0);
        const firstName = nameParts[0] || '';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        const allPatients = await base44.entities.Patient.list('-created_date', 500);
        
        // Helper: normalize string for comparison
        const normalize = (str) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || '';
        
        // Helper: calculate string similarity (Levenshtein-like)
        const similarity = (s1, s2) => {
          if (!s1 || !s2) return 0;
          const longer = s1.length > s2.length ? s1 : s2;
          const shorter = s1.length > s2.length ? s2 : s1;
          if (longer.length === 0) return 1.0;
          const editDistance = [...longer].reduce((prev, curr, i) => {
            return shorter[i] === curr ? prev : prev + 1;
          }, 0);
          return (longer.length - editDistance) / longer.length;
        };
        
        // Score each patient for match likelihood
        const scoredPatients = allPatients.map(p => {
          let score = 0;
          const reasons = [];
          
          // Name matching (40 points max)
          if (firstName && p.first_name) {
            const firstNameSim = similarity(normalize(firstName), normalize(p.first_name));
            if (firstNameSim >= 0.8) {
              score += firstNameSim * 20;
              reasons.push(`First name: ${(firstNameSim * 100).toFixed(0)}%`);
            }
          }
          
          if (lastName && p.last_name) {
            const lastNameSim = similarity(normalize(lastName), normalize(p.last_name));
            if (lastNameSim >= 0.8) {
              score += lastNameSim * 20;
              reasons.push(`Last name: ${(lastNameSim * 100).toFixed(0)}%`);
            }
          }
          
          // Middle name/initial bonus (5 points)
          if (middleName && p.middle_name) {
            const m1 = normalize(middleName);
            const m2 = normalize(p.middle_name);
            if (m1 === m2 || m1[0] === m2[0]) {
              score += 5;
              reasons.push('Middle name match');
            }
          }
          
          // DOB matching (30 points)
          if (dob && p.date_of_birth) {
            if (dob === p.date_of_birth) {
              score += 30;
              reasons.push('Exact DOB match');
            } else {
              // Partial DOB match (year and month)
              const [y1, m1] = dob.split('-');
              const [y2, m2] = p.date_of_birth.split('-');
              if (y1 === y2 && m1 === m2) {
                score += 15;
                reasons.push('Partial DOB match');
              }
            }
          }
          
          // Phone matching (15 points)
          if (phone && p.phone) {
            const p1 = normalize(phone);
            const p2 = normalize(p.phone);
            if (p1 === p2 || p1.includes(p2.slice(-7)) || p2.includes(p1.slice(-7))) {
              score += 15;
              reasons.push('Phone match');
            }
          }
          
          // Address matching (10 points)
          if (address && p.address) {
            const a1 = normalize(address);
            const a2 = normalize(p.address);
            if (similarity(a1, a2) >= 0.7) {
              score += 10;
              reasons.push('Address match');
            }
          }
          
          return { patient: p, score, reasons };
        });
        
        // Sort by score and get best match
        const bestMatch = scoredPatients.sort((a, b) => b.score - a.score)[0];
        
        // Match threshold: 60+ points = high confidence match
        if (bestMatch && bestMatch.score >= 60) {
          existingPatient = bestMatch.patient;
          console.log(`Patient match found: ${bestMatch.patient.first_name} ${bestMatch.patient.last_name} (Score: ${bestMatch.score}, Reasons: ${bestMatch.reasons.join(', ')})`);
        } else if (bestMatch && bestMatch.score >= 40) {
          // Possible match but not certain - log for review
          console.warn(`Possible patient match: ${bestMatch.patient.first_name} ${bestMatch.patient.last_name} (Score: ${bestMatch.score})`);
        }
      }

      // AI-powered patient matching with confidence scoring
      if (!existingPatient && extractedData.demographics && allPatients.length > 0) {
        const aiMatchResponse = await base44.functions.invoke('matchPatientWithAI', {
          extractedData,
          existingPatients: allPatients.slice(0, 50) // Top 50 most recent for AI analysis
        });

        const matchAnalysis = aiMatchResponse.data?.matchAnalysis;
        
        if (matchAnalysis && matchAnalysis.confidence_level === 'high' && matchAnalysis.best_match_id) {
          existingPatient = allPatients.find(p => p.id === matchAnalysis.best_match_id);
          updates.match_confidence = matchAnalysis.confidence_score;
          updates.match_factors = matchAnalysis.match_factors;
          console.log(`AI matched patient: ${existingPatient.first_name} ${existingPatient.last_name} (${matchAnalysis.confidence_score}% confidence)`);
        } else if (matchAnalysis && matchAnalysis.confidence_level === 'medium') {
          // Flag for manual review
          updates.requires_manual_review = true;
          updates.match_suggestions = matchAnalysis.alternative_matches;
          updates.match_analysis = matchAnalysis;
          console.log('Medium confidence match - flagged for manual review');
        }
      }

      if (!existingPatient && extractedData.demographics) {
        // Create new patient from referral data
        const nameParts = (extractedData.demographics.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        const newPatient = await base44.entities.Patient.create({
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          medical_record_number: extractedData.demographics.medical_record_number || extractedData.demographics.mrn || null,
          date_of_birth: extractedData.demographics.date_of_birth,
          address: extractedData.demographics.address,
          phone: extractedData.demographics.phone,
          email: extractedData.demographics.email || null,
          payor: extractedData.demographics.insurance_primary || 'Unknown',
          emergency_contact_name: extractedData.demographics.emergency_contact,
          emergency_contact_phone: extractedData.demographics.emergency_phone,
          emergency_contact_relationship: extractedData.demographics.emergency_relationship,
          physician_name: extractedData.demographics.referring_physician || extractedData.demographics.primary_care_physician,
          physician_phone: extractedData.demographics.referring_physician_contact || extractedData.demographics.pcp_contact,
          physician_email: extractedData.demographics.referring_physician_email || extractedData.demographics.pcp_email,
          caregiver_name: extractedData.demographics.caregiver_name,
          caregiver_phone: extractedData.demographics.caregiver_phone,
          caregiver_email: extractedData.demographics.caregiver_email,
          primary_diagnosis: extractedData.diagnoses?.primary_diagnosis,
          secondary_diagnoses: extractedData.diagnoses?.secondary_diagnoses || [],
          allergies: extractedData.diagnoses?.allergies,
          current_medications: extractedData.medications?.map(med => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            prescriber: med.prescriber,
            start_date: med.start_date
          })) || [],
          past_medical_history: extractedData.diagnoses?.past_medical_history || [],
          past_hospitalizations: extractedData.diagnoses?.past_hospitalizations || [],
          baseline_vitals: extractedData.vital_signs || {},
          functional_status: extractedData.functional_status || {},
          social_history: extractedData.social_history || {},
          advance_directives: extractedData.advance_directives || {},
          insurance_primary: extractedData.demographics.insurance_details?.primary || {},
          insurance_secondary: extractedData.demographics.insurance_details?.secondary || {},
          admission_date: extractedData.admission_details?.admission_date,
          admission_source: extractedData.admission_details?.admission_source,
          status: 'active',
          care_type: extractedData.admission_details?.care_type || 'home_health',
          clinical_notes: `Referral received from ${extractedData.demographics.referring_physician || 'physician'} on ${extractedData.admission_details?.referral_date || 'unknown date'}.\n\nReason: ${extractedData.admission_details?.referral_reason || 'Not specified'}`,
          goals_of_care: extractedData.skilled_needs?.goals_of_care ? [extractedData.skilled_needs.goals_of_care] : []
        });

        updates.patient_id = newPatient.id;
        existingPatient = newPatient;
      } else if (existingPatient) {
        // Pull MRN from existing patient and update with referral data
        const updateData = {
          medical_record_number: existingPatient.medical_record_number || extractedData.demographics?.medical_record_number || extractedData.demographics?.mrn,
        };
        
        // Update fields only if they're missing or empty in existing record
        if (!existingPatient.physician_name && (extractedData.demographics?.referring_physician || extractedData.demographics?.primary_care_physician)) {
          updateData.physician_name = extractedData.demographics.referring_physician || extractedData.demographics.primary_care_physician;
        }
        if (!existingPatient.physician_phone && (extractedData.demographics?.referring_physician_contact || extractedData.demographics?.pcp_contact)) {
          updateData.physician_phone = extractedData.demographics.referring_physician_contact || extractedData.demographics.pcp_contact;
        }
        if (!existingPatient.emergency_contact_name && extractedData.demographics?.emergency_contact) {
          updateData.emergency_contact_name = extractedData.demographics.emergency_contact;
        }
        if (!existingPatient.emergency_contact_phone && extractedData.demographics?.emergency_phone) {
          updateData.emergency_contact_phone = extractedData.demographics.emergency_phone;
        }
        if (extractedData.diagnoses?.secondary_diagnoses?.length > 0) {
          const existingDiagnoses = existingPatient.secondary_diagnoses || [];
          const newDiagnoses = extractedData.diagnoses.secondary_diagnoses.filter(d => !existingDiagnoses.includes(d));
          if (newDiagnoses.length > 0) {
            updateData.secondary_diagnoses = [...existingDiagnoses, ...newDiagnoses];
          }
        }
        
        // Update patient with new information
        await base44.entities.Patient.update(existingPatient.id, updateData);
        updates.patient_id = existingPatient.id;
      }

      // Store the generated PDF URL in referral
      if (generatedPdfUrl) {
        updates.processed_document_url = generatedPdfUrl;
      }

      await base44.entities.Referral.update(referralId, updates);
      setProcessingReferralId(null);
      
      // If requires manual review, show the match review dialog
      if (updates.requires_manual_review) {
        const updatedReferral = await base44.entities.Referral.filter({ id: referralId });
        setMatchReviewReferral(updatedReferral[0]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Error updating referral:', error);
      alert('Failed to process referral. Please try again.');
    }
  };

  const handleConfirmMatch = async (patientId) => {
    try {
      await base44.entities.Referral.update(matchReviewReferral.id, {
        patient_id: patientId,
        requires_manual_review: false,
        manually_confirmed: true
      });
      setMatchReviewReferral(null);
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    } catch (error) {
      console.error('Error confirming match:', error);
      alert('Failed to confirm match');
    }
  };

  const handleCreateNewFromReview = async () => {
    try {
      const data = matchReviewReferral.extracted_data;
      const nameParts = (data.demographics.full_name || '').split(' ');
      
      const newPatient = await base44.entities.Patient.create({
        first_name: nameParts[0] || '',
        middle_name: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
        last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
        medical_record_number: data.demographics?.medical_record_number || data.demographics?.mrn || null,
        date_of_birth: data.demographics.date_of_birth,
        address: data.demographics.address,
        phone: data.demographics.phone,
        email: data.demographics.email || null,
        payor: data.demographics.insurance_primary || 'Unknown',
        emergency_contact_name: data.demographics.emergency_contact,
        emergency_contact_phone: data.demographics.emergency_phone,
        emergency_contact_relationship: data.demographics.emergency_relationship,
        physician_name: data.demographics.referring_physician || data.demographics.primary_care_physician,
        physician_phone: data.demographics.referring_physician_contact || data.demographics.pcp_contact,
        primary_diagnosis: data.diagnoses?.primary_diagnosis,
        secondary_diagnoses: data.diagnoses?.secondary_diagnoses || [],
        allergies: data.diagnoses?.allergies,
        current_medications: data.medications?.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          prescriber: med.prescriber
        })) || [],
        past_medical_history: data.diagnoses?.past_medical_history || [],
        status: 'active',
        care_type: data.admission_details?.care_type || 'home_health'
      });

      await base44.entities.Referral.update(matchReviewReferral.id, {
        patient_id: newPatient.id,
        requires_manual_review: false,
        manually_confirmed: true
      });

      setMatchReviewReferral(null);
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Error creating new patient:', error);
      alert('Failed to create new patient');
    }
  };

  const filteredReferrals = referrals.filter(r => {
    const statusMatch = statusFilter === 'all' || r.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || r.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'awaiting_info': return 'bg-orange-500';
      case 'ready_for_admission': return 'bg-green-500';
      case 'archived': return 'bg-gray-500';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'normal': return 'bg-blue-600';
      case 'low': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const statusCounts = {
    new: referrals.filter(r => r.status === 'new').length,
    processing: referrals.filter(r => r.status === 'processing').length,
    awaiting_info: referrals.filter(r => r.status === 'awaiting_info').length,
    ready_for_admission: referrals.filter(r => r.status === 'ready_for_admission').length,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Referral Intake</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Streamlined workflow for processing incoming referrals</p>
        </div>
        <Button
          onClick={() => setUploadDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
        >
          <Upload className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3 sm:p-4">
            <p className="text-blue-100 text-xs sm:text-sm mb-1">New</p>
            <p className="text-2xl sm:text-3xl font-bold">{statusCounts.new}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-3 sm:p-4">
            <p className="text-yellow-100 text-xs sm:text-sm mb-1">Processing</p>
            <p className="text-2xl sm:text-3xl font-bold">{statusCounts.processing}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3 sm:p-4">
            <p className="text-orange-100 text-xs sm:text-sm mb-1">Awaiting Info</p>
            <p className="text-2xl sm:text-3xl font-bold">{statusCounts.awaiting_info}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3 sm:p-4">
            <p className="text-green-100 text-xs sm:text-sm mb-1">Ready</p>
            <p className="text-2xl sm:text-3xl font-bold">{statusCounts.ready_for_admission}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-0">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="awaiting_info">Awaiting Info</SelectItem>
                  <SelectItem value="ready_for_admission">Ready for Admission</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Priority Filter</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals ({filteredReferrals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading referrals...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No referrals found</p>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                Upload First Referral
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Referral Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {referral.patient_id ? (
                          <Link to={createPageUrl(`PatientDetails?id=${referral.patient_id}`)} className="text-blue-600 hover:underline">
                            {referral.patient_name || 'Unknown'}
                          </Link>
                        ) : (
                          <span>{referral.patient_name || 'Unknown'}</span>
                        )}
                        {referral.patient_dob && (
                          <p className="text-xs text-gray-500">
                            DOB: {format(new Date(referral.patient_dob), 'MM/dd/yyyy')}
                          </p>
                        )}
                        {referral.patient_id && !referral.requires_manual_review && (
                          <Badge className="bg-green-600 text-xs mt-1">
                            In System
                            {referral.match_confidence && ` (${Math.round(referral.match_confidence)}%)`}
                          </Badge>
                        )}
                        {referral.requires_manual_review && (
                          <Badge className="bg-yellow-600 text-xs mt-1">Review Match</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.referral_date ? format(new Date(referral.referral_date), 'MM/dd/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">{referral.referral_source || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(referral.priority)}>
                          {referral.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(referral.status)}>
                          {referral.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Select
                          value={referral.assigned_to || "unassigned"}
                          onValueChange={(value) => handleNurseAssignment(referral.id, value)}
                        >
                          <SelectTrigger className="w-[180px] flex-row-reverse">
                            <SelectValue placeholder="Assign nurse" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.filter(u => u.role === 'user' || u.role === 'admin').map(u => (
                              <SelectItem key={u.email} value={u.email}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                       <div className="flex flex-col gap-2 min-w-[120px]">
                         {referral.requires_manual_review ? (
                           <Button
                             size="sm"
                             variant="outline"
                             className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 min-h-[36px] text-xs"
                             onClick={() => setMatchReviewReferral(referral)}
                           >
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Review Match
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setProcessingReferralId(referral.id)}
                              className="min-h-[36px] text-xs"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900 text-sm">
                Upload a referral document (PDF, fax, or image) and provide basic information. 
                The system will automatically process and extract data using AI.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Patient Name (if known)</Label>
                <Input
                  placeholder="First Last"
                  value={newReferral.patient_name}
                  onChange={(e) => setNewReferral({ ...newReferral, patient_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Referral Source</Label>
                <Input
                  placeholder="Hospital, physician, facility"
                  value={newReferral.referral_source}
                  onChange={(e) => setNewReferral({ ...newReferral, referral_source: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Referral Date</Label>
                <Input
                  type="date"
                  value={newReferral.referral_date}
                  onChange={(e) => setNewReferral({ ...newReferral, referral_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newReferral.priority}
                  onValueChange={(value) => setNewReferral({ ...newReferral, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Type</Label>
                <Select
                  value={newReferral.document_type}
                  onValueChange={(value) => setNewReferral({ ...newReferral, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="fax">Fax</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="electronic">Electronic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Upload Document</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                      <span>File uploaded successfully</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-gray-600">
                        {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG, or TIFF</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleCreateReferral}
              disabled={isUploading || !uploadedFile}
              className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create & Process Referral
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Dialog */}
      {processingReferralId && (
        <Dialog open={!!processingReferralId} onOpenChange={(open) => !open && setProcessingReferralId(null)}>
          <DialogContent className="max-w-[98vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Referral Processor
              </DialogTitle>
            </DialogHeader>
            <ReferralPDFSummarizer
              fileUrl={referrals.find(r => r.id === processingReferralId)?.document_url}
              onExtractionComplete={(data, analysis, pdfUrl) => handleProcessingComplete(processingReferralId, data, analysis, pdfUrl)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Patient Match Review Dialog */}
      {matchReviewReferral && (
        <Dialog open={!!matchReviewReferral} onOpenChange={(open) => !open && setMatchReviewReferral(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-yellow-600" />
                Patient Match Review
              </DialogTitle>
            </DialogHeader>
            <PatientMatchReview
              referral={matchReviewReferral}
              onConfirmMatch={handleConfirmMatch}
              onCreateNew={handleCreateNewFromReview}
              onClose={() => setMatchReviewReferral(null)}
            />
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}