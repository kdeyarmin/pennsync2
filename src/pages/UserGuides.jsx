import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, BookOpen, Users, Stethoscope } from "lucide-react";

export default function UserGuides() {
  const [downloading, setDownloading] = useState(null);

  const handleDownloadGuide = async (guideType, guideName) => {
    setDownloading(guideType);
    try {
      const response = await base44.functions.invoke('generateUserGuidePDF', {
        guide_type: guideType
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${guideName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading guide:', error);
      alert('Failed to generate guide. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const guides = [
    {
      type: 'all_features',
      title: 'Complete User Guide - All Features',
      description: 'Comprehensive guide covering every feature of Penn Sync Healthcare platform',
      icon: BookOpen,
      color: 'purple',
      audience: 'All Users',
      topics: [
        'Dashboard & navigation',
        'Notification center',
        'My Workflow dashboard',
        'Patient management',
        'Document management & templates',
        'Visual PDF editor & field mapping',
        'E-signature workflows',
        'Documentation tools',
        'OASIS & care plans',
        'Patient alerts & monitoring',
        'Quality & compliance',
        'Communication & messaging',
        'Training & personalized learning',
        'Offline documentation mode',
        'Admin features & analytics'
      ],
      featured: true
    },
    {
      type: 'document_management',
      title: 'Document Management Guide',
      description: 'Master PDF templates, visual field editor, and document package creation',
      icon: FileText,
      color: 'blue',
      audience: 'Administrative Staff & Nurses',
      topics: [
        'Template library & categories',
        'Version control',
        'Search & filters',
        'Quick document presets',
        'Custom PDF uploads',
        'Visual field editor',
        'Conditional logic',
        'Dynamic tables',
        'Rich text formatting',
        'Document packages',
        'E-signature setup'
      ]
    },
    {
      type: 'referral_intake',
      title: 'Referral Intake Guide',
      description: 'Step-by-step instructions for uploading and processing referrals with AI assistance',
      icon: FileText,
      color: 'blue',
      audience: 'Administrative Staff',
      topics: [
        'Uploading referral documents',
        'Reviewing AI-extracted data',
        'Patient matching process',
        'Generating admission packets',
        'Using AI features'
      ]
    },
    {
      type: 'admission_documentation',
      title: 'Admission Visit Guide',
      description: 'Complete guide for nurses documenting admission visits with AI-powered tools',
      icon: Stethoscope,
      color: 'green',
      audience: 'Clinical Nurses',
      topics: [
        'Pre-visit preparation',
        'Using Smart Note Assistant',
        'SOAP documentation format',
        'AI quality review',
        'OASIS assessment completion',
        'Medicare compliance checklist'
      ]
    },
    {
      type: 'smart_notes',
      title: 'Smart Notes & Quick Note Guide',
      description: 'Master AI-powered documentation with voice dictation and real-time assistance',
      icon: FileText,
      color: 'blue',
      audience: 'Clinical Nurses',
      topics: [
        'Quick Note interface',
        'Voice dictation',
        'AI enhancement',
        'Compliance checking',
        'Clinical event extraction',
        'Offline documentation'
      ]
    },
    {
      type: 'oasis_assessment',
      title: 'OASIS Assessment Guide',
      description: 'Complete OASIS documentation with AI pre-assessment and PDGM optimization',
      icon: FileText,
      color: 'green',
      audience: 'Clinical Nurses',
      topics: [
        'OASIS overview',
        'AI pre-assessment',
        'Item completion',
        'PDGM case mix',
        'Quality validation',
        'Submission process'
      ]
    },
    {
      type: 'care_plans',
      title: 'Care Plan Management Guide',
      description: 'Create and manage comprehensive care plans with AI-generated suggestions',
      icon: FileText,
      color: 'purple',
      audience: 'Clinical Nurses',
      topics: [
        'Creating care plans',
        'AI suggestions',
        'SMART goals',
        'Progress tracking',
        'Gap analysis',
        'Interdisciplinary coordination'
      ]
    },
    {
      type: 'patient_management',
      title: 'Patient Management Guide',
      description: 'Comprehensive patient record management and Patient 360 view',
      icon: Users,
      color: 'blue',
      audience: 'All Clinical Staff',
      topics: [
        'Patient records',
        'Patient 360 view',
        'Demographics',
        'Medical history',
        'Document management',
        'Care coordination'
      ]
    },
    {
      type: 'training_hub',
      title: 'Training Hub Guide',
      description: 'Complete training modules and track professional development',
      icon: FileText,
      color: 'green',
      audience: 'All Staff',
      topics: [
        'Training modules',
        'Interactive quizzes',
        'Certifications',
        'Personalized learning',
        'Skill development',
        'Performance tracking'
      ]
    },
    {
      type: 'compliance_quality',
      title: 'Compliance & Quality Guide',
      description: 'Maintain Medicare compliance and quality standards with AI monitoring',
      icon: FileText,
      color: 'purple',
      audience: 'Clinical Nurses & Admin',
      topics: [
        'Compliance dashboard',
        'Quality scoring',
        'Medicare guidelines',
        'Regulatory updates',
        'Audit preparation',
        'Performance metrics'
      ]
    },
    {
      type: 'messages',
      title: 'Messaging & Communication Guide',
      description: 'Effective team communication and care coordination',
      icon: FileText,
      color: 'blue',
      audience: 'All Staff',
      topics: [
        'Creating messages',
        'Threading',
        'Patient-specific communication',
        'Priority messages',
        'Team coordination',
        'Care handoffs'
      ]
    },
    {
      type: 'patient_alerts',
      title: 'Patient Alerts & Monitoring Guide',
      description: 'Monitor and respond to patient risk alerts and clinical deterioration',
      icon: FileText,
      color: 'green',
      audience: 'Clinical Nurses',
      topics: [
        'Alert dashboard',
        'Alert types',
        'Severity levels',
        'Action plans',
        'Predictive analytics',
        'Alert resolution'
      ]
    },
    {
      type: 'workflow_notifications',
      title: 'Workflow & Notifications Guide',
      description: 'Master your daily workflow with notifications, tasks, and priority management',
      icon: FileText,
      color: 'blue',
      audience: 'Clinical Nurses',
      topics: [
        'My Workflow dashboard',
        'Notification center',
        'Task management',
        'Priority alerts',
        'Daily schedule',
        'Quick actions'
      ]
    },
    {
      type: 'offline_mode',
      title: 'Offline Documentation Guide',
      description: 'Document patient visits without internet and sync when back online',
      icon: FileText,
      color: 'purple',
      audience: 'Clinical Nurses',
      topics: [
        'Enabling offline mode',
        'Patient data caching',
        'Offline documentation',
        'Auto-sync process',
        'Conflict resolution',
        'Troubleshooting'
      ]
    },
    {
      type: 'personalized_training',
      title: 'AI Personalized Training Guide',
      description: 'Improve documentation quality with AI-driven personalized learning',
      icon: FileText,
      color: 'green',
      audience: 'Clinical Nurses',
      topics: [
        'Training recommendations',
        'Skill gap analysis',
        'Micro-learning modules',
        'Practice scenarios',
        'Performance tracking',
        'Certification progress'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Guides & Training Materials</h1>
          <p className="text-gray-600">
            Download comprehensive PDF guides with step-by-step instructions and screenshots
          </p>
        </div>

        {/* Featured Complete Guide */}
        {guides.filter(g => g.featured).map((guide) => {
          const IconComponent = guide.icon;
          return (
            <Card key={guide.type} className="border-4 border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50 mb-6">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                      ⭐ RECOMMENDED START HERE
                    </div>
                    <CardTitle className="text-2xl mb-1">{guide.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{guide.audience}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{guide.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Complete Coverage:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {guide.topics.map((topic, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center gap-2 bg-white p-2 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleDownloadGuide(guide.type, guide.title)}
                  disabled={downloading === guide.type}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 h-12 text-base"
                >
                  {downloading === guide.type ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download Complete Guide (PDF)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Feature-Specific Guides</h2>
          <p className="text-sm text-gray-600">Detailed guides for specific features and workflows</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {guides.filter(g => !g.featured).map((guide) => {
            const IconComponent = guide.icon;
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              purple: 'from-purple-500 to-purple-600'
            };

            return (
              <Card key={guide.type} className="border-2 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${colorClasses[guide.color]} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{guide.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{guide.audience}</span>
                      </div>
                      <p className="text-sm text-gray-600">{guide.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Topics Covered:</p>
                    <ul className="space-y-1">
                      {guide.topics.map((topic, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleDownloadGuide(guide.type, guide.title)}
                    disabled={downloading === guide.type}
                    className={`w-full bg-gradient-to-r ${colorClasses[guide.color]} hover:opacity-90`}
                  >
                    {downloading === guide.type ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF Guide
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8 border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <BookOpen className="w-5 h-5" />
              About These Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-yellow-900">
              <p>
                <strong>📖 Comprehensive Instructions:</strong> Each guide includes detailed step-by-step 
                instructions with specific button names, field labels, and navigation paths.
              </p>
              <p>
                <strong>✅ Best Practices:</strong> Learn the recommended workflows and tips for using 
                AI features effectively while maintaining clinical accuracy.
              </p>
              <p>
                <strong>⚠️ Common Pitfalls:</strong> Understand what to avoid and troubleshooting 
                steps for common issues.
              </p>
              <p>
                <strong>📋 Checklists:</strong> Medicare compliance checklists and quality assurance 
                checkpoints included for clinical documentation.
              </p>
              <p className="mt-4 pt-3 border-t border-yellow-300">
                <strong>💡 Tip:</strong> Print these guides and keep them available at workstations 
                for quick reference during daily workflows.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}