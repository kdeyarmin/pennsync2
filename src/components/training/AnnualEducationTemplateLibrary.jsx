import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const templates = [
  { name: 'Penn Hospice Annual Mandatory Education', topic: 'Hospice philosophy and goals of care', training_category: 'hospice', business_line: 'hospice', audience_roles: ['clinical staff'] },
  { name: 'Penn Home Health Annual Mandatory Education', topic: 'Homebound eligibility basics', training_category: 'home_health', business_line: 'home_health', audience_roles: ['clinical staff'] },
  { name: 'Penn Office Staff Annual Mandatory Education', topic: 'HIPAA and confidentiality', training_category: 'compliance', business_line: 'all', audience_roles: ['office staff'] },
];

export default function AnnualEducationTemplateLibrary({ onUseTemplate }) {
  return (
    <Card>
      <CardHeader><CardTitle>Annual Topic Library</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.name} className="rounded-xl border p-4 bg-white space-y-3">
            <p className="font-semibold text-slate-900">{template.name}</p>
            <p className="text-sm text-slate-500">{template.topic}</p>
            <Button variant="outline" className="w-full" onClick={() => onUseTemplate?.(template)}>Use Template</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}