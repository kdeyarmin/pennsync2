
import React, { useState } from "react";
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
  Lightbulb
} from "lucide-react";

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

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
          details: "Eliminates typing, auto-formats medical terminology, integrates with existing templates"
        },
        {
          name: "Voice-Driven Data Entry",
          icon: Volume2,
          description: "Speak vital signs and structured data directly - AI extracts and populates fields automatically. Say 'blood pressure one twenty over eighty' and it fills in the form.",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Hands-free structured data entry, natural language processing, auto-converts spoken numbers to proper format"
        },
        {
          name: "Smart Template Generator",
          icon: FileText,
          description: "AI generates pre-filled, diagnosis-specific templates based on visit type, patient history, and care plan goals",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "Prioritizes sections by diagnosis, includes Medicare requirements, compares to previous visits"
        },
        {
          name: "AI Documentation Polish",
          icon: Sparkles,
          description: "Automatically improves grammar, medical terminology, and ensures professional formatting",
          timeSaved: "5-8 min/visit",
          impact: "medium",
          details: "Fixes errors, removes filler words, maintains clinical accuracy, ensures consistency"
        },
        {
          name: "Medicare Compliance Scrubber",
          icon: ShieldCheck,
          description: "Comprehensive audit tool that checks note against all Medicare requirements before submission",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Identifies missing elements, suggests improvements, prevents denials, ensures reimbursement"
        },
        {
          name: "OASIS Scrubber & Guidance",
          icon: FileCheck,
          description: "Automated OASIS data completeness checker for SOC/ROC/DC visits. Identifies missing data elements, provides specific guidance, and calculates case-mix weight impact.",
          timeSaved: "20-30 min/OASIS visit",
          impact: "critical",
          details: "Comprehensive OASIS validation, reimbursement impact analysis, guided data collection, prevents survey deficiencies"
        },
        {
          name: "AI Quality Assurance",
          icon: Shield,
          description: "Real-time quality checking with scoring, critical issue alerts, and auto-fix suggestions",
          timeSaved: "8-12 min/visit",
          impact: "high",
          details: "Prevents errors, ensures compliance, provides actionable feedback"
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
          description: "Navigate app, insert templates, save documentation, and trigger actions completely hands-free throughout the entire app",
          timeSaved: "5-10 min/visit",
          impact: "high",
          details: "Over 30 voice commands for common tasks, works on every page, context-aware suggestions"
        },
        {
          name: "Quick Section Insertion",
          icon: Zap,
          description: "Say 'cardiovascular section' or 'normal findings' to instantly insert pre-written content",
          timeSaved: "3-5 min/visit",
          impact: "medium",
          details: "Includes Medicare-required sections, normal findings, patient education templates"
        }
      ]
    },
    {
      category: "Clinical Intelligence",
      icon: Brain,
      color: "indigo",
      items: [
        {
          name: "AI Early Warning System",
          icon: Bell,
          description: "Continuously monitors patient data for deterioration patterns. Detects vital sign trends, visit patterns, and incident clusters. Provides immediate alerts with specific interventions.",
          timeSaved: "Prevents hospitalizations",
          impact: "critical",
          details: "Real-time risk scoring, predictive analytics, automated physician notifications, diagnosis-specific algorithms, trend analysis across all visits"
        },
        {
          name: "Clinical Decision Support",
          icon: Activity,
          description: "AI analyzes vitals and narrative to provide red flags, trending concerns, and clinical recommendations",
          timeSaved: "5-7 min/visit",
          impact: "critical",
          details: "Identifies critical values, suggests interventions, supports clinical judgment"
        },
        {
          name: "Smart Assessment Suggestions",
          icon: Lightbulb,
          description: "AI analyzes your note in real-time and suggests missing assessments based on diagnosis and what you've already documented",
          timeSaved: "5-8 min/visit",
          impact: "high",
          details: "Context-aware suggestions, prevents missed documentation, ensures comprehensive assessments"
        },
        {
          name: "Smart Vitals Predictor",
          icon: Stethoscope,
          description: "AI predicts expected vital sign ranges based on patient history and suggests auto-fill for stable patients",
          timeSaved: "3-5 min/visit",
          impact: "medium",
          details: "Machine learning predictions, anomaly detection, one-click auto-fill for stable vitals"
        },
        {
          name: "Predictive Monitoring",
          icon: TrendingUp,
          description: "Analyzes trends across visits to predict hospitalizations, falls, and deterioration before they occur",
          timeSaved: "Prevents adverse events",
          impact: "critical",
          details: "Early warning system, proactive care, reduces hospital readmissions"
        },
        {
          name: "Vital Signs Comparison",
          icon: BarChart3,
          description: "Automatic side-by-side comparison with previous visit, trend analysis, and clinical interpretation",
          timeSaved: "3-5 min/visit",
          impact: "medium",
          details: "Visualizes trends, highlights concerning changes, aids assessment"
        },
        {
          name: "Care Plan Progress Tracker",
          icon: Target,
          description: "Auto-generates progress notes for each care plan goal, with measurements and next steps",
          timeSaved: "8-10 min/visit",
          impact: "high",
          details: "Tracks all goals, documents progress, ensures continuity of care"
        },
        {
          name: "Automatic Care Plan Triggers",
          icon: Layers,
          description: "Admin-configured automatic care plan generation based on diagnosis or medication. When system detects trigger (e.g., CHF diagnosis), automatically creates appropriate care plans.",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Reduces manual care plan creation, ensures evidence-based care, standardizes documentation, improves compliance"
        }
      ]
    },
    {
      category: "Efficiency Tools",
      icon: Zap,
      color: "green",
      items: [
        {
          name: "Pre-Visit Prep Brief",
          icon: FileText,
          description: "AI generates a focused brief before each visit with priority areas, red flags, and questions to ask",
          timeSaved: "5-10 min prep time",
          impact: "high",
          details: "Review patient history, identify concerns, prepare supplies list"
        },
        {
          name: "Same As Last Visit",
          icon: Copy,
          description: "Copy stable sections from previous visit (environment, equipment, medications) in one click",
          timeSaved: "15-20 min/visit",
          impact: "high",
          details: "Selectively copy unchanged content, maintain accuracy, reduce redundancy"
        },
        {
          name: "Quick Templates Library",
          icon: Package,
          description: "100+ pre-written templates for common scenarios, organized by category",
          timeSaved: "5-10 min/visit",
          impact: "medium",
          details: "Normal findings, education templates, interventions, assessments"
        },
        {
          name: "Text Expander Macros",
          icon: Zap,
          description: "Type shortcuts like 'wnl' to auto-expand to 'within normal limits' - 25+ medical abbreviations",
          timeSaved: "3-5 min/visit",
          impact: "low",
          details: "Common medical terms, assessments, findings"
        },
        {
          name: "One-Click Actions",
          icon: CheckCircle2,
          description: "Mark urgent, schedule follow-up, request supplies, or print summary in one click",
          timeSaved: "2-3 min/visit",
          impact: "medium",
          details: "Streamlined workflows, reduces administrative tasks"
        },
        {
          name: "Auto-Save",
          icon: RefreshCw,
          description: "Documentation auto-saves every 30 seconds, never lose work",
          timeSaved: "Prevents data loss",
          impact: "critical",
          details: "Background saving, version history, peace of mind"
        }
      ]
    },
    {
      category: "Communication",
      icon: MessageSquare,
      color: "cyan",
      items: [
        {
          name: "Family Communication Auto-Updates",
          icon: Users,
          description: "AI generates warm, family-friendly visit summaries and sends them automatically",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "Plain language, customizable content, email or SMS, improves satisfaction"
        },
        {
          name: "Team Notes & Collaboration",
          icon: MessageSquare,
          description: "Internal notes for care team, alerts, and coordination - separate from clinical documentation",
          timeSaved: "5-7 min/visit",
          impact: "medium",
          details: "Team communication, handoffs, coordination"
        },
        {
          name: "Smart Reminders",
          icon: AlertTriangle,
          description: "Context-aware reminders for visit-specific tasks, recertification dates, follow-ups",
          timeSaved: "3-5 min/visit",
          impact: "medium",
          details: "Never miss critical tasks, proactive alerts"
        }
      ]
    },
    {
      category: "Medication Management",
      icon: Activity,
      color: "orange",
      items: [
        {
          name: "Medication Reconciliation",
          icon: Activity,
          description: "Track medication changes, compare to previous visits, identify discrepancies",
          timeSaved: "8-12 min/visit",
          impact: "high",
          details: "Ensures accuracy, documents changes, reduces med errors"
        },
        {
          name: "Barcode Scanner",
          icon: Scan,
          description: "Scan medication barcodes to auto-populate drug name, dose, strength, and common instructions",
          timeSaved: "5-8 min/visit",
          impact: "medium",
          details: "Reduces errors, speeds documentation, ensures accuracy"
        }
      ]
    },
    {
      category: "Incident Reporting",
      icon: AlertTriangle,
      color: "red",
      items: [
        {
          name: "Quick Incident Reporting",
          icon: AlertTriangle,
          description: "Guided forms for falls, hospitalizations, med errors - AI generates complete incident reports",
          timeSaved: "15-20 min/incident",
          impact: "critical",
          details: "Ensures compliance, proper notifications, complete documentation"
        },
        {
          name: "Auto-Notifications",
          icon: Phone,
          description: "Automatically notify physician, office, and family when incidents occur",
          timeSaved: "5-10 min/incident",
          impact: "high",
          details: "Timely communication, documentation of notifications"
        }
      ]
    },
    {
      category: "Analytics & Insights",
      icon: TrendingUp,
      color: "purple",
      items: [
        {
          name: "Productivity Dashboard",
          icon: BarChart3,
          description: "Track completion rates, documentation time, efficiency scores, and achievements",
          timeSaved: "Visibility & motivation",
          impact: "medium",
          details: "Personal metrics, time saved by AI, goal tracking"
        },
        {
          name: "Admin Analytics",
          icon: Shield,
          description: "Agency-wide metrics, user activity, security logs, compliance monitoring",
          timeSaved: "30-60 min/week",
          impact: "high",
          details: "Team oversight, audit readiness, security monitoring"
        },
        {
          name: "Quality Metrics Dashboard",
          icon: ClipboardList,
          description: "Track OASIS accuracy, documentation quality scores, compliance rates, and benchmarking",
          timeSaved: "Improves outcomes",
          impact: "high",
          details: "Quality monitoring, performance tracking, regulatory compliance"
        }
      ]
    },
    {
      category: "Security & Compliance",
      icon: Shield,
      color: "gray",
      items: [
        {
          name: "Role-Based Access Control",
          icon: ShieldCheck,
          description: "Granular permissions ensure users only access appropriate patient data",
          timeSaved: "HIPAA Compliance",
          impact: "critical",
          details: "Audit trails, access logging, security monitoring"
        },
        {
          name: "Security Audit Logs",
          icon: Eye,
          description: "Complete audit trail of all user actions, data access, and system events",
          timeSaved: "Regulatory compliance",
          impact: "critical",
          details: "Forensic analysis, compliance reporting, incident investigation"
        },
        {
          name: "AI Rate Limiting",
          icon: Shield,
          description: "Prevents abuse of AI features with intelligent rate limiting per user",
          timeSaved: "System protection",
          impact: "high",
          details: "Resource management, cost control, security protection"
        }
      ]
    }
  ];

  // Calculate totals
  const totalTimeSavedPerVisit = 110; // Updated conservative estimate in minutes
  const totalTimeSavedPerWeek = totalTimeSavedPerVisit * 5; // 5 visits/day
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
        <p className="text-xl text-gray-600 mb-6">
          Intelligent home health documentation that saves time and ensures compliance
        </p>
        
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
                        
                        <p className="text-xs text-gray-500">{feature.details}</p>
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
