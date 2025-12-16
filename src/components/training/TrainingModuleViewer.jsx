import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  XCircle, 
  PlayCircle, 
  FileText, 
  Brain,
  ArrowLeft,
  Award
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function TrainingModuleViewer({ module, nurseEmail, onComplete, onBack }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const queryClient = useQueryClient();

  const completionMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingCompletion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
    }
  });

  const updateCompletionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingCompletion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
    }
  });

  const questions = module.content?.quiz_questions || [];
  const hasQuiz = questions.length > 0;

  const handleAnswerChange = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };

  const calculateScore = () => {
    if (!hasQuiz) return 100;
    
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const score = calculateScore();
    
    try {
      // Check if completion already exists
      const existingCompletions = await base44.entities.TrainingCompletion.filter({
        nurse_email: nurseEmail,
        training_module_id: module.id
      });

      const completionData = {
        nurse_email: nurseEmail,
        training_module_id: module.id,
        completion_date: new Date().toISOString().split('T')[0],
        score,
        status: score >= (module.passing_score || 80) ? 'completed' : 'in_progress',
        feedback: feedback || undefined
      };

      if (existingCompletions && existingCompletions.length > 0) {
        await updateCompletionMutation.mutateAsync({
          id: existingCompletions[0].id,
          data: completionData
        });
      } else {
        await completionMutation.mutateAsync(completionData);
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error submitting completion:', error);
      alert('Failed to save progress');
    }
    
    setIsSubmitting(false);
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(calculateScore());
    }
  };

  const renderContent = () => {
    if (module.content_type === 'video' && module.content?.video_url) {
      return (
        <div className="aspect-video bg-black rounded-lg mb-6">
          <iframe
            src={module.content.video_url}
            className="w-full h-full rounded-lg"
            allowFullScreen
            title={module.title}
          />
        </div>
      );
    }

    if (module.content_type === 'document' && module.content?.document_url) {
      return (
        <div className="mb-6">
          <Button
            onClick={() => window.open(module.content.document_url, '_blank')}
            className="w-full"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Training Document
          </Button>
        </div>
      );
    }

    if (module.content?.text) {
      return (
        <div className="prose max-w-none mb-6">
          <ReactMarkdown>{module.content.text}</ReactMarkdown>
        </div>
      );
    }

    return null;
  };

  const renderQuiz = () => {
    if (!hasQuiz) return null;

    if (showResults) {
      const score = calculateScore();
      const passed = score >= (module.passing_score || 80);

      return (
        <Card className={`border-2 ${passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              {passed ? (
                <Award className="w-16 h-16 text-green-600 mx-auto mb-3" />
              ) : (
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-3" />
              )}
              <h3 className="text-2xl font-bold mb-2">
                {passed ? 'Congratulations!' : 'Keep Practicing'}
              </h3>
              <p className="text-lg font-semibold mb-1">Your Score: {score}%</p>
              <p className="text-sm text-gray-600">
                Passing Score: {module.passing_score || 80}%
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {questions.map((q, idx) => {
                const isCorrect = answers[idx] === q.correct_answer;
                return (
                  <div key={idx} className="p-4 bg-white rounded-lg border">
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="font-medium">{q.question}</p>
                    </div>
                    <p className="text-sm text-gray-600 ml-7">{q.explanation}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              {!passed && (
                <Button onClick={() => {
                  setShowResults(false);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }} variant="outline" className="flex-1">
                  Try Again
                </Button>
              )}
              <Button onClick={handleFinish} className="flex-1">
                {passed ? 'Continue' : 'Exit'}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Knowledge Check
            </CardTitle>
            <Badge>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.question}</p>
            
            <RadioGroup
              value={answers[currentQuestionIndex]?.toString()}
              onValueChange={(value) => handleAnswerChange(currentQuestionIndex, parseInt(value))}
            >
              {currentQuestion.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  disabled={answers[currentQuestionIndex] === undefined}
                  className="flex-1"
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length !== questions.length || isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Training
          </Button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{module.title}</h2>
          <p className="text-gray-600 mb-4">{module.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{module.content_type}</Badge>
            <Badge variant="outline">{module.duration_minutes} minutes</Badge>
            {module.difficulty_level && (
              <Badge variant="outline" className="capitalize">{module.difficulty_level}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {renderContent()}
          
          {!hasQuiz && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts about this training..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Completing...' : 'Mark as Complete'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz */}
      {hasQuiz && renderQuiz()}
    </div>
  );
}