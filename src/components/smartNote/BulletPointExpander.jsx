import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Sparkles, ArrowRight, Copy } from "lucide-react";

export default function BulletPointExpander({ 
  visitType, 
  diagnosis, 
  patientName,
  onExpanded 
}) {
  const [bullets, setBullets] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandedText, setExpandedText] = useState("");

  const handleExpand = async () => {
    if (!bullets.trim()) return;

    setExpanding(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation assistant. Expand these brief bullet points into a cohesive narrative for a nursing note.

CONTEXT:
- Patient: ${patientName}
- Visit Type: ${visitType}
- Diagnosis: ${diagnosis}

BULLET POINTS:
${bullets}

Transform these into a flowing narrative paragraph that:
1. Uses complete sentences with proper clinical terminology
2. Maintains chronological flow
3. Keeps the nurse's original observations
4. Adds appropriate clinical context
5. Stays factual and objective

Return ONLY the expanded narrative text.`
      });

      setExpandedText(result);
      onExpanded(result);
    } catch (error) {
      console.error('Expansion error:', error);
      alert('Failed to expand bullets. Please try again.');
    }
    setExpanding(false);
  };

  const handleUseExpanded = () => {
    onExpanded(expandedText);
    setBullets("");
    setExpandedText("");
  };

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-indigo-600" />
          Bullet Point Expander
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-white border-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <AlertDescription className="text-xs text-slate-700">
            Type quick bullet points or keywords, and AI will expand them into a comprehensive narrative.
          </AlertDescription>
        </Alert>

        <div>
          <Textarea
            value={bullets}
            onChange={(e) => setBullets(e.target.value)}
            placeholder="Enter bullet points or keywords, e.g.:
- arrived on time
- vitals stable
- wound showing improvement
- patient ambulating with walker
- meds reviewed"
            className="h-32 text-sm"
          />
        </div>

        <Button
          onClick={handleExpand}
          disabled={expanding || !bullets.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
        >
          {expanding ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Expanding...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Expand into Narrative
            </>
          )}
        </Button>

        {expandedText && (
          <div className="space-y-2">
            <div className="bg-white border border-indigo-300 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-900 mb-2">Expanded Narrative:</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{expandedText}</p>
            </div>
            <Button
              onClick={handleUseExpanded}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Copy className="w-3 h-3 mr-1" />
              Add to Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}