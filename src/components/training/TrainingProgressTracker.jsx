import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { 
  Target, 
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2
} from "lucide-react";

export default function TrainingProgressTracker({ _userEmail, trainingProgress, practiceSubmissions }) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  
  const completedTutorials = trainingProgress.filter(t => t.status === 'completed').length;
  const totalTutorials = 3; // Based on TUTORIALS array
  const tutorialProgress = (completedTutorials / totalTutorials) * 100;

  const practiceScores = practiceSubmissions
    .filter(s => s.score != null)
    .map(s => s.score);
  const averagePracticeScore = practiceScores.length > 0
    ? practiceScores.reduce((sum, score) => sum + score, 0) / practiceScores.length
    : 0;

  const recentPractice = practiceSubmissions.slice(0, 5);
  const improvementTrend = practiceScores.length >= 2
    ? practiceScores[0] - practiceScores[practiceScores.length - 1]
    : 0;

  // Identify weak areas
  const weakAreas = [];
  if (averagePracticeScore < 70) {
    weakAreas.push({ area: "Overall Documentation Quality", score: averagePracticeScore });
  }

  const downloadCertificate = async (completion) => {
    setIsDownloading(true);
    try {
      const moduleMatch = completion.training_module_id?.match(/documentation-(.+)/);
      const moduleName = moduleMatch ? moduleMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Documentation Training';
      
      const response = await base44.functions.invoke('generateTrainingCertificate', {
        moduleName,
        completionDate: completion.completion_date,
        score: completion.score
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${moduleName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to generate certificate');
    }
    setIsDownloading(false);
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Your Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tutorials Completed</span>
              <span className="text-sm font-bold">{completedTutorials} / {totalTutorials}</span>
            </div>
            <Progress value={tutorialProgress} className="h-3" />
          </div>

          {/* Completed Tutorials with Certificates */}
          {trainingProgress.filter(t => t.status === 'completed').length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs font-semibold text-slate-600 mb-2">Completed Modules:</p>
              <div className="space-y-2">
                {trainingProgress.filter(t => t.status === 'completed').map((completion) => (
                  <div key={completion.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium">
                        {completion.training_module_id.replace('documentation-', '').replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-xs">
                        {Math.round(completion.score)}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCertificate(completion)}
                        disabled={isDownloading}
                        className="h-6 px-2 gap-1"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <><Download className="w-3 h-3" /> Cert</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Practice Exercises</span>
              <span className="text-sm font-bold">{practiceSubmissions.length} completed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-900">{Math.round(averagePracticeScore)}%</p>
              <p className="text-xs text-slate-600">Average Score</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${improvementTrend >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {improvementTrend >= 0 ? '+' : ''}{Math.round(improvementTrend)}%
              </p>
              <p className="text-xs text-slate-600">Improvement Trend</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentPractice.length > 0 ? (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-3">Recent Practice Scores</h4>
                <div className="space-y-2">
                  {recentPractice.map((submission, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{submission.skill_area}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(submission.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          submission.score >= 90 ? 'bg-green-600' :
                          submission.score >= 80 ? 'bg-blue-600' :
                          submission.score >= 70 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }>
                          {Math.round(submission.score)}%
                        </Badge>
                        {submission.score >= 80 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No practice submissions yet</p>
              <p className="text-xs mt-1">Complete practice exercises to see your progress</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Areas Needing Attention */}
      {weakAreas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Areas Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weakAreas.map((area, idx) => (
                <div key={idx} className="bg-white p-4 rounded border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">{area.area}</p>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {Math.round(area.score)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Focus on improving this area through additional practice exercises
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Level Badge */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <Target className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-purple-900 mb-1">
            {averagePracticeScore >= 90 ? 'Expert Documenter' :
             averagePracticeScore >= 80 ? 'Advanced' :
             averagePracticeScore >= 70 ? 'Intermediate' :
             averagePracticeScore >= 60 ? 'Developing' : 'Beginner'}
          </h3>
          <p className="text-sm text-purple-700">Current Documentation Skill Level</p>
          {averagePracticeScore < 90 && (
            <p className="text-xs text-slate-600 mt-2">
              {90 - Math.round(averagePracticeScore)}% more to reach Expert level
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}