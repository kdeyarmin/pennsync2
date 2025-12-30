import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Download, 
  Mail, 
  Heart, 
  Activity, 
  Droplet, 
  Brain,
  Bandage,
  Shield,
  AlertCircle,
  Search,
  Loader2,
  CheckCircle2,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HandoutCustomizer from "../components/education/HandoutCustomizer";
import HandoutPreview from "../components/education/HandoutPreview";
import HandoutStyleCustomizer from "../components/education/HandoutStyleCustomizer";
import PersonalizedEducationGenerator from "../components/education/PersonalizedEducationGenerator";

const educationTopics = [
  {
    id: 'chf',
    title: 'Congestive Heart Failure (CHF)',
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    description: 'Learn about managing heart failure, recognizing symptoms, and preventing complications.'
  },
  {
    id: 'copd',
    title: 'COPD',
    icon: Activity,
    color: 'from-blue-500 to-cyan-500',
    description: 'Breathing techniques, medication management, and lifestyle tips for COPD patients.'
  },
  {
    id: 'copd_oxygen',
    title: 'Home Oxygen Therapy',
    icon: Activity,
    color: 'from-sky-500 to-blue-500',
    description: 'Safe use of home oxygen equipment, oxygen therapy guidelines, and troubleshooting.'
  },
  {
    id: 'diabetes',
    title: 'Diabetes Management',
    icon: Droplet,
    color: 'from-purple-500 to-indigo-500',
    description: 'Blood sugar monitoring, diet, medications, and preventing diabetes complications.'
  },
  {
    id: 'hypertension',
    title: 'High Blood Pressure',
    icon: Activity,
    color: 'from-orange-500 to-red-500',
    description: 'Managing blood pressure through lifestyle changes and medications.'
  },
  {
    id: 'stroke',
    title: 'Stroke Recovery',
    icon: Brain,
    color: 'from-teal-500 to-green-500',
    description: 'Recovery tips, preventing another stroke, and recognizing warning signs.'
  },
  {
    id: 'wound_care',
    title: 'Wound Care',
    icon: Bandage,
    color: 'from-green-500 to-emerald-500',
    description: 'Proper wound care techniques, signs of infection, and promoting healing.'
  },
  {
    id: 'fall_prevention',
    title: 'Fall Prevention',
    icon: Shield,
    color: 'from-yellow-500 to-orange-500',
    description: 'Home safety tips and strategies to prevent falls at home.'
  },
  {
    id: 'pain_management',
    title: 'Pain Management',
    icon: AlertCircle,
    color: 'from-pink-500 to-purple-500',
    description: 'Managing pain safely with medications and non-drug approaches.'
  },
  {
    id: 'ckd',
    title: 'Chronic Kidney Disease',
    icon: Droplet,
    color: 'from-amber-500 to-orange-500',
    description: 'Managing kidney disease, diet modifications, and understanding CKD stages.'
  },
  {
    id: 'osteoporosis',
    title: 'Osteoporosis & Bone Health',
    icon: Shield,
    color: 'from-slate-500 to-gray-500',
    description: 'Building strong bones, fall prevention, and osteoporosis management.'
  },
  {
    id: 'dementia_care',
    title: 'Dementia & Memory Care',
    icon: Brain,
    color: 'from-violet-500 to-purple-500',
    description: 'Communication strategies, daily care tips, and caregiver support for dementia.'
  },
  {
    id: 'anticoagulation',
    title: 'Blood Thinner Management',
    icon: Droplet,
    color: 'from-rose-500 to-red-500',
    description: 'Safe use of blood thinners, diet considerations, and recognizing bleeding risks.'
  },
  {
    id: 'nutrition',
    title: 'Healthy Eating for Seniors',
    icon: Heart,
    color: 'from-lime-500 to-green-500',
    description: 'Essential nutrients, meal planning, and overcoming common eating challenges.'
  },
  {
    id: 'pneumonia',
    title: 'Pneumonia Recovery',
    icon: Activity,
    color: 'from-cyan-500 to-blue-500',
    description: 'Recovery tips, breathing exercises, and preventing pneumonia complications.'
  },
  {
    id: 'uti',
    title: 'UTI Prevention & Care',
    icon: Droplet,
    color: 'from-blue-500 to-indigo-500',
    description: 'Preventing and treating urinary tract infections, catheter care tips.'
  },
  {
    id: 'parkinsons',
    title: 'Parkinson\'s Disease',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    description: 'Living with Parkinson\'s, medication management, and daily living strategies.'
  },
  {
    id: 'catheter_care',
    title: 'Urinary Catheter Care',
    icon: Droplet,
    color: 'from-teal-500 to-cyan-500',
    description: 'Daily catheter care, preventing infection, and managing drainage bags.'
  },
  {
    id: 'tube_feeding',
    title: 'Tube Feeding Care',
    icon: Heart,
    color: 'from-orange-500 to-amber-500',
    description: 'Tube feeding instructions, site care, and preventing complications.'
  },
  {
    id: 'hospice_comfort',
    title: 'Hospice & Comfort Care',
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    description: 'Comfort measures, symptom management, and supporting loved ones in hospice.'
  }
];

