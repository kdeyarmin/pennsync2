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
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-12 sm:h-14">
              <TabsTrigger value="performance" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
              <TabsTrigger value="predictive" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Predictive</span>
                <span className="sm:hidden">Pred</span>
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