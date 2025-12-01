import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";

export default function VitalSignsForm({ vitalSigns, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...vitalSigns,
      [field]: value ? parseFloat(value) : null
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="temperature">Temperature (°F)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="98.6"
              value={vitalSigns.temperature || ''}
              onChange={(e) => handleChange('temperature', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bp_systolic">BP Systolic</Label>
            <Input
              id="bp_systolic"
              type="number"
              placeholder="120"
              value={vitalSigns.blood_pressure_systolic || ''}
              onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bp_diastolic">BP Diastolic</Label>
            <Input
              id="bp_diastolic"
              type="number"
              placeholder="80"
              value={vitalSigns.blood_pressure_diastolic || ''}
              onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="heart_rate">Heart Rate</Label>
            <Input
              id="heart_rate"
              type="number"
              placeholder="72"
              value={vitalSigns.heart_rate || ''}
              onChange={(e) => handleChange('heart_rate', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="respiratory_rate">Respiratory Rate</Label>
            <Input
              id="respiratory_rate"
              type="number"
              placeholder="16"
              value={vitalSigns.respiratory_rate || ''}
              onChange={(e) => handleChange('respiratory_rate', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="oxygen_saturation">O2 Saturation (%)</Label>
            <Input
              id="oxygen_saturation"
              type="number"
              placeholder="98"
              value={vitalSigns.oxygen_saturation || ''}
              onChange={(e) => handleChange('oxygen_saturation', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pain_level">Pain Level (0-10)</Label>
            <Input
              id="pain_level"
              type="number"
              min="0"
              max="10"
              placeholder="0"
              value={vitalSigns.pain_level || ''}
              onChange={(e) => handleChange('pain_level', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}