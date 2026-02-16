import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, FileText, History, TrendingUp, Activity, Brain, Search, Sparkles, Upload } from "lucide-react";
import EnhancedCameraFaxSender from "../components/fax/EnhancedCameraFaxSender";
import DocumentFaxSender from "../components/fax/DocumentFaxSender";
import PhotoUploadFaxSender from "../components/fax/PhotoUploadFaxSender";
import EnhancedFaxHistory from "../components/fax/EnhancedFaxHistory";
import FaxAnalyticsDashboard from "../components/fax/FaxAnalyticsDashboard";
import FaxActivityFeed from "../components/fax/FaxActivityFeed";
import FaxPriorityRuleManager from "../components/fax/FaxPriorityRuleManager";
import FaxSearchInterface from "../components/fax/FaxSearchInterface";
import FaxAIAssistant from "../components/fax/FaxAIAssistant";
import FaxRetrySettings from "../components/fax/FaxRetrySettings";

export default function SendFax() {
  const [selectedFaxForAI, setSelectedFaxForAI] = useState(null);

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0" />
            <span className="truncate">Fax Center</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Send faxes from camera or documents, and track fax history
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full" onValueChange={() => setSelectedFaxForAI(null)}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1">
            <TabsTrigger value="upload" className="flex-col sm:flex-row gap-1 py-2 min-h-[44px]">
              <Upload className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Photo</span>
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex-col sm:flex-row gap-1 py-2 min-h-[44px]">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Camera</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-col sm:flex-row gap-1 py-2 min-h-[44px]">
              <FileText className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Doc</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="hidden sm:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <Search className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Search</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="hidden sm:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <History className="w-4 h-4" />
              <span className="text-xs sm:text-sm">History</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="hidden lg:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="hidden lg:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <Activity className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="priority" className="hidden lg:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <Brain className="w-4 h-4" />
              <span className="text-xs sm:text-sm">AI Rules</span>
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" disabled={!selectedFaxForAI} className="hidden lg:flex flex-col lg:flex-row gap-1 py-2 min-h-[44px]">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs sm:text-sm">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 sm:mt-6">
            <PhotoUploadFaxSender />
          </TabsContent>

          <TabsContent value="camera" className="mt-4 sm:mt-6">
            <EnhancedCameraFaxSender />
          </TabsContent>

          <TabsContent value="documents" className="mt-4 sm:mt-6">
            <DocumentFaxSender />
          </TabsContent>

          <TabsContent value="search" className="mt-4 sm:mt-6">
            <FaxSearchInterface onSelectFaxForAI={setSelectedFaxForAI} />
          </TabsContent>

          <TabsContent value="history" className="mt-4 sm:mt-6">
            <EnhancedFaxHistory />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 sm:mt-6">
            <FaxAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="activity" className="mt-4 sm:mt-6">
            <FaxActivityFeed />
          </TabsContent>

          <TabsContent value="priority" className="mt-4 sm:mt-6">
            <div className="space-y-4 sm:space-y-6">
              <FaxPriorityRuleManager />
              <FaxRetrySettings />
            </div>
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-4 sm:mt-6">
            {selectedFaxForAI ? (
              <FaxAIAssistant faxLogId={selectedFaxForAI} />
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                Select a fax from History or Search to analyze with AI
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}