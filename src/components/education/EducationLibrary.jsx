import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  Heart,
  Pill,
  Activity,
  Utensils,
  Shield,
  Brain,
  AlertTriangle,
  ChevronRight
} from "lucide-react";

export default function EducationLibrary({ patient, onSelectMaterial }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen },
    { id: "cardiac", label: "Heart & Cardiac", icon: Heart },
    { id: "respiratory", label: "Respiratory", icon: Activity },
    { id: "diabetes", label: "Diabetes", icon: Pill },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
    { id: "safety", label: "Safety", icon: Shield },
    { id: "wound", label: "Wound Care", icon: AlertTriangle },
    { id: "hospice", label: "Hospice/Comfort", icon: Brain },
  ];

  const educationTopics = [
    {
      id: 1,
      title: "Understanding Congestive Heart Failure (CHF)",
      category: "cardiac",
      description: "Learn about CHF, daily weight monitoring, and when to call your nurse.",
      topics: ["Daily weight monitoring", "Fluid restriction", "Medication adherence", "Warning signs"],
      readingLevel: "simple"
    },
    {
      id: 2,
      title: "Managing Your Blood Pressure",
      category: "cardiac",
      description: "Tips for controlling high blood pressure at home.",
      topics: ["Blood pressure monitoring", "Low-sodium diet", "Stress management", "Medications"],
      readingLevel: "simple"
    },
    {
      id: 3,
      title: "Living with COPD",
      category: "respiratory",
      description: "Breathing exercises and techniques for managing COPD.",
      topics: ["Pursed lip breathing", "Oxygen therapy", "Inhaler use", "Avoiding triggers"],
      readingLevel: "simple"
    },
    {
      id: 4,
      title: "Diabetes Self-Management",
      category: "diabetes",
      description: "Daily care for managing diabetes and blood sugar levels.",
      topics: ["Blood glucose monitoring", "Insulin administration", "Foot care", "Diet management"],
      readingLevel: "moderate"
    },
    {
      id: 5,
      title: "Preventing Falls at Home",
      category: "safety",
      description: "Keep yourself safe from falls with these home safety tips.",
      topics: ["Home modifications", "Exercise for balance", "Medication review", "Proper footwear"],
      readingLevel: "simple"
    },
    {
      id: 6,
      title: "Caring for Your Wound",
      category: "wound",
      description: "Proper wound care techniques to promote healing.",
      topics: ["Dressing changes", "Signs of infection", "Nutrition for healing", "When to call nurse"],
      readingLevel: "simple"
    },
    {
      id: 7,
      title: "Understanding Hospice Care",
      category: "hospice",
      description: "What to expect from hospice and comfort-focused care.",
      topics: ["Comfort measures", "Pain management", "Emotional support", "Family involvement"],
      readingLevel: "simple"
    },
    {
      id: 8,
      title: "Heart-Healthy Eating",
      category: "nutrition",
      description: "Dietary guidelines for a healthy heart.",
      topics: ["Low-sodium foods", "Reading labels", "Portion control", "Meal planning"],
      readingLevel: "simple"
    },
    {
      id: 9,
      title: "Medication Safety at Home",
      category: "safety",
      description: "Keep track of your medications safely.",
      topics: ["Pill organizers", "Avoiding interactions", "Storage tips", "Refill reminders"],
      readingLevel: "simple"
    },
    {
      id: 10,
      title: "Managing Pain at Home",
      category: "hospice",
      description: "Techniques for managing chronic and acute pain.",
      topics: ["Pain scales", "Medication timing", "Non-drug methods", "Communication"],
      readingLevel: "simple"
    },
  ];

  const filteredTopics = educationTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.topics.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Suggest topics based on patient diagnosis
  const suggestedTopics = patient?.primary_diagnosis ? 
    educationTopics.filter(t => 
      t.title.toLowerCase().includes(patient.primary_diagnosis.toLowerCase()) ||
      t.topics.some(topic => patient.primary_diagnosis.toLowerCase().includes(topic.toLowerCase()))
    ).slice(0, 3) : [];

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    const Icon = cat?.icon || BookOpen;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search education topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Suggested for Patient */}
      {suggestedTopics.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-green-800">
              📌 Suggested for {patient.first_name} ({patient.primary_diagnosis})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid md:grid-cols-3 gap-3">
              {suggestedTopics.map((topic) => (
                <Card 
                  key={topic.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-green-300"
                  onClick={() => onSelectMaterial({ title: topic.title, topic: topic.title })}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {getCategoryIcon(topic.category)}
                      <div>
                        <h4 className="font-medium text-sm">{topic.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{topic.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Topics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTopics.map((topic) => (
          <Card 
            key={topic.id} 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
            onClick={() => onSelectMaterial({ title: topic.title, topic: topic.title })}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(topic.category)}
                  <Badge variant="outline" className="text-xs">
                    {categories.find(c => c.id === topic.category)?.label}
                  </Badge>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {topic.readingLevel}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">{topic.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
              
              <div className="flex flex-wrap gap-1">
                {topic.topics.slice(0, 3).map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
                {topic.topics.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{topic.topics.length - 3} more
                  </Badge>
                )}
              </div>
              
              <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
                Generate Material <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No topics found matching your search.</p>
            <p className="text-sm">Try a different search term or category.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}