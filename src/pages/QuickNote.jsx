import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Sparkles, 
  Copy, 
  Save, 
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity
} from "lucide-react";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import { todayEastern } from "../components/utils/timezone";

export default function QuickNote() {
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate, setVisitDate] = useState(todayEastern());
  
  // Vitals inline
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [o2, setO2] = useState("");
  const [pain, setPain] = useState("");
  
  const [roughNote, setRoughNote] = useState("");
  const [enhancedNote, setEnhancedNote] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [listening, setListening] = useState(false);
  const recognitionRef = React.useRef(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 200),
    initialData: [],
  });

  const patient = patients.find(p => p.id === patientId);

  const handleEnhance = async () => {
    if (!roughNote || !patientId) return;
    
    setEnhancing(true);
    try {
      const vitalSigns = { bp, hr, temp, o2, pain };
      
      const response = await base44.functions.invoke('smartNoteAssistant', {
        action: 'enhance_note',
        roughNote,
        patientId,
        visitType,
        visitDate,
        diagnosis: patient?.primary_diagnosis,
        vitalSigns,
        nurseType: 'RN'
      });

      setEnhancedNote(response.data.enhanced_note);
      
      // Auto-save to visit
      await base44.entities.Visit.create({
        patient_id: patientId,
        visit_date: visitDate,
        visit_type: visitType,
        status: 'completed',
        nurse_notes: response.data.enhanced_note,
        raw_transcription: roughNote,
        vital_signs: {
          blood_pressure_systolic: bp?.split('/')[0] || null,
          blood_pressure_diastolic: bp?.split('/')[1] || null,
          heart_rate: hr ? parseInt(hr) : null,
          temperature: temp ? parseFloat(temp) : null,
          oxygen_saturation: o2 ? parseInt(o2) : null,
          pain_level: pain ? parseInt(pain) : null
        }
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      queryClient.invalidateQueries(['patients']);
    } catch (error) {
      alert('Enhancement failed: ' + error.message);
    }
    setEnhancing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enhancedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setRoughNote("");
    setEnhancedNote("");
    setBp("");
    setHr("");
    setTemp("");
    setO2("");
    setPain("");
    setCopied(false);
    setSaved(false);
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported');
      return;
    }
    
    const recognition = new window.webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ');
      setRoughNote(prev => prev ? prev + ' ' + transcript : transcript);
    };
    
    recognition.onend = () => {
      if (listening) {
        recognition.start();
      }
    };
    
    setListening(true);
    recognition.start();
  };

  const stopDictation = () => {
    setListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quick Note</h1>
          <Button variant="outline" onClick={handleClear} className="min-h-[44px] w-full sm:w-auto">Start Over</Button>
        </div>

        {/* Patient & Visit Info - Always Visible */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Patient</Label>
                <SearchablePatientSelect
                  patients={patients}
                  value={patientId}
                  onValueChange={setPatientId}
                  placeholder="Select patient"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Visit Type</Label>
                <Select value={visitType} onValueChange={setVisitType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine_visit">Routine</SelectItem>
                    <SelectItem value="admission">Admission</SelectItem>
                    <SelectItem value="recertification">Recert</SelectItem>
                    <SelectItem value="discharge">Discharge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date</Label>
                <Input 
                  type="date" 
                  value={visitDate} 
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="sm:col-span-2 md:col-span-1 flex items-end">
                {patient && (
                  <div className="text-xs w-full">
                    <p className="font-semibold text-gray-900 truncate">{patient.first_name} {patient.last_name}</p>
                    <p className="text-gray-600 truncate">{patient.primary_diagnosis}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {patient && (
          <>
            {/* Vitals - Inline Quick Entry */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Vitals (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <Input placeholder="BP (120/80)" value={bp} onChange={(e) => setBp(e.target.value)} className="h-9 text-sm" />
                  <Input placeholder="HR (72)" value={hr} onChange={(e) => setHr(e.target.value)} className="h-9 text-sm" />
                  <Input placeholder="Temp (98.6)" value={temp} onChange={(e) => setTemp(e.target.value)} className="h-9 text-sm" />
                  <Input placeholder="O2 (98)" value={o2} onChange={(e) => setO2(e.target.value)} className="h-9 text-sm" />
                  <Input placeholder="Pain (0-10)" value={pain} onChange={(e) => setPain(e.target.value)} className="h-9 text-sm" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const vitalsText = `Vitals: BP ${bp || '___'}, HR ${hr || '___'}, Temp ${temp || '___'}, O2 ${o2 || '___'}%, Pain ${pain || '___'}/10`;
                      setRoughNote(prev => prev ? prev + '\n\n' + vitalsText : vitalsText);
                    }}
                    className="h-9 text-xs"
                    disabled={!bp && !hr}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Add to Note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Note Area */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    Write Your Notes
                    {roughNote.length > 0 && (
                      <Badge variant="outline" className="text-xs">{roughNote.length} chars</Badge>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant={listening ? "destructive" : "outline"}
                    onClick={listening ? stopDictation : startDictation}
                    className="gap-1"
                  >
                    {listening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Dictate
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={roughNote}
                  onChange={(e) => setRoughNote(e.target.value)}
                  placeholder="Type or dictate your visit notes...&#10;&#10;Examples:&#10;• Patient reports improved mobility&#10;• Wound healing well, less drainage&#10;• Reviewed medications, patient understands&#10;• BP elevated today, will monitor"
                  className="min-h-[250px] text-base"
                />
                
                {listening && (
                  <Alert className="bg-red-50 border-red-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <AlertDescription className="text-red-900 font-medium">
                        Recording... Speak your notes
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {patient.allergies && (
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <strong>Allergies:</strong> {patient.allergies}
                    </AlertDescription>
                  </Alert>
                )}

                {roughNote.length >= 50 && !enhancedNote && (
                  <Button
                    onClick={handleEnhance}
                    disabled={enhancing}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 min-h-[44px] h-auto py-3 text-sm sm:text-base"
                  >
                    {enhancing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Enhancing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Transform to Medicare-Compliant Note
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Note Output */}
            {enhancedNote && (
              <Card className="border-2 border-green-500">
                <CardHeader className="bg-green-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Medicare-Compliant Note Ready
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={enhancedNote}
                    onChange={(e) => setEnhancedNote(e.target.value)}
                    className="min-h-[300px] text-sm font-mono"
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleCopy}
                      className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy to EHR
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                    >
                      New Note
                    </Button>
                  </div>

                  {saved && (
                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        Note saved to patient chart automatically!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Help Card */}
        {!patientId && (
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Note Workflow</h3>
              <div className="text-sm text-gray-700 space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  <p>Select patient and visit details</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  <p>Add vitals (optional, but helps AI)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                  <p>Type or dictate your rough notes</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                  <p>Click "Transform" - AI creates compliant note</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">5</span>
                  <p>Copy to your EHR - Done!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}