import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Mic } from "lucide-react";
import SmartNoteAssistant from "@/pages/SmartNoteAssistant";
import RealTimeDictationScribe from "@/components/visit/RealTimeDictationScribe";

export default function ClinicalDocumentation() {
  const [activeMethod, setActiveMethod] = useState("smart-notes");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Clinical Documentation
        </h1>
        <p className="text-indigo-100">AI-powered note generation, voice dictation, and compliance checking</p>
      </div>

      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <Tabs value={activeMethod} onValueChange={setActiveMethod} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2">
            <TabsTrigger value="smart-notes" className="min-h-[44px] font-semibold">Smart Notes</TabsTrigger>
            <TabsTrigger value="live-dictation" className="min-h-[44px] font-semibold">Live Dictation</TabsTrigger>
            <TabsTrigger value="quick-guide" className="min-h-[44px] font-semibold">Quick Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="smart-notes">
            <SmartNoteAssistant />
          </TabsContent>

          <TabsContent value="live-dictation">
            <Card>
              <CardContent className="p-6">
                <RealTimeDictationScribe currentUser={currentUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick-guide">
            <Card>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Smart Notes
                    </h3>
                    <p className="text-gray-600">
                      Write rough bullet points or free-text notes. AI analyzes for Medicare compliance,
                      suggests additions, and generates a polished clinical narrative.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      Live Dictation
                    </h3>
                    <p className="text-gray-600">
                      Dictate directly into a structured form with real-time transcription.
                      Perfect for clinicians who prefer speaking their documentation.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Always select the patient first for better compliance checking</li>
                      <li>• Include vitals with clinical interpretation</li>
                      <li>• Document homebound status and skilled need for home health</li>
                      <li>• Use voice recording for faster documentation on mobile</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}