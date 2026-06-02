import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Shield, GraduationCap, Stethoscope } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import ClinicalLibraryManager from "@/components/clinical/ClinicalLibraryManager";
import ClinicalReferencePanel from "@/components/clinical/ClinicalReferencePanel";
import GuidelineComplianceChecker from "@/components/guidelines/GuidelineComplianceChecker";
import GuidelineReferencePanel from "@/components/guidelines/GuidelineReferencePanel";
import EducationLibrary from "@/components/education/EducationLibrary";

export default function ResourceLibrary() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
<PageHeader
        icon={BookOpen}
        iconColor="bg-indigo-600"
        eyebrow="Resources"
        title="Resource Library"
        description="Clinical templates, Medicare guidelines, and patient education materials"
        favoritePage="ResourceLibrary"
      />

      <Tabs defaultValue="clinical" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="clinical" className="min-h-[44px]">
            <BookOpen className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Clinical </span>Templates
          </TabsTrigger>
          <TabsTrigger value="reference" className="min-h-[44px]">
            <Stethoscope className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Clinical </span>Reference
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="min-h-[44px]">
            <Shield className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Medicare </span>Guidelines
          </TabsTrigger>
          <TabsTrigger value="education" className="min-h-[44px]">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Patient </span>Education
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinical">
          <ClinicalLibraryManager />
        </TabsContent>

        <TabsContent value="reference">
          <ClinicalReferencePanel />
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