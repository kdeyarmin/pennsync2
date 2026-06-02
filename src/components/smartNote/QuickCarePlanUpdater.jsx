import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

export default function QuickCarePlanUpdater({ 
  _patientId, 
  carePlans = [],
  onCarePlanUpdated 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [progressNote, setProgressNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const activeCarePlans = carePlans.filter(cp => cp.status === 'active');

  if (activeCarePlans.length === 0) {
    return null;
  }

  const handleUpdateProgress = async (carePlan, status, _note) => {
    setUpdating(true);
    try {
      await base44.entities.CarePlan.update(carePlan.id, {
        status: status,
        // Could add progress_notes field to entity
      });
      onCarePlanUpdated && onCarePlanUpdated();
      setEditingId(null);
      setProgressNote("");
    } catch (error) {
      console.error("Error updating care plan:", error);
    }
    setUpdating(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'met': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'not_met': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'revised': return <Edit2 className="w-4 h-4 text-yellow-600" />;
      default: return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader 
        className="py-2 px-3 bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600" />
            Care Plan Goals ({activeCarePlans.length})
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-2 space-y-2 max-h-48 overflow-y-auto">
          {activeCarePlans.map((cp) => (
            <div 
              key={cp.id} 
              className="bg-white p-2 rounded border border-slate-200"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {cp.problem}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    Goal: {cp.goal}
                  </p>
                </div>
                {getStatusIcon(cp.status)}
              </div>

              {editingId === cp.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Add progress note..."
                    className="text-xs h-16"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs flex-1"
                      onClick={() => handleUpdateProgress(cp, 'active', progressNote)}
                      disabled={updating}
                    >
                      <Minus className="w-3 h-3 mr-1" />
                      Progressing
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-xs flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleUpdateProgress(cp, 'met', progressNote)}
                      disabled={updating}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Met
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-5 text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-6 text-xs mt-1"
                  onClick={() => {
                    setEditingId(cp.id);
                    setProgressNote("");
                  }}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Update Progress
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}