import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function RiskTrendVisualizer({ trends }) {
  if (!trends || Object.keys(trends).length === 0) {
    return null;
  }

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-slate-600" />;
  };

  const getTrendColor = (trend, key) => {
    // For certain vitals, decreasing is bad
    const badIfDecreasing = ['oxygen_saturation', 'weight'];
    const goodIfDecreasing = ['blood_pressure_systolic', 'pain_level', 'heart_rate'];
    
    if (trend === 'increasing') {
      if (badIfDecreasing.includes(key)) return 'text-green-600 bg-green-50';
      if (goodIfDecreasing.includes(key)) return 'text-red-600 bg-red-50';
    }
    if (trend === 'decreasing') {
      if (badIfDecreasing.includes(key)) return 'text-red-600 bg-red-50';
      if (goodIfDecreasing.includes(key)) return 'text-green-600 bg-green-50';
    }
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-navy-600" />
          Vital Sign Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend Summary */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(trends).map(([key, data]) => (
            <div key={key} className={`p-3 rounded-lg border ${getTrendColor(data.trend, key)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{key.replace(/_/g, ' ').toUpperCase()}</span>
                {getTrendIcon(data.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{data.current_avg}</span>
                <span className="text-xs">
                  ({data.change > 0 ? '+' : ''}{data.change})
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart for most critical trend */}
        {Object.entries(trends).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              {Object.keys(trends)[0].replace(/_/g, ' ').toUpperCase()} History
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={Object.values(trends)[0].values}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}