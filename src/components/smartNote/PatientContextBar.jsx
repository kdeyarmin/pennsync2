import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Heart,
  AlertTriangle,
  Activity
} from "lucide-react";

export default function PatientContextBar({ patient, carePlans = [] }) {
  if (!patient) {
    return (
      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-3 text-center text-slate-500 text-sm">
          Select a patient to see their context
        </CardContent>
      </Card>
    );
  }

  const activeCarePlans = carePlans.filter(cp => cp.status === 'active');

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Patient Avatar */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold truncate">
                {patient.first_name} {patient.last_name}
              </h3>
              <Badge className="bg-white/20 text-white text-xs">
                {patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
              </Badge>
            </div>

            {/* Key Info Row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-100">
              {patient.primary_diagnosis && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{patient.primary_diagnosis}</span>
                </div>
              )}
              {patient.allergies && patient.allergies !== 'NKDA' && (
                <div className="flex items-center gap-1 text-yellow-200">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{patient.allergies}</span>
                </div>
              )}
            </div>

            {/* Active Care Plans */}
            {activeCarePlans.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Activity className="w-3 h-3 text-blue-200" />
                <span className="text-blue-200">Active Goals:</span>
                <div className="flex gap-1 overflow-x-auto">
                  {activeCarePlans.slice(0, 3).map((cp, idx) => (
                    <Badge key={idx} className="bg-white/10 text-white text-xs whitespace-nowrap">
                      {cp.problem?.substring(0, 25)}{cp.problem?.length > 25 ? '...' : ''}
                    </Badge>
                  ))}
                  {activeCarePlans.length > 3 && (
                    <Badge className="bg-white/10 text-white text-xs">
                      +{activeCarePlans.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}