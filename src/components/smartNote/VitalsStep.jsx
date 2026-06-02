import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2 } from "lucide-react";

export default function VitalsStep({
  vitalSigns, onVitalsChange,
  isCollapsed, onToggleCollapse, currentStep
}) {
  const handleChange = (field, value) => {
    onVitalsChange({ ...vitalSigns, [field]: value });
  };

  return (
    <Card id="step-vitals" className={`border-2 transition-all duration-300 ${currentStep === 'vitals' ? 'border-green-500 shadow-lg' : 'border-slate-300'}`}>
      <CardHeader 
        className={`py-4 md:py-5 cursor-pointer ${currentStep === 'vitals' ? 'bg-gradient-to-r from-green-100 to-emerald-100' : 'bg-slate-50'}`}
        onClick={() => isCollapsed && onToggleCollapse()}
      >
        <CardTitle className="text-base md:text-lg flex items-center gap-3">
          <div className={`p-2 rounded-full ${(vitalSigns.bp_systolic || vitalSigns.hr) ? 'bg-green-500' : 'bg-slate-400'}`}>
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span>2. Vitals</span>
          {(vitalSigns.bp_systolic || vitalSigns.hr) && (
            <span className="text-sm text-slate-600 ml-2">BP: {vitalSigns.bp_systolic}{vitalSigns.bp_diastolic ? '/' + vitalSigns.bp_diastolic : ''} | HR: {vitalSigns.hr || '-'}</span>
          )}
          {(vitalSigns.bp_systolic || vitalSigns.hr) && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['bp_systolic', 'bp_diastolic', 'hr', 'temp'].map(field => (
              <div key={field}>
                <Label className="text-xs mb-1 block">{
                  field === 'bp_systolic' ? 'BP Systolic' :
                  field === 'bp_diastolic' ? 'BP Diastolic' :
                  field === 'hr' ? 'Heart Rate' : 'Temperature'
                }</Label>
                <Input
                  type="text"
                  placeholder={field === 'bp_systolic' ? '120' : field === 'bp_diastolic' ? '80' : field === 'hr' ? '72' : '98.6'}
                  value={vitalSigns[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  inputMode={field === 'temp' ? 'decimal' : 'numeric'}
                  className="text-sm"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs mb-1 block">Pain (0-10)</Label>
              <Input
                type="text"
                placeholder="0"
                value={vitalSigns.pain || ''}
                onChange={(e) => handleChange('pain', e.target.value)}
                inputMode="numeric"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <Label className="text-xs mb-1 block">O2 Saturation</Label>
              <Input
                type="text"
                placeholder="98"
                value={vitalSigns.o2 || ''}
                onChange={(e) => handleChange('o2', e.target.value)}
                inputMode="numeric"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">O2 Source</Label>
              <Select 
                value={vitalSigns.o2Source || 'room_air'} 
                onValueChange={(value) => handleChange('o2Source', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room_air">Room Air</SelectItem>
                  <SelectItem value="on_oxygen">On Oxygen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {vitalSigns.o2Source === 'on_oxygen' && (
              <div>
                <Label className="text-xs mb-1 block">O2 Flow Rate</Label>
                <Input
                  type="text"
                  placeholder="L/min"
                  value={vitalSigns.o2Flow || ''}
                  onChange={(e) => handleChange('o2Flow', e.target.value)}
                  inputMode="decimal"
                  className="text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}