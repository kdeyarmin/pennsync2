import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Clock, CheckCircle2, Clipboard, Download } from "lucide-react";

const stateSurveyVideos = [
  {
    id: "1",
    title: "How to Prepare for Home Health Medicare Survey",
    description: "Medicare surveyors don't knock - they show up. Learn key preparation strategies for your home health agency",
    duration: "58:30",
    category: "Survey Prep",
    videoId: "zsj2x-1zhIc",
    priority: "high"
  },
  {
    id: "2",
    title: "Survey Readiness for Home Health and Hospice",
    description: "Comprehensive guide to CMS survey process and readiness strategies",
    duration: "60:00",
    category: "Survey Prep",
    videoId: "7SrimL0OftY",
    priority: "high"
  },
  {
    id: "3",
    title: "Home Health Bag Technique - Best Practice",
    description: "6-step bag technique following accepted standards of practice for infection control during surveys",
    duration: "8:00",
    category: "Survey Prep",
    videoId: "T-oO-eZWO74",
    priority: "high"
  },

];

export default function StateSurveyVideos() {
  const [completedVideos, setCompletedVideos] = React.useState([]);
  const [bagTechniqueChecklist, setBagTechniqueChecklist] = React.useState({});

  const handleVideoComplete = (videoId) => {
    if (!completedVideos.includes(videoId)) {
      setCompletedVideos([...completedVideos, videoId]);
    }
  };

  const toggleChecklistItem = (step, itemIndex) => {
    const key = `${step}-${itemIndex}`;
    setBagTechniqueChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const categoryColors = {
    "Survey Prep": "bg-blue-100 text-blue-800"
  };

  const totalVideos = stateSurveyVideos.length;
  const completionPercentage = Math.round((completedVideos.length / totalVideos) * 100);

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">State Survey Preparation</h2>
              <p className="text-sm text-slate-600">Essential training videos to prepare for your state survey</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Your Progress</span>
              <span className="text-sm font-bold text-blue-600">{completedVideos.length} / {totalVideos} videos</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bag Technique Checklist */}
      <Card className="border-2 border-navy-300 bg-gradient-to-r from-navy-50 to-gold-50">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-navy-600" />
                Bag Technique Checklist - Survey Ready
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Essential infection control procedure - demonstrate proper technique during state surveys
              </p>
            </div>
            <Button
              variant="outline"
              className="flex-shrink-0 gap-2"
              onClick={async () => {
                try {
                  const response = await base44.functions.invoke('generateBagTechniquePDF');
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Bag_Technique_Checklist.pdf';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                } catch (error) {
                  console.error('Error downloading PDF:', error);
                }
              }}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Before You Begin */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-navy-600">Before You Begin</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Review the plan of care and provider's orders",
                "Introduce yourself and ask patient how they'd like to be addressed",
                "Confirm patient understanding of procedure and gain informed consent",
                "Locate a hard surface near patient (table) and trash receptacle",
                "Follow organization's infection control policies"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`before-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('before', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('before', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Prepare the Bag */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-blue-600">Step 1: Prepare the Bag</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Perform hand hygiene",
                "Remove cleansing wipes from outside pocket",
                "Clean the selected hard surface and let it dry",
                "Remove clean barrier from outside pocket and lay on dry surface",
                "Place bag on top of barrier",
                "Perform hand hygiene and open the bag",
                "Place down two barriers (clean area and dirty area)",
                "Obtain all necessary supplies and place on clean barrier",
                "Close the bag"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`step1-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('step1', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('step1', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 italic">
              *Note: Shoulder bags on barrier; rolling bags stay on floor
            </p>
          </div>

          {/* Step 2: Perform Patient Care */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-green-600">Step 2: Perform Patient Care</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Perform hand hygiene and don gloves if indicated",
                "Perform patient care, placing used equipment on dirty barrier (if reusable)",
                "Dispose of waste in trash according to organizational policies",
                "If item forgotten: perform hand hygiene before retrieving from bag",
                "After care completion: discard all remaining disposable supplies",
                "Perform hand hygiene"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`step2-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('step2', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('step2', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Clean Reusable Equipment */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-orange-600">Step 3: Clean Reusable Equipment</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Don clean gloves",
                "Use sanitizing wipes/disinfectant per organizational policies",
                "Clean all equipment used or removed from clean barrier",
                "Follow manufacturer's contact time for disinfection",
                "Place cleaned equipment back on clean barrier to dry"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`step3-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('step3', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('step3', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Return Equipment to Bag */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-indigo-600">Step 4: Return Equipment to Bag</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Doff used gloves using Aseptic Non Touch Technique",
                "Dispose of gloves in trash",
                "Perform hand hygiene",
                "Return cleaned items to the bag",
                "Close the bag",
                "Discard the barriers into the trash",
                "Perform hand hygiene"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`step4-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('step4', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('step4', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Step 5: Complete Procedure and Clean Up */}
          <div className="bg-white rounded-lg p-4 border border-navy-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Badge className="bg-teal-600">Step 5: Complete Procedure</Badge>
            </h3>
            <div className="space-y-2">
              {[
                "Assess patient for tolerance of performed treatments",
                "Confirm understanding with teach-back as appropriate",
                "Document the procedure",
                "Follow up with provider on noted abnormalities as indicated"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    checked={bagTechniqueChecklist[`step5-${idx}`] || false}
                    onCheckedChange={() => toggleChecklistItem('step5', idx)}
                    className="mt-0.5"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer" onClick={() => toggleChecklistItem('step5', idx)}>
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Completion Indicator */}
          {Object.values(bagTechniqueChecklist).filter(Boolean).length === 30 && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-900">Bag Technique Checklist Complete!</p>
                <p className="text-sm text-green-700">You're ready for state survey observation</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stateSurveyVideos.map((video) => (
          <Card 
            key={video.id}
            className={`hover:shadow-lg transition-shadow ${
              completedVideos.includes(video.id) ? 'border-green-300 bg-green-50' : ''
            } ${video.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base mb-2 flex items-center gap-2">
                    {completedVideos.includes(video.id) && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                    <span>{video.title}</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mb-2">{video.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={categoryColors[video.category] || "bg-slate-100 text-slate-800"}>
                      {video.category}
                    </Badge>
                    {video.priority === 'high' && (
                      <Badge className="bg-red-100 text-red-800">Priority</Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {video.duration}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* YouTube Embed */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://www.youtube.com/embed/${video.videoId}?rel=0`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              {/* Mark Complete Button */}
              {!completedVideos.includes(video.id) && (
                <button
                  onClick={() => handleVideoComplete(video.id)}
                  className="w-full mt-3 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Complete
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Message */}
      {completedVideos.length === totalVideos && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Congratulations!</h3>
            <p className="text-slate-600">
              You've completed all State Survey preparation videos. You're ready for your survey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}