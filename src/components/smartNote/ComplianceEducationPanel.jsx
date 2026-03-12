import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Info
} from "lucide-react";

// Medicare guideline references
const MEDICARE_GUIDELINES = {
  "HOMEBOUND STATUS": {
    code: "42 CFR 409.42",
    title: "Homebound Status Requirements",
    summary: "Patient must be confined to home due to illness/injury. Leaving home requires considerable/taxing effort.",
    keyPoints: [
      "Patient normally unable to leave home",
      "Leaving requires considerable and taxing effort",
      "Absences must be infrequent, short duration, or for medical treatment",
      "Need for assistive devices alone doesn't qualify"
    ],
    link: "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/bp102c07.pdf",
    examples: {
      good: "Patient is homebound due to severe dyspnea on exertion, requiring rest after ambulating 15 feet. Leaving home requires maximum assistance and considerable taxing effort.",
      poor: "Patient stays at home."
    }
  },
  "SKILLED NEED": {
    code: "42 CFR 409.44",
    title: "Skilled Nursing Services",
    summary: "Services must require the skills of a qualified nurse and be reasonable and necessary.",
    keyPoints: [
      "Must require skills of a licensed nurse",
      "Cannot be safely performed by non-medical personnel",
      "Must be reasonable and necessary for treatment",
      "Observation and assessment of complex conditions qualifies"
    ],
    link: "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/bp102c07.pdf",
    examples: {
      good: "Skilled nursing required for complex medication management, assessment of cardiopulmonary status, and patient education requiring professional nursing judgment.",
      poor: "Patient needs nursing care."
    }
  },
  "PATIENT RESPONSE": {
    code: "CoP 484.60",
    title: "Patient Response Documentation",
    summary: "Document patient's response to care, teaching effectiveness, and progress toward goals.",
    keyPoints: [
      "Document patient verbalization of understanding",
      "Include teach-back demonstration when applicable",
      "Note any barriers to learning",
      "Record patient's stated commitment to plan"
    ],
    link: "https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification/SurveyCertificationGenInfo/Downloads/Survey-and-Cert-Letter-18-28.pdf",
    examples: {
      good: "Patient verbalized understanding of medication schedule and correctly demonstrated teach-back of warning signs. Patient agreed to follow dietary recommendations.",
      poor: "Patient understood teaching."
    }
  },
  "VITAL SIGNS": {
    code: "CoP 484.55",
    title: "Comprehensive Assessment",
    summary: "Vital signs must be documented with context and clinical interpretation.",
    keyPoints: [
      "Include all relevant vital signs for condition",
      "Document oxygen source if applicable",
      "Compare to baseline when available",
      "Note any abnormalities and interventions"
    ],
    link: "https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification/SurveyCertificationGenInfo/Downloads/Survey-and-Cert-Letter-18-28.pdf",
    examples: {
      good: "BP 142/88, HR 78 regular, RR 18, Temp 98.4°F, O2 Sat 94% on room air. BP slightly elevated compared to previous visit.",
      poor: "Vitals taken."
    }
  },
  "ASSESSMENT FINDINGS": {
    code: "CoP 484.55(b)",
    title: "Clinical Assessment Requirements",
    summary: "Comprehensive assessment must include objective, measurable clinical findings.",
    keyPoints: [
      "Document objective findings, not just subjective",
      "Use measurable terms (grading scales, measurements)",
      "Include all body systems relevant to diagnosis",
      "Compare to previous assessment when applicable"
    ],
    link: "https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification/SurveyCertificationGenInfo/Downloads/Survey-and-Cert-Letter-18-28.pdf",
    examples: {
      good: "Cardiovascular: S1/S2 regular, no murmurs. 2+ bilateral pedal edema, improved from 3+ last visit. Lungs: Diminished bases bilateral, no crackles.",
      poor: "Heart and lungs normal."
    }
  },
  "INTERVENTIONS": {
    code: "CoP 484.60(a)",
    title: "Care and Services Documentation",
    summary: "All interventions must be documented with clinical reasoning and patient response.",
    keyPoints: [
      "Document all skilled interventions performed",
      "Include patient/caregiver education provided",
      "Note coordination with other providers",
      "Record time spent on skilled activities"
    ],
    link: "https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification/SurveyCertificationGenInfo/Downloads/Survey-and-Cert-Letter-18-28.pdf",
    examples: {
      good: "Performed medication reconciliation, identified potential interaction, contacted physician. Provided education on CHF symptom management and daily weight monitoring.",
      poor: "Care provided as ordered."
    }
  },
  "PLAN/GOALS": {
    code: "CoP 484.60(b)",
    title: "Plan of Care Documentation",
    summary: "Document progress toward goals, plan modifications, and next steps.",
    keyPoints: [
      "Reference specific care plan goals",
      "Document progress or lack thereof",
      "Include plan modifications if needed",
      "State next visit plan and frequency"
    ],
    link: "https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification/SurveyCertificationGenInfo/Downloads/Survey-and-Cert-Letter-18-28.pdf",
    examples: {
      good: "Patient progressing toward goal of independent medication management. Continue current POC. Next visit in 3 days to reassess BP and medication tolerance.",
      poor: "Continue plan."
    }
  }
};

