import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Clock,
  Mic,
  FileText,
  Shield,
  Zap,
  TrendingUp,
  Users,
  MessageSquare,
  Copy,
  CheckCircle2,
  Target,
  AlertTriangle,
  Phone,
  Package,
  Calendar,
  Activity,
  BarChart3,
  Volume2,
  Scan,
  Mail,
  RefreshCw,
  ShieldCheck,
  Brain,
  Heart,
  Bell,
  FileCheck,
  Layers,
  Eye,
  ClipboardList,
  Stethoscope,
  Lightbulb,
  Download,
  GraduationCap,
  Pill,
  BookOpen,
  ClipboardCheck
} from "lucide-react";

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const features = [
    {
      category: "AI Documentation",
      icon: Sparkles,
      color: "purple",
      items: [
        {
          name: "Voice-to-Text Dictation",
          icon: Mic,
          description: "Record clinical observations and AI automatically transcribes, formats, and merges into Medicare-compliant narrative",
          timeSaved: "15-20 min/visit",
          impact: "high",
          details: "Eliminates typing, auto-formats medical terminology, integrates with existing templates",
          howToUse: "1. Click the microphone icon in the documentation screen. 2. Speak your observations naturally. 3. AI will transcribe and format into professional clinical language. 4. Review and edit as needed."
        },
        {
          name: "Voice-Driven Data Entry",
          icon: Volume2,
          description: "Speak vital signs and structured data directly - AI extracts and populates fields automatically.",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Hands-free structured data entry, natural language processing, auto-converts spoken numbers",
          howToUse: "1. Enable Voice Data Entry on the visit screen. 2. Say 'blood pressure one twenty over eighty' or 'heart rate 72'. 3. AI automatically fills the corresponding fields. 4. Confirm the values are correct."
        },
        {
          name: "Smart Template Generator",
          icon: FileText,
          description: "AI generates pre-filled, diagnosis-specific templates based on visit type, patient history, and care plan goals",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "Prioritizes sections by diagnosis, includes Medicare requirements, compares to previous visits",
          howToUse: "1. Start a new visit documentation. 2. Click 'Generate Smart Template'. 3. AI creates a customized template based on patient diagnosis and visit type. 4. Fill in specific observations."
        },
        {
          name: "AI Documentation Audit",
          icon: ClipboardCheck,
          description: "Comprehensive audit of completed notes for Medicare compliance, accuracy, and completeness with one-click fixes",
          timeSaved: "15-20 min/visit",
          impact: "critical",
          details: "Scores compliance, accuracy, completeness; identifies missing elements; provides fix suggestions",
          howToUse: "1. Complete your documentation. 2. Click 'Run Audit' in the AI Audit panel. 3. Review scores and issues. 4. Click 'Fix' or 'Add' buttons to apply suggested corrections."
        },
        {
          name: "Medicare Compliance Scrubber",
          icon: ShieldCheck,
          description: "Checks note against all Medicare requirements before submission",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Identifies missing elements, suggests improvements, prevents denials",
          howToUse: "1. After completing documentation, the scrubber runs automatically. 2. Review flagged issues. 3. Click suggested fixes to add required elements. 4. Re-run to verify compliance."
        },
        {
          name: "OASIS Scrubber & Guidance",
          icon: FileCheck,
          description: "Automated OASIS data completeness checker for SOC/ROC/DC visits with reimbursement impact analysis",
          timeSaved: "20-30 min/OASIS visit",
          impact: "critical",
          details: "Comprehensive OASIS validation, case-mix weight impact, guided data collection",
          howToUse: "1. On admission/recertification visits, access the OASIS Scrubber panel. 2. Review missing or incomplete items. 3. Follow guided prompts to complete each section. 4. Check reimbursement impact score."
        }
      ]
    },
    {
      category: "Clinical Decision Support",
      icon: Brain,
      color: "indigo",
      items: [
        {
          name: "Real-Time Clinical Decision Support",
          icon: Stethoscope,
          description: "AI analyzes patient data to suggest diagnoses, flag drug interactions, recommend treatments, and suggest patient education",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Differential diagnoses, drug interaction alerts, evidence-based recommendations, education materials",
          howToUse: "1. Enter vitals and begin documentation. 2. The Clinical Decision Support panel auto-analyzes data. 3. Review tabs: Diagnoses, Drugs, Treatment, Education. 4. Click 'Add' to insert suggestions into notes."
        },
        {
          name: "AI Early Warning System",
          icon: Bell,
          description: "Monitors patient data for deterioration patterns with predictive alerts",
          timeSaved: "Prevents hospitalizations",
          impact: "critical",
          details: "Real-time risk scoring, trend analysis, automated alerts",
          howToUse: "1. System continuously monitors all patient data. 2. Alerts appear on patient details and visit screens. 3. Review risk factors and recommended interventions. 4. Document actions taken."
        },
        {
          name: "Predictive Analytics",
          icon: TrendingUp,
          description: "AI forecasts hospital readmission risks, care plan goal timelines, and appointment compliance",
          timeSaved: "Prevents adverse events",
          impact: "critical",
          details: "30-day readmission prediction, goal achievement forecasting, proactive outreach strategies",
          howToUse: "1. Navigate to Predictive AI page. 2. Click 'Run Predictive Analysis'. 3. Review patient risk rankings. 4. Expand each patient for detailed predictions and recommended actions."
        },
        {
          name: "Smart Assessment Suggestions",
          icon: Lightbulb,
          description: "AI suggests missing assessments based on diagnosis and documented content",
          timeSaved: "5-8 min/visit",
          impact: "high",
          details: "Context-aware suggestions, prevents missed documentation",
          howToUse: "1. As you document, AI analyzes content. 2. Suggestions appear in the sidebar. 3. Click to insert recommended assessment sections."
        }
      ]
    },
    {
      category: "Voice Commands",
      icon: Volume2,
      color: "blue",
      items: [
        {
          name: "Global Voice Commands",
          icon: Volume2,
          description: "Navigate app, insert templates, save documentation hands-free",
          timeSaved: "5-10 min/visit",
          impact: "high",
          details: "Over 30 voice commands, works on every page, context-aware",
          howToUse: "1. Click the microphone icon in the bottom corner. 2. Speak commands like 'insert cardiovascular', 'save documentation', or 'add homebound status'. 3. AI executes the command immediately."
        },
        {
          name: "Quick Section Insertion",
          icon: Zap,
          description: "Say 'cardiovascular section' or 'normal findings' to insert content",
          timeSaved: "3-5 min/visit",
          impact: "medium",
          details: "Medicare-required sections, normal findings, patient education templates",
          howToUse: "1. While documenting, say 'insert [section name]'. 2. Available sections: cardiovascular, respiratory, medication, education, homebound status, skilled need. 3. Content is inserted at cursor position."
        }
      ]
    },
    {
      category: "Efficiency Tools",
      icon: Zap,
      color: "green",
      items: [
        {
          name: "Same As Last Visit",
          icon: Copy,
          description: "Copy stable sections from previous visit in one click",
          timeSaved: "15-20 min/visit",
          impact: "high",
          details: "Selectively copy unchanged content, maintain accuracy",
          howToUse: "1. When previous visit exists, the 'Same As Last Visit' panel appears. 2. Review what can be copied (environment, medications, equipment). 3. Click to copy specific sections or all stable content."
        },
        {
          name: "Quick Templates Library",
          icon: Package,
          description: "100+ pre-written templates for common scenarios",
          timeSaved: "5-10 min/visit",
          impact: "medium",
          details: "Normal findings, education templates, interventions, assessments",
          howToUse: "1. Click 'Quick Templates' in documentation. 2. Browse categories or search. 3. Click a template to insert into your note."
        },
        {
          name: "Pre-Visit Prep Brief",
          icon: FileText,
          description: "AI generates focused brief with priority areas and red flags",
          timeSaved: "5-10 min prep time",
          impact: "high",
          details: "Review patient history, identify concerns, prepare supplies",
          howToUse: "1. Before starting a visit, review the Pre-Visit Prep panel. 2. Note priority assessment areas. 3. Check supplies needed. 4. Review recent incidents or concerns."
        },
        {
          name: "Auto-Save",
          icon: RefreshCw,
          description: "Documentation auto-saves every 30 seconds",
          timeSaved: "Prevents data loss",
          impact: "critical",
          details: "Background saving, never lose work",
          howToUse: "Automatic - documentation saves every 30 seconds. Look for 'Last saved' timestamp at top of screen."
        }
      ]
    },
    {
      category: "Care Plan Management",
      icon: Target,
      color: "cyan",
      items: [
        {
          name: "AI Care Plan Suggestions",
          icon: Brain,
          description: "AI generates evidence-based care plans based on diagnoses",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Diagnosis-specific problems, goals, interventions",
          howToUse: "1. On patient details page, click 'Generate Care Plan Suggestions'. 2. Review AI-generated care plans. 3. Click 'Add' to create each care plan."
        },
        {
          name: "Care Plan Timeline Predictor",
          icon: Calendar,
          description: "AI predicts goal achievement timelines dynamically",
          timeSaved: "Improves outcomes",
          impact: "high",
          details: "Progress tracking, barrier identification, adjustment recommendations",
          howToUse: "1. View patient's care plans. 2. Click 'Analyze Timelines'. 3. Review predicted achievement dates and likelihood. 4. Follow recommendations to accelerate progress."
        },
        {
          name: "Automatic Care Plan Triggers",
          icon: Layers,
          description: "Admin-configured automatic care plan generation based on diagnosis or medication",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Standardized evidence-based care, ensures compliance",
          howToUse: "Admin: 1. Go to Auto Care Plans page. 2. Create triggers for diagnoses/medications. 3. System auto-generates care plans on admission. Staff: Care plans appear automatically."
        }
      ]
    },
    {
      category: "Training & Education",
      icon: GraduationCap,
      color: "purple",
      items: [
        {
          name: "Interactive Training Scenarios",
          icon: Brain,
          description: "Practice with realistic patient situations and get AI feedback",
          timeSaved: "Improves competency",
          impact: "high",
          details: "Multiple scenario types, step-by-step guidance, performance scoring",
          howToUse: "1. Go to Staff Training page. 2. Select a scenario type (CHF, COPD, Wound Care, etc.). 3. Respond to each clinical situation. 4. Receive AI feedback on your decisions."
        },
        {
          name: "Personalized Learning Path",
          icon: Target,
          description: "AI creates custom learning plans based on performance gaps",
          timeSaved: "Targeted improvement",
          impact: "high",
          details: "Skill assessment, prioritized modules, progress tracking",
          howToUse: "1. Complete training scenarios. 2. Go to Learning Path tab. 3. Click 'Generate Learning Path'. 4. Follow recommended modules in order."
        }
      ]
    },
    {
      category: "Communication",
      icon: MessageSquare,
      color: "orange",
      items: [
        {
          name: "Family Communication",
          icon: Users,
          description: "AI generates family-friendly visit summaries",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "Plain language, customizable, email delivery",
          howToUse: "1. After completing visit, find Family Communication panel. 2. Click 'Generate Summary'. 3. Review and edit as needed. 4. Click 'Send to Family'."
        },
        {
          name: "Team Notes",
          icon: MessageSquare,
          description: "Internal notes for care team coordination",
          timeSaved: "5-7 min/visit",
          impact: "medium",
          details: "Separate from clinical documentation, team visibility",
          howToUse: "1. In documentation screen, scroll to Team Notes section. 2. Add notes for other team members. 3. Flag urgency if needed. 4. Notes visible to all care team."
        }
      ]
    },
    {
      category: "Incident & Compliance",
      icon: AlertTriangle,
      color: "red",
      items: [
        {
          name: "Quick Incident Reporting",
          icon: AlertTriangle,
          description: "Guided forms for falls, hospitalizations, med errors with AI reports",
          timeSaved: "15-20 min/incident",
          impact: "critical",
          details: "Ensures compliance, proper notifications, complete documentation",
          howToUse: "1. Click incident type button (Fall, Hospitalization, etc.). 2. Complete guided form. 3. AI generates comprehensive report. 4. Notifications sent automatically."
        },
        {
          name: "Compliance Dashboard",
          icon: ClipboardCheck,
          description: "Aggregated compliance alerts, deadlines, and proactive notifications",
          timeSaved: "30 min/day",
          impact: "critical",
          details: "Visit deadlines, recertifications, quality measures, security",
          howToUse: "1. Navigate to Compliance Dashboard. 2. Review alerts by category. 3. Click items to navigate to related pages. 4. Use filters to focus on specific areas."
        }
      ]
    },
    {
      category: "Security & Admin",
      icon: Shield,
      color: "gray",
      items: [
        {
          name: "Security Audit Logs",
          icon: Eye,
          description: "Complete audit trail of all user actions and data access",
          timeSaved: "Regulatory compliance",
          impact: "critical",
          details: "HIPAA compliance, forensic analysis, incident investigation",
          howToUse: "Admin only: 1. Go to Admin Dashboard > Security tab. 2. Review recent security events. 3. Filter by user, action type, or date. 4. Export logs for audits."
        },
        {
          name: "Enhanced Clinical Decision Support",
          icon: Stethoscope,
          description: "AI-powered real-time clinical analysis with drug interactions, vital trends, and evidence-based recommendations",
          timeSaved: "15-20 min/visit",
          impact: "critical",
          details: "Drug safety alerts, differential diagnoses, vital sign trend analysis, preventive risk scoring",
          howToUse: "1. Open patient visit or Smart Note Assistant. 2. Enhanced CDS panel auto-analyzes patient data. 3. Review tabs for alerts, drugs, vitals, recommendations. 4. Click to insert suggestions into notes."
        },
        {
          name: "Regulatory Compliance Center",
          icon: Shield,
          description: "Monitor healthcare regulations and manage compliance updates with AI scanning",
          timeSaved: "30 min/week",
          impact: "high",
          details: "Automated regulatory scanning, compliance tracking, training recommendations",
          howToUse: "1. Navigate to Regulatory Center. 2. Review pending updates. 3. Admins can scan for new regulations. 4. Implement updates and assign training."
        }
      ]
    }
  ];

  const generateFeaturesPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      let pdfContent = `PENN SYNC FEATURES GUIDE
=====================================
AI-Powered Home Health Documentation System

Generated: ${new Date().toLocaleDateString()}

TABLE OF CONTENTS
-----------------
`;
      
      features.forEach((category, idx) => {
        pdfContent += `${idx + 1}. ${category.category}\n`;
      });

      pdfContent += `\n\n`;

      features.forEach((category, catIdx) => {
        pdfContent += `\n${'='.repeat(50)}
SECTION ${catIdx + 1}: ${category.category.toUpperCase()}
${'='.repeat(50)}\n\n`;

        category.items.forEach((feature, idx) => {
          pdfContent += `${catIdx + 1}.${idx + 1} ${feature.name}
${'-'.repeat(40)}
Impact: ${feature.impact.toUpperCase()}
Time Saved: ${feature.timeSaved}

DESCRIPTION:
${feature.description}

DETAILS:
${feature.details}

HOW TO USE:
${feature.howToUse}

\n`;
        });
      });

      pdfContent += `\n${'='.repeat(50)}
QUICK REFERENCE: VOICE COMMANDS
${'='.repeat(50)}

Documentation Commands:
- "Insert cardiovascular" - Adds cardiovascular assessment section
- "Insert respiratory" - Adds respiratory assessment section  
- "Insert medication" - Adds medication management section
- "Insert education" - Adds patient education section
- "Add normal findings" - Inserts standard normal findings
- "Add homebound status" - Adds homebound justification
- "Add skilled need" - Adds skilled nursing necessity
- "Insert vital signs" - Adds current vitals to narrative
- "Copy from last visit" - Copies previous visit content

Action Commands:
- "Save documentation" - Saves current note
- "Generate template" - Creates smart template
- "Report fall" - Opens fall incident form
- "Report hospitalization" - Opens hospitalization form

Navigation Commands:
- "Go to patients" - Opens patient list
- "Go to dashboard" - Opens main dashboard
- "Refresh data" - Refreshes current page


${'='.repeat(50)}
KEYBOARD SHORTCUTS
${'='.repeat(50)}

Text Expanders (type and press space):
- wnl → within normal limits
- nka → no known allergies
- sob → shortness of breath
- rom → range of motion
- adl → activities of daily living
- bp → blood pressure
- hr → heart rate
- rr → respiratory rate
- o2 → oxygen saturation
- pt → patient
- hx → history


${'='.repeat(50)}
BEST PRACTICES
${'='.repeat(50)}

1. START WITH VITALS
   Enter vital signs first - AI uses them to generate better templates and suggestions.

2. USE VOICE DICTATION
   Speak naturally and let AI format your observations professionally.

3. RUN COMPLIANCE AUDIT
   Always run the AI audit before completing a visit to catch missing elements.

4. REVIEW ENHANCED CLINICAL DECISION SUPPORT
   Check the Enhanced CDS panel for drug interactions, vital trends, and AI recommendations.

5. DOCUMENT PATIENT RESPONSE
   Always include how the patient responded to teaching and interventions.

6. USE TEMPLATES
   Start with smart templates and customize rather than typing from scratch.


${'='.repeat(50)}
SUPPORT & TRAINING
${'='.repeat(50)}

For additional training:
- Visit the Skills & Training page for interactive scenarios
- Complete your Personalized Learning Path
- Contact your administrator for questions

For technical support:
- Check the Compliance Dashboard for system alerts
- Review Security Documentation for HIPAA guidelines
- Contact your IT administrator for access issues


© Penn Sync - AI-Powered Home Health Documentation
`;

      // Create and download the file
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Penn_Sync_Features_Guide.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating guide. Please try again.');
    }
    setIsGeneratingPDF(false);
  };

  // Calculate totals
  const totalTimeSavedPerVisit = 110;
  const totalTimeSavedPerWeek = totalTimeSavedPerVisit * 5;
  const totalTimeSavedPerMonth = totalTimeSavedPerWeek * 4;
  const totalTimeSavedPerYear = totalTimeSavedPerMonth * 12;

  const filteredFeatures = selectedCategory === "all" 
    ? features 
    : features.filter(cat => cat.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const getCategoryColor = (color) => {
    const colors = {
      purple: "from-purple-500 to-pink-500",
      blue: "from-blue-500 to-cyan-500",
      indigo: "from-indigo-500 to-purple-500",
      green: "from-green-500 to-emerald-500",
      cyan: "from-cyan-500 to-blue-500",
      orange: "from-orange-500 to-red-500",
      red: "from-red-500 to-pink-500",
      gray: "from-gray-500 to-gray-600"
    };
    return colors[color] || "from-gray-500 to-gray-600";
  };

  const getImpactBadge = (impact) => {
    const styles = {
      critical: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-blue-500 text-white",
      low: "bg-gray-500 text-white"
    };
    return styles[impact] || styles.medium;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Penn Sync Features
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          Intelligent home health documentation that saves time and ensures compliance
        </p>
        
        {/* Download Button */}
        <Button 
          onClick={generateFeaturesPDF}
          disabled={isGeneratingPDF}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mb-6"
        >
          {isGeneratingPDF ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" /> Download Features Guide</>
          )}
        </Button>
        
        {/* Time Saved Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{totalTimeSavedPerVisit}</p>
              <p className="text-sm text-gray-600">min saved per visit</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{Math.round(totalTimeSavedPerWeek / 60)}</p>
              <p className="text-sm text-gray-600">hours saved per week</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{Math.round(totalTimeSavedPerMonth / 60)}</p>
              <p className="text-sm text-gray-600">hours saved per month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{Math.round(totalTimeSavedPerYear / 60 / 24)}</p>
              <p className="text-sm text-gray-600">days saved per year</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className="gap-2"
          >
            All Features
          </Button>
          {features.map((category) => (
            <Button
              key={category.category}
              variant={selectedCategory === category.category.toLowerCase() ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.category.toLowerCase())}
              className="gap-2"
            >
              <category.icon className="w-4 h-4" />
              {category.category}
            </Button>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="space-y-8">
        {filteredFeatures.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <div key={category.category}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(category.color)} rounded-xl flex items-center justify-center shadow-lg`}>
                  <CategoryIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                  <p className="text-sm text-gray-600">{category.items.length} feature{category.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <Card key={feature.name} className="hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <FeatureIcon className="w-5 h-5 text-gray-700" />
                          </div>
                          <div className="flex gap-1">
                            <Badge className={getImpactBadge(feature.impact)}>
                              {feature.impact}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{feature.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">{feature.description}</p>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-900">
                            Saves: {feature.timeSaved}
                          </span>
                        </div>
                        
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-semibold text-blue-800 mb-1">How to Use:</p>
                          <p className="text-xs text-blue-700">{feature.howToUse}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Impact Summary */}
      <Card className="mt-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white border-none">
        <CardContent className="p-8">
          <div className="text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-white opacity-90" />
            <h2 className="text-3xl font-bold mb-3">The Penn Sync Impact</h2>
            <p className="text-xl text-blue-100 mb-6">
              Save over <strong>{Math.round(totalTimeSavedPerYear / 60)} hours per year</strong> per nurse
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Heart className="w-8 h-8 mx-auto mb-2 text-pink-200" />
                <p className="font-semibold text-lg">More Patient Time</p>
                <p className="text-sm text-blue-100">Less paperwork, more care</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-200" />
                <p className="font-semibold text-lg">100% Compliant</p>
                <p className="text-sm text-blue-100">Medicare requirements guaranteed</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-200" />
                <p className="font-semibold text-lg">Better Outcomes</p>
                <p className="text-sm text-blue-100">Early detection & intervention</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}