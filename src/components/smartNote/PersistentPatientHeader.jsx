import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, AlertTriangle, Heart, Pill } from "lucide-react";

export default function PersistentPatientHeader({ patient, vitalSigns, carePlansCount }) {
  if (!patient) return null;

  const hasAbnormalVitals = vitalSigns && (
    (vitalSigns.pain && parseInt(vitalSigns.pain) >= 7) ||
    (vitalSigns.o2 && parseInt(vitalSigns.o2) < 92)
  );

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm -mx-4 md:-mx-8 px-4 md:px-8 py-2 mb-4">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h2>
            <p className="text-xs text-gray-600">{patient.primary_diagnosis || 'No diagnosis'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {patient.allergies && patient.allergies !== 'NKDA' && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs gap-1">
              <AlertTriangle className="w-3 h-3" />
              {patient.allergies.length > 15 ? patient.allergies.substring(0, 15) + '...' : patient.allergies}
            </Badge>
          )}
          
          {vitalSigns?.bp && (
            <Badge variant="outline" className={`text-xs gap-1 ${hasAbnormalVitals ? 'border-orange-300 bg-orange-50' : ''}`}>
              <Heart className="w-3 h-3" />
              {vitalSigns.bp} {vitalSigns.hr && `| ${vitalSigns.hr}`}
            </Badge>
          )}

          {carePlansCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {carePlansCount} Care Plan{carePlansCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}