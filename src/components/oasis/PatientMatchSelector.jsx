import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, User, Calendar } from "lucide-react";

export default function PatientMatchSelector({ 
  extractedName, 
  extractedDOB, 
  matchResults, 
  selectedPatientId, 
  onSelectPatient,
  allPatients 
}) {
  if (!extractedName || !matchResults) return null;

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getConfidenceIcon = (score) => {
    if (score >= 90) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (score >= 70) return <CheckCircle2 className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-orange-600" />;
  };

  const bestMatch = matchResults.matches?.[0];
  const hasAlternatives = matchResults.matches?.length > 1;

  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Patient Matching</span>
        </div>

        {/* Extracted Info */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 mb-2">Extracted from OASIS:</p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {extractedName || <span className="text-red-600">Name not found</span>}
            </p>
            {extractedDOB && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                DOB: {extractedDOB}
              </p>
            )}
          </div>
        </div>

        {/* Best Match */}
        {bestMatch ? (
          <div className={`p-3 rounded-lg border-2 ${getConfidenceColor(bestMatch.confidence)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getConfidenceIcon(bestMatch.confidence)}
                <span className="text-sm font-semibold text-gray-900">
                  {bestMatch.confidence >= 90 ? 'Strong Match' : bestMatch.confidence >= 70 ? 'Likely Match' : 'Possible Match'}
                </span>
              </div>
              <Badge className={getConfidenceColor(bestMatch.confidence)}>
                {bestMatch.confidence}% confidence
              </Badge>
            </div>
            
            <div className="bg-white p-2 rounded border mb-2">
              <p className="font-medium text-gray-900">
                {bestMatch.patient.first_name} {bestMatch.patient.last_name}
              </p>
              {bestMatch.patient.date_of_birth && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  DOB: {bestMatch.patient.date_of_birth}
                  {bestMatch.dobMatch && <CheckCircle2 className="w-3 h-3 text-green-600 ml-1" />}
                </p>
              )}
            </div>

            {/* Match Factors */}
            <div className="text-xs text-gray-700 space-y-1">
              {bestMatch.matchFactors?.map((factor, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  {factor}
                </div>
              ))}
            </div>

            {bestMatch.confidence >= 70 && (
              <Button
                onClick={() => onSelectPatient(bestMatch.patient.id)}
                size="sm"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
              >
                Confirm Match
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-red-800">No matching patient found</p>
          </div>
        )}

        {/* Alternative Matches */}
        {hasAlternatives && (
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-xs font-semibold text-gray-700 mb-2">Other Possible Matches:</p>
            <div className="space-y-2">
              {matchResults.matches.slice(1, 4).map((match, idx) => (
                <div 
                  key={idx}
                  className="bg-white p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSelectPatient(match.patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {match.patient.first_name} {match.patient.last_name}
                      </p>
                      {match.patient.date_of_birth && (
                        <p className="text-xs text-gray-500">DOB: {match.patient.date_of_birth}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {match.confidence}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Override */}
        <div className="border-t pt-3">
          <p className="text-xs text-gray-600 mb-2">Or select manually:</p>
          <Select 
            value={selectedPatientId || "none"} 
            onValueChange={(v) => onSelectPatient(v === "none" ? "" : v)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Choose different patient..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No patient (save standalone)</SelectItem>
              {allPatients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                  {p.date_of_birth && ` - ${p.date_of_birth}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}