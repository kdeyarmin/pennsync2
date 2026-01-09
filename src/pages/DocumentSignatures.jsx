import React from "react";
import DocumentSignatureTracker from "../components/documents/DocumentSignatureTracker";

export default function DocumentSignatures() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Signatures</h1>
        <p className="text-gray-600">
          Track and manage patient document signatures across your agency
        </p>
      </div>

      <DocumentSignatureTracker />
    </div>
  );
}