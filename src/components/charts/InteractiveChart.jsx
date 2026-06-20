import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHART_COLORS as COLORS } from "@/constants/chartColors";

export default function InteractiveChart({
  type = "bar",
  data,
  title,
  dataKey,
  xAxisKey = "name",
  yAxisKey = "value",
  onDrillDown,
  drillDownLabel = "View Details",
  showLegend = true,
  height = 300,
  colors = COLORS,
  customTooltip
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    if (customTooltip) {
      return customTooltip({ active, payload, label });
    }

    return (
      <Card className="shadow-lg border border-slate-200">
        <CardContent className="p-3">
          <p className="font-semibold text-sm mb-2 text-slate-900">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-bold">{entry.value?.toLocaleString?.() || entry.value}</span>
            </div>
          ))}
          {onDrillDown && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full text-xs"
              onClick={() => onDrillDown(payload[0]?.payload)}
            >
              <ZoomIn className="w-3 h-3 mr-1" />
              {drillDownLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleBarClick = (data) => {
    if (onDrillDown) {
      onDrillDown(data);
    }
  };

  const renderChart = (containerHeight = height) => {
    const chartProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={containerHeight}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Bar
                dataKey={dataKey || yAxisKey}
                fill={colors[0]}
                radius={[8, 8, 0, 0]}
                onClick={handleBarClick}
                cursor={onDrillDown ? "pointer" : "default"}
                onMouseEnter={(data) => setHoveredItem(data)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredItem === entry ? colors[1] : colors[0]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={containerHeight}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey={dataKey || yAxisKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0], r: 4 }}
                activeDot={{ r: 6, onClick: handleBarClick, cursor: onDrillDown ? "pointer" : "default" }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={containerHeight}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry[xAxisKey]}: ${entry[yAxisKey]}`}
                outerRadius={containerHeight / 3}
                fill="#8884d8"
                dataKey={dataKey || yAxisKey}
                onClick={handleBarClick}
                cursor={onDrillDown ? "pointer" : "default"}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              title="Expand chart"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh]">
            {renderChart(500)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}