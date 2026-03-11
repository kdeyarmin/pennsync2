import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookTemplate } from "lucide-react";

const ANNUAL_TEMPLATES = [
  { name: "HH Conditions of Participation", topic: "Home health conditions of participation overview", training_category: "home_health", business_line: "home_health", audience_roles: ["clinical staff"] },
  { name: "Homebound Eligibility", topic: "Homebound eligibility basics", training_category: "home_health", business_line: "home_health", audience_roles: ["clinical staff"] },
  { name: "OASIS Awareness", topic: "OASIS documentation awareness", training_category: "documentation", business_line: "home_health", audience_roles: ["clinical staff"] },
  { name: "Hospice Philosophy", topic: "Hospice philosophy and goals of care", training_category: "hospice", business_line: "hospice", audience_roles: ["clinical staff", "leadership"] },
  { name: "Pain & Symptom Management", topic: "Pain and symptom management basics", training_category: "clinical", business_line: "hospice", audience_roles: ["clinical staff"] },
  { name: "HIPAA", topic: "HIPAA, privacy, and confidentiality", training_category: "compliance", business_line: "all", audience_roles: ["all employees"] },
  { name: "Infection Prevention", topic: "Infection prevention and control", training_category: "clinical", business_line: "all", audience_roles: ["clinical staff", "field staff"] },
  { name: "Hand Hygiene", topic: "Hand hygiene and PPE", training_category: "safety", business_line: "all", audience_roles: ["clinical staff", "field staff"] },
  { name: "Abuse / Neglect", topic: "Abuse, neglect, and exploitation", training_category: "compliance", business_line: "all", audience_roles: ["all employees"] },
  { name: "Emergency Preparedness", topic: "Emergency preparedness", training_category: "safety", business_line: "all", audience_roles: ["all employees"] },
  { name: "Patient Rights", topic: "Patient rights and responsibilities", training_category: "compliance", business_line: "all", audience_roles: ["all employees"] },
  { name: "Incident Reporting", topic: "Incident reporting for annual education", training_category: "compliance", business_line: "all", audience_roles: ["all employees"] },
  { name: "Documentation Standards", topic: "Documentation standards", training_category: "documentation", business_line: "all", audience_roles: ["clinical staff", "office staff"] },
  { name: "OSHA / Bloodborne Pathogens", topic: "OSHA and bloodborne pathogens", training_category: "safety", business_line: "all", audience_roles: ["clinical staff", "field staff"] },
  { name: "Driving & Field Safety", topic: "Driving and field safety", training_category: "safety", business_line: "all", audience_roles: ["field staff"] }
];

export default function AnnualEducationTemplateLibrary({ onUseTemplate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookTemplate className="w-4 h-4 text-indigo-600" />
          Annual education starter templates
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ANNUAL_TEMPLATES.map((template) => (
          <div key={template.name} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{template.name}</h3>
              <Badge variant="outline">{template.business_line}</Badge>
            </div>
            <p className="text-sm text-slate-500 mb-4">{template.topic}</p>
            <p className="text-xs text-slate-500 mb-4">Audience: {template.audience_roles.join(', ')}</p>
            <Button variant="outline" className="w-full" onClick={() => onUseTemplate(template)}>Use template</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}