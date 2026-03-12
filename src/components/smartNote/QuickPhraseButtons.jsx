import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const quickPhrases = [
  { label: "Stable", text: "Patient stable, no acute distress noted.", category: "status" },
  { label: "Lungs Clear", text: "Lungs clear to auscultation bilaterally.", category: "respiratory" },
  { label: "No Edema", text: "No peripheral edema noted.", category: "cardiovascular" },
  { label: "Wound OK", text: "Wound site clean, dry, intact with no signs of infection.", category: "wound" },
  { label: "Meds Reviewed", text: "Medications reviewed with patient. No concerns noted.", category: "medication" },
  { label: "Teaching Done", text: "Education provided, patient verbalized understanding.", category: "teaching" },
  { label: "Pain Controlled", text: "Pain well controlled with current regimen.", category: "pain" },
  { label: "Fall Risk", text: "Fall precautions reviewed and reinforced.", category: "safety" },
];

export default function QuickPhraseButtons({ onInsert }) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {quickPhrases.map((phrase, idx) => (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
                onClick={() => onInsert(phrase.text)}
              >
                {phrase.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{phrase.text}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}