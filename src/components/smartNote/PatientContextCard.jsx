import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Heart,
  Target,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function PatientContextCard({ 
  patient, 
  carePlans = [], 
  recentVisit,
  vitalSigns,
  onClear 
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (!patient) return null;

  const activeCarePlans = carePlans.filter(cp => cp.status === 'active');
  const hasAllergies = patient.allergies && patient.allergies.toLowerCase() !== 'none' && patient.allergies.toLowerCase() !== 'nkda';

  return (
    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-3">
          {/* Main row - always visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {patient.first_name} {patient.last_name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {patient.primary_diagnosis && (
                    <Badge variant="outline" className="text-xs bg-white">
                      <Heart className="w-3 h-3 mr-1 text-red-500" />
                      {patient.primary_diagnosis}
                    </Badge>
                  )}
                  {hasAllergies && (
                    <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Allergies
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick vitals display */}
              <div className="hidden md:flex gap-1">
                {vitalSigns?.bp && (
                  <Badge variant="outline" className="bg-white text-xs">BP: {vitalSigns.bp}</Badge>
                )}
                {vitalSigns?.hr && (
                  <Badge variant="outline" className="bg-white text-xs">HR: {vitalSigns.hr}</Badge>
                )}
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                onClick={onClear}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Allergies */}
              {hasAllergies && (
                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Allergies</p>
                  <p className="text-xs text-red-700">{patient.allergies}</p>
                </div>
              )}

              {/* Active Care Plans */}
              {activeCarePlans.length > 0 && (
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Active Care Plans ({activeCarePlans.length})
                  </p>
                  <ul className="text-xs text-slate-600 space-y-0.5">
                    {activeCarePlans.slice(0, 3).map((cp, idx) => (
                      <li key={idx} className="truncate">• {cp.problem}</li>
                    ))}
                    {activeCarePlans.length > 3 && (
                      <li className="text-blue-600">+{activeCarePlans.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Recent Visit */}
              {recentVisit && (
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1">📋 Last Visit</p>
                  <p className="text-xs text-slate-600">
                    {recentVisit.visit_date} - {recentVisit.visit_type?.replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              {/* Secondary Diagnoses */}
              {patient.secondary_diagnoses?.length > 0 && (
                <div className="bg-white p-2 rounded-lg border border-blue-200 md:col-span-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Other Diagnoses</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.secondary_diagnoses.map((dx, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-slate-50">
                        {dx}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}