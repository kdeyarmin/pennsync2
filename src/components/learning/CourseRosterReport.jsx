import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReportFilters from './ReportFilters';

export default function CourseRosterReport() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [filters, setFilters] = useState({
    businessLine: 'home_health',
    dateStart: '',
    dateEnd: '',
    status: 'all'
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.TrainingCourse.filter({ status: 'published' }, 'title'),
    initialData: []
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['roster', selectedCourse, filters],
    queryFn: () => selectedCourse
      ? base44.entities.TrainingAssignment.filter({ course_id: selectedCourse }, '-created_date', 500)
      : [],
    initialData: [],
    enabled: !!selectedCourse
  });

  const statusColors = {
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      <ReportFilters
        onFilterChange={setFilters}
        businessLineOptions={[
          { value: 'home_health', label: 'Home Health' },
          { value: 'hospice', label: 'Hospice' }
        ]}
        showCourse={false}
        showPlan={false}
      />

      {/* Course Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Roster ({roster.length} enrolled)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.assigned_to_user_id}</TableCell>
                    <TableCell>{new Date(assignment.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>{assignment.due_date || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[assignment.status]}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.completion_date ? new Date(assignment.completion_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{assignment.score || '-'}</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}