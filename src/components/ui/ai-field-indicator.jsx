import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AIFieldIndicator({ 
  confidence, 
  source = "AI Generated",
  needsVerification = false,
  tooltip 
}) {
  if (needsVerification) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Verify
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tooltip || "Please verify this AI-generated field"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const confidenceColor = confidence >= 90 
    ? "bg-green-50 text-green-700 border-green-300"
    : confidence >= 70
    ? "bg-blue-50 text-blue-700 border-blue-300"
    : "bg-yellow-50 text-yellow-700 border-yellow-300";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${confidenceColor} text-xs`}>
            <Sparkles className="w-3 h-3 mr-1" />
            {source}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {tooltip || `AI generated with ${confidence}% confidence`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}