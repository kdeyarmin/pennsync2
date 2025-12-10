import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Brain } from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import PredictiveAnalytics from "./PredictiveAnalytics";

export default function AgencyAnalytics() {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-14">
              <TabsTrigger value="performance" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="predictive" className="gap-2">
                <Brain className="w-4 h-4" />
                Predictive
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="performance" className="m-0">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="predictive" className="m-0">
          <PredictiveAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}