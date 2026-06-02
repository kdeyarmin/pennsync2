import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';

export default function ReportFilters({
  onFilterChange,
  businessLineOptions = [],
  isAdmin = false,
  isSuperAdmin = false,
  showBusinessLine = true,
  showDateRange = true,
  showEmployee = true,
  showCourse = true,
  showPlan = true,
  showStatus = true,
  planOptions = [],
  onExport
}) {
  const [filters, setFilters] = useState({
    businessLine: isAdmin && !isSuperAdmin ? (businessLineOptions[0]?.value || 'home_health') : 'home_health',
    dateStart: '',
    dateEnd: '',
    employee: '',
    course: '',
    plan: '',
    status: 'all'
  });

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  return (
    <Card className="mb-6 bg-white border-l-4 border-l-blue-600">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {showBusinessLine && (
            <div>
              <label className="text-sm font-medium text-slate-700">Business Line</label>
              <Select 
                value={filters.businessLine}
                onValueChange={(value) => handleFilterChange('businessLine', value)}
                disabled={isAdmin && !isSuperAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessLineOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showDateRange && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">From Date</label>
                <Input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">To Date</label>
                <Input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                />
              </div>
            </>
          )}

          {showEmployee && (
            <div>
              <label className="text-sm font-medium text-slate-700">Employee Name</label>
              <Input
                placeholder="Search employee..."
                value={filters.employee}
                onChange={(e) => handleFilterChange('employee', e.target.value)}
              />
            </div>
          )}

          {showCourse && (
            <div>
              <label className="text-sm font-medium text-slate-700">Course</label>
              <Input
                placeholder="Search course..."
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
              />
            </div>
          )}

          {showPlan && planOptions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Learning Plan</label>
              <Select value={filters.plan} onValueChange={(value) => handleFilterChange('plan', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Plans</SelectItem>
                  {planOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showStatus && (
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {onExport && (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('pdf')}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}