import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  Clock,
  Award,
  ArrowRight
} from "lucide-react";

export default function OnboardingTracker({ nurseEmail, onStartModule }) {
  const { data: modules = [] } = useQuery({
    queryKey: ['onboardingModules'],
    queryFn: () => base44.entities.TrainingModule.filter({ 
      required_for_onboarding: true,
      is_active: true 
    }),
    initialData: [],
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['onboardingCompletions', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({ 
      nurse_email: nurseEmail 
    }),
    enabled: !!nurseEmail,
    initialData: [],
  });

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0));

  const getModuleStatus = (module) => {
    const completion = completions.find(c => c.training_module_id === module.id);
    if (!completion) return 'not_started';
    return completion.status;
  };

  const isModuleLocked = (module) => {
    if (!module.prerequisites || module.prerequisites.length === 0) return false;
    
    return module.prerequisites.some(prereqId => {
      const prereqCompletion = completions.find(c => c.training_module_id === prereqId);
      return !prereqCompletion || prereqCompletion.status !== 'completed';
    });
  };

  const completedCount = sortedModules.filter(m => getModuleStatus(m) === 'completed').length;
  const totalCount = sortedModules.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusIcon = (module) => {
    const status = getModuleStatus(module);
    const locked = isModuleLocked(module);

    if (locked) return <Lock className="w-5 h-5 text-gray-400" />;
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'in_progress') return <Play className="w-5 h-5 text-blue-600" />;
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  const getStatusColor = (module) => {
    const status = getModuleStatus(module);
    const locked = isModuleLocked(module);

    if (locked) return 'border-gray-200 bg-gray-50';
    if (status === 'completed') return 'border-green-200 bg-green-50';
    if (status === 'in_progress') return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-white hover:bg-gray-50';
  };

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No onboarding modules configured yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
              <p className="text-sm text-gray-600">
                {completedCount} of {totalCount} modules completed
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{progressPercentage}%</p>
              <p className="text-xs text-gray-600">Complete</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          {progressPercentage === 100 && (
            <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-100 rounded-lg p-3">
              <Award className="w-5 h-5" />
              <span className="font-medium">Congratulations! You've completed onboarding!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module List */}
      <div className="space-y-3">
        {sortedModules.map((module, index) => {
          const status = getModuleStatus(module);
          const locked = isModuleLocked(module);
          const completion = completions.find(c => c.training_module_id === module.id);

          return (
            <Card 
              key={module.id}
              className={`transition-all ${getStatusColor(module)} ${locked ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Step Number & Icon */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-gray-700">
                      {index + 1}
                    </div>
                    {getStatusIcon(module)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{module.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      </div>
                      <Badge variant={
                        status === 'completed' ? 'default' : 
                        status === 'in_progress' ? 'secondary' : 
                        'outline'
                      }>
                        {status === 'completed' ? 'Completed' :
                         status === 'in_progress' ? 'In Progress' :
                         locked ? 'Locked' : 'Not Started'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {module.duration_minutes} min
                      </span>
                      <span className="capitalize">{module.content_type}</span>
                      {module.difficulty_level && (
                        <span className="capitalize">{module.difficulty_level}</span>
                      )}
                    </div>

                    {completion?.score !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Score:</span>
                          <span className={`font-semibold ${
                            completion.score >= (module.passing_score || 80) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {completion.score}%
                          </span>
                        </div>
                        <Progress value={completion.score} className="h-2" />
                      </div>
                    )}

                    {locked && module.prerequisites && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">
                        Complete previous modules to unlock
                      </p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => onStartModule(module)}
                      disabled={locked}
                      className={status === 'completed' ? 'bg-gray-600' : 'bg-blue-600'}
                    >
                      {status === 'completed' ? 'Review' :
                       status === 'in_progress' ? 'Continue' :
                       'Start Module'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}