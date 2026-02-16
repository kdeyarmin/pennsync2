import React from "react";
import CameraFaxSender from "../components/fax/CameraFaxSender";

export default function SendFax() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Fax</h1>
          <p className="text-gray-600 mt-2">
            Capture a photo with your device camera and send it as a fax
          </p>
        </div>
        
        <CameraFaxSender />
      </div>
    </div>
  );
}