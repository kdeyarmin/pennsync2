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

        <div className="grid md:grid-cols-2 gap-6">
          {guides.map((guide) => {
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