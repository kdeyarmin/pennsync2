import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Shield, GraduationCap } from "lucide-react";
import ClinicalLibraryManager from "@/components/clinical/ClinicalLibraryManager";
import GuidelineComplianceChecker from "@/components/guidelines/GuidelineComplianceChecker";
import GuidelineReferencePanel from "@/components/guidelines/GuidelineReferencePanel";
import EducationLibrary from "@/components/education/EducationLibrary";

export default function ResourceLibrary() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          Resource Library
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Clinical templates, Medicare guidelines, and patient education materials
        </p>
      </div>

      <Tabs defaultValue="clinical" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2">
          <TabsTrigger value="clinical" className="min-h-[44px]">
            <BookOpen className="w-4 h-4 mr-2" />
            Clinical Templates
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="min-h-[44px]">
            <Shield className="w-4 h-4 mr-2" />
            Medicare Guidelines
          </TabsTrigger>
          <TabsTrigger value="education" className="min-h-[44px]">
            <GraduationCap className="w-4 h-4 mr-2" />
            Patient Education
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinical">
          <ClinicalLibraryManager />
        </TabsContent>

        <TabsContent value="guidelines">
          <div className="space-y-6">
            <GuidelineComplianceChecker />
            <GuidelineReferencePanel />
          </div>
        </TabsContent>

        <TabsContent value="education">
          <EducationLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}