import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookTemplate } from "lucide-react";

const STARTER_TEMPLATES = [
  { name: "HIPAA", topic: "HIPAA and patient privacy", training_category: "compliance", purpose_of_training: "Reinforce confidentiality, privacy, and protected health information handling.", audience_roles: ["clinical staff", "administrative staff"] },
  { name: "Infection Control", topic: "Infection prevention and control", training_category: "clinical", purpose_of_training: "Prevent transmission risks in patient care settings.", audience_roles: ["clinical staff"] },
  { name: "Hand Hygiene", topic: "Hand hygiene and universal precautions", training_category: "safety", purpose_of_training: "Improve hand hygiene compliance and reduce infection risk.", audience_roles: ["clinical staff", "support staff"] },
  { name: "Abuse / Neglect", topic: "Abuse, neglect, and exploitation reporting", training_category: "compliance", purpose_of_training: "Help staff identify, report, and escalate abuse or neglect concerns.", audience_roles: ["all employees"] },
  { name: "Emergency Preparedness", topic: "Emergency preparedness in home-based care", training_category: "safety", purpose_of_training: "Prepare employees to respond to emergency disruptions and patient crises.", audience_roles: ["clinical staff", "administrative staff"] },
  { name: "Workplace Safety", topic: "Workplace safety for field clinicians", training_category: "safety", purpose_of_training: "Reduce field safety risks, including driving and home environment hazards.", audience_roles: ["clinical staff"] },
  { name: "Documentation Standards", topic: "Documentation standards and compliance", training_category: "documentation", purpose_of_training: "Improve charting quality, defensibility, and completeness.", audience_roles: ["clinical staff", "administrative staff"] },
  { name: "Hospice Philosophy", topic: "Hospice philosophy and end-of-life care principles", training_category: "hospice", purpose_of_training: "Strengthen hospice-aligned communication and care planning.", audience_roles: ["hospice staff"] },
  { name: "Patient Rights", topic: "Patient rights and informed care", training_category: "compliance", purpose_of_training: "Ensure employees understand patient rights, dignity, and participation in care.", audience_roles: ["all employees"] },
];

export default function TemplateLibraryPanel({ onUseTemplate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookTemplate className="w-4 h-4 text-indigo-600" />
          Starter template library
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {STARTER_TEMPLATES.map((template) => (
          <div key={template.name} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{template.name}</h3>
              <Badge variant="outline">{template.training_category}</Badge>
            </div>
            <p className="text-sm text-slate-500 mb-3">{template.purpose_of_training}</p>
            <p className="text-xs text-slate-500 mb-4">Audience: {template.audience_roles.join(", ")}</p>
            <Button variant="outline" className="w-full" onClick={() => onUseTemplate(template)}>
              Use template
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}