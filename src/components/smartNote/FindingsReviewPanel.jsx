import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, CheckSquare, XCircle, AlertTriangle, Shield, Lightbulb, DollarSign, Target, AlertCircle, HelpCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SEV_STYLE = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-blue-500 bg-blue-50"
};

const SEV_BADGE = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800"
};

const CAT_ICON = { compliance: Shield, quality: Lightbulb, billing: DollarSign, clinical: Target };
const CAT_COLOR = { compliance: "text-orange-600", quality: "text-blue-600", billing: "text-green-600", clinical: "text-purple-600" };

function FindingCard({ finding, selected, onToggle, answers, onAnswerChange }) {
  const [open, setOpen] = useState(finding.severity === "critical" || finding.severity === "high");
  const Icon = CAT_ICON[finding.category] || AlertCircle;

  return (
    <div className={`border-l-4 rounded-lg ${SEV_STYLE[finding.severity] || SEV_STYLE.medium} p-3`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${CAT_COLOR[finding.category] || "text-gray-500"}`} />
              <span className="text-sm font-semibold text-gray-900">{finding.issue}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={`text-xs ${SEV_BADGE[finding.severity] || SEV_BADGE.medium}`}>{finding.severity}</Badge>
              <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600">
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {finding.suggestion && (
            <p className="text-sm text-gray-800 bg-white/80 border border-gray-200 rounded px-2 py-1.5 italic mt-1">
              "{finding.suggestion}"
            </p>
          )}

          {finding.needs_clarification && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Additional information needed:</span>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{finding.question}</p>
              <Textarea
                placeholder="Your response…"
                value={answers?.[finding.id] || ""}
                onChange={e => onAnswerChange(finding.id, e.target.value)}
                className="text-sm min-h-[60px] bg-white border-amber-300 focus:border-indigo-400"
              />
            </div>
          )}

          {open && (
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              {finding.rationale && <p>{finding.rationale}</p>}
              {finding.revenue_impact && <p className="text-green-700 font-medium">💰 {finding.revenue_impact}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FindingsReviewPanel({ analysis, selected, onToggle, answers, onAnswerChange, needsClarificationFindings, criticalFindings, onSelectAll, onSelectNone, onSelectByType }) {
  const calculateRevenueImpact = () => {
    if (!analysis) return 0;
    return analysis.findings
      .filter(f => selected.has(f.id))
      .reduce((sum, f) => {
        const match = f.revenue_impact?.match(/\$?([\d,]+)/);
        return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
      }, 0);
  };

  const totalRevenueImpact = calculateRevenueImpact();

  return (
    <div className="space-y-4">
      {criticalFindings.length > 0 && (
        <Alert className="border-red-300 bg-red-50 py-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            {criticalFindings.length} critical Medicare compliance element{criticalFindings.length > 1 ? "s" : ""} — required for payment and audit protection.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Review Suggested Additions</p>
            <p className="text-xs text-gray-500 mt-0.5">Only checked items will be included in the final note</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSelectAll}>
            <CheckSquare className="w-3.5 h-3.5" /> All
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSelectNone}>
            <XCircle className="w-3.5 h-3.5" /> None
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-red-50 border-red-300 text-red-700" onClick={() => onSelectByType("critical")}>
            Critical Only
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-orange-50 border-orange-300 text-orange-700" onClick={() => onSelectByType("high")}>
            High Priority
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-indigo-600 font-medium">{selected.size} of {analysis?.findings?.length || 0} selected</p>
          {totalRevenueImpact > 0 && <p className="text-xs font-semibold text-green-600">💰 +${totalRevenueImpact.toLocaleString()} potential</p>}
        </div>
      </div>

      <div className="space-y-3">
        {analysis?.findings?.map(f => (
          <FindingCard
            key={f.id}
            finding={f}
            selected={selected.has(f.id)}
            onToggle={() => onToggle(f.id)}
            answers={answers}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </div>
    </div>
  );
}