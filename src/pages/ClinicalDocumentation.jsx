import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Mic, Brain } from "lucide-react";
import SmartNoteAssistant from "@/pages/SmartNoteAssistant";
import RealTimeDictationScribe from "@/components/visit/RealTimeDictationScribe";
import AudioVisitCapture from "@/components/visit/AudioVisitCapture";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import EmbeddedPage from "@/components/ui/embeddedPage";

// Tab keys, kept in sync with the TabsTrigger values below. Used to validate the
// ?tab= deep-link so the retired Visit Scribe page can redirect straight to the
// "record" tab (see REDIRECTS in src/routes.jsx).
const TAB_KEYS = ["smart-notes", "live-dictation", "record", "quick-guide"];

export default function ClinicalDocumentation() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TAB_KEYS.includes(requestedTab) ? requestedTab : "smart-notes";
  // Reflect the active tab in the URL so tabs are shareable/bookmarkable and the
  // Visit Scribe redirect deep-links correctly. "smart-notes" is the default, so
  // it stays a clean /ClinicalDocumentation with no query string.
  const handleTabChange = (value) => {
    setSearchParams(value === "smart-notes" ? {} : { tab: value });
  };

  // Converge on the canonical URL: strip a redundant or unknown ?tab= so the
  // default tab is plain /ClinicalDocumentation. Only fires when the param
  // resolved to the default, so a valid deep-link like ?tab=record is untouched.
  useEffect(() => {
    if (requestedTab !== null && activeTab === "smart-notes") {
      setSearchParams({}, { replace: true });
    }
  }, [requestedTab, activeTab, setSearchParams]);

  return (
    <PageContainer>
      <PageHeader
        icon={Brain}
        eyebrow="Documentation"
        title="Clinical Notes"
        description="AI-powered note generation, voice dictation, audio capture, and compliance checking"
        favoritePage="ClinicalDocumentation"
      />
        <EmbeddedPage>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="smart-notes" className="min-h-[44px] font-semibold">Smart Notes</TabsTrigger>
            <TabsTrigger value="live-dictation" className="min-h-[44px] font-semibold">Live Dictation</TabsTrigger>
            <TabsTrigger value="record" className="min-h-[44px] font-semibold">Record / Upload</TabsTrigger>
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

          <TabsContent value="record">
            <AudioVisitCapture currentUser={currentUser} />
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
                      <Mic className="w-5 h-5 text-navy-600" />
                      Live Dictation
                    </h3>
                    <p className="text-slate-600">
                      Dictate directly into a structured form with real-time transcription.
                      Perfect for clinicians who prefer speaking their documentation.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-orange-600" />
                      Record / Upload
                    </h3>
                    <p className="text-slate-600">
                      Record the visit conversation or upload an audio file. AI transcribes it into a
                      rough note, then enhances it into a compliant clinical note.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Pro Tips</h4>
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
        </EmbeddedPage>
    </PageContainer>
  );
}
