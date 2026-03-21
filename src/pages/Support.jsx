import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Mail, MessageSquare, BookOpen, AlertCircle, Clock, Shield } from "lucide-react";

export default function Support() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      category: "Getting Started",
      items: [
        {
          question: "How do I set up my account?",
          answer: "Your admin will invite you to Penn Sync with your email. Click the invitation link to set your password and complete your profile. You'll then need to select your care scope (Home Health, Hospice, or Both) before accessing the full platform."
        },
        {
          question: "What browsers are supported?",
          answer: "Penn Sync works on all modern browsers: Chrome, Firefox, Safari, and Edge (latest versions). For mobile access, use the web app on your iOS or Android device browser for the best experience."
        },
        {
          question: "How do I reset my password?",
          answer: "On the login page, click 'Forgot Password' and enter your email. You'll receive a link to reset your password. If you don't receive it, check your spam folder or contact your admin."
        }
      ]
    },
    {
      category: "Documentation & Smart Notes",
      items: [
        {
          question: "How does the Smart Notes Assistant work?",
          answer: "The Smart Notes Assistant uses AI to enhance your clinical documentation. You can dictate notes using voice, or manually enter text. The AI helps structure your documentation, flags compliance issues, suggests relevant clinical codes, and generates Medicare-compliant narratives."
        },
        {
          question: "Can I edit AI-enhanced notes?",
          answer: "Yes! All AI suggestions are editable. You review the enhanced content before saving and can modify any section. Your clinical judgment always takes priority."
        },
        {
          question: "Is my documentation compliant with Medicare requirements?",
          answer: "Penn Sync includes real-time compliance checking that flags documentation gaps and provides guidance on Medicare requirements. However, always review the compliance suggestions and consult your agency's compliance officer for final approval."
        }
      ]
    },
    {
      category: "Patient Management",
      items: [
        {
          question: "How do I add a new patient?",
          answer: "From the Patients page, click 'Add Patient' and fill in the required information (name, DOB, address). You can add patient details incrementally—complete required fields first, then add additional clinical information as available."
        },
        {
          question: "How do I schedule visits?",
          answer: "Navigate to Patients > [Patient Name] > Visits. Click 'Schedule Visit', select the visit type, date, and time. You can also use the Smart Route Optimizer on the Dashboard to efficiently plan your daily route."
        },
        {
          question: "Can I export patient data?",
          answer: "Yes. From any patient's chart, use the Export function to generate a PDF or CSV of their records. This is helpful for referrals, discharge summaries, or data backup."
        }
      ]
    },
    {
      category: "Compliance & Auditing",
      items: [
        {
          question: "How often should I check my compliance status?",
          answer: "Penn Sync provides real-time compliance monitoring. Check the Compliance Dashboard on your home page for daily updates. Address any 'Critical' flags immediately—'High' and 'Medium' alerts should be addressed within your agency's timeframe."
        },
        {
          question: "What is an OASIS assessment?",
          answer: "OASIS (Outcome and Assessment Information Set) assessments are federally-mandated clinical assessments for home health patients at specific timepoints. Penn Sync helps you complete and audit OASIS data to ensure accuracy and compliance."
        },
        {
          question: "How does Penn Sync help with Medicare compliance?",
          answer: "Penn Sync includes compliance auditing, real-time alerts about documentation gaps, OASIS validation, billing code suggestions, and regulatory guideline references. Use the Compliance Dashboard and Guidelines Library to stay current."
        }
      ]
    },
    {
      category: "Technical Issues",
      items: [
        {
          question: "What should I do if the app is slow?",
          answer: "Try refreshing the page or clearing your browser cache. Check your internet connection speed. If issues persist, try a different browser. For persistent problems, contact your IT support team."
        },
        {
          question: "Can I use Penn Sync offline?",
          answer: "Yes! Penn Sync includes offline mode for basic functions. Downloaded data syncs automatically when you reconnect. Navigate to Offline Mode from the main menu to enable it."
        },
        {
          question: "What do I do if I lose internet connection during a visit?",
          answer: "Penn Sync saves your work locally in offline mode. Continue documenting—your changes will sync automatically when you reconnect. Your admin can also restore data if needed."
        }
      ]
    },
    {
      category: "Security & Privacy",
      items: [
        {
          question: "Is my data HIPAA compliant?",
          answer: "Yes. Penn Sync is fully HIPAA-compliant with encrypted data transmission, secure authentication, audit logging, and regular security audits. Your health information is protected with enterprise-grade security."
        },
        {
          question: "Who can see my patient's information?",
          answer: "Access is role-based. Only users with appropriate permissions can view patient data. Admins can configure specific access levels. You can see who accessed patient records in the audit trail."
        },
        {
          question: "How often does Penn Sync back up my data?",
          answer: "Your data is backed up continuously in the cloud. Penn Sync maintains multiple redundant copies to ensure no data loss. You can't accidentally delete patient records—they're archived and recoverable by admins."
        }
      ]
    }
  ];

  const resources = [
    {
      icon: BookOpen,
      title: "Documentation Guides",
      description: "Step-by-step guides for all features",
      action: "View Guides"
    },
    {
      icon: MessageSquare,
      title: "Community Forum",
      description: "Connect with other Penn Sync users",
      action: "Join Community"
    },
    {
      icon: Shield,
      title: "Security & Compliance",
      description: "Learn about our security practices",
      action: "Read Policy"
    },
    {
      icon: AlertCircle,
      title: "Status & Updates",
      description: "Check system status and new features",
      action: "View Status"
    }
  ];

  const handleFAQToggle = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Support & Help Center</h1>
          <p className="text-xl text-indigo-100">
            Find answers, learn best practices, and get help with Penn Sync
          </p>
        </div>
      </div>

      {/* Quick Contact */}
      <div className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6 flex items-start gap-4">
              <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Email Support</h3>
                <p className="text-sm text-gray-600 mb-3">support@pennsync.io</p>
                <p className="text-xs text-gray-500">Response time: 24 hours</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 flex items-start gap-4">
              <Clock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Business Hours Support</h3>
                <p className="text-sm text-gray-600 mb-3">Mon-Fri, 8am-6pm ET</p>
                <p className="text-xs text-gray-500">Call your admin for emergencies</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Knowledge Base Resources */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Icon className="w-6 h-6 text-indigo-600" />
                    <Button variant="ghost" size="sm">{resource.action}</Button>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{resource.title}</h3>
                  <p className="text-sm text-gray-600">{resource.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((category, catIndex) => (
            <div key={catIndex}>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-600 rounded" />
                {category.category}
              </h3>
              <div className="space-y-2 mb-6">
                {category.items.map((item, itemIndex) => {
                  const faqId = `${catIndex}-${itemIndex}`;
                  return (
                    <Card key={itemIndex} className="border-gray-200">
                      <button
                        onClick={() => handleFAQToggle(faqId)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start justify-between gap-4"
                      >
                        <span className="font-semibold text-gray-900">{item.question}</span>
                        {openFAQ === faqId ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {openFAQ === faqId && (
                        <div className="px-4 pb-4 pt-0 text-gray-700 border-t border-gray-200">
                          {item.answer}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mb-12">
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Still need help?</h2>
            <p className="text-gray-600 mb-6">
              Our support team is ready to help. Contact us via email or ask your agency admin for more assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="gap-2">
                <Mail className="w-4 h-4" />
                Email Support
              </Button>
              <Button variant="outline">Contact Your Admin</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}