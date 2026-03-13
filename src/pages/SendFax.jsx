import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, FileText, History, Search, Upload, BookTemplate, Layers, Activity } from "lucide-react";
import EnhancedCameraFaxSender from "../components/fax/EnhancedCameraFaxSender";
import DocumentFaxSender from "../components/fax/DocumentFaxSender";
import PhotoUploadFaxSender from "../components/fax/PhotoUploadFaxSender";
import EnhancedFaxHistory from "../components/fax/EnhancedFaxHistory";
import FaxSearchInterface from "../components/fax/FaxSearchInterface";
import FaxTemplateManager from "../components/fax/FaxTemplateManager";
import BatchFaxSender from "../components/fax/BatchFaxSender";
import RealtimeFaxStatusTracker from "../components/fax/RealtimeFaxStatusTracker";

export default function SendFax() {
  const [activeTab, setActiveTab] = useState("upload");
  const [prefilledData, setPrefilledData] = useState(null);

  const handleApplyTemplate = (tpl) => {
    setPrefilledData(tpl);
    setActiveTab("upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/70 to-sky-100/80 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/15">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
            </div>
            <span className="truncate">Fax Center</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-200/90 mt-2">
            Send, review, and track faxes from one professional workspace.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-1 scrollbar-hide">
            <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
              {[
                { value: "upload",     Icon: Upload,        label: "Photo"     },
                { value: "camera",     Icon: Smartphone,    label: "Camera"    },
                { value: "documents",  Icon: FileText,      label: "Doc"       },
                { value: "batch",      Icon: Layers,        label: "Batch"     },
                { value: "templates",  Icon: BookTemplate,  label: "Templates" },
                { value: "status",     Icon: Activity,      label: "Status"    },
                { value: "search",     Icon: Search,        label: "Search"    },
                { value: "history",    Icon: History,       label: "History"   },
              ].map(({ value, Icon, label }) => (
                <TabsTrigger key={value} value={value} className="flex flex-col sm:flex-row items-center gap-1 px-3 py-2 min-h-[52px] sm:min-h-[44px] min-w-[60px] sm:min-w-0 text-xs sm:text-sm whitespace-nowrap">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="upload" className="mt-4 sm:mt-6">
            <PhotoUploadFaxSender prefilledData={prefilledData} />
          </TabsContent>

          <TabsContent value="camera" className="mt-4 sm:mt-6">
            <EnhancedCameraFaxSender />
          </TabsContent>

          <TabsContent value="documents" className="mt-4 sm:mt-6">
            <DocumentFaxSender prefilledData={prefilledData} />
          </TabsContent>

          <TabsContent value="batch" className="mt-4 sm:mt-6">
            <BatchFaxSender prefilledData={prefilledData} />
          </TabsContent>

          <TabsContent value="templates" className="mt-4 sm:mt-6">
            <FaxTemplateManager onApplyTemplate={handleApplyTemplate} />
          </TabsContent>

          <TabsContent value="status" className="mt-4 sm:mt-6">
            <RealtimeFaxStatusTracker />
          </TabsContent>

          <TabsContent value="search" className="mt-4 sm:mt-6">
            <FaxSearchInterface onSelectFaxForAI={() => {}} />
          </TabsContent>

          <TabsContent value="history" className="mt-4 sm:mt-6">
            <EnhancedFaxHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}