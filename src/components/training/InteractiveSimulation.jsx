import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  TrendingUp
} from "lucide-react";

export default function InteractiveSimulation({ scenario, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const steps = scenario.steps || [];
  const currentStepData = steps[currentStep];

  const handleResponseSubmit = () => {
    const response = responses[currentStep];
    
    // Simulate AI evaluation
    const isCorrect = Math.random() > 0.3; // Placeholder - would use AI in production
    const stepFeedback = {
      correct: isCorrect,
      message: isCorrect 
        ? "Excellent! Your documentation meets Medicare standards."
        : "This could be improved. Consider adding more specific details about the patient's condition.",
      suggestions: isCorrect ? [] : [
        "Include baseline measurements",
        "Document specific skilled nursing interventions",
        "Note changes from previous visit"
      ]
    };

    setFeedback({ ...feedback, [currentStep]: stepFeedback });

    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 2000);
    } else {
      // Calculate final score
      const correctCount = Object.values({ ...feedback, [currentStep]: stepFeedback })
        .filter(f => f.correct).length;
      const finalScore = Math.round((correctCount / steps.length) * 100);
      setScore(finalScore);
      setShowResults(true);
    }
  };

  const handleInputChange = (value) => {
    setResponses({ ...responses, [currentStep]: value });
  };

  if (showResults) {
    return (
      <Card className={`border-2 ${score >= 80 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            {score >= 80 ? (
              <Award className="w-16 h-16 text-green-600 mx-auto mb-3" />
            ) : (
              <TrendingUp className="w-16 h-16 text-yellow-600 mx-auto mb-3" />
            )}
            <h3 className="text-2xl font-bold mb-2">
              {score >= 80 ? 'Excellent Work!' : 'Good Progress!'}
            </h3>
            <p className="text-lg font-semibold mb-1">Final Score: {score}%</p>
            <p className="text-sm text-gray-600">
              You completed {Object.values(feedback).filter(f => f.correct).length} of {steps.length} steps correctly
            </p>
          </div>

          {/* Step by Step Review */}
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900">Review:</h4>
            {steps.map((step, idx) => {
              const stepFeedback = feedback[idx];
              return (
                <div key={idx} className="p-4 bg-white rounded-lg border">
                  <div className="flex items-start gap-2 mb-2">
                    {stepFeedback?.correct ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{stepFeedback?.message}</p>
                      {stepFeedback?.suggestions?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {stepFeedback.suggestions.map((suggestion, sIdx) => (
                            <li key={sIdx} className="text-xs text-blue-600 flex items-start gap-1">
                              <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => {
              setCurrentStep(0);
              setResponses({});
              setFeedback({});
              setShowResults(false);
              setScore(0);
            }} variant="outline" className="flex-1">
              Try Again
            </Button>
            <Button onClick={() => onComplete(score)} className="flex-1">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentFeedback = feedback[currentStep];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Interactive Simulation
          </CardTitle>
          <Badge>
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Scenario Context */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              <strong className="text-blue-900">Scenario:</strong>
              <p className="text-blue-800 mt-1">{scenario.description}</p>
            </AlertDescription>
          </Alert>

          {/* Current Step */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{currentStepData?.title}</h3>
            <p className="text-gray-600 mb-4">{currentStepData?.prompt}</p>

            {currentStepData?.type === 'text_input' && (
              <Textarea
                value={responses[currentStep] || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type your documentation here..."
                rows={6}
                className="mb-4"
              />
            )}

            {currentStepData?.type === 'vital_signs' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input placeholder="Blood Pressure" />
                <Input placeholder="Heart Rate" />
                <Input placeholder="Temperature" />
                <Input placeholder="O2 Saturation" />
              </div>
            )}
          </div>

          {/* Feedback Display */}
          {currentFeedback && (
            <Alert className={currentFeedback.correct ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              {currentFeedback.correct ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              )}
              <AlertDescription>
                <p className={currentFeedback.correct ? 'text-green-800' : 'text-yellow-800'}>
                  {currentFeedback.message}
                </p>
                {currentFeedback.suggestions?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {currentFeedback.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          {!currentFeedback && (
            <Button
              onClick={handleResponseSubmit}
              disabled={!responses[currentStep]}
              className="w-full"
            >
              Submit Response
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}