import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DocumentManagementDashboard from "../components/documents/DocumentManagementDashboard";
import DocumentPackageCreator from "../components/documents/DocumentPackageCreator";

export default function DocumentManagement() {
  const [showPackageCreator, setShowPackageCreator] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track and manage patient document signatures and packages
          </p>
        </div>
        <Button 
          onClick={() => setShowPackageCreator(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Package
        </Button>
      </div>

      <DocumentManagementDashboard />

      <DocumentPackageCreator
        open={showPackageCreator}
        onClose={() => setShowPackageCreator(false)}
      />
    </div>
  );
}