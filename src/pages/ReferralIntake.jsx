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

export default function ReferralIntake() {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [processingReferralId, setProcessingReferralId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

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

  const handleProcessingComplete = async (referralId, extractedData, analysisResults) => {
    try {
      const updates = {
        status: 'ready_for_admission',
        extracted_data: extractedData,
        analysis_results: analysisResults
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

      // Check if patient exists in system, create if not
      const fullName = extractedData.demographics?.full_name || '';
      const dob = extractedData.demographics?.date_of_birth;
      
      let existingPatient = null;
      if (fullName && dob) {
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        // Search for existing patient by name and DOB
        const allPatients = await base44.entities.Patient.list('-created_date', 500);
        existingPatient = allPatients.find(p => 
          p.first_name?.toLowerCase() === firstName?.toLowerCase() &&
          p.last_name?.toLowerCase() === lastName?.toLowerCase() &&
          p.date_of_birth === dob
        );
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
          primary_diagnosis: extractedData.diagnoses?.primary_diagnosis,
          secondary_diagnoses: extractedData.diagnoses?.secondary_diagnoses || [],
          allergies: extractedData.diagnoses?.allergies,
          current_medications: extractedData.medications?.map(med => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            prescriber: med.prescriber
          })) || [],
          past_medical_history: extractedData.diagnoses?.past_medical_history || [],
          admission_date: extractedData.admission_details?.admission_date,
          admission_source: extractedData.admission_details?.admission_source,
          status: 'active',
          care_type: 'home_health',
          clinical_notes: `Referral received from ${extractedData.demographics.referring_physician || 'physician'} on ${extractedData.admission_details?.referral_date || 'unknown date'}.\n\nReason: ${extractedData.admission_details?.referral_reason || 'Not specified'}`,
          goals_of_care: extractedData.skilled_needs?.goals_of_care ? [extractedData.skilled_needs.goals_of_care] : []
        });

        updates.patient_id = newPatient.id;
        existingPatient = newPatient;
      } else if (existingPatient) {
        updates.patient_id = existingPatient.id;
      }

      await base44.entities.Referral.update(referralId, updates);
      setProcessingReferralId(null);
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Error updating referral:', error);
      alert('Failed to process referral. Please try again.');
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral Intake</h1>
          <p className="text-gray-600 mt-1">Streamlined workflow for processing incoming referrals</p>
        </div>
        <Button
          onClick={() => setUploadDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-blue-100 text-sm mb-1">New</p>
            <p className="text-3xl font-bold">{statusCounts.new}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <p className="text-yellow-100 text-sm mb-1">Processing</p>
            <p className="text-3xl font-bold">{statusCounts.processing}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <p className="text-orange-100 text-sm mb-1">Awaiting Info</p>
            <p className="text-3xl font-bold">{statusCounts.awaiting_info}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <p className="text-green-100 text-sm mb-1">Ready</p>
            <p className="text-3xl font-bold">{statusCounts.ready_for_admission}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
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
                        {referral.patient_id && (
                          <Badge className="bg-green-600 text-xs mt-1">In System</Badge>
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
                        {referral.assigned_to ? 
                          users.find(u => u.email === referral.assigned_to)?.full_name || referral.assigned_to
                          : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setProcessingReferralId(referral.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Process
                          </Button>
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
        <DialogContent className="max-w-2xl">
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

            <div className="grid md:grid-cols-2 gap-4">
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

            <div className="grid md:grid-cols-3 gap-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReferral}
              disabled={isUploading || !uploadedFile}
              className="bg-blue-600 hover:bg-blue-700"
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
        <Dialog open={!!processingReferralId} onOpenChange={() => setProcessingReferralId(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Referral Processor
              </DialogTitle>
            </DialogHeader>
            <ReferralPDFSummarizer
              fileUrl={referrals.find(r => r.id === processingReferralId)?.document_url}
              onExtractionComplete={(data, analysis) => handleProcessingComplete(processingReferralId, data, analysis)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}