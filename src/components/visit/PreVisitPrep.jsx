import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Target,
  FileText
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

export default function PreVisitPrep({ patient, visit, previousVisit, carePlans }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!patient || !visit) return null;

  // Calculate days since last visit
  const daysSinceLastVisit = previousVisit 
    ? differenceInDays(new Date(visit.visit_date), new Date(previousVisit.visit_date))
    : null;

  // Identify active care plans
  const activeCarePlans = carePlans?.filter(cp => cp.status === 'active') || [];

  // Check for alerts
  const alerts = [];
  
  if (daysSinceLastVisit && daysSinceLastVisit > 14) {
    alerts.push({
      type: 'warning',
      message: `${daysSinceLastVisit} days since last visit - expect significant changes`
    });
  }

  if (patient.allergies && patient.allergies !== 'NKDA') {
    alerts.push({
      type: 'critical',
      message: `Allergies: ${patient.allergies}`
    });
  }

  if (activeCarePlans.length > 5) {
    alerts.push({
      type: 'info',
      message: `${activeCarePlans.length} active care plans to assess`
    });
  }

  return (
    <Card className="bg-gradient-to-r from-navy-50 to-blue-50 border-navy-200 mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="w-5 h-5 text-navy-600" />
            Penn Sync Pre-Visit Prep
            <Badge variant="outline" className="bg-white">Ready for visit</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  className={
                    alert.type === 'critical'
                      ? 'bg-red-50 border-red-300'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-blue-50 border-blue-300'
                  }
                >
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      alert.type === 'critical'
                        ? 'text-red-600'
                        : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <AlertDescription
                    className={
                      alert.type === 'critical'
                        ? 'text-red-900'
                        : alert.type === 'warning'
                        ? 'text-yellow-900'
                        : 'text-blue-900'
                    }
                  >
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Accordion type="single" collapsible className="w-full">
            {/* Quick Facts */}
            <AccordionItem value="facts">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Quick Facts
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-slate-600 text-xs">Primary Diagnosis</p>
                    <p className="font-medium text-slate-900">{patient.primary_diagnosis}</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-slate-600 text-xs">Care Type</p>
                    <p className="font-medium text-slate-900 capitalize">
                      {patient.care_type?.replace('_', ' ')}
                    </p>
                  </div>
                  {daysSinceLastVisit && (
                    <div className="p-2 bg-white rounded border">
                      <p className="text-slate-600 text-xs">Last Visit</p>
                      <p className="font-medium text-slate-900">{daysSinceLastVisit} days ago</p>
                    </div>
                  )}
                  <div className="p-2 bg-white rounded border">
                    <p className="text-slate-600 text-xs">Visit Type</p>
                    <p className="font-medium text-slate-900 capitalize">
                      {visit.visit_type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Active Care Plans */}
            {activeCarePlans.length > 0 && (
              <AccordionItem value="careplans">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Active Care Plans ({activeCarePlans.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {activeCarePlans.slice(0, 5).map((plan) => (
                      <div key={plan.id} className="p-3 bg-white rounded border text-sm">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-slate-900">{plan.problem}</p>
                          <Badge variant="outline" className="text-xs">
                            {plan.frequency || 'Each visit'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">Goal: {plan.goal}</p>
                        {plan.target_date && (
                          <p className="text-xs text-slate-500">
                            Target: {format(new Date(plan.target_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Previous Visit Summary */}
            {previousVisit && (
              <AccordionItem value="previous">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Previous Visit Highlights
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-slate-600 mb-1">
                        {format(new Date(previousVisit.visit_date), 'MMMM d, yyyy')}
                      </p>
                      {previousVisit.vital_signs && Object.keys(previousVisit.vital_signs).length > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs font-semibold text-slate-700">Vital Signs:</p>
                          {previousVisit.vital_signs.blood_pressure_systolic && (
                            <p className="text-xs text-slate-600">
                              BP: {previousVisit.vital_signs.blood_pressure_systolic}/
                              {previousVisit.vital_signs.blood_pressure_diastolic}
                            </p>
                          )}
                          {previousVisit.vital_signs.oxygen_saturation && (
                            <p className="text-xs text-slate-600">
                              O2: {previousVisit.vital_signs.oxygen_saturation}%
                            </p>
                          )}
                        </div>
                      )}
                      {previousVisit.nurse_notes && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                          {previousVisit.nurse_notes.substring(0, 200)}...
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <Alert className="bg-white border-navy-200">
            <CheckCircle2 className="w-4 h-4 text-navy-600" />
            <AlertDescription className="text-sm text-slate-700">
              <strong>Penn Sync Ready:</strong> All patient information loaded. Review alerts and care plans before documenting.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}