export default function PatientEducationHub() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [patientId, setPatientId] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSections, setSelectedSections] = useState({});
  const [customNotes, setCustomNotes] = useState("");
  const [showCustomization, setShowCustomization] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [styleOptions, setStyleOptions] = useState({
    colorScheme: 'penn_health',
    fontFamily: 'helvetica',
    layout: 'standard',
    customHeader: '',
    customFooter: '',
    agencyName: '',
    agencyPhone: ''
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const selectedPatient = patients.find(p => p.id === patientId);

  const filteredTopics = educationTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize selections when topic changes
  React.useEffect(() => {
    if (selectedTopic) {
      const template = educationTopics.find(t => t.id === selectedTopic.id);
      if (template) {
        // Auto-select all sections and bullets by default
        const initialSelections = {};
        // Since templates are defined in the backend function, we'll handle this dynamically
        setSelectedSections({});
        setCustomNotes("");
        setShowCustomization(false);
      }
    }
  }, [selectedTopic]);

  const handleDownload = async () => {
    if (!selectedTopic) return;
    
    setIsGenerating(true);
    setSuccessMessage("");
    
    const diagnostics = {
      condition: selectedTopic.id,
      hasPatient: !!selectedPatient,
      hasSections: Object.keys(selectedSections).length > 0,
      hasNotes: !!customNotes,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      browser: navigator.userAgent.match(/(firefox|msie|chrome|safari|trident)/gi)?.[0] || 'unknown'
    };
    
    try {
      console.log('Requesting PDF generation with diagnostics:', diagnostics);
      
      const payload = {
        condition: selectedTopic.id,
        patientName: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null,
        action: 'download',
        selectedSections: Object.keys(selectedSections).length > 0 ? selectedSections : null,
        customNotes: customNotes || null,
        styleOptions: styleOptions
      };
      
      console.log('Sending payload:', payload);
      
      const response = await base44.functions.invoke('generatePatientHandout', payload);

      console.log('Raw response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');

      // Handle axios response wrapper - check multiple levels
      let data = response;
      if (response?.data) {
        data = response.data;
      }
      if (data?.data) {
        data = data.data;
      }
      
      console.log('Extracted data:', data);
      console.log('Data type:', typeof data);
      console.log('Data keys:', data ? Object.keys(data) : 'null');
      console.log('Data.success:', data?.success);
      console.log('Data.pdf exists:', !!data?.pdf);
      console.log('Data.error:', data?.error);

      if (data?.error) {
        console.error('Backend error:', data.error, data.details);
        throw new Error(`Backend error: ${data.error}${data.details ? '\n\n' + data.details : ''}`);
      }

      if (!data || !data.pdf) {
        console.error('Invalid response structure:', data);
        console.error('Data.pdf exists:', !!data?.pdf);
        console.error('Data.success:', data?.success);
        throw new Error(`Invalid response from handout generator. Got: ${JSON.stringify(data || {}).substring(0, 200)}`);
      }

      console.log('PDF data length:', data.pdf.length);
      
      // Decode base64 PDF and download
      try {
        const binaryString = atob(data.pdf);
        console.log('Decoded binary length:', binaryString.length);
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        console.log('Blob created, size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${selectedTopic.id}_handout.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        console.log('Download triggered successfully');
      } catch (decodeError) {
        console.error('Error decoding/downloading PDF:', decodeError);
        throw new Error(`Failed to process PDF: ${decodeError.message}`);
      }

      setSuccessMessage("Handout downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error downloading handout:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error stack:', error.stack);
      
      // Log to backend for debugging
      try {
        await base44.asServiceRole.entities.SystemLog.create({
          job_name: 'PDF Download Error (Frontend)',
          job_type: 'other',
          status: 'error',
          message: `Frontend PDF download failed for ${selectedTopic.id}`,
          details: {
            ...diagnostics,
            errorMessage: error.message,
            errorType: error.constructor.name,
            responseData: error?.response?.data
          }
        });
      } catch (logErr) {
        console.error('Failed to log frontend error:', logErr);
      }
      
      const errorDetails = error?.response?.data?.error || error?.response?.data?.details || error?.message || 'Failed to generate handout. Please try again.';
      alert(`Error generating handout:\n\n${errorDetails}\n\nCheck console for details.`);
    }
    
    setIsGenerating(false);
  };

  const handleEmail = async () => {
    if (!selectedTopic || !patientEmail) return;
    
    setIsEmailing(true);
    setSuccessMessage("");
    
    try {
      const response = await base44.functions.invoke('generatePatientHandout', {
        condition: selectedTopic.id,
        patientName: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null,
        patientEmail,
        action: 'email',
        selectedSections: Object.keys(selectedSections).length > 0 ? selectedSections : null,
        customNotes: customNotes || null
      });

      console.log('Email response:', response);

      // Handle axios response wrapper
      const data = response?.data || response;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccessMessage(`Handout emailed to ${patientEmail}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      console.error('Error emailing handout:', error);
      const errorDetails = error?.response?.data?.error || error?.response?.data?.details || error?.message || 'Failed to email handout. Please try again.';
      alert(`Error emailing handout:\n\n${errorDetails}`);
    }
    
    setIsEmailing(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Patient Education Hub</h1>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-gray-600">
          Generate personalized, AI-powered educational materials for your patients
        </p>
      </div>

      {/* AI Personalized Generator for Selected Patient */}
      {selectedPatient && (
        <div className="mb-4 sm:mb-6">
          <PersonalizedEducationGenerator
            patient={selectedPatient}
            carePlans={[]}
            recentVisits={[]}
          />
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <Card className="mb-4 sm:mb-6 border-green-200 bg-green-50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Search and Patient Selection */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-xs sm:text-sm mb-2 block">Select Patient (Optional)</Label>
              <Select value={patientId} onValueChange={(value) => {
                setPatientId(value);
                const patient = patients.find(p => p.id === value);
                if (patient?.email) {
                  setPatientEmail(patient.email);
                }
              }}>
                <SelectTrigger className="h-11 touch-target">
                  <SelectValue placeholder="Select patient for personalization..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs sm:text-sm mb-2 block">Search Topics</Label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search education topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 touch-target"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Topics Grid */}
        <div className="lg:col-span-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Standard Education Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredTopics.map((topic) => {
              const Icon = topic.icon;
              const isSelected = selectedTopic?.id === topic.id;
              
              return (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all hover:shadow-lg touch-target ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-br ${topic.color} shadow-md flex-shrink-0`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{topic.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{topic.description}</p>
                        {isSelected && (
                          <Badge className="mt-2 bg-blue-600">Selected</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Actions Panel */}
        <div>
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Generate Handout</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              {!selectedTopic ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a topic to generate a handout</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Selected Topic</Label>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-medium text-blue-900">{selectedTopic.title}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Patient (Optional)</Label>
                    <Select value={patientId} onValueChange={(value) => {
                      setPatientId(value);
                      const patient = patients.find(p => p.id === value);
                      if (patient?.email) {
                        setPatientEmail(patient.email);
                      }
                    }}>
                      <SelectTrigger className="mt-2 h-11 touch-target">
                        <SelectValue placeholder="Select patient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Email Address (for emailing)</Label>
                    <Input
                      type="email"
                      placeholder="patient@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="mt-2 h-11 touch-target"
                    />
                  </div>

                  {/* Customization Toggle */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomization(!showCustomization)}
                      className="w-full min-h-[44px]"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {showCustomization ? 'Hide' : 'Show'} Customization
                    </Button>
                  </div>

                  {/* Customization Panel */}
                  {showCustomization && (
                    <div className="space-y-4 pt-2">
                      <HandoutStyleCustomizer
                        styleOptions={styleOptions}
                        onStyleChange={setStyleOptions}
                      />

                      <HandoutCustomizer
                        topicId={selectedTopic.id}
                        selectedSections={selectedSections}
                        onSelectionChange={setSelectedSections}
                      />

                      <div>
                        <Label>Custom Notes / Instructions</Label>
                        <Textarea
                          placeholder="Add patient-specific instructions or notes here..."
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          className="mt-2 min-h-[100px]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          These notes will appear at the end of the handout.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={() => setShowPreview(true)}
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 min-h-[44px]"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Preview Handout
                    </Button>

                    <Button
                      onClick={handleDownload}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleEmail}
                      disabled={!patientEmail || isEmailing}
                      variant="outline"
                      className="w-full min-h-[44px]"
                    >
                      {isEmailing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Email to Patient
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="pt-4 border-t text-xs text-gray-500">
                    <p>📄 Generated handouts include the Penn Home Health logo and are printer-friendly.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <HandoutPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTopic}
        patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null}
        selectedSections={selectedSections}
        customNotes={customNotes}
        onDownload={() => {
          setShowPreview(false);
          handleDownload();
        }}
        onEmail={() => {
          setShowPreview(false);
          handleEmail();
        }}
      />
    </div>
  );
}