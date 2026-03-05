import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SmartNotePDFExporter({ finalNote, patient, visitType, analysisScore }) {
  const [exporting, setExporting] = useState(false);
  
  const { data: agencySettings } = useQuery({
    queryKey: ["agencySettings"],
    queryFn: async () => {
      const settings = await base44.entities.AgencySettings.list();
      return settings?.[0];
    },
    enabled: !!finalNote,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const exportToPDF = async () => {
    if (!finalNote || !patient) return;
    
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Header: Facility Name
      if (agencySettings?.office_name) {
        doc.setFontSize(16);
        doc.setTextColor(30, 66, 159); // Indigo color
        doc.setFont(undefined, "bold");
        doc.text(agencySettings.office_name, margin, yPos);
        yPos += 8;

        // Address
        if (agencySettings?.office_address) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.setFont(undefined, "normal");
          doc.text(agencySettings.office_address, margin, yPos);
          yPos += 5;
        }
      }

      // Divider line
      yPos += 2;
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont(undefined, "bold");
      doc.text("CLINICAL NURSING NOTE", margin, yPos);
      yPos += 8;

      // Patient Details Section
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(50);
      doc.text("PATIENT INFORMATION", margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(80);
      
      const patientName = `${patient.first_name} ${patient.last_name}`;
      const dob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "N/A";
      const mrn = patient.medical_record_number || "N/A";
      const diagnosis = patient.primary_diagnosis || "Not documented";

      doc.text(`Name: ${patientName}`, margin, yPos);
      yPos += 5;
      doc.text(`Date of Birth: ${dob}`, margin, yPos);
      yPos += 5;
      doc.text(`Medical Record #: ${mrn}`, margin, yPos);
      yPos += 5;
      doc.text(`Primary Diagnosis: ${diagnosis}`, margin, yPos);
      yPos += 8;

      // Visit Info
      doc.setFont(undefined, "bold");
      doc.setTextColor(50);
      doc.text("VISIT DETAILS", margin, yPos);
      yPos += 6;

      doc.setFont(undefined, "normal");
      doc.setTextColor(80);
      const today = new Date().toLocaleDateString();
      doc.text(`Visit Date: ${today}`, margin, yPos);
      yPos += 5;
      doc.text(`Visit Type: ${visitType || "N/A"}`, margin, yPos);
      yPos += 5;
      doc.text(`Documentation Quality Score: ${analysisScore || "N/A"}%`, margin, yPos);
      yPos += 8;

      // Divider
      doc.setDrawColor(220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Clinical Note Content
      doc.setFont(undefined, "bold");
      doc.setTextColor(50);
      doc.text("CLINICAL NOTE", margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0);

      // Split note into paragraphs and add to PDF with text wrapping
      const noteLines = doc.splitTextToSize(finalNote, contentWidth);
      noteLines.forEach((line) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 4;
      });

      // Add signature line section
      yPos += 12;
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Signature section
      doc.setFont(undefined, "bold");
      doc.setTextColor(50);
      doc.setFontSize(10);
      doc.text("SIGNATURE & VERIFICATION", margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(80);
      doc.text(`Nurse Name: ${currentUser?.full_name || ""}`, margin, yPos);
      yPos += 5;
      doc.text(`Date Signed: _______________`, margin, yPos);
      yPos += 8;

      // Signature line
      doc.setDrawColor(0);
      doc.line(margin, yPos, pageWidth - margin - 60, yPos);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Nurse Signature", margin, yPos + 3);

      // Generate filename
      const filename = `${patientName.replace(/\s+/g, "_")}_Note_${today.replace(/\//g, "-")}.pdf`;
      
      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!finalNote || !patient) return null;

  return (
    <Button
      onClick={exportToPDF}
      disabled={exporting}
      className="bg-blue-600 hover:bg-blue-700 h-12 sm:h-10 gap-2 font-semibold flex-1 sm:flex-none"
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF…
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" /> Export as PDF
        </>
      )}
    </Button>
  );
}