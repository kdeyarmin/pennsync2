import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Settings, AlertCircle } from "lucide-react";

const PRESET_TARGETS = {
  standard: { value: 85, label: "Standard (85%)", description: "Medicare baseline compliance" },
  high: { value: 90, label: "High (90%)", description: "Recommended for quality measures" },
  excellence: { value: 95, label: "Excellence (95%)", description: "Audit-ready documentation" },
  perfect: { value: 100, label: "Perfect (100%)", description: "Zero-defect standard" }
};

export default function ComplianceTargetSettings({ 
  currentTarget = 90, 
  onTargetChange,
  visitType 
}) {
  const [target, setTarget] = useState(currentTarget);
  const [preset, setPreset] = useState(
    Object.entries(PRESET_TARGETS).find(([_k, v]) => v.value === currentTarget)?.[0] || 'custom'
  );
  const [showSettings, setShowSettings] = useState(false);

  const handlePresetChange = (presetKey) => {
    setPreset(presetKey);
    if (presetKey !== 'custom') {
      const newTarget = PRESET_TARGETS[presetKey].value;
      setTarget(newTarget);
      onTargetChange?.(newTarget);
    }
  };

  const handleCustomTarget = (value) => {
    setTarget(value[0]);
    setPreset('custom');
    onTargetChange?.(value[0]);
  };

  const getVisitTypeRecommendation = () => {
    const recommendations = {
      admission: { target: 95, reason: "SOC requires comprehensive documentation" },
      recertification: { target: 95, reason: "ROC requires detailed progress documentation" },
      discharge: { target: 90, reason: "DC requires outcome documentation" },
      routine_visit: { target: 85, reason: "Standard skilled visit documentation" },
      prn: { target: 85, reason: "PRN visit with skilled need justification" }
    };
    return recommendations[visitType] || { target: 90, reason: "Comprehensive documentation recommended" };
  };

  const recommendation = getVisitTypeRecommendation();

  return (
    <Card className="border-2 border-indigo-300">
      <CardHeader className="pb-3 bg-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Compliance Target
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-7 px-2"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="text-center p-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg border-2 border-indigo-300">
          <p className="text-xs text-indigo-700 mb-1">Current Target</p>
          <p className="text-3xl font-bold text-indigo-900">{target}%</p>
          <p className="text-xs text-indigo-600 mt-1">
            {PRESET_TARGETS[preset]?.description || "Custom target"}
          </p>
        </div>

        {showSettings && (
          <>
            <div>
              <Label className="text-xs mb-2 block">Preset Targets</Label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_TARGETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label} - {preset.description}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Target</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <div>
                <Label className="text-xs mb-2 block">Custom Target: {target}%</Label>
                <Slider
                  value={[target]}
                  onValueChange={handleCustomTarget}
                  min={70}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>70%</span>
                  <span>85%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900">
                <strong>{visitType.replace('_', ' ').toUpperCase()} Recommendation:</strong> {recommendation.target}%
                <br />
                <span className="text-blue-700">{recommendation.reason}</span>
              </AlertDescription>
            </Alert>

            {target !== recommendation.target && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setTarget(recommendation.target);
                  setPreset(Object.entries(PRESET_TARGETS).find(([_k, v]) => v.value === recommendation.target)?.[0] || 'custom');
                  onTargetChange?.(recommendation.target);
                }}
              >
                Use Recommended Target ({recommendation.target}%)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}