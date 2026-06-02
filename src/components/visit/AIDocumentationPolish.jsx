import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AIDocumentationPolish({ narrativeText, onPolishedTextGenerated }) {
  const [isPolishing, setIsPolishing] = useState(false);
  const [hasPolished, setHasPolished] = useState(false);

  const polishDocumentation = async () => {
    if (!narrativeText || narrativeText.trim().length < 50) {
      toast.error("Please add more documentation before polishing.");
      return;
    }

    setIsPolishing(true);

    try {
      const prompt = `You are Penn Sync AI, an expert clinical documentation specialist. Your task is to polish and improve the following clinical narrative while maintaining all clinical accuracy and factual content.

ORIGINAL DOCUMENTATION:
${narrativeText}

POLISHING INSTRUCTIONS:
1. Fix grammar, spelling, and punctuation errors
2. Improve sentence structure and flow
3. Ensure proper medical terminology usage
4. Remove filler words and redundancies
5. Ensure professional, clinical tone
6. Maintain chronological organization
7. Keep all clinical facts and observations intact
8. Ensure Medicare compliance language is present
9. Add proper section headers if missing
10. Ensure consistency in tense and perspective

CRITICAL RULES:
- DO NOT add, remove, or modify any clinical facts, observations, or data
- DO NOT change vital signs, measurements, or patient responses
- DO NOT add information that wasn't in the original
- ONLY improve grammar, clarity, and professional presentation
- Maintain all section headers and structure

Generate the polished version now:`;

      const polishedText = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      onPolishedTextGenerated(polishedText);
      setHasPolished(true);

      setTimeout(() => setHasPolished(false), 3000);

    } catch (error) {
      console.error("Error polishing documentation:", error);
      toast.error("Error polishing documentation. Please try again.");
    }

    setIsPolishing(false);
  };

  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Penn Sync Documentation Polish
            <Badge variant="outline" className="bg-white">Saves 5-8 min</Badge>
          </CardTitle>
          <Button
            onClick={polishDocumentation}
            disabled={isPolishing || !narrativeText || narrativeText.length < 50}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPolishing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Polishing...
              </>
            ) : hasPolished ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Polished!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Polish Note
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="bg-white border-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <AlertDescription className="text-slate-700">
            Penn Sync AI will automatically improve grammar, fix errors, enhance clarity, and ensure professional formatting - while keeping all clinical facts intact.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}