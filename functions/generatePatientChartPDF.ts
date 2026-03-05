import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, includeVisits = true, includeCare = true, includeIncidents = true } = body;

    if (!patientId) {
      return Response.json({ error: 'Missing patientId' }, { status: 400 });
    }

    // Fetch patient data
    const patients = await base44.entities.Patient.filter({ id: patientId });
    if (!patients || patients.length === 0) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patient = patients[0];

    // Fetch related data
    const visits = includeVisits ? await base44.entities.Visit.filter({ patient_id: patientId }) : [];
    const carePlans = includeCare ? await base44.entities.CarePlan.filter({ patient_id: patientId }) : [];
    const incidents = includeIncidents ? await base44.entities.Incident.filter({ patient_id: patientId }) : [];

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 15;
    const margin = 10;
    const lineHeight = 5;

    // Helper to add page break if needed
    const checkPageBreak = (spaceNeeded) => {
      if (yPosition + spaceNeeded > pageHeight - 10) {
        pdf.addPage();
        yPosition = 15;
      }
    };

    // Helper to format text
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    // Header with HIPAA notice
    pdf.setFontSize(14);
    pdf.setTextColor(31, 41, 55);
    pdf.text('PATIENT MEDICAL RECORD', margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    pdf.text(`By: ${user.full_name} (${user.email})`, pageWidth - margin - 60, yPosition);
    yPosition += 8;

    // HIPAA Confidentiality Banner
    pdf.setFillColor(255, 193, 7);
    pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 8, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.text('CONFIDENTIAL - For Authorized Users Only. Contains Protected Health Information (PHI) subject to 45 CFR §164.500.', margin + 1, yPosition + 2);
    yPosition += 12;

    // Patient Demographics
    pdf.setFontSize(11);
    pdf.setTextColor(31, 41, 55);
    pdf.text('PATIENT DEMOGRAPHICS', margin, yPosition);
    yPosition += 6;

    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    const demoData = [
      `Name: ${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`,
      `Date of Birth: ${formatDate(patient.date_of_birth)}`,
      `Medical Record Number: ${patient.medical_record_number || 'Not specified'}`,
      `Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}`,
      `Status: ${patient.status || 'Not specified'}`,
      `Admission Date: ${formatDate(patient.admission_date)}`,
      `Address: ${patient.address || 'Not specified'}`,
      `Phone: ${patient.phone || 'Not specified'}`,
      `Email: ${patient.email || 'Not specified'}`,
      `Payor: ${patient.payor || 'Not specified'}`
    ];

    demoData.forEach(text => {
      checkPageBreak(4);
      pdf.text(text, margin, yPosition);
      yPosition += 4;
    });

    // Emergency Contact
    if (patient.emergency_contact_name) {
      yPosition += 3;
      checkPageBreak(8);
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('EMERGENCY CONTACT', margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      const emergencyData = [
        `Name: ${patient.emergency_contact_name}`,
        `Relationship: ${patient.emergency_contact_relationship || 'Not specified'}`,
        `Phone: ${patient.emergency_contact_phone || 'Not specified'}`
      ];

      emergencyData.forEach(text => {
        pdf.text(text, margin, yPosition);
        yPosition += 4;
      });
    }

    // Clinical Information
    yPosition += 5;
    checkPageBreak(10);
    pdf.setFontSize(10);
    pdf.setTextColor(31, 41, 55);
    pdf.text('CLINICAL INFORMATION', margin, yPosition);
    yPosition += 5;

    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    const clinicalData = [
      `Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}`,
      `Allergies: ${patient.allergies || 'NKDA'}`,
      `Physician: ${patient.physician_name || 'Not specified'}`
    ];

    clinicalData.forEach(text => {
      pdf.text(text, margin, yPosition);
      yPosition += 4;
    });

    // Secondary Diagnoses
    if (patient.secondary_diagnoses && patient.secondary_diagnoses.length > 0) {
      yPosition += 3;
      checkPageBreak(6);
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      const diagText = `Secondary Diagnoses: ${patient.secondary_diagnoses.join(', ')}`;
      const splitText = pdf.splitTextToSize(diagText, pageWidth - 2 * margin);
      pdf.text(splitText, margin, yPosition);
      yPosition += splitText.length * 4 + 2;
    }

    // Current Medications
    if (patient.current_medications && patient.current_medications.length > 0) {
      yPosition += 5;
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('CURRENT MEDICATIONS', margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);
      patient.current_medications.forEach((med, idx) => {
        checkPageBreak(6);
        const medText = `${idx + 1}. ${med.name} - ${med.dosage || 'N/A'} - ${med.frequency || 'N/A'}`;
        pdf.text(medText, margin + 2, yPosition);
        yPosition += 4;
      });
    }

    // Recent Visits
    if (includeVisits && visits.length > 0) {
      yPosition += 5;
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('VISIT HISTORY (Last 10)', margin, yPosition);
      yPosition += 5;

      const recentVisits = visits.slice(0, 10);
      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);
      
      recentVisits.forEach((visit) => {
        checkPageBreak(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${formatDate(visit.visit_date)} - ${visit.visit_type.replace(/_/g, ' ').toUpperCase()}`, margin, yPosition);
        yPosition += 4;
        
        pdf.setFont(undefined, 'normal');
        if (visit.nurse_notes) {
          const notesText = pdf.splitTextToSize(visit.nurse_notes.substring(0, 300), pageWidth - 2 * margin - 2);
          pdf.text(notesText, margin + 2, yPosition);
          yPosition += notesText.length * 3.5 + 2;
        }
        yPosition += 2;
      });
    }

    // Care Plans
    if (includeCare && carePlans.length > 0) {
      yPosition += 5;
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('ACTIVE CARE PLANS', margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);

      carePlans.forEach((plan, idx) => {
        checkPageBreak(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${idx + 1}. Problem: ${plan.problem}`, margin, yPosition);
        yPosition += 4;
        
        pdf.setFont(undefined, 'normal');
        const goalText = pdf.splitTextToSize(`Goal: ${plan.goal}`, pageWidth - 2 * margin - 2);
        pdf.text(goalText, margin + 2, yPosition);
        yPosition += goalText.length * 3.5 + 2;
        
        if (plan.target_date) {
          pdf.text(`Target Date: ${formatDate(plan.target_date)}`, margin + 2, yPosition);
          yPosition += 4;
        }
        yPosition += 1;
      });
    }

    // Incidents
    if (includeIncidents && incidents.length > 0) {
      yPosition += 5;
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('INCIDENT REPORTS', margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);

      incidents.slice(0, 5).forEach((incident, idx) => {
        checkPageBreak(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${idx + 1}. ${incident.incident_name || incident.incident_type.replace(/_/g, ' ')} - ${formatDate(incident.incident_date)}`, margin, yPosition);
        yPosition += 4;
        
        pdf.setFont(undefined, 'normal');
        if (incident.report) {
          const reportText = pdf.splitTextToSize(incident.report.substring(0, 200), pageWidth - 2 * margin - 2);
          pdf.text(reportText, margin + 2, yPosition);
          yPosition += reportText.length * 3.5 + 2;
        }
        yPosition += 1;
      });
    }

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 5);
      pdf.text('This document is confidential and for authorized healthcare providers only.', margin, pageHeight - 5);
    }

    const pdfBytes = pdf.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="patient_chart_${patient.medical_record_number || patientId}_${new Date().getTime()}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});