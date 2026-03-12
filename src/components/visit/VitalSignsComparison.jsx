import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VitalSignsComparison({ currentVitals, previousVitals }) {
  if (!previousVitals || Object.keys(previousVitals).length === 0) {
    return null;
  }

  const comparisons = [];

  const compareValue = (current, previous, label, unit = "", lowerIsBetter = false) => {
    if (current && previous) {
      const diff = current - previous;
      const percentChange = ((diff / previous) * 100).toFixed(1);
      
      let trend = "stable";
      let icon = Minus;
      let color = "text-gray-500";
      
      if (Math.abs(diff) > 0.1) {
        if (diff > 0) {
          trend = lowerIsBetter ? "worsened" : "improved";
          icon = TrendingUp;
          color = lowerIsBetter ? "text-red-500" : "text-green-500";
        } else {
          trend = lowerIsBetter ? "improved" : "worsened";
          icon = TrendingDown;
          color = lowerIsBetter ? "text-green-500" : "text-red-500";
        }
      }

      return {
        label,
        current: `${current}${unit}`,
        previous: `${previous}${unit}`,
        diff: diff > 0 ? `+${diff.toFixed(1)}${unit}` : `${diff.toFixed(1)}${unit}`,
        percentChange: `${percentChange}%`,
        trend,
        icon,
        color
      };
    }
    return null;
  };

  // Blood Pressure
  if (currentVitals.blood_pressure_systolic && previousVitals.blood_pressure_systolic) {
    const systolic = compareValue(
      currentVitals.blood_pressure_systolic, 
      previousVitals.blood_pressure_systolic, 
      "BP Systolic", 
      " mmHg",
      true
    );
    if (systolic) comparisons.push(systolic);
  }

  if (currentVitals.blood_pressure_diastolic && previousVitals.blood_pressure_diastolic) {
    const diastolic = compareValue(
      currentVitals.blood_pressure_diastolic, 
      previousVitals.blood_pressure_diastolic, 
      "BP Diastolic", 
      " mmHg",
      true
    );
    if (diastolic) comparisons.push(diastolic);
  }

  // Other vitals
  const vitalMappings = [
    { key: "heart_rate", label: "Heart Rate", unit: " bpm", lowerIsBetter: false },
    { key: "respiratory_rate", label: "Respiratory Rate", unit: " /min", lowerIsBetter: false },
    { key: "oxygen_saturation", label: "O2 Saturation", unit: "%", lowerIsBetter: false },
    { key: "temperature", label: "Temperature", unit: "°F", lowerIsBetter: false },
    { key: "pain_level", label: "Pain Level", unit: "/10", lowerIsBetter: true },
  ];

  vitalMappings.forEach(({ key, label, unit, lowerIsBetter }) => {
    const comparison = compareValue(
      currentVitals[key],
      previousVitals[key],
      label,
      unit,
      lowerIsBetter
    );
    if (comparison) comparisons.push(comparison);
  });

  if (comparisons.length === 0) return null;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Comparison to Previous Visit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comparisons.map((comp, index) => {
            const Icon = comp.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{comp.label}</span>
                  <Icon className={`w-4 h-4 ${comp.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900">{comp.current}</span>
                  <span className="text-xs text-gray-500">was {comp.previous}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      comp.trend === "improved" ? "border-green-300 text-green-700" :
                      comp.trend === "worsened" ? "border-red-300 text-red-700" :
                      "border-gray-300 text-gray-700"
                    }`}
                  >
                    {comp.diff}
                  </Badge>
                  <span className="text-xs text-gray-500">{comp.trend}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}