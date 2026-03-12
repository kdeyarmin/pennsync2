import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2 } from "lucide-react";

export default function SameAsLastVisit({ previousVisit, onCopyContent }) {
  const [selectedSections, setSelectedSections] = useState([]);

  if (!previousVisit || !previousVisit.nurse_notes) {
    return null;
  }

  const sections = [
    { id: 'environment', label: 'Home Environment', keywords: ['environment', 'home', 'safety', 'clean'] },
    { id: 'caregiver', label: 'Caregiver Status', keywords: ['caregiver', 'family', 'support'] },
    { id: 'equipment', label: 'Medical Equipment', keywords: ['equipment', 'dme', 'walker', 'wheelchair', 'oxygen'] },
    { id: 'medications', label: 'Medication List', keywords: ['medication', 'medications', 'taking', 'prescribed'] },
    { id: 'allergies', label: 'Allergies', keywords: ['allerg', 'nkda', 'no known drug'] },
    { id: 'history', label: 'Medical History', keywords: ['history', 'diagnosis', 'past medical'] },
  ];

  const handleToggle = (sectionId) => {
    if (selectedSections.includes(sectionId)) {
      setSelectedSections(selectedSections.filter(id => id !== sectionId));
    } else {
      setSelectedSections([...selectedSections, sectionId]);
    }
  };

  const extractSection = (notes, section) => {
    const lowerNotes = notes.toLowerCase();
    const found = section.keywords.some(keyword => lowerNotes.includes(keyword));
    
    if (!found) return null;

    // Try to extract relevant sentences
    const sentences = notes.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      section.keywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );

    return relevantSentences.slice(0, 3).join('. ') + '.';
  };

  const handleCopySelected = () => {
    let copiedContent = '\n\n--- Copied from Previous Visit ---\n\n';
    
    selectedSections.forEach(sectionId => {
      const section = sections.find(s => s.id === sectionId);
      const content = extractSection(previousVisit.nurse_notes, section);
      
      if (content) {
        copiedContent += `**${section.label}:** ${content}\n\n`;
      }
    });

    copiedContent += '--- End Previous Visit Content ---\n\n[Update with today\'s findings as needed]';
    
    onCopyContent(copiedContent);
    setSelectedSections([]);
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Copy className="w-5 h-5 text-blue-600" />
          Copy Stable Sections from Last Visit
          <Badge variant="outline" className="ml-auto">
            Save 15+ minutes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Select sections that haven't changed since {previousVisit.visit_date}:
        </p>

        <div className="grid grid-cols-2 gap-3">
          {sections.map(section => {
            const hasContent = extractSection(previousVisit.nurse_notes, section);
            return (
              <div 
                key={section.id} 
                className="flex items-center space-x-2 p-3 bg-white rounded-lg border"
              >
                <Checkbox
                  id={section.id}
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => handleToggle(section.id)}
                  disabled={!hasContent}
                />
                <Label 
                  htmlFor={section.id} 
                  className={`cursor-pointer flex-1 ${!hasContent ? 'text-gray-400' : ''}`}
                >
                  {section.label}
                  {!hasContent && <span className="text-xs block text-gray-400">Not in previous note</span>}
                </Label>
                {hasContent && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleCopySelected}
          disabled={selectedSections.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Selected Sections ({selectedSections.length})
        </Button>
      </CardContent>
    </Card>
  );
}