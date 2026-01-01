import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ConfidenceBadge, { ConfidenceProgressBar } from "@/components/ui/confidence-badge";
import { AlertCircle, CheckCircle2, User, XCircle } from "lucide-react";

export default function PatientMatchReview({ referral, onConfirmMatch, onCreateNew, onClose }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const matchAnalysis = referral.match_analysis;

  if (!matchAnalysis) return null;

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-yellow-50 border-yellow-300">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <AlertDescription className="text-yellow-900">
          <strong>Patient Match Requires Review</strong>
          <p className="mt-1 text-sm">
            The AI system found potential matches but couldn't determine with high confidence. 
            Please review the suggestions below and choose the best option.
          </p>
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-blue-300">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            AI Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-gray-600">Confidence Level</span>
                <div className="mt-1">
                  <Badge className={getConfidenceColor(matchAnalysis.confidence_level) + " text-sm"}>
                    {matchAnalysis.confidence_level.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Confidence Score</span>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          matchAnalysis.confidence_score >= 80 ? "bg-green-500" :
                          matchAnalysis.confidence_score >= 60 ? "bg-yellow-500" :
                          "bg-orange-500"
                        }`}
                        style={{ width: `${matchAnalysis.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold">{Math.round(matchAnalysis.confidence_score)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <span className="text-sm font-medium text-gray-900">AI Reasoning:</span>
              <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded">{matchAnalysis.reasoning}</p>
            </div>

            {matchAnalysis.match_factors && matchAnalysis.match_factors.length > 0 && (
              <div>
                <span className="text-sm font-medium text-green-700">Supporting Evidence:</span>
                <ul className="list-disc list-inside mt-1 text-sm text-gray-700 space-y-1">
                  {matchAnalysis.match_factors.map((factor, i) => (
                    <li key={i} className="text-green-600">{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {matchAnalysis.alternative_matches && matchAnalysis.alternative_matches.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Potential Matches ({matchAnalysis.alternative_matches.length})</h3>
          
          {matchAnalysis.alternative_matches.map((match, index) => (
            <Card
              key={match.patient_id}
              className={`cursor-pointer transition-all ${
                selectedMatch === match.patient_id
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'hover:border-blue-300'
              }`}
              onClick={() => setSelectedMatch(match.patient_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{match.patient_name || `Match Option ${index + 1}`}</span>
                      <Badge 
                        variant="outline"
                        className={
                          match.confidence_score >= 80 ? "bg-green-100 text-green-700 border-green-300" :
                          match.confidence_score >= 60 ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                          "bg-orange-100 text-orange-700 border-orange-300"
                        }
                      >
                        {Math.round(match.confidence_score)}% match
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-700 space-y-2">
                      <p className="text-xs text-gray-500"><strong>Patient ID:</strong> {match.patient_id}</p>
                      
                      <div>
                        <strong className="text-green-700">✓ Matching Factors:</strong>
                        <ul className="list-disc list-inside mt-1 text-xs space-y-1 text-gray-600">
                          {match.reasons?.map((reason, i) => (
                            <li key={i} className="text-green-700">{reason}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {match.discrepancies && match.discrepancies.length > 0 && (
                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <strong className="text-orange-700 text-xs">⚠️ Discrepancies:</strong>
                          <ul className="list-disc list-inside mt-1 text-xs space-y-1 text-orange-600">
                            {match.discrepancies.map((disc, i) => (
                              <li key={i}>{disc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedMatch === match.patient_id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {matchAnalysis.discrepancies && matchAnalysis.discrepancies.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <strong className="text-red-900">Discrepancies Found:</strong>
            <ul className="list-disc list-inside mt-2 text-sm text-red-800 space-y-1">
              {matchAnalysis.discrepancies.map((disc, i) => (
                <li key={i}>{disc}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={() => selectedMatch && onConfirmMatch(selectedMatch)}
          disabled={!selectedMatch}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Confirm Selected Match
        </Button>
        <Button
          onClick={onCreateNew}
          variant="outline"
          className="flex-1"
        >
          <User className="w-4 h-4 mr-2" />
          Create New Patient
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}