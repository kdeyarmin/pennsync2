import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";

// CMS OASIS-E 2024 Reference Data (embedded for reliability)
const CMS_OASIS_REFERENCE = {
  lastUpdated: "2024-01-01",
  version: "OASIS-E",
  sections: {
    "GG": {
      title: "Section GG: Functional Abilities and Goals",
      items: {
        "GG0130": {
          name: "Self-Care",
          description: "Assess patient's ability to perform self-care activities",
          scoringScale: {
            "06": "Independent - Patient completes activity by self with no assistance",
            "05": "Setup or clean-up assistance - Helper SETS UP or CLEANS UP",
            "04": "Supervision or touching assistance - Helper provides VERBAL CUES or STEADYING",
            "03": "Partial/moderate assistance - Helper does LESS THAN HALF the effort",
            "02": "Substantial/maximal assistance - Helper does MORE THAN HALF the effort",
            "01": "Dependent - Helper does ALL of the effort"
          },
          subItems: ["A. Eating", "B. Oral hygiene", "C. Toileting hygiene", "E. Shower/bathe", "F. Upper body dressing", "G. Lower body dressing", "H. Footwear"],
          pdgmImpact: "Directly affects functional impairment level and case-mix weight"
        },
        "GG0170": {
          name: "Mobility",
          description: "Assess patient's mobility abilities",
          scoringScale: {
            "06": "Independent",
            "05": "Setup or clean-up assistance",
            "04": "Supervision or touching assistance",
            "03": "Partial/moderate assistance",
            "02": "Substantial/maximal assistance",
            "01": "Dependent"
          },
          subItems: ["B. Sit to lying", "C. Lying to sitting", "D. Sit to stand", "E. Chair/bed transfer", "F. Toilet transfer", "I-O. Walking items", "P. Picking up object", "R/RR. Wheeling"],
          pdgmImpact: "Critical for functional level determination"
        }
      }
    },
    "M1800": {
      title: "M1800-M1860: Functional Status",
      items: {
        "M1800": {
          name: "Grooming",
          scoringScale: { "0": "Independent", "1": "Setup only", "2": "Assistance required", "3": "Dependent" },
          pdgmImpact: "Contributes to functional impairment score"
        },
        "M1810": {
          name: "Upper Body Dressing",
          scoringScale: { "0": "Independent", "1": "Setup only", "2": "Assistance required", "3": "Dependent" },
          pdgmImpact: "Contributes to functional impairment score"
        },
        "M1820": {
          name: "Lower Body Dressing",
          scoringScale: { "0": "Independent", "1": "Setup only", "2": "Assistance required", "3": "Dependent" },
          pdgmImpact: "Contributes to functional impairment score"
        },
        "M1830": {
          name: "Bathing",
          scoringScale: { "0": "Independent", "1": "With help setup only", "2": "Participates", "3": "In bed bath", "4": "Unable to participate", "5": "Unable to bathe self", "6": "Dependent" },
          pdgmImpact: "High-weight item for functional level"
        },
        "M1840": {
          name: "Toilet Transfer",
          scoringScale: { "0": "Independent", "1": "Partial assistance", "2": "Substantial assistance", "3": "Bedpan/commode", "4": "Unable" },
          pdgmImpact: "Contributes to functional impairment score"
        },
        "M1850": {
          name: "Transferring",
          scoringScale: { "0": "Independent", "1": "Minimal human assist", "2": "Moderate assist 1 person", "3": "Moderate assist 2+ persons", "4": "Maximal assist", "5": "Dependent" },
          pdgmImpact: "Contributes to functional impairment score"
        },
        "M1860": {
          name: "Ambulation",
          scoringScale: { "0": "Independent", "1": "With device only", "2": "Minimal assist", "3": "Moderate assist", "4": "Maximal assist", "5": "Chairfast", "6": "Bedbound" },
          pdgmImpact: "High-weight item for functional level"
        }
      }
    },
    "Clinical": {
      title: "Clinical Assessment Items",
      items: {
        "M1021": { name: "Primary Diagnosis", description: "Primary diagnosis requiring home health services", pdgmImpact: "Determines clinical grouping category" },
        "M1023": { name: "Other Diagnoses", description: "All secondary diagnoses", pdgmImpact: "Affects comorbidity adjustment" },
        "M1033": { name: "Risk for Hospitalization", description: "Risk factors assessment", pdgmImpact: "Quality measure impact" }
      }
    },
    "Wounds": {
      title: "Integumentary Status",
      items: {
        "M1306": { name: "Pressure Ulcer Present", scoringScale: { "0": "No", "1": "Yes" } },
        "M1311": { name: "Current Number of Pressure Ulcers", description: "Count by stage" },
        "M1322": { name: "Most Problematic Pressure Ulcer Stage", description: "Document worst pressure ulcer" },
        "M1330": { name: "Stasis Ulcer Present", scoringScale: { "0": "No", "1": "Yes" } },
        "M1340": { name: "Surgical Wound Present", scoringScale: { "0": "No", "1": "Yes" } }
      }
    },
    "Medications": {
      title: "Medication Management",
      items: {
        "M2001": { name: "Drug Regimen Review", description: "Was drug regimen review conducted?" },
        "M2003": { name: "Medication Follow-up", description: "Required if issues identified" },
        "M2010": { name: "High-Risk Drugs", description: "Patient receiving high-risk medications" },
        "M2020": { name: "Oral Medication Management", scoringScale: { "0": "Independent", "1": "Setup", "2": "Assist", "3": "Dependent", "NA": "No oral meds" } },
        "M2030": { name: "Injectable Medication Management", scoringScale: { "0": "Independent", "1": "Setup", "2": "Assist", "3": "Dependent", "NA": "No injectables" } }
      }
    }
  },
  pdgmRules: {
    functionalLevels: {
      low: { range: "0-5 points", description: "Minimal functional impairment", multiplier: 0.85 },
      medium: { range: "6-13 points", description: "Moderate functional impairment", multiplier: 1.0 },
      high: { range: "14+ points", description: "Significant functional impairment", multiplier: 1.25 }
    },
    clinicalGroups: [
      "MMTA - Surgical Aftercare",
      "MMTA - Cardiac/Circulatory",
      "MMTA - Complex Nursing",
      "MMTA - Wounds",
      "MMTA - Endocrine",
      "MMTA - GI/GU",
      "MMTA - Infectious Disease",
      "MMTA - Neuro/Rehab",
      "MMTA - Respiratory",
      "MMTA - Behavioral Health",
      "MMTA - Medication Management",
      "MMTA - Other"
    ],
    comorbidityAdjustments: {
      none: { criteria: "0 comorbidities", multiplier: 1.0 },
      low: { criteria: "1+ secondary diagnoses", multiplier: 1.03 },
      high: { criteria: "2+ high-value comorbidities", multiplier: 1.08 }
    }
  },
  resources: [
    { name: "CMS OASIS-E Guidance Manual", url: "https://www.cms.gov/medicare/quality/home-health/oasis-guidance-manual" },
    { name: "OASIS-E Data Collection Specifications", url: "https://www.cms.gov/medicare/quality/home-health/oasis-data-sets" },
    { name: "PDGM Technical Report", url: "https://www.cms.gov/medicare/payment/prospective-payment-systems/home-health" },
    { name: "Home Health CoP Regulations", url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-484" }
  ]
};

export default function CMSComplianceReference({ oasisItem, onInsertGuidance, compact = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(null);
  const [selectedItem, setSelectedItem] = useState(oasisItem || null);

  const fetchLiveUpdates = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Check for any recent CMS OASIS-E updates or guidance changes effective 2024-2025. Focus on:
1. Any changes to functional scoring (GG items, M1800-M1860)
2. PDGM calculation updates
3. New documentation requirements
4. Quality measure changes

Return JSON:
{
  "hasUpdates": true|false,
  "lastChecked": "date",
  "updates": [
    {"effective_date": "date", "item": "M-item or section", "change": "description", "impact": "high|medium|low"}
  ],
  "alerts": ["any critical compliance alerts"],
  "newGuidance": ["any new documentation tips"]
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            hasUpdates: { type: "boolean" },
            lastChecked: { type: "string" },
            updates: { type: "array", items: { type: "object" } },
            alerts: { type: "array", items: { type: "string" } },
            newGuidance: { type: "array", items: { type: "string" } }
          }
        }
      });
      setLiveUpdates(result);
    } catch (error) {
      console.error("Error fetching updates:", error);
    }
    setIsLoading(false);
  };

  const filteredItems = () => {
    if (!searchTerm) return CMS_OASIS_REFERENCE.sections;
    
    const results = {};
    Object.entries(CMS_OASIS_REFERENCE.sections).forEach(([sectionKey, section]) => {
      const matchingItems = {};
      Object.entries(section.items || {}).forEach(([itemKey, item]) => {
        if (
          itemKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          matchingItems[itemKey] = item;
        }
      });
      if (Object.keys(matchingItems).length > 0) {
        results[sectionKey] = { ...section, items: matchingItems };
      }
    });
    return results;
  };

  if (compact) {
    return (
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            CMS Reference
          </h4>
          <Button size="sm" variant="ghost" onClick={fetchLiveUpdates} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
        {selectedItem && CMS_OASIS_REFERENCE.sections[selectedItem.split(/\d/)[0]]?.items?.[selectedItem] && (
          <div className="text-xs text-blue-800">
            <p className="font-medium">{selectedItem}: {CMS_OASIS_REFERENCE.sections[selectedItem.split(/\d/)[0]]?.items?.[selectedItem]?.name}</p>
            {CMS_OASIS_REFERENCE.sections[selectedItem.split(/\d/)[0]]?.items?.[selectedItem]?.pdgmImpact && (
              <p className="text-blue-600 mt-1">
                <Info className="w-3 h-3 inline mr-1" />
                {CMS_OASIS_REFERENCE.sections[selectedItem.split(/\d/)[0]]?.items?.[selectedItem]?.pdgmImpact}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            CMS OASIS-E Compliance Reference
          </span>
          <Badge variant="outline" className="text-xs">
            v{CMS_OASIS_REFERENCE.version} | Updated {CMS_OASIS_REFERENCE.lastUpdated}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Updates Check */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={fetchLiveUpdates}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Check for CMS Updates
          </Button>
          {liveUpdates && (
            <Badge className={liveUpdates.hasUpdates ? "bg-orange-500" : "bg-green-500"}>
              {liveUpdates.hasUpdates ? "Updates Available" : "Up to Date"}
            </Badge>
          )}
        </div>

        {/* Live Updates Display */}
        {liveUpdates?.updates?.length > 0 && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription>
              <p className="font-semibold text-orange-900 mb-2">Recent CMS Updates:</p>
              <ul className="space-y-1">
                {liveUpdates.updates.map((update, idx) => (
                  <li key={idx} className="text-sm text-orange-800">
                    <Badge className={`mr-2 text-xs ${update.impact === 'high' ? 'bg-red-500' : update.impact === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                      {update.impact}
                    </Badge>
                    <strong>{update.item}:</strong> {update.change}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search OASIS items (e.g., M1830, bathing, GG0130)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Reference Content */}
        <ScrollArea className="h-96">
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(filteredItems()).map(([sectionKey, section]) => (
              <AccordionItem key={sectionKey} value={sectionKey} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {section.title}
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(section.items || {}).length} items
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {Object.entries(section.items || {}).map(([itemKey, item]) => (
                      <div
                        key={itemKey}
                        className={`p-3 rounded-lg border ${
                          selectedItem === itemKey ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                        }`}
                        onClick={() => setSelectedItem(itemKey)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{itemKey}: {item.name}</h4>
                            {item.description && (
                              <p className="text-xs text-gray-600">{item.description}</p>
                            )}
                          </div>
                          {onInsertGuidance && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onInsertGuidance(itemKey, item)}
                              className="text-xs"
                            >
                              Insert
                            </Button>
                          )}
                        </div>
                        
                        {item.scoringScale && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Scoring Scale:</p>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              {Object.entries(item.scoringScale).map(([score, desc]) => (
                                <div key={score} className="bg-white p-1 rounded border">
                                  <span className="font-mono font-bold text-blue-600">{score}</span>: {desc}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.subItems && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Sub-items:</p>
                            <div className="flex flex-wrap gap-1">
                              {item.subItems.map((sub, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{sub}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.pdgmImpact && (
                          <Alert className="mt-2 py-1 px-2 bg-green-50 border-green-200">
                            <Info className="w-3 h-3 text-green-600" />
                            <AlertDescription className="text-xs text-green-800">
                              <strong>PDGM Impact:</strong> {item.pdgmImpact}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        {/* PDGM Rules Reference */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="font-semibold text-indigo-900 mb-2">PDGM Functional Level Thresholds</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(CMS_OASIS_REFERENCE.pdgmRules.functionalLevels).map(([level, data]) => (
              <div key={level} className={`p-2 rounded border ${
                level === 'high' ? 'bg-green-100 border-green-300' :
                level === 'medium' ? 'bg-yellow-100 border-yellow-300' :
                'bg-red-100 border-red-300'
              }`}>
                <p className="font-bold capitalize">{level}</p>
                <p className="text-gray-700">{data.range}</p>
                <p className="text-gray-600">×{data.multiplier}</p>
              </div>
            ))}
          </div>
        </div>

        {/* External Resources */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Official CMS Resources</h4>
          <div className="grid grid-cols-2 gap-2">
            {CMS_OASIS_REFERENCE.resources.map((resource, idx) => (
              <a
                key={idx}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 text-xs text-blue-600"
              >
                <ExternalLink className="w-3 h-3" />
                {resource.name}
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}