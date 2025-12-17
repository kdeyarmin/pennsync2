import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, PlayCircle, CheckCircle2 } from "lucide-react";

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
  }
];

export default function StateSurveyVideos() {
  const [completedVideos, setCompletedVideos] = React.useState([]);

  const handleVideoComplete = (videoId) => {
    if (!completedVideos.includes(videoId)) {
      setCompletedVideos([...completedVideos, videoId]);
    }
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
              <h2 className="text-xl font-bold text-gray-900">State Survey Preparation</h2>
              <p className="text-sm text-gray-600">Essential training videos to prepare for your state survey</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Your Progress</span>
              <span className="text-sm font-bold text-blue-600">{completedVideos.length} / {totalVideos} videos</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
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
                  <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={categoryColors[video.category] || "bg-gray-100 text-gray-800"}>
                      {video.category}
                    </Badge>
                    {video.priority === 'high' && (
                      <Badge className="bg-red-100 text-red-800">Priority</Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
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
                  onEnded={() => handleVideoComplete(video.id)}
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Congratulations!</h3>
            <p className="text-gray-600">
              You've completed all State Survey preparation videos. You're ready for your survey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}