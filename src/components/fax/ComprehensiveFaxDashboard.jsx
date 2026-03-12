import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, CheckCircle, Clock, DollarSign, Users, FileText, Filter } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ComprehensiveFaxDashboard() {
  const [dateRange, setDateRange] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: faxLogs = [], isLoading } = useQuery({
    queryKey: ['fax-logs-dashboard'],
    queryFn: () => base44.entities.FaxLog.list('-created_date', 1000),
    initialData: []
  });

  const filteredLogs = useMemo(() => {
    let filtered = [...faxLogs];

    // Date range filter
    if (startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      filtered = filtered.filter(log => {
        const date = new Date(log.created_date);
        return date >= start && date <= end;
      });
    } else if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter(log => new Date(log.created_date) >= cutoff);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter(log => log.sent_by === userFilter);
    }

    return filtered;
  }, [faxLogs, dateRange, statusFilter, userFilter, startDate, endDate]);

  const metrics = useMemo(() => {
    const total = filteredLogs.length;
    const delivered = filteredLogs.filter(f => f.status === 'delivered').length;
    const failed = filteredLogs.filter(f => f.status === 'failed').length;
    const pending = filteredLogs.filter(f => ['queued', 'sending', 'sent'].includes(f.status)).length;
    const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : 0;
    
    const totalCost = filteredLogs.reduce((sum, f) => sum + (f.estimated_cost || 0), 0) / 100;
    const totalPages = filteredLogs.reduce((sum, f) => sum + (f.pages || 1), 0);
    const avgCostPerFax = total > 0 ? (totalCost / total).toFixed(2) : 0;
    
    // Calculate average delivery time (for delivered faxes)
    const deliveredFaxes = filteredLogs.filter(f => f.status === 'delivered' && f.updated_date);
    const avgDeliveryTime = deliveredFaxes.length > 0
      ? deliveredFaxes.reduce((sum, f) => {
          const sent = new Date(f.created_date).getTime();
          const delivered = new Date(f.updated_date).getTime();
          return sum + (delivered - sent);
        }, 0) / deliveredFaxes.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      total,
      delivered,
      failed,
      pending,
      successRate,
      failureRate,
      totalCost,
      totalPages,
      avgCostPerFax,
      avgDeliveryTime: avgDeliveryTime.toFixed(1)
    };
  }, [filteredLogs]);

  const volumeTrends = useMemo(() => {
    const grouped = {};
    filteredLogs.forEach(log => {
      const date = format(new Date(log.created_date), 'MMM dd');
      if (!grouped[date]) {
        grouped[date] = { date, total: 0, delivered: 0, failed: 0 };
      }
      grouped[date].total++;
      if (log.status === 'delivered') grouped[date].delivered++;
      if (log.status === 'failed') grouped[date].failed++;
    });
    return Object.values(grouped).slice(-30);
  }, [filteredLogs]);

  const topRecipients = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(log => {
      const key = log.to_name || log.to_number;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filteredLogs]);

  const topSenders = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(log => {
      if (log.sent_by) {
        counts[log.sent_by] = (counts[log.sent_by] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }));
  }, [filteredLogs]);

  const statusDistribution = useMemo(() => {
    const dist = [
      { name: 'Delivered', value: metrics.delivered, color: '#10b981' },
      { name: 'Failed', value: metrics.failed, color: '#ef4444' },
      { name: 'Pending', value: metrics.pending, color: '#f59e0b' }
    ];
    return dist.filter(d => d.value > 0);
  }, [metrics]);

  const priorityDistribution = useMemo(() => {
    const counts = { urgent: 0, normal: 0, low: 0 };
    filteredLogs.forEach(log => {
      counts[log.priority || 'normal']++;
    });
    return [
      { name: 'Urgent', value: counts.urgent, color: '#dc2626' },
      { name: 'Normal', value: counts.normal, color: '#3b82f6' },
      { name: 'Low', value: counts.low, color: '#6b7280' }
    ].filter(d => d.value > 0);
  }, [filteredLogs]);

  const uniqueUsers = useMemo(() => {
    return [...new Set(faxLogs.map(log => log.sent_by).filter(Boolean))];
  }, [faxLogs]);

  const prevPeriodComparison = useMemo(() => {
    if (dateRange === "all" || !dateRange) return null;
    
    const days = parseInt(dateRange);
    const currentPeriodStart = subDays(new Date(), days);
    const prevPeriodStart = subDays(currentPeriodStart, days);
    
    const currentPeriod = faxLogs.filter(log => 
      new Date(log.created_date) >= currentPeriodStart
    );
    const prevPeriod = faxLogs.filter(log => {
      const date = new Date(log.created_date);
      return date >= prevPeriodStart && date < currentPeriodStart;
    });
    
    const currentCount = currentPeriod.length;
    const prevCount = prevPeriod.length;
    const change = prevCount > 0 ? (((currentCount - prevCount) / prevCount) * 100).toFixed(1) : 0;
    
    return { change, isIncrease: change > 0 };
  }, [faxLogs, dateRange]);

  if (isLoading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Quick Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateRange("30");
                  setStatusFilter("all");
                  setUserFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Faxes</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.total}</p>
                {prevPeriodComparison && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${prevPeriodComparison.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                    {prevPeriodComparison.isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(prevPeriodComparison.change)}% vs prev period
                  </div>
                )}
              </div>
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">{metrics.successRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.delivered} delivered</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Delivery Time</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.avgDeliveryTime}</p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-purple-600">${metrics.totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">${metrics.avgCostPerFax} avg/fax</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failed Faxes</span>
                <Badge className="bg-red-100 text-red-800">{metrics.failed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failure Rate</span>
                <span className="font-semibold text-red-600">{metrics.failureRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <Badge className="bg-yellow-100 text-yellow-800">{metrics.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Pages</span>
                <span className="font-semibold">{metrics.totalPages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Pages/Fax</span>
                <span className="font-semibold">{(metrics.totalPages / (metrics.total || 1)).toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">With Cover Page</span>
                <span className="font-semibold">
                  {filteredLogs.filter(f => f.cover_page_details).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unique Recipients</span>
                <span className="font-semibold">{topRecipients.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="font-semibold">{topSenders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Retry Rate</span>
                <span className="font-semibold">
                  {((filteredLogs.filter(f => f.retry_count > 0).length / (metrics.total || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volume Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fax Volume Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volumeTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Recipients and Senders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              Top Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRecipients.map((recipient, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {recipient.name}
                    </span>
                  </div>
                  <Badge variant="outline">{recipient.count} faxes</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              Top Senders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSenders.map((sender, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-600">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {sender.email}
                    </span>
                  </div>
                  <Badge variant="outline">{sender.count} faxes</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}