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
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-8 h-8" />
            Fax Center
          </h1>
          <p className="text-gray-600 mt-2">
            Send faxes from camera or documents, and track fax history
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full" onValueChange={() => setSelectedFaxForAI(null)}>
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="camera">
              <Smartphone className="w-4 h-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Document
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="priority">
              <Brain className="w-4 h-4 mr-2" />
              AI Rules
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" disabled={!selectedFaxForAI}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <PhotoUploadFaxSender />
          </TabsContent>

          <TabsContent value="camera" className="mt-6">
            <EnhancedCameraFaxSender />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentFaxSender />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <FaxSearchInterface onSelectFaxForAI={setSelectedFaxForAI} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <EnhancedFaxHistory />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <FaxAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <FaxActivityFeed />
          </TabsContent>

          <TabsContent value="priority" className="mt-6">
            <div className="space-y-6">
              <FaxPriorityRuleManager />
              <FaxRetrySettings />
            </div>
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-6">
            {selectedFaxForAI ? (
              <FaxAIAssistant faxLogId={selectedFaxForAI} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select a fax from History or Search to analyze with AI
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}