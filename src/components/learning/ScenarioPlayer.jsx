import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ScenarioPlayer({ scenario, attemptId, onComplete }) {
  const [currentNodeId, setCurrentNodeId] = useState('node-start');
  const [decisions, setDecisions] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [scenarioComplete, setScenarioComplete] = useState(false);
  const [score, setScore] = useState(null);
  const [passed, setPassed] = useState(null);
  const [startTime] = useState(new Date());

  const nodes = scenario.scenarioFlow;
  const currentNode = findNode(scenario.scenarioFlow, currentNodeId);

  function findNode(flow, nodeId) {
    if (!flow) return null;
    if (flow.id === nodeId) return flow;
    for (const choice of flow.choices || []) {
      const found = findNode(nodes[choice.nextNodeId], nodeId);
      if (found) return found;
    }
    return null;
  }

  // Reconstruct flat node map from tree
  function _flattenNodes(node, map = {}) {
    if (!node) return map;
    map[node.id] = node;
    (node.choices || []).forEach(choice => {
      if (choice.nextNodeId) {
        const next = findNodeById(nodes, choice.nextNodeId);
        if (next) _flattenNodes(next, map);
      }
    });
    return map;
  }

  function findNodeById(node, nodeId) {
    if (!node) return null;
    if (node.id === nodeId) return node;
    for (const choice of node.choices || []) {
      if (choice.nextNodeId) {
        const found = findNodeById(scenario.scenarioFlow, choice.nextNodeId);
        if (found) return found;
      }
    }
    return null;
  }

  const handleChoice = (choiceIndex) => {
    const choice = currentNode.choices[choiceIndex];
    const newDecision = {
      nodeId: currentNodeId,
      choiceIndex,
      text: choice.text,
      isCorrect: choice.isCorrect,
      timestamp: new Date().toISOString()
    };

    setDecisions([...decisions, newDecision]);
    setFeedback(choice.feedback);
    setShowFeedback(true);

    if (choice.isCorrect && choice.nextNodeId) {
      setTimeout(() => {
        setCurrentNodeId(choice.nextNodeId);
        setShowFeedback(false);
      }, 2000);
    } else if (!choice.isCorrect) {
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }
  };

  const handleFinishScenario = async () => {
    const correctDecisions = decisions.filter(d => d.isCorrect).length;
    const scorePercentage = decisions.length > 0 ? Math.round((correctDecisions / decisions.length) * 100) : 0;
    const hasPassed = scorePercentage >= scenario.passingScore;

    setScore(scorePercentage);
    setPassed(hasPassed);
    setScenarioComplete(true);

    // Save attempt
    try {
      const endTime = new Date();
      const timeSpentMinutes = Math.round((endTime - startTime) / 60000);

      await base44.entities.ScenarioAttempt.create({
        scenario_id: scenario.id,
        user_id: (await base44.auth.me()).email,
        assignment_id: attemptId || null,
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        decisions_made_json: decisions,
        correct_decisions: correctDecisions,
        total_decisions: decisions.length,
        score_percentage: scorePercentage,
        passed: hasPassed,
        time_spent_minutes: timeSpentMinutes
      });

      if (onComplete) onComplete({ score: scorePercentage, passed: hasPassed });
    } catch (error) {
      console.error('Failed to save scenario attempt:', error);
    }
  };

  if (scenarioComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            {passed ? (
              <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <h1 className="text-3xl font-bold text-green-700">Scenario Passed!</h1>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
                <h1 className="text-3xl font-bold text-red-700">Scenario Failed</h1>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-6 mb-6">
            <p className="text-sm text-slate-600 mb-2">Your Score</p>
            <p className="text-4xl font-bold text-slate-900 mb-2">{score}%</p>
            <Progress value={score} className="h-2 mb-2" />
            <p className="text-sm text-slate-600">
              Passing score: {scenario.passingScore}%
            </p>
          </div>

          <p className="text-slate-600 mb-6">
            Correct decisions: {decisions.filter(d => d.isCorrect).length} / {decisions.length}
          </p>

          <Button onClick={() => {
            setCurrentNodeId('node-start');
            setDecisions([]);
            setFeedback('');
            setShowFeedback(false);
            setScenarioComplete(false);
            setScore(null);
            setPassed(null);
          }} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Patient Context */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Patient Context</h3>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{scenario.patientContext || 'No patient context provided'}</p>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-1">Progress</p>
          <Progress value={scenario.totalNodes ? (decisions.length / scenario.totalNodes) * 100 : Math.min(decisions.length * 20, 100)} className="h-2" />
        </div>
        <Badge className="ml-4">{decisions.length} decisions</Badge>
      </div>

      {/* Current Node */}
      <Card>
        <CardHeader>
          <CardTitle>{scenario.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Text */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-slate-900 whitespace-pre-wrap">{currentNode?.text}</p>
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div
              className={`p-4 rounded-lg flex gap-3 ${
                decisions[decisions.length - 1]?.isCorrect
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {decisions[decisions.length - 1]?.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-sm mb-1">
                  {decisions[decisions.length - 1]?.isCorrect ? 'Correct!' : 'Not the best choice'}
                </p>
                <p className="text-sm text-slate-700">{feedback}</p>
              </div>
            </div>
          )}

          {/* Choices */}
          {!showFeedback && (
            <div className="space-y-2">
              {currentNode?.choices?.map((choice, idx) => (
                <Button
                  key={idx}
                  onClick={() => handleChoice(idx)}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 text-left"
                >
                  <span className="text-sm">{choice.text}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Finish Button */}
          {(currentNodeId === 'node-end' || decisions.length > 0) && !showFeedback && (
            <Button
              onClick={handleFinishScenario}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Finish Scenario
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Decision History */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Decision History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decisions.map((decision, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Step {idx + 1}:</span>
                  <span className="text-slate-700">{decision.text}</span>
                  {decision.isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}