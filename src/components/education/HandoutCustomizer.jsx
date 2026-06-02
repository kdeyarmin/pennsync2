import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

// Template sections data (mirrored from backend)
const templateSections = {
  'chf': [
    { heading: 'What is CHF?', hasBullets: false },
    { heading: 'Warning Signs', bullets: 6 },
    { heading: 'Self-Care Tips', bullets: 6 },
    { heading: 'When to Call Your Doctor', bullets: 5 },
    { heading: 'Emergency - Call 911 If:', bullets: 4 }
  ],
  'copd': [
    { heading: 'What is COPD?', hasBullets: false },
    { heading: 'Common Symptoms', bullets: 6 },
    { heading: 'Managing Your COPD', bullets: 6 },
    { heading: 'Breathing Techniques', bullets: 4 },
    { heading: 'Call Your Doctor If:', bullets: 6 }
  ],
  'copd_oxygen': [
    { heading: 'Why You Need Oxygen', hasBullets: false },
    { heading: 'Understanding Your Prescription', bullets: 5 },
    { heading: 'Types of Oxygen Equipment', hasSubsections: true },
    { heading: 'Using Your Oxygen Safely', bullets: 8 },
    { heading: 'Daily Oxygen Use', bullets: 8 },
    { heading: 'Traveling with Oxygen', bullets: 6 },
    { heading: 'Troubleshooting', hasSubsections: true },
    { heading: 'When to Call Your Doctor', bullets: 7 }
  ],
  'diabetes': [
    { heading: 'Understanding Diabetes', hasBullets: false },
    { heading: 'Blood Sugar Targets', bullets: 4 },
    { heading: 'Daily Management', bullets: 6 },
    { heading: 'Signs of Low Blood Sugar (Hypoglycemia)', bullets: 7 },
    { heading: 'Signs of High Blood Sugar (Hyperglycemia)', bullets: 6 },
    { heading: 'Foot Care', bullets: 6 }
  ],
  'hypertension': [
    { heading: 'What is High Blood Pressure?', hasBullets: false },
    { heading: 'Blood Pressure Goals', bullets: 3 },
    { heading: 'Lifestyle Changes', bullets: 7 },
    { heading: 'Taking Your Blood Pressure at Home', bullets: 6 },
    { heading: 'Medications', bullets: 5 },
    { heading: 'Call Your Doctor If:', bullets: 5 }
  ],
  'stroke': [
    { heading: 'What is a Stroke?', hasBullets: false },
    { heading: 'Remember F.A.S.T.', bullets: 4 },
    { heading: 'Recovery Tips', bullets: 6 },
    { heading: 'Preventing Another Stroke', bullets: 8 },
    { heading: 'Safety at Home', bullets: 6 },
    { heading: 'Call 911 Immediately If:', bullets: 5 }
  ],
  'wound_care': [
    { heading: 'Keeping Your Wound Clean', hasBullets: false },
    { heading: 'Daily Wound Care', bullets: 6 },
    { heading: 'Signs Your Wound is Healing', bullets: 5 },
    { heading: 'Signs of Infection - Call Your Nurse', bullets: 9 },
    { heading: 'Promoting Healing', bullets: 7 },
    { heading: 'Supplies', bullets: 5 }
  ],
  'fall_prevention': [
    { heading: 'Why Fall Prevention Matters', hasBullets: false },
    { heading: 'Home Safety Checklist', bullets: 10 },
    { heading: 'Personal Safety', bullets: 9 },
    { heading: 'Medications and Falls', bullets: 5 },
    { heading: 'Stay Strong and Active', bullets: 6 },
    { heading: 'If You Do Fall', bullets: 7 }
  ],
  'pain_management': [
    { heading: 'Understanding Pain', hasBullets: false },
    { heading: 'Describing Your Pain', bullets: 6 },
    { heading: 'Medication Safety', bullets: 8 },
    { heading: 'Non-Drug Pain Relief', bullets: 9 },
    { heading: 'When to Call Your Doctor', bullets: 7 }
  ],
  'ckd': [
    { heading: 'What is Chronic Kidney Disease?', hasBullets: false },
    { heading: 'Understanding Your Stage', bullets: 4 },
    { heading: 'Managing Your Diet', hasSubsections: true },
    { heading: 'Daily Management', bullets: 6 },
    { heading: 'Warning Signs - Call Your Doctor', bullets: 8 }
  ],
  'osteoporosis': [
    { heading: 'Understanding Osteoporosis', hasBullets: false },
    { heading: 'Risk Factors You Can\'t Change', bullets: 5 },
    { heading: 'Risk Factors You Can Change', bullets: 6 },
    { heading: 'Building Strong Bones', hasSubsections: true },
    { heading: 'Fall Prevention', bullets: 7 },
    { heading: 'When to Call Your Doctor', bullets: 5 }
  ],
  'dementia_care': [
    { heading: 'Understanding Dementia', hasBullets: false },
    { heading: 'Common Signs and Symptoms', bullets: 10 },
    { heading: 'Communication Strategies', hasSubsections: true },
    { heading: 'Daily Care Tips', bullets: 8 },
    { heading: 'Managing Challenging Behaviors', hasSubsections: true },
    { heading: 'Caregiver Self-Care', bullets: 7 },
    { heading: 'When to Call for Help', bullets: 7 }
  ],
  'anticoagulation': [
    { heading: 'Why You\'re Taking Blood Thinners', hasBullets: false },
    { heading: 'Common Blood Thinners', bullets: 6 },
    { heading: 'Taking Your Medication Safely', bullets: 7 },
    { heading: 'Diet Considerations', hasSubsections: true },
    { heading: 'Safety Precautions', bullets: 8 },
    { heading: 'Warning Signs of Bleeding', bullets: 9 },
    { heading: 'CALL 911 IMMEDIATELY IF:', bullets: 8 }
  ],
  'nutrition': [
    { heading: 'Why Good Nutrition Matters', hasBullets: false },
    { heading: 'Essential Nutrients', hasSubsections: true },
    { heading: 'Building a Healthy Plate', bullets: 6 },
    { heading: 'Overcoming Common Challenges', hasSubsections: true },
    { heading: 'Meal Planning Tips', bullets: 7 },
    { heading: 'Staying Hydrated', bullets: 6 }
  ]
};