export default function ComplianceEducationPanel({ 
  issues = [], 
  onStartPractice,
  compact = false 
}) {
  const [expandedGuideline, setExpandedGuideline] = useState(null);
  const [showAllGuidelines, setShowAllGuidelines] = useState(false);

  // Get unique guideline topics from issues
  const relevantGuidelines = [...new Set(
    issues
      .map(issue => {
        const element = issue.element?.toUpperCase() || '';
        return Object.keys(MEDICARE_GUIDELINES).find(key => 
          element.includes(key) || key.includes(element.split(' ')[0])
        );
      })
      .filter(Boolean)
  )];

  const guidelinesToShow = showAllGuidelines 
    ? Object.keys(MEDICARE_GUIDELINES) 
    : relevantGuidelines.length > 0 
      ? relevantGuidelines 
      : Object.keys(MEDICARE_GUIDELINES).slice(0, 3);

  if (compact) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
              <GraduationCap className="w-4 h-4" /> Learn More
            </p>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 text-xs text-blue-600"
              onClick={() => onStartPractice?.()}
            >
              Practice →
            </Button>
          </div>
          <div className="space-y-1">
            {relevantGuidelines.slice(0, 2).map(key => (
              <div key={key} className="flex items-center gap-2 text-xs text-blue-700">
                <Info className="w-3 h-3" />
                <span>{MEDICARE_GUIDELINES[key].title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Medicare Compliance Guidelines
          </div>
          <Badge variant="outline" className="text-xs">
            {relevantGuidelines.length} relevant
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <Accordion type="single" collapsible value={expandedGuideline} onValueChange={setExpandedGuideline}>
          {guidelinesToShow.map(key => {
            const guideline = MEDICARE_GUIDELINES[key];
            const isRelevant = relevantGuidelines.includes(key);
            
            return (
              <AccordionItem key={key} value={key} className={isRelevant ? 'border-blue-200' : ''}>
                <AccordionTrigger className="text-sm hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    {isRelevant ? (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={isRelevant ? 'font-medium' : ''}>{key}</span>
                    {isRelevant && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs ml-2">
                        Needs attention
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-6">
                    {/* Reference Code */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {guideline.code}
                      </Badge>
                      <span className="text-xs text-gray-600">{guideline.title}</span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-700">{guideline.summary}</p>

                    {/* Key Points */}
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Key Requirements:</p>
                      <ul className="space-y-1">
                        {guideline.keyPoints.map((point, idx) => (
                          <li key={idx} className="text-xs text-blue-700 flex items-start gap-1">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Examples */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-green-50 p-2 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-800 mb-1">✓ Good Example:</p>
                        <p className="text-xs text-green-700 italic">"{guideline.examples.good}"</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded border border-red-200">
                        <p className="text-xs font-semibold text-red-800 mb-1">✗ Poor Example:</p>
                        <p className="text-xs text-red-700 italic">"{guideline.examples.poor}"</p>
                      </div>
                    </div>

                    {/* CMS Link */}
                    <a 
                      href={guideline.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View CMS Guidelines
                    </a>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAllGuidelines(!showAllGuidelines)}
          >
            {showAllGuidelines ? 'Show Relevant Only' : 'Show All Guidelines'}
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-xs"
            onClick={() => onStartPractice?.()}
          >
            <GraduationCap className="w-3 h-3 mr-1" />
            Practice Scenarios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}