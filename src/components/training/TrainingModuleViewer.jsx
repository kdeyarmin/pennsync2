import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Lightbulb, BookOpenCheck, MessageSquare, Eye } from "lucide-react";

function ReadingTime({ content }) {
  const text = JSON.stringify(content || "");
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return <span className="text-xs text-slate-400">~{minutes} min read</span>;
}

function Section({ section, index, onViewed }) {
  const [open, setOpen] = useState(true);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!open || !sectionRef.current || !onViewed) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onViewed(index); },
      { threshold: 0.5 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [open, index, onViewed]);

  return (
    <div ref={sectionRef} className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          {section.heading}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 sm:px-5 py-4 space-y-3 text-slate-700 text-sm leading-7">
          {section.body && <p>{section.body}</p>}
          {section.bullets?.length > 0 && (
            <ul className="space-y-2">
              {section.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {section.example && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Practical Example</p>
              <p className="text-blue-900">{section.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrainingModuleViewer({ module }) {
  const content = module?.content_json || {};
  const sections = content.sections || [];
  const scenarios = content.case_scenarios || [];
  const takeaways = content.key_takeaways || [];
  const [viewedSections, setViewedSections] = useState(new Set());

  const handleSectionViewed = (index) => {
    setViewedSections(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const readingProgress = sections.length > 0
    ? Math.round((viewedSections.size / sections.length) * 100)
    : 100;

  const typeColors = {
    lesson: "bg-blue-100 text-blue-800",
    video: "bg-purple-100 text-purple-800",
    policy: "bg-orange-100 text-orange-800",
    checklist: "bg-teal-100 text-teal-800",
    attestation: "bg-pink-100 text-pink-800",
    simulation: "bg-indigo-100 text-indigo-800",
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg text-slate-900">{module.title}</CardTitle>
            <div className="flex items-center gap-3 mt-1">
              <ReadingTime content={content} />
              {sections.length > 0 && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {viewedSections.size}/{sections.length} sections read
                </span>
              )}
            </div>
          </div>
          <Badge className={typeColors[module.type] || "bg-slate-100 text-slate-700"}>
            {module.type}
          </Badge>
        </div>
        {sections.length > 1 && (
          <Progress value={readingProgress} className="h-1 mt-3 [&>div]:bg-blue-500" />
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {content.intro && (
          <p className="text-slate-700 leading-7 text-sm sm:text-base border-l-4 border-blue-200 pl-4 bg-blue-50/50 py-2 rounded-r-xl">
            {content.intro}
          </p>
        )}

        {sections.length > 0 && (
          <div className="space-y-2">
            {sections.map((section, i) => (
              <Section key={i} section={section} index={i} onViewed={handleSectionViewed} />
            ))}
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Case Scenarios
            </h3>
            {scenarios.map((scenario, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="font-semibold text-amber-900">{scenario.title}</p>
                <p className="text-amber-900/90 text-sm leading-6">{scenario.situation}</p>
                {scenario.guidance && (
                  <p className="text-sm text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
                    <strong>Guidance:</strong> {scenario.guidance}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {takeaways.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4" /> Key Takeaways
            </h3>
            <ul className="space-y-2">
              {takeaways.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
