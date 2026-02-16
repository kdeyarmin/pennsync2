import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, FileText, History } from "lucide-react";
import CameraFaxSender from "../components/fax/CameraFaxSender";
import DocumentFaxSender from "../components/fax/DocumentFaxSender";
import FaxHistory from "../components/fax/FaxHistory";

export default function SendFax() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-8 h-8" />
            Fax Center
          </h1>
          <p className="text-gray-600 mt-2">
            Send faxes from camera or documents, and track fax history
          </p>
        </div>

        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera">
              <Smartphone className="w-4 h-4 mr-2" />
              Camera Fax
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Send Document
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-6">
            <CameraFaxSender />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentFaxSender />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <FaxHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}