import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VitalSignsComparison({ currentVitals, previousVitals }) {
  if (!previousVitals || Object.keys(previousVitals).length === 0) {
    return null;
  }

  const comparisons = [];

  // Vital signs have an optimal RANGE, not a monotonic "higher/lower is better"
  // direction — a rising temperature, heart rate, or respiratory rate is NOT an
  // improvement. Clinical interpretation is whether the value moved toward the
  // normal range (improved) or away from it (worsened). Ranges below are the
  // standard adult reference ranges; pain is best at 0.
  const NORMAL_RANGES = {
    "BP Systolic": [90, 120],
    "BP Diastolic": [60, 80],
    "Heart Rate": [60, 100],
    "Respiratory Rate": [12, 20],
    "O2 Saturation": [95, 100],
    "Temperature": [97, 99.5],
    "Pain Level": [0, 0],
  };

  // How far a value sits outside its normal range (0 when within range).
  const distanceFromRange = (value, [low, high]) => {
    if (value < low) return low - value;
    if (value > high) return value - high;
    return 0;
  };

  const compareValue = (current, previous, label, unit = "") => {
    if (current && previous) {
      const diff = current - previous;
      const percentChange = ((diff / previous) * 100).toFixed(1);

      let trend = "stable";
      let icon = Minus;
      let color = "text-slate-500";

      if (Math.abs(diff) > 0.1) {
        // Direction icon reflects whether the reading rose or fell.
        icon = diff > 0 ? TrendingUp : TrendingDown;

        // Improvement is movement toward the normal range, away from it is a
        // worsening. Falls back to direction-only (neutral) when no range is
        // defined for the vital.
        const range = NORMAL_RANGES[label];
        if (range) {
          const beforeDist = distanceFromRange(previous, range);
          const afterDist = distanceFromRange(current, range);
          if (afterDist < beforeDist - 0.1) {
            trend = "improved";
            color = "text-green-500";
          } else if (afterDist > beforeDist + 0.1) {
            trend = "worsened";
            color = "text-red-500";
          }
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
      " mmHg"
    );
    if (systolic) comparisons.push(systolic);
  }

  if (currentVitals.blood_pressure_diastolic && previousVitals.blood_pressure_diastolic) {
    const diastolic = compareValue(
      currentVitals.blood_pressure_diastolic,
      previousVitals.blood_pressure_diastolic,
      "BP Diastolic",
      " mmHg"
    );
    if (diastolic) comparisons.push(diastolic);
  }

  // Other vitals (trend direction is interpreted against each vital's normal
  // range inside compareValue — see NORMAL_RANGES above).
  const vitalMappings = [
    { key: "heart_rate", label: "Heart Rate", unit: " bpm" },
    { key: "respiratory_rate", label: "Respiratory Rate", unit: " /min" },
    { key: "oxygen_saturation", label: "O2 Saturation", unit: "%" },
    { key: "temperature", label: "Temperature", unit: "°F" },
    { key: "pain_level", label: "Pain Level", unit: "/10" },
  ];

  vitalMappings.forEach(({ key, label, unit }) => {
    const comparison = compareValue(
      currentVitals[key],
      previousVitals[key],
      label,
      unit
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
                  <span className="text-sm font-medium text-slate-700">{comp.label}</span>
                  <Icon className={`w-4 h-4 ${comp.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900">{comp.current}</span>
                  <span className="text-xs text-slate-500">was {comp.previous}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      comp.trend === "improved" ? "border-green-300 text-green-700" :
                      comp.trend === "worsened" ? "border-red-300 text-red-700" :
                      "border-slate-300 text-slate-700"
                    }`}
                  >
                    {comp.diff}
                  </Badge>
                  <span className="text-xs text-slate-500">{comp.trend}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}