import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, Lock, ChevronRight } from "lucide-react";

const TUTORIALS = [
  {
    id: "documentation-basics",
    title: "Documentation Basics",
    description: "Learn the fundamentals of Medicare-compliant home health documentation",
    duration: "15 min",
    difficulty: "beginner",
    topics: [
      "What makes documentation Medicare-compliant",
      "Required elements in every visit note",
      "Common documentation mistakes",
      "Best practices for clarity and completeness"
    ],
    content: `# Documentation Basics for Home Health

## What Makes Documentation Medicare-Compliant?

Medicare requires home health documentation to demonstrate:
1. **Medical Necessity**: Why skilled nursing services are needed
2. **Homebound Status**: Why the patient cannot easily leave home
3. **Skilled Need**: What requires professional nursing judgment
4. **Patient Response**: How the patient responds to interventions

## Required Elements in Every Visit Note

Every visit note must include:
- **Patient identification and visit date**
- **Vital signs and physical assessment**
- **Skilled interventions performed**
- **Patient/caregiver teaching and response**
- **Current condition and any changes from baseline**
- **Plan of care updates**

## Common Documentation Mistakes

❌ Vague language: "Patient doing well"
✓ Specific observations: "Blood pressure 128/76, down from 148/92 last visit. Patient reports improved energy and decreased shortness of breath with ambulation."

❌ Missing skilled need justification
✓ Clear skilled need: "RN assessment required for monitoring post-surgical wound healing, evaluating infection risk, and adjusting wound care protocol based on tissue granulation progress."

## Best Practices

1. **Be Specific**: Use measurable, objective data
2. **Show Clinical Judgment**: Explain your nursing assessments and decisions
3. **Document Patient Response**: Always note how patient responded to teaching/interventions
4. **Reference Care Plan**: Connect visit activities to care plan goals
5. **Use Medical Terminology**: Professional language demonstrates skilled nursing care`,
    quiz: [
      {
        question: "Which of the following demonstrates homebound status?",
        options: [
          "Patient is able to drive to the store",
          "Patient ambulates with walker, requires assistance of 1 for distances >20 feet, experiences severe SOB and fatigue when leaving home",
          "Patient prefers to stay home",
          "Patient goes to church weekly"
        ],
        correct: 1
      },
      {
        question: "What is missing from this note: 'Visited patient. Vitals WNL. Wound looks better.'",
        options: [
          "Specific vital sign values",
          "Objective wound measurements",
          "Skilled interventions performed",
          "All of the above"
        ],
        correct: 3
      }
    ]
  },
  {
    id: "homebound-documentation",
    title: "Documenting Homebound Status",
    description: "Master the art of clearly documenting why leaving home is taxing and infrequent",
    duration: "20 min",
    difficulty: "intermediate",
    topics: [
      "What qualifies as homebound",
      "Common homebound scenarios",
      "Taxing effort examples",
      "Documenting medical contraindications"
    ],
    content: `# Documenting Homebound Status

## What Qualifies as Homebound?

A patient is considered homebound if leaving home requires:
- **Considerable and taxing effort**
- **Supportive devices or assistance of another person**
- **Medical contraindication to leaving home**

## Common Homebound Scenarios

### Mobility Limitations
✓ "Patient ambulates with wheeled walker. Requires assist of 1 for balance and safety for distances >15 feet. Experiences severe dyspnea and lower extremity weakness after ambulating to bathroom (approximately 30 feet). Reports that leaving home is extremely taxing due to multiple transfers (bed to chair to car) and prolonged ambulation, causing significant SOB, fatigue, and increased fall risk."

### Medical Contraindications
✓ "Patient with severe COPD on 4L continuous oxygen. O2 sat drops to 84% with minimal exertion (walking to bathroom). Physician has ordered patient to remain home except for essential medical appointments due to high risk of respiratory distress with activity."

### Cognitive/Psychiatric Barriers
✓ "Patient with advanced dementia, disoriented to time and place. Requires 24-hour supervision for safety. Unable to navigate environment independently. Would be unsafe to leave home without constant caregiver assistance."

## What to Avoid

❌ "Patient is homebound"
❌ "Patient doesn't like to leave home"  
❌ "Patient is too weak"

## Strong Examples

✓ Describe specific symptoms when attempting to leave
✓ Quantify distances and assistance needed
✓ Note oxygen requirements and desaturation
✓ Document medical device dependencies
✓ Explain why brief absences for medical care don't negate homebound status`,
    quiz: [
      {
        question: "Which statement best documents homebound status?",
        options: [
          "Patient is homebound and rarely leaves the house",
          "Patient requires wheelchair for mobility and assistance of 2 for all transfers. Leaving home requires significant preparation including oxygen setup, wheelchair transport, and results in severe fatigue lasting hours after minimal exertion",
          "Patient has difficulty walking",
          "Doctor says patient should stay home"
        ],
        correct: 1
      }
    ]
  },
  {
    id: "skilled-need-justification",
    title: "Justifying Skilled Need",
    description: "Learn to clearly articulate why professional nursing services are medically necessary",
    duration: "25 min",
    difficulty: "intermediate",
    topics: [
      "What constitutes skilled nursing",
      "Assessment vs. task completion",
      "Clinical judgment documentation",
      "Teaching that requires RN skills"
    ],
    content: `# Justifying Skilled Need

## What Constitutes Skilled Nursing?

Skilled nursing services require the expertise of a licensed nurse and include:
- **Complex assessments** requiring clinical judgment
- **Teaching** requiring professional knowledge
- **Medication management** requiring RN evaluation
- **Wound care** requiring skilled observation and management

## Assessment vs. Task Completion

❌ Weak: "Checked blood pressure"
✓ Strong: "Assessed cardiovascular status in patient with CHF. BP 142/88, up from 128/76 last visit. Evaluated for signs of fluid retention: trace pedal edema (previously none), lung sounds clear. Patient reports 2-pound weight gain since last visit. RN clinical judgment indicates early signs of CHF exacerbation. Educated patient on fluid restriction and symptoms requiring immediate MD notification. Will monitor closely and report findings to physician."

## Documenting Clinical Judgment

Every skilled intervention should show WHY it requires an RN:

**Wound Assessment**
✓ "RN wound assessment performed to evaluate healing progress and determine appropriate treatment modifications. Wound bed shows 30% granulation tissue (improved from 15% last visit), minimal serous drainage, periwound area without erythema. Based on assessment, RN modified wound care protocol to advance healing. This skilled nursing evaluation is necessary to prevent complications and ensure optimal healing."

**Patient Teaching**  
✓ "Complex diabetic foot care education provided requiring RN knowledge of diabetes pathophysiology, wound healing, and infection prevention. Taught patient to inspect feet daily for skin breakdown, demonstrated proper nail trimming technique, educated on footwear selection. Evaluated patient's understanding through teach-back method—patient correctly identified early signs of infection and when to notify nurse. Ongoing RN teaching needed due to patient's learning needs and high risk for complications."

## Teaching That Requires RN Skills

Simple task instruction is not skilled. The teaching must require professional nursing knowledge:

❌ "Taught patient to take medications"
✓ "Provided comprehensive medication education requiring RN knowledge of pharmacology. Taught patient about new CHF medication regimen including mechanism of action, importance of adherence, potential side effects requiring MD notification (dizziness, excessive urination, muscle cramps). Evaluated patient's understanding of when to hold medications based on vital signs (HR <60, BP <100/60). Complex teaching necessary due to polypharmacy (9 medications) and need for clinical judgment in medication administration."`,
    quiz: [
      {
        question: "Which demonstrates skilled need?",
        options: [
          "Changed patient's bed linens",
          "Gave patient a bath",
          "Assessed diabetic patient's foot ulcer, evaluated healing progress, modified dressing protocol based on wound bed characteristics, and educated patient on signs of infection requiring immediate intervention",
          "Reminded patient to take medications"
        ],
        correct: 2
      }
    ]
  }
];

export default function InteractiveTutorials({ userEmail, onComplete }) {
  const [selectedTutorial, setSelectedTutorial] = React.useState(null);
  const [currentStep, setCurrentStep] = React.useState("content");
  const [quizAnswers, setQuizAnswers] = React.useState({});
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [completedTutorials, setCompletedTutorials] = React.useState([]);

  const handleStartTutorial = (tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentStep("content");
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const handleCompleteContent = () => {
    setCurrentStep("quiz");
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitted(true);
    
    const score = selectedTutorial.quiz.reduce((acc, q, idx) => {
      return acc + (quizAnswers[idx] === q.correct ? 1 : 0);
    }, 0);
    
    const percentage = (score / selectedTutorial.quiz.length) * 100;

    if (percentage >= 80) {
      setCompletedTutorials(prev => [...prev, selectedTutorial.id]);
      
      try {
        await base44.entities.TrainingCompletion.create({
          nurse_email: userEmail,
          training_module_id: `documentation-${selectedTutorial.id}`,
          completion_date: new Date().toISOString().split('T')[0],
          score: percentage,
          status: 'completed'
        });
        onComplete?.(selectedTutorial.id);
      } catch (error) {
        console.error('Error saving completion:', error);
      }
    }
  };

  if (selectedTutorial) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{selectedTutorial.title}</CardTitle>
              <p className="text-sm text-slate-600 mt-1">{selectedTutorial.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge>{selectedTutorial.difficulty}</Badge>
                <Badge variant="outline">{selectedTutorial.duration}</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSelectedTutorial(null)}>
              Back to List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentStep === "content" && (
            <div className="space-y-6">
              <div className="prose max-w-none">
                {selectedTutorial.content.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) return <h2 key={idx} className="text-2xl font-bold mt-6 mb-3">{line.substring(2)}</h2>;
                  if (line.startsWith('## ')) return <h3 key={idx} className="text-xl font-bold mt-4 mb-2">{line.substring(3)}</h3>;
                  if (line.startsWith('### ')) return <h4 key={idx} className="text-lg font-semibold mt-3 mb-2">{line.substring(4)}</h4>;
                  if (line.startsWith('✓ ')) return <p key={idx} className="text-green-700 bg-green-50 p-3 rounded border-l-4 border-green-500 my-2">{line.substring(2)}</p>;
                  if (line.startsWith('❌ ')) return <p key={idx} className="text-red-700 bg-red-50 p-3 rounded border-l-4 border-red-500 my-2">{line.substring(2)}</p>;
                  if (line.match(/^\d+\./)) return <li key={idx} className="ml-4">{line}</li>;
                  if (line.startsWith('- ')) return <li key={idx} className="ml-6">{line.substring(2)}</li>;
                  if (line.trim()) return <p key={idx} className="my-2">{line}</p>;
                  return <br key={idx} />;
                })}
              </div>
              <Button onClick={handleCompleteContent} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Continue to Quiz <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {currentStep === "quiz" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Knowledge Check</h3>
              {selectedTutorial.quiz.map((q, qIdx) => (
                <Card key={qIdx} className="border-indigo-200">
                  <CardContent className="p-4">
                    <p className="font-medium mb-3">{qIdx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                            quizSubmitted
                              ? oIdx === q.correct
                                ? 'border-green-500 bg-green-50'
                                : quizAnswers[qIdx] === oIdx
                                ? 'border-red-500 bg-red-50'
                                : 'border-slate-200'
                              : quizAnswers[qIdx] === oIdx
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:border-indigo-300'
                          }`}
                          onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {!quizSubmitted ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizAnswers).length !== selectedTutorial.quiz.length}
                  className="w-full"
                >
                  Submit Quiz
                </Button>
              ) : (
                <Card className={`border-2 ${
                  (Object.keys(quizAnswers).reduce((acc, idx) => acc + (quizAnswers[idx] === selectedTutorial.quiz[idx].correct ? 1 : 0), 0) / selectedTutorial.quiz.length * 100) >= 80
                    ? 'border-green-300 bg-green-50'
                    : 'border-orange-300 bg-orange-50'
                }`}>
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-semibold mb-2">
                      Score: {Math.round((Object.keys(quizAnswers).reduce((acc, idx) => acc + (quizAnswers[idx] === selectedTutorial.quiz[idx].correct ? 1 : 0), 0) / selectedTutorial.quiz.length) * 100)}%
                    </p>
                    <p className="text-sm text-slate-700">
                      {(Object.keys(quizAnswers).reduce((acc, idx) => acc + (quizAnswers[idx] === selectedTutorial.quiz[idx].correct ? 1 : 0), 0) / selectedTutorial.quiz.length * 100) >= 80
                        ? '🎉 Congratulations! Tutorial completed.'
                        : '📚 Review the material and try again to score 80% or higher.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {TUTORIALS.map((tutorial, idx) => {
        const isCompleted = completedTutorials.includes(tutorial.id);
        const isLocked = idx > 0 && !completedTutorials.includes(TUTORIALS[idx - 1].id);

        return (
          <Card key={tutorial.id} className={`${isCompleted ? 'border-green-300 bg-green-50' : isLocked ? 'opacity-50' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{tutorial.title}</h3>
                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {isLocked && <Lock className="w-5 h-5 text-slate-400" />}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{tutorial.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{tutorial.difficulty}</Badge>
                    <Badge variant="outline">{tutorial.duration}</Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-medium mb-1">Topics covered:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {tutorial.topics.slice(0, 3).map((topic, i) => (
                        <li key={i}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={() => handleStartTutorial(tutorial)}
                  disabled={isLocked}
                  className="flex-shrink-0"
                >
                  {isCompleted ? 'Review' : 'Start'} <PlayCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}