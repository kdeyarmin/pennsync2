import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3 } from "lucide-react";
import OASISAnalyzer from "./OASISAnalyzer";
import OASISAnalyticsDashboard from "./OASISAnalyticsDashboard";

export default function OASIS() {
  const [activeTab, setActiveTab] = useState("analyzer");

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-14">
              <TabsTrigger value="analyzer" className="gap-2">
                <FileText className="w-4 h-4" />
                OASIS Analyzer
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="analyzer" className="m-0">
          <OASISAnalyzer />
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <OASISAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}