export default function HandoutCustomizer({ topicId, selectedSections, onSelectionChange }) {
  const [openSections, setOpenSections] = React.useState({});
  
  const sections = templateSections[topicId] || [];

  const toggleSection = (heading) => {
    setOpenSections(prev => ({ ...prev, [heading]: !prev[heading] }));
  };

  const handleSectionToggle = (heading, checked) => {
    const section = sections.find(s => s.heading === heading);
    const bullets = section.bullets ? Array(section.bullets).fill(checked) : undefined;
    
    onSelectionChange({
      ...selectedSections,
      [heading]: {
        included: checked,
        bullets: bullets
      }
    });
  };

  const handleBulletToggle = (heading, bulletIndex, checked) => {
    const currentSection = selectedSections[heading] || { included: true, bullets: [] };
    const newBullets = [...(currentSection.bullets || [])];
    newBullets[bulletIndex] = checked;
    
    onSelectionChange({
      ...selectedSections,
      [heading]: {
        included: currentSection.included,
        bullets: newBullets
      }
    });
  };

  const isSectionChecked = (heading) => {
    return selectedSections[heading]?.included !== false;
  };

  const isBulletChecked = (heading, bulletIndex) => {
    return selectedSections[heading]?.bullets?.[bulletIndex] !== false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customize Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {sections.map((section, idx) => (
          <div key={idx} className="border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id={`section-${idx}`}
                checked={isSectionChecked(section.heading)}
                onCheckedChange={(checked) => handleSectionToggle(section.heading, checked)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`section-${idx}`}
                  className="font-medium cursor-pointer"
                >
                  {section.heading}
                </Label>
                
                {section.bullets && (
                  <Collapsible open={openSections[section.heading]}>
                    <CollapsibleTrigger
                      onClick={() => toggleSection(section.heading)}
                      className="flex items-center gap-1 text-xs text-blue-600 mt-1 hover:text-blue-700"
                    >
                      {openSections[section.heading] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {section.bullets} items
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-4 border-l-2 border-slate-200">
                      {Array.from({ length: section.bullets }).map((_, bulletIdx) => (
                        <div key={bulletIdx} className="flex items-center gap-2">
                          <Checkbox
                            id={`bullet-${idx}-${bulletIdx}`}
                            checked={isBulletChecked(section.heading, bulletIdx)}
                            onCheckedChange={(checked) => handleBulletToggle(section.heading, bulletIdx, checked)}
                            disabled={!isSectionChecked(section.heading)}
                          />
                          <Label
                            htmlFor={`bullet-${idx}-${bulletIdx}`}
                            className="text-xs text-slate-600 cursor-pointer"
                          >
                            Item {bulletIdx + 1}
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}