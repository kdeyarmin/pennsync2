import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Route,
  Users,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import AIScheduleOptimizer from "../components/scheduling/AIScheduleOptimizer";

export default function ScheduleOptimizer() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get visits count for the week
  const { data: weekVisits = [] } = useQuery({
    queryKey: ['weekVisits', selectedDate],
    queryFn: async () => {
      const visits = await base44.entities.Visit.filter({}, '-visit_date', 200);
      return visits;
    },
  });

  // Calculate stats
  const todayVisits = weekVisits.filter(v => v.visit_date === selectedDate);
  const completedToday = todayVisits.filter(v => v.status === 'completed').length;

  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    const newDate = direction === 'next' ? addDays(current, 1) : subDays(current, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          AI Schedule Optimizer
        </h1>
        <p className="text-gray-600">
          Optimize your daily route and schedule with AI-powered planning
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Today's Visits</p>
                <p className="text-3xl font-bold">{todayVisits.length}</p>
              </div>
              <CalendarIcon className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-3xl font-bold">{completedToday}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Remaining</p>
                <p className="text-3xl font-bold">{todayVisits.length - completedToday}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">This Week</p>
                <p className="text-3xl font-bold">{weekVisits.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={new Date(selectedDate)}
                onSelect={(date) => date && setSelectedDate(format(date, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
        >
          Today
        </Button>
      </div>

      {/* Main Optimizer */}
      <AIScheduleOptimizer
        nurseEmail={currentUser?.email}
        selectedDate={selectedDate}
      />

      {/* Tips Card */}
      <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="w-4 h-4 text-indigo-600" />
            How AI Optimization Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <ul className="space-y-1">
            <li>• <strong>Route Planning:</strong> Groups geographically close patients to minimize driving</li>
            <li>• <strong>Acuity Priority:</strong> High-acuity patients are scheduled earlier when you're fresh</li>
            <li>• <strong>Duration Learning:</strong> Uses your historical visit times to estimate accurately</li>
            <li>• <strong>Conflict Detection:</strong> Flags overloads, impossible routes, and scheduling issues</li>
            <li>• <strong>Feedback Learning:</strong> Your feedback improves future suggestions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}