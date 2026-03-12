import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TrainingModuleViewer({ module }) {
  const content = module?.content_json || {};
  const sections = content.sections || [];
  const scenarios = content.case_scenarios || [];
  const takeaways = content.key_takeaways || [];

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{module.title}</CardTitle>
          <Badge variant="outline">{module.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-slate-700">
        {content.intro && <p className="leading-7">{content.intro}</p>}

        {sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h3 className="font-semibold text-slate-900">{section.heading}</h3>
            {section.body && <p className="leading-7">{section.body}</p>}
            {section.bullets?.length > 0 && (
              <ul className="list-disc pl-5 space-y-1">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.example && (
              <div className="rounded-xl bg-slate-50 border p-3">
                <p className="font-medium text-slate-900 mb-1">Practical example</p>
                <p>{section.example}</p>
              </div>
            )}
          </div>
        ))}

        {scenarios.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Case scenarios</h3>
            {scenarios.map((scenario, index) => (
              <div key={index} className="rounded-xl border bg-amber-50 p-4">
                <p className="font-medium text-amber-900">{scenario.title}</p>
                <p className="mt-2 text-amber-900/90">{scenario.situation}</p>
                <p className="mt-2 text-sm text-amber-800">{scenario.guidance}</p>
              </div>
            ))}
          </div>
        )}

        {takeaways.length > 0 && (
          <div className="rounded-xl border bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">Key takeaways</h3>
            <ul className="list-disc pl-5 space-y-1 text-emerald-900/90">
              {takeaways.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}