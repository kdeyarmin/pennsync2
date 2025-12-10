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
    
    try {
      const response = await base44.functions.invoke('generatePatientHandout', {
        condition: selectedTopic.id,
        patientName: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null,
        action: 'download',
        selectedSections: Object.keys(selectedSections).length > 0 ? selectedSections : null,
        customNotes: customNotes || null
      });

      if (!response || !response.pdf) {
        throw new Error('Invalid response from handout generator');
      }

      // Decode base64 PDF and download
      const binaryString = atob(response.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename || `${selectedTopic.id}_handout.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccessMessage("Handout downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error downloading handout:', error);
      const errorMsg = error?.message || 'Failed to generate handout. Please try again.';
      alert(errorMsg);
    }
    
    setIsGenerating(false);
  };

  const handleEmail = async () => {
    if (!selectedTopic || !patientEmail) return;
    
    setIsEmailing(true);
    setSuccessMessage("");
    
    try {
      await base44.functions.invoke('generatePatientHandout', {
        condition: selectedTopic.id,
        patientName: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null,
        patientEmail,
        action: 'email',
        selectedSections: Object.keys(selectedSections).length > 0 ? selectedSections : null,
        customNotes: customNotes || null
      });

      setSuccessMessage(`Handout emailed to ${patientEmail}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      console.error('Error emailing handout:', error);
      const errorMsg = error?.message || 'Failed to email handout. Please try again.';
      alert(errorMsg);
    }
    
    setIsEmailing(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Patient Education Hub</h1>
        </div>
        <p className="text-gray-600">
          Generate and share educational handouts for common conditions
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search education topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTopics.map((topic) => {
              const Icon = topic.icon;
              const isSelected = selectedTopic?.id === topic.id;
              
              return (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${topic.color} shadow-md`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                        <p className="text-sm text-gray-600">{topic.description}</p>
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
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Generate Handout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <Label>Patient (Optional)</Label>
                    <Select value={patientId} onValueChange={(value) => {
                      setPatientId(value);
                      const patient = patients.find(p => p.id === value);
                      if (patient?.email) {
                        setPatientEmail(patient.email);
                      }
                    }}>
                      <SelectTrigger className="mt-2">
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
                    <Label>Email Address (for emailing)</Label>
                    <Input
                      type="email"
                      placeholder="patient@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* Customization Toggle */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomization(!showCustomization)}
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {showCustomization ? 'Hide' : 'Show'} Customization
                    </Button>
                  </div>

                  {/* Customization Panel */}
                  {showCustomization && (
                    <div className="space-y-4 pt-2">
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
                      onClick={handleDownload}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
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
                      className="w-full"
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
    </div>
  );
}