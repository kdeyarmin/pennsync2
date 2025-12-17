import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, PlayCircle, CheckCircle2 } from "lucide-react";

const pennsylvaniaSurveyVideos = [
  {
    id: "1",
    title: "Pennsylvania State Survey Overview",
    description: "Introduction to PA state survey process and what to expect",
    duration: "12:45",
    category: "Overview",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "high"
  },
  {
    id: "2",
    title: "Documentation Standards for PA Surveys",
    description: "Key documentation requirements and best practices",
    duration: "18:30",
    category: "Documentation",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "high"
  },
  {
    id: "3",
    title: "OASIS Assessment for PA State Survey",
    description: "OASIS-E requirements and common survey findings",
    duration: "22:15",
    category: "OASIS",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "high"
  },
  {
    id: "4",
    title: "Infection Control & Safety Protocols",
    description: "PA-specific infection control and safety standards",
    duration: "15:20",
    category: "Safety",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "medium"
  },
  {
    id: "5",
    title: "Patient Rights & Privacy (HIPAA)",
    description: "Understanding patient rights compliance for surveys",
    duration: "14:10",
    category: "Compliance",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "medium"
  },
  {
    id: "6",
    title: "Medication Management Best Practices",
    description: "Medication reconciliation and documentation standards",
    duration: "16:45",
    category: "Clinical",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "medium"
  },
  {
    id: "7",
    title: "Survey Interview Techniques",
    description: "How to respond to surveyor questions effectively",
    duration: "10:30",
    category: "Communication",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
    priority: "high"
  },
  {
    id: "8",
    title: "Common Deficiency Citations & How to Avoid Them",
    description: "Review of most common PA citations and prevention strategies",
    duration: "25:00",
    category: "Compliance",
    videoId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
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
    "Overview": "bg-blue-100 text-blue-800",
    "Documentation": "bg-purple-100 text-purple-800",
    "OASIS": "bg-green-100 text-green-800",
    "Safety": "bg-red-100 text-red-800",
    "Compliance": "bg-yellow-100 text-yellow-800",
    "Clinical": "bg-indigo-100 text-indigo-800",
    "Communication": "bg-pink-100 text-pink-800"
  };

  const totalVideos = pennsylvaniaSurveyVideos.length;
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
              <h2 className="text-xl font-bold text-gray-900">Pennsylvania State Survey Preparation</h2>
              <p className="text-sm text-gray-600">Essential training videos to prepare for your PA state survey</p>
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
        {pennsylvaniaSurveyVideos.map((video) => (
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
              You've completed all Pennsylvania State Survey preparation videos. You're ready for your survey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}