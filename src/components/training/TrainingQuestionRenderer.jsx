import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TrainingQuestionRenderer({ question, index, value, onChange }) {
  const answer = value ?? (question.type === "multi_select" ? [] : question.type === "matching" ? {} : "");

  const toggleMultiValue = (optionValue, checked) => {
    const current = Array.isArray(answer) ? answer : [];
    if (checked) onChange([...current, optionValue]);
    else onChange(current.filter((item) => item !== optionValue));
  };

  const matchingPairs = Array.isArray(question.correct_answer_json?.answer?.pairs)
    ? question.correct_answer_json.answer.pairs
    : [];
  const matchingOptions = Array.isArray(question.options_json)
    ? question.options_json
    : [];

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Question {index + 1}</p>
          <h3 className="font-medium text-slate-900">{question.prompt}</h3>
        </div>

        {question.type === "mcq" && (
          <div className="space-y-2">
            {(question.options_json || []).map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={answer === option.value ? "default" : "outline"}
                className="w-full justify-start text-left h-auto whitespace-normal"
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {question.type === "true_false" && (
          <div className="grid grid-cols-2 gap-2">
            {[{ value: true, label: "True" }, { value: false, label: "False" }].map((option) => (
              <Button
                key={String(option.value)}
                type="button"
                variant={answer === option.value ? "default" : "outline"}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {question.type === "multi_select" && (
          <div className="space-y-3">
            {(question.options_json || []).map((option) => (
              <div key={option.value} className="flex items-start gap-3 rounded-xl border p-3">
                <Checkbox
                  checked={Array.isArray(answer) && answer.includes(option.value)}
                  onCheckedChange={(checked) => toggleMultiValue(option.value, !!checked)}
                />
                <Label className="font-normal leading-6">{option.label}</Label>
              </div>
            ))}
          </div>
        )}

        {(question.type === "short_answer" || question.type === "scenario_based") && (
          <Textarea
            rows={5}
            value={typeof answer === "string" ? answer : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter your response"
          />
        )}

        {question.type === "matching" && matchingPairs.length > 0 && (
          <div className="space-y-3">
            {matchingPairs.map((pair, pairIndex) => (
              <div key={pairIndex} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="rounded-xl border bg-slate-50 p-3">{pair.left}</div>
                <Select
                  value={answer[pair.left] || ""}
                  onValueChange={(selected) => onChange({ ...answer, [pair.left]: selected })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Match item" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {question.type === "matching" && matchingPairs.length === 0 && (
          <Input
            value={typeof answer === "string" ? answer : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter matching answer"
          />
        )}
      </CardContent>
    </Card>
  );
}