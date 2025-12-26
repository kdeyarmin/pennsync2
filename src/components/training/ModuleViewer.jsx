import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Video, 
  Award,
  Star,
  MessageCircle,
  Download
} from "lucide-react";
import AIQuizGenerator from "./AIQuizGenerator";

export default function ModuleViewer({ module, userEmail, onComplete }) {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("content");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [completing, setCompleting] = useState(false);

  const markCompleteMutation = useMutation({
    mutationFn: async (completionData) => {
      // Check if completion already exists
      const existing = await base44.entities.TrainingCompletion.filter({
        nurse_email: userEmail,
        training_module_id: module.id
      });

      if (existing.length > 0) {
        return base44.entities.TrainingCompletion.update(existing[0].id, completionData);
      } else {
        return base44.entities.TrainingCompletion.create({
          nurse_email: userEmail,
          training_module_id: module.id,
          ...completionData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTrainingCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
      onComplete?.();
    },
  });

  const handleMarkComplete = () => {
    setCompleting(true);
    markCompleteMutation.mutate({
      status: 'completed',
      completion_date: new Date().toISOString().split('T')[0],
      feedback,
      effectiveness_rating: rating,
    });
    setCompleting(false);
  };

  const handleQuizComplete = (result) => {
    markCompleteMutation.mutate({
      status: result.passed ? 'completed' : 'in_progress',
      score: result.score,
      completion_date: result.passed ? new Date().toISOString().split('T')[0] : null,
      feedback,
      effectiveness_rating: rating,
    });
  };

  // Extract content for quiz generation
  const getContentForQuiz = () => {
    let content = module.description || '';
    if (module.content?.text) content += '\n\n' + module.content.text;
    return content;
  };

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
              <p className="text-sm text-gray-600">{module.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-blue-100 text-blue-800">{module.category}</Badge>
                <Badge variant="outline">{module.difficulty_level}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {module.duration_minutes} min
                </Badge>
                {module.is_required && <Badge className="bg-red-600">Required</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="content">
            <FileText className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Award className="w-4 h-4 mr-2" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="complete">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {/* Text Content */}
          {module.content?.text && (
            <Card>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none">
                  {module.content.text}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Content */}
          {module.content?.video_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Training Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video controls className="w-full rounded-lg">
                  <source src={module.content.video_url} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </CardContent>
            </Card>
          )}

          {/* Document Download */}
          {module.content?.document_url && (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-sm text-gray-700 mb-3">Training document available</p>
                <Button
                  onClick={() => window.open(module.content.document_url, '_blank')}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Document
                </Button>
              </CardContent>
            </Card>
          )}

          {/* External Content */}
          {module.content_url && (
            <Card>
              <CardContent className="p-6 text-center">
                <Button
                  onClick={() => window.open(module.content_url, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Access External Training Content
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <AIQuizGenerator
            trainingContent={getContentForQuiz()}
            moduleTitle={module.title}
            onComplete={handleQuizComplete}
          />
        </TabsContent>

        {/* Complete Tab */}
        <TabsContent value="complete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mark as Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div>
                <Label className="text-sm mb-2 block">Rate this training</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setRating(num)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          num <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <Label className="text-sm mb-2 block">
                  Feedback (optional)
                  <MessageCircle className="w-3 h-3 inline ml-1" />
                </Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts on this training..."
                  className="h-24"
                />
              </div>

              {/* Complete Button */}
              <Button
                onClick={handleMarkComplete}
                disabled={completing || rating === 0}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {completing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Mark as Complete
                  </>
                )}
              </Button>

              {rating === 0 && (
                <p className="text-xs text-orange-600 text-center">
                  Please provide a rating before completing
                </p>
              )}
            </CardContent>
          </Card>

          {/* Completion Info */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              By marking this training as complete, you confirm that you have reviewed all materials
              and understand the content. Your completion will be recorded for compliance tracking.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}