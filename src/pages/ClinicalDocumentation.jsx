import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Mic, Brain } from "lucide-react";
import SmartNoteAssistant from "@/pages/SmartNoteAssistant";
import RealTimeDictationScribe from "@/components/visit/RealTimeDictationScribe";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function ClinicalDocumentation() {
  const [activeMethod, setActiveMethod] = useState("smart-notes");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <PageContainer>
      <PageHeader
        icon={Brain}
        eyebrow="Documentation"
        title="Clinical Notes"
        description="AI-powered note generation, voice dictation, and compliance checking"
        favoritePage="ClinicalDocumentation"
      />
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
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Smart Notes
                    </h3>
                    <p className="text-slate-600">
                      Write rough bullet points or free-text notes. AI analyzes for Medicare compliance,
                      suggests additions, and generates a polished clinical narrative.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      Live Dictation
                    </h3>
                    <p className="text-slate-600">
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
    </PageContainer>
  );
}