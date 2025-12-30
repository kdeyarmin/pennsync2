import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Brain, TrendingUp } from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import PredictiveAnalytics from "./PredictiveAnalytics";
import AdvancedAnalyticsDashboard from "./AdvancedAnalyticsDashboard";

export default function AgencyAnalytics() {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex md:grid md:w-full md:max-w-2xl md:grid-cols-3 gap-1 min-w-max h-auto md:h-14">
                <TabsTrigger value="performance" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Performance</span>
                  <span className="sm:hidden">Perf</span>
                </TabsTrigger>
                <TabsTrigger value="predictive" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Predictive</span>
                  <span className="sm:hidden">Pred</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Advanced</span>
                  <span className="sm:hidden">Adv</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="performance" className="m-0">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="predictive" className="m-0">
          <PredictiveAnalytics />
        </TabsContent>

        <TabsContent value="advanced" className="m-0">
          <AdvancedAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}