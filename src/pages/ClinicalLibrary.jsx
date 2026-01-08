import React from "react";
import ClinicalLibraryManager from "../components/clinical/ClinicalLibraryManager";

export default function ClinicalLibrary() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Clinical Phrase Library</h1>
        <p className="text-gray-600 mt-2">
          Create and manage quick phrases that expand into full Medicare-compliant documentation.
          Perfect for common assessments, education, and interventions.
        </p>
      </div>

      <ClinicalLibraryManager />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Generic Templates</h3>
          <p className="text-sm text-blue-800 mb-4">
            Use for standard documentation that applies to all patients.
          </p>
          <div className="space-y-2 text-sm">
            <div className="bg-white rounded p-3">
              <code className="text-blue-600 font-mono">diabetic education</code>
              <p className="text-gray-600 mt-1 text-xs">
                Expands to full diabetic education documentation
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <code className="text-blue-600 font-mono">fall risk assessment</code>
              <p className="text-gray-600 mt-1 text-xs">
                Generates complete fall risk evaluation
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-3">Patient-Specific Templates</h3>
          <p className="text-sm text-purple-800 mb-4">
            Automatically pulls patient data to personalize documentation.
          </p>
          <div className="space-y-2 text-sm">
            <div className="bg-white rounded p-3">
              <code className="text-purple-600 font-mono">wound care provided</code>
              <p className="text-gray-600 mt-1 text-xs">
                Uses patient's wound data to generate specific care notes
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <code className="text-purple-600 font-mono">medication review</code>
              <p className="text-gray-600 mt-1 text-xs">
                Includes patient's current medications in documentation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}