import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  GraduationCap,
  Brain,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Target,
  Play
} from "lucide-react";

import TrainingScenarioSimulator from "../components/training/TrainingScenarioSimulator";
import PersonalizedLearningPath from "../components/training/PersonalizedLearningPath";

export default function StaffTraining() {
  const [activeTab, setActiveTab] = useState("overview");
  const [completedScenarios, setCompletedScenarios] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`training_history_${currentUser.id}`);
      if (saved) {
        setCompletedScenarios(JSON.parse(saved));
      }
    }
  }, [currentUser]);

  const handleScenarioComplete = (result) => {
    const updated = [...completedScenarios, result];
    setCompletedScenarios(updated);
    if (currentUser) {
      localStorage.setItem(`training_history_${currentUser.id}`, JSON.stringify(updated));
    }
  };

  const averageScore = completedScenarios.length > 0
    ? Math.round(completedScenarios.reduce((a, b) => a + b.score, 0) / completedScenarios.length)
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Training Center</h1>
            <p className="text-gray-600">AI-powered clinical education and competency development</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <Play className="w-8 h-8 text-purple-200 mb-2" />
            <p className="text-3xl font-bold">{completedScenarios.length}</p>
            <p className="text-sm text-purple-100">Scenarios Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <Award className="w-8 h-8 text-green-200 mb-2" />
            <p className="text-3xl font-bold">{averageScore}%</p>
            <p className="text-sm text-green-100">Average Score</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 text-blue-200 mb-2" />
            <p className="text-3xl font-bold">{completedScenarios.length * 15}</p>
            <p className="text-sm text-blue-100">Minutes Trained</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none">
          <CardContent className="p-4">
            <Target className="w-8 h-8 text-indigo-200 mb-2" />
            <p className="text-3xl font-bold">
              {completedScenarios.filter(s => s.score >= 80).length}
            </p>
            <p className="text-sm text-indigo-100">Mastery Achieved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2">
            <Brain className="w-4 h-4" />
            Training Scenarios
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Learning Path
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Brain className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Interactive Scenarios</h3>
                    <p className="text-sm text-gray-600">
                      Practice with realistic patient situations and get AI feedback on your decisions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                  <Target className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold">Personalized Learning</h3>
                    <p className="text-sm text-gray-600">
                      AI analyzes your performance to create a custom learning path.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Award className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Compliance Training</h3>
                    <p className="text-sm text-gray-600">
                      Focus on Medicare requirements, OASIS accuracy, and quality measures.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {completedScenarios.length > 0 ? (
                  <div className="space-y-3">
                    {completedScenarios.slice(-5).reverse().map((scenario, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {scenario.scenarioType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(scenario.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={
                          scenario.score >= 80 ? 'bg-green-500' :
                          scenario.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }>
                          {scenario.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No training completed yet</p>
                    <Button 
                      className="mt-3"
                      onClick={() => setActiveTab("scenarios")}
                    >
                      Start Training
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios">
          <TrainingScenarioSimulator onComplete={handleScenarioComplete} />
        </TabsContent>

        <TabsContent value="learning">
          <PersonalizedLearningPath 
            userPerformance={completedScenarios}
            userId={currentUser?.id || 'guest'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}