import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      pdf_template_url, 
      patient_info,
      patient_id,
      document_type 
    } = await req.json();

    if (!pdf_template_url || !patient_info) {
      return Response.json({ 
        error: 'Missing required fields: pdf_template_url, patient_info' 
      }, { status: 400 });
    }

    // Fetch the PDF template
    const pdfResponse = await fetch(pdf_template_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF template: ${pdfResponse.statusText}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Try to fill PDF form fields first (if it's a fillable PDF)
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      // Common field mappings
      const fieldMappings = {
        'patient_name': patient_info.patient_name,
        'PatientName': patient_info.patient_name,
        'name': patient_info.patient_name,
        'Name': patient_info.patient_name,
        'date_of_birth': patient_info.date_of_birth,
        'DateOfBirth': patient_info.date_of_birth,
        'DOB': patient_info.date_of_birth,
        'address': patient_info.address,
        'Address': patient_info.address,
        'city': patient_info.city,
        'City': patient_info.city,
        'state': patient_info.state,
        'State': patient_info.state,
        'zip': patient_info.zip_code,
        'zip_code': patient_info.zip_code,
        'ZipCode': patient_info.zip_code,
        'phone': patient_info.phone,
        'Phone': patient_info.phone,
        'email': patient_info.email,
        'Email': patient_info.email,
        'emergency_contact': patient_info.emergency_contact_name,
        'EmergencyContact': patient_info.emergency_contact_name,
        'emergency_phone': patient_info.emergency_contact_phone,
        'EmergencyPhone': patient_info.emergency_contact_phone,
        'physician': patient_info.physician_name,
        'Physician': patient_info.physician_name,
        'physician_name': patient_info.physician_name,
        'PhysicianName': patient_info.physician_name,
        'physician_phone': patient_info.physician_phone,
        'PhysicianPhone': patient_info.physician_phone,
        'insurance': patient_info.insurance_provider,
        'Insurance': patient_info.insurance_provider,
        'insurance_provider': patient_info.insurance_provider,
        'policy_number': patient_info.insurance_policy,
        'PolicyNumber': patient_info.insurance_policy,
        'admission_date': patient_info.admission_date,
        'AdmissionDate': patient_info.admission_date,
        'date': new Date().toLocaleDateString()
      };

      fields.forEach(field => {
        const fieldName = field.getName();
        const value = fieldMappings[fieldName];
        
        if (value) {
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value));
          } catch (e) {
            console.log(`Could not fill field ${fieldName}:`, e.message);
          }
        }
      });

      // Flatten the form to prevent editing
      form.flatten();
    } catch (e) {
      console.log('No fillable form fields found or error filling them:', e.message);
      
      // If no form fields, add text overlays on the first page
      const fontSize = 11;
      const lineHeight = 14;
      let yPosition = height - 150;

      const addText = (label, value, x = 60) => {
        if (value) {
          firstPage.drawText(`${label}: ${value}`, {
            x,
            y: yPosition,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
        }
      };

      // Add patient info as text overlay
      addText('Patient Name', patient_info.patient_name);
      addText('Date of Birth', patient_info.date_of_birth);
      
      if (patient_info.address) {
        addText('Address', `${patient_info.address}, ${patient_info.city || ''} ${patient_info.state || ''} ${patient_info.zip_code || ''}`.trim());
      }
      
      addText('Phone', patient_info.phone);
      addText('Email', patient_info.email);
      
      yPosition -= 5; // Extra spacing
      addText('Emergency Contact', patient_info.emergency_contact_name);
      addText('Emergency Phone', patient_info.emergency_contact_phone);
      
      yPosition -= 5;
      addText('Physician', patient_info.physician_name);
      addText('Physician Phone', patient_info.physician_phone);
      
      yPosition -= 5;
      addText('Insurance', patient_info.insurance_provider);
      addText('Policy Number', patient_info.insurance_policy);
      
      yPosition -= 5;
      addText('Admission Date', patient_info.admission_date);
    }

    // Save the modified PDF
    const preparedPdfBytes = await pdfDoc.save();

    // Upload to Base44 storage
    const blob = new Blob([preparedPdfBytes], { type: 'application/pdf' });
    const fileName = `prepared-${document_type || 'document'}-${patient_id || 'patient'}-${Date.now()}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Log the activity
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'pdf_prepared',
      details: {
        document_type,
        patient_id,
        patient_name: patient_info.patient_name,
        prepared_pdf: uploadResult.file_url
      },
      page: 'pdf_preparation'
    });

    return Response.json({
      success: true,
      prepared_pdf_url: uploadResult.file_url,
      patient_info
    });

  } catch (error) {
    console.error('PDF preparation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to prepare PDF' 
    }, { status: 500 });
  }
});