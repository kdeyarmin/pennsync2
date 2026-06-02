import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, FileText } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export default function SmartReminders({ patient, visit, allVisits }) {
  const reminders = [];
  const today = new Date();

  // Check for recertification due
  if (patient?.care_type === 'home_health') {
    const admissionVisit = allVisits?.find(v => v.visit_type === 'admission');
    if (admissionVisit) {
      const admissionDate = parseISO(admissionVisit.visit_date);
      const daysSinceAdmission = differenceInDays(today, admissionDate);
      const recertDue = 60 - daysSinceAdmission;
      
      if (recertDue <= 14 && recertDue > 0) {
        reminders.push({
          type: 'recertification',
          priority: recertDue <= 7 ? 'high' : 'medium',
          message: `Recertification due in ${recertDue} days`,
          icon: Calendar,
          color: recertDue <= 7 ? 'red' : 'yellow'
        });
      }
    }
  }

  // Check for gaps in visit schedule
  if (allVisits && allVisits.length > 0) {
    const lastVisit = allVisits[0];
    if (lastVisit && lastVisit.id !== visit?.id) {
      const daysSinceLastVisit = differenceInDays(today, parseISO(lastVisit.visit_date));
      
      if (daysSinceLastVisit > 7) {
        reminders.push({
          type: 'visit_gap',
          priority: 'medium',
          message: `${daysSinceLastVisit} days since last visit`,
          icon: AlertTriangle,
          color: 'yellow'
        });
      }
    }
  }

  // Check for missing vital signs
  if (visit && visit.status !== 'completed' && (!visit.vital_signs || Object.keys(visit.vital_signs).length === 0)) {
    reminders.push({
      type: 'vital_signs',
      priority: 'high',
      message: 'Vital signs not yet documented',
      icon: FileText,
      color: 'orange'
    });
  }

  // Check for patient's upcoming birthday (medication review opportunity)
  if (patient?.date_of_birth) {
    const birthday = new Date(patient.date_of_birth);
    birthday.setFullYear(today.getFullYear());
    const daysUntilBirthday = differenceInDays(birthday, today);
    
    if (daysUntilBirthday >= 0 && daysUntilBirthday <= 30) {
      reminders.push({
        type: 'birthday',
        priority: 'low',
        message: `Patient's birthday in ${daysUntilBirthday} days - consider annual medication review`,
        icon: Calendar,
        color: 'blue'
      });
    }
  }

  if (reminders.length === 0) return null;

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-50 border-red-300',
      yellow: 'bg-yellow-50 border-yellow-300',
      orange: 'bg-orange-50 border-orange-300',
      blue: 'bg-blue-50 border-blue-300'
    };
    return colors[color] || colors.blue;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return styles[priority] || styles.low;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-slate-900">Smart Reminders</h3>
          <Badge variant="outline">{reminders.length}</Badge>
        </div>
        
        <div className="space-y-2">
          {reminders.map((reminder, index) => {
            const Icon = reminder.icon;
            return (
              <Alert key={index} className={getColorClasses(reminder.color)}>
                <Icon className="w-4 h-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm font-medium">{reminder.message}</span>
                  <Badge variant="outline" className={getPriorityBadge(reminder.priority)}>
                    {reminder.priority}
                  </Badge>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}