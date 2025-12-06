import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Mic,
  FileText,
  Shield,
  Zap,
  TrendingUp,
  Brain,
  Bell,
  Target,
  AlertTriangle,
  Calendar,
  Activity,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Heart,
  ClipboardList,
  Stethoscope,
  Download,
  GraduationCap,
  DollarSign,
  FileCheck,
  Users,
  LineChart,
  Layers,
  BookOpen,
  CheckCircle2
} from "lucide-react";

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const features = [
    {
      category: "Smart Note Assistant",
      icon: Brain,
      color: "purple",
      items: [
        {
          name: "AI-Powered Voice Dictation",
          icon: Mic,
          description: "Record clinical observations and AI automatically transcribes, formats, and converts to Medicare-compliant narrative",
          timeSaved: "15-20 min/visit",
          impact: "critical",
          details: "Eliminates typing, auto-formats medical terminology, real-time transcription",
          howToUse: "Click the microphone icon, speak naturally, AI transcribes and formats automatically. Review and enhance with one click."
        },
        {
          name: "Smart Vitals Recognition",
          icon: Activity,
          description: "Speak vital signs naturally and AI extracts and populates fields automatically",
          timeSaved: "5-10 min/visit",
          impact: "high",
          details: "Hands-free structured data entry, natural language processing, auto-converts spoken values",
          howToUse: "Say 'blood pressure 120 over 80' or 'heart rate 72' and AI fills the fields automatically."
        },
        {
          name: "AI Note Enhancement",
          icon: Sparkles,
          description: "One-click transformation of rough notes into polished, Medicare-compliant clinical documentation",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Adds required sections, improves clarity, ensures compliance, maintains clinical accuracy",
          howToUse: "Type or dictate rough notes, click 'Enhance with AI', review the polished result."
        },
        {
          name: "Real-Time Compliance Checking",
          icon: ShieldCheck,
          description: "Continuous analysis of documentation for Medicare compliance with flagged issues and instant fixes",
          timeSaved: "15-20 min/visit",
          impact: "critical",
          details: "Identifies missing elements, suggests compliant additions, prevents claim denials",
          howToUse: "Compliance score updates as you type. Click flagged issues to add suggested compliant text."
        },
        {
          name: "AI Note Drafting Assistant",
          icon: FileText,
          description: "Generate complete assessment, interventions, and patient response sections based on patient data",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "Diagnosis-specific content, evidence-based language, ready-to-paste sections",
          howToUse: "Click AI Assistant panel, select section type, generate and insert into your note."
        },
        {
          name: "Clinical Decision Support",
          icon: Stethoscope,
          description: "Real-time clinical analysis with drug interactions, risk detection, and evidence-based recommendations",
          timeSaved: "10-15 min/visit",
          impact: "critical",
          details: "Drug safety alerts, vital sign analysis, diagnosis-specific guidance",
          howToUse: "System automatically analyzes patient data and displays alerts and recommendations as you document."
        },
        {
          name: "Automated Task Generation",
          icon: ClipboardList,
          description: "AI identifies follow-up tasks from documentation and creates them automatically",
          timeSaved: "5-10 min/visit",
          impact: "high",
          details: "Extracts action items, assigns priorities, suggests due dates",
          howToUse: "After enhancing note, click 'Generate Tasks' to auto-create follow-up items."
        }
      ]
    },
    {
      category: "OASIS Analyzer",
      icon: BarChart3,
      color: "indigo",
      items: [
        {
          name: "PDF Upload & Data Extraction",
          icon: FileCheck,
          description: "Upload OASIS PDFs and AI automatically extracts all data with intelligent patient matching",
          timeSaved: "30-40 min/OASIS",
          impact: "critical",
          details: "Fuzzy matching, confidence scoring, dispute resolution workflow",
          howToUse: "Upload OASIS PDF, AI extracts data and matches to patient, confirm or dispute match."
        },
        {
          name: "PDGM Revenue Analysis",
          icon: DollarSign,
          description: "Complete PDGM grouping analysis with payment calculation and optimization opportunities",
          timeSaved: "20-30 min/OASIS",
          impact: "critical",
          details: "Clinical group, functional level, comorbidity analysis, case-mix calculation",
          howToUse: "After OASIS upload, view automated PDGM analysis with payment breakdown and optimization tips."
        },
        {
          name: "Documentation Quality Scoring",
          icon: Target,
          description: "AI scores OASIS accuracy, completeness, and compliance with detailed issue identification",
          timeSaved: "15-20 min/OASIS",
          impact: "critical",
          details: "Accuracy score, completeness score, compliance flags, specific improvement suggestions",
          howToUse: "Review quality scores in analysis results, click issues for detailed explanations and fixes."
        },
        {
          name: "Revenue Optimization Recommendations",
          icon: TrendingUp,
          description: "Identify missed revenue opportunities with specific M-item corrections and PDGM impact analysis",
          timeSaved: "Increases reimbursement",
          impact: "critical",
          details: "Rescore opportunities, documentation gaps, projected payment increases",
          howToUse: "Review revenue tips section, implement suggested M-item changes, see projected payment impact."
        },
        {
          name: "Clinical Pathway Triggering",
          icon: Layers,
          description: "Automatically identifies relevant clinical pathways based on diagnosis and functional status",
          timeSaved: "10-15 min/admission",
          impact: "high",
          details: "Evidence-based documentation prompts, rescore opportunities, recommended tasks",
          howToUse: "System auto-identifies pathways, review documentation prompts and create recommended tasks."
        },
        {
          name: "Predictive Revenue Forecasting",
          icon: LineChart,
          description: "AI forecasts financial impact of documentation improvements with multiple scenarios",
          timeSaved: "Strategic planning",
          impact: "high",
          details: "Quick wins, comprehensive optimization, 12-month trajectory, breakeven analysis",
          howToUse: "View forecaster section for baseline vs optimized payment scenarios and implementation roadmap."
        }
      ]
    },
    {
      category: "Clinical Pathways",
      icon: Target,
      color: "cyan",
      items: [
        {
          name: "Diagnosis-Based Pathway Triggers",
          icon: Layers,
          description: "Automatic pathway activation based on diagnosis codes, keywords, and clinical conditions",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Condition-specific assessments, documentation prompts, rescore opportunities",
          howToUse: "Pathways trigger automatically on patient admission based on diagnosis. Review and implement recommendations."
        },
        {
          name: "Documentation Prompts",
          icon: FileText,
          description: "Condition-specific prompts ensure comprehensive documentation of all relevant clinical factors",
          timeSaved: "10-15 min/visit",
          impact: "high",
          details: "M-item-specific guidance, priority flagging, evidence-based assessments",
          howToUse: "Review pathway documentation prompts during visits to ensure complete clinical capture."
        },
        {
          name: "Automated Task Creation",
          icon: CheckCircle2,
          description: "Generate pathway-specific tasks for care coordination, safety, and follow-up",
          timeSaved: "5-10 min/pathway",
          impact: "high",
          details: "Priority-based task assignment, due date recommendations, care team coordination",
          howToUse: "Click 'Create Tasks' from triggered pathway to auto-generate all recommended follow-up items."
        },
        {
          name: "Pathway Management",
          icon: BookOpen,
          description: "Admin interface to create, edit, and manage evidence-based clinical pathways",
          timeSaved: "Standardizes care",
          impact: "high",
          details: "Customizable triggers, documentation templates, rescore opportunity library",
          howToUse: "Admins: Navigate to Clinical Pathway Manager to create and customize pathways for your agency."
        }
      ]
    },
    {
      category: "Patient Alerts & Monitoring",
      icon: Bell,
      color: "orange",
      items: [
        {
          name: "Proactive Risk Detection",
          icon: Bell,
          description: "AI monitors patient data for deterioration patterns and generates predictive alerts",
          timeSaved: "Prevents hospitalizations",
          impact: "critical",
          details: "Vital trend analysis, clinical pattern recognition, risk scoring, recommended interventions",
          howToUse: "Review Patient Alerts dashboard daily. Click alerts for detailed risk analysis and action items."
        },
        {
          name: "Multi-Factor Risk Scoring",
          icon: Activity,
          description: "Comprehensive risk assessment based on vitals, functional status, medications, and comorbidities",
          timeSaved: "Early intervention",
          impact: "critical",
          details: "Fall risk, readmission risk, infection risk, medication risk, symptom escalation",
          howToUse: "System auto-calculates risk scores. Review contributing factors and recommended actions for high-risk patients."
        },
        {
          name: "Alert Workflow Management",
          icon: Target,
          description: "Assign, acknowledge, and track resolution of patient alerts with team coordination",
          timeSaved: "5-10 min/alert",
          impact: "high",
          details: "Assignment workflow, status tracking, resolution documentation, team notifications",
          howToUse: "Click alerts to assign to team members, document actions taken, mark as resolved."
        }
      ]
    },
    {
      category: "Training & Education",
      icon: GraduationCap,
      color: "green",
      items: [
        {
          name: "Personalized Training Plans",
          icon: Target,
          description: "AI generates custom learning paths based on individual nurse performance and documentation gaps",
          timeSaved: "Targeted improvement",
          impact: "high",
          details: "Skill gap analysis, prioritized modules, progress tracking, micro-learning",
          howToUse: "Go to Training Hub, view your personalized learning path, complete recommended modules."
        },
        {
          name: "Interactive Scenarios",
          icon: Brain,
          description: "Practice with realistic patient cases and receive AI feedback on clinical decisions",
          timeSaved: "Builds competency",
          impact: "high",
          details: "Multiple scenario types, real-time feedback, performance scoring",
          howToUse: "Select a scenario from Training Hub, respond to clinical situations, review AI feedback."
        },
        {
          name: "Documentation Practice",
          icon: FileText,
          description: "Hands-on practice with documentation scenarios and instant AI quality feedback",
          timeSaved: "Improves quality",
          impact: "medium",
          details: "Real-world cases, compliance checking, quality scoring",
          howToUse: "Complete documentation practice scenarios to improve skills before real visits."
        },
        {
          name: "Training Recommendations",
          icon: Lightbulb,
          description: "Auto-assign training based on documentation review and compliance audit findings",
          timeSaved: "Proactive learning",
          impact: "high",
          details: "Triggered by errors, competency-based, tracks completion",
          howToUse: "System automatically recommends training when documentation gaps are identified."
        }
      ]
    },
    {
      category: "Compliance & Analytics",
      icon: Shield,
      color: "red",
      items: [
        {
          name: "Automated Compliance Auditing",
          icon: ShieldCheck,
          description: "AI audits all documentation against Medicare CoPs, state regulations, and agency policies",
          timeSaved: "30-40 min/audit",
          impact: "critical",
          details: "Rule-based checking, severity scoring, corrective action suggestions",
          howToUse: "Navigate to Compliance Dashboard to review audit results and address flagged issues."
        },
        {
          name: "User Activity Tracking",
          icon: Users,
          description: "Comprehensive logging of all user actions for audit trail and performance monitoring",
          timeSaved: "Regulatory compliance",
          impact: "critical",
          details: "HIPAA audit trail, login tracking, note enhancement stats, action-specific metrics",
          howToUse: "Admins: View User Activity Log for detailed action history and compliance reporting."
        },
        {
          name: "Regulatory Updates",
          icon: BookOpen,
          description: "AI monitors and alerts on CMS, Medicare, and state regulatory changes",
          timeSaved: "30 min/week",
          impact: "high",
          details: "Automated scanning, compliance impact analysis, training recommendations",
          howToUse: "Review Regulatory Compliance page for pending updates and required actions."
        },
        {
          name: "Performance Analytics",
          icon: BarChart3,
          description: "Comprehensive dashboards for nurse performance, documentation quality, and outcomes",
          timeSaved: "Strategic insight",
          impact: "high",
          details: "Quality metrics, time savings, compliance rates, trend analysis",
          howToUse: "Admins: Access Analytics Dashboard for agency-wide performance insights and reporting."
        }
      ]
    },
    {
      category: "Patient & Care Management",
      icon: Heart,
      color: "pink",
      items: [
        {
          name: "Care Plan Auto-Generation",
          icon: Target,
          description: "AI generates evidence-based care plans based on diagnosis and patient data",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Problem, goal, intervention generation, measurable outcomes, evidence-based",
          howToUse: "Navigate to patient, click 'Generate Care Plan', review and create suggested plans."
        },
        {
          name: "Automatic Care Plan Triggers",
          icon: Layers,
          description: "Admin-configured automatic care plan creation based on diagnosis or medication",
          timeSaved: "15-20 min/admission",
          impact: "critical",
          details: "Standardized evidence-based care, ensures consistency across agency",
          howToUse: "Admins: Configure triggers in Automatic Care Plans. Staff: Plans auto-generate on admission."
        },
        {
          name: "Incident Reporting",
          icon: AlertTriangle,
          description: "Guided incident reporting with AI-generated comprehensive reports",
          timeSaved: "15-20 min/incident",
          impact: "critical",
          details: "Fall, hospitalization, med error templates, automatic notifications",
          howToUse: "Click incident type button, complete guided form, AI generates detailed report."
        },
        {
          name: "Patient History Summarization",
          icon: FileText,
          description: "AI generates concise summaries of patient history and recent activity",
          timeSaved: "5-10 min prep",
          impact: "high",
          details: "Recent visits, active problems, medications, care plan status",
          howToUse: "View patient context card in Smart Note Assistant for auto-generated summary."
        }
      ]
    }
  ];

  const generateFeaturesPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const featuresList = features.map(cat => ({
        category: cat.category,
        items: cat.items.map(f => ({
          name: f.name,
          description: f.description,
          timeSaved: f.timeSaved,
          impact: f.impact,
          howToUse: f.howToUse,
          details: f.details
        }))
      }));

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Penn Sync Features Guide</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { color: #4F46E5; text-align: center; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
    h2 { color: #6366F1; margin-top: 30px; border-left: 4px solid #6366F1; padding-left: 10px; }
    h3 { color: #1F2937; margin-top: 20px; }
    .feature { background: #F9FAFB; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #E5E7EB; page-break-inside: avoid; }
    .feature-name { font-weight: bold; font-size: 16px; color: #1F2937; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 8px; }
    .critical { background: #FEE2E2; color: #DC2626; }
    .high { background: #FED7AA; color: #EA580C; }
    .medium { background: #DBEAFE; color: #2563EB; }
    .time-saved { color: #059669; font-weight: bold; }
    .how-to { background: #EFF6FF; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 13px; }
    .section { page-break-inside: avoid; }
    .toc { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .toc-item { margin: 5px 0; }
    .header-info { text-align: center; color: #6B7280; margin-bottom: 30px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; }
    .impact-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; }
    .impact-stat { display: inline-block; margin: 15px 20px; }
    .impact-stat-value { font-size: 32px; font-weight: bold; }
    .impact-stat-label { font-size: 14px; opacity: 0.9; }
  </style>
</head>
<body>
  <h1>🏥 Penn Sync Features Guide</h1>
  <p class="header-info">AI-Powered Home Health Documentation & OASIS Analytics<br>Generated: ${new Date().toLocaleDateString()}</p>
  
  <div class="impact-summary">
    <h2 style="color: white; margin-top: 0;">The Penn Sync Impact</h2>
    <p style="opacity: 0.95; font-size: 16px; margin-bottom: 20px;">Revolutionizing home health documentation with AI-powered efficiency</p>
    <div class="impact-stat">
      <div class="impact-stat-value">110+</div>
      <div class="impact-stat-label">Minutes Saved Per Visit</div>
    </div>
    <div class="impact-stat">
      <div class="impact-stat-value">40+</div>
      <div class="impact-stat-label">Hours Saved Per Week</div>
    </div>
    <div class="impact-stat">
      <div class="impact-stat-value">100%</div>
      <div class="impact-stat-label">Medicare Compliant</div>
    </div>
  </div>

  <div class="toc">
    <h3>📑 Table of Contents</h3>
    ${features.map((cat, idx) => `<div class="toc-item">${idx + 1}. ${cat.category} (${cat.items.length} features)</div>`).join('')}
  </div>

  ${features.map((category, catIdx) => `
    <div class="section">
      <h2>${catIdx + 1}. ${category.category}</h2>
      ${category.items.map((feature, idx) => `
        <div class="feature">
          <div class="feature-name">
            ${catIdx + 1}.${idx + 1} ${feature.name}
            <span class="badge ${feature.impact}">${feature.impact.toUpperCase()}</span>
          </div>
          <p>${feature.description}</p>
          <p class="time-saved">⏱️ Time Saved: ${feature.timeSaved}</p>
          <p><strong>Details:</strong> ${feature.details}</p>
          <div class="how-to">
            <strong>📋 How to Use:</strong><br>
            ${feature.howToUse}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('')}

  <div class="footer">
    <p><strong>© Penn Sync - AI-Powered Home Health Documentation</strong></p>
    <p>For support, contact your administrator</p>
    <p style="font-size: 12px; margin-top: 10px;">This guide reflects the current system capabilities as of ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating guide. Please try again.');
    }
    setIsGeneratingPDF(false);
  };

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
      pink: "from-pink-500 to-rose-500",
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
          AI-powered home health documentation, OASIS analytics, and clinical decision support
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