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
      document_type,
      template_id,
      field_mappings = []
    } = await req.json();

    if (!pdf_template_url || !patient_info) {
      return Response.json({ 
        error: 'Missing required fields: pdf_template_url, patient_info' 
      }, { status: 400 });
    }

    // Fetch additional patient data if mappings require it
    let patientData = null;
    let visitData = null;
    let carePlans = [];
    
    if (patient_id && field_mappings.length > 0) {
      try {
        patientData = await base44.entities.Patient.filter({ id: patient_id });
        if (patientData.length > 0) patientData = patientData[0];
        
        // Get latest visit if needed
        if (field_mappings.some(m => m.data_source === 'visit')) {
          const visits = await base44.entities.Visit.filter(
            { patient_id },
            '-visit_date',
            1
          );
          if (visits.length > 0) visitData = visits[0];
        }
        
        // Get active care plans if needed
        if (field_mappings.some(m => m.data_source === 'care_plan')) {
          carePlans = await base44.entities.CarePlan.filter({
            patient_id,
            status: 'active'
          });
        }
      } catch (e) {
        console.log('Error fetching additional data:', e.message);
      }
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

    // Helper to get nested value from object
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => {
        if (key.includes('[')) {
          const arrayKey = key.split('[')[0];
          const index = parseInt(key.split('[')[1].split(']')[0]);
          return current?.[arrayKey]?.[index];
        }
        return current?.[key];
      }, obj);
    };

    // Try to fill PDF form fields first (if it's a fillable PDF)
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      // Build dynamic field mappings based on template configuration
      const dynamicMappings = {};
      
      // Add patient_info mappings
      Object.entries(patient_info).forEach(([key, value]) => {
        dynamicMappings[key] = value;
        dynamicMappings[key.charAt(0).toUpperCase() + key.slice(1)] = value;
      });
      
      // Add custom field mappings from template
      field_mappings.forEach(mapping => {
        let value;
        
        switch (mapping.data_source) {
          case 'patient':
            value = patientData ? getNestedValue(patientData, mapping.field_path) : null;
            break;
          case 'visit':
            value = visitData ? getNestedValue(visitData, mapping.field_path) : null;
            break;
          case 'care_plan':
            if (carePlans.length > 0) {
              value = getNestedValue(carePlans[0], mapping.field_path);
            }
            break;
          case 'custom':
            value = patient_info[mapping.field_path] || mapping.default_value;
            break;
        }
        
        if (value !== null && value !== undefined) {
          // Format value based on field type
          if (mapping.field_type === 'date' && value) {
            value = new Date(value).toLocaleDateString();
          } else if (mapping.field_type === 'checkbox') {
            value = value ? 'Yes' : 'No';
          }
          
          dynamicMappings[mapping.pdf_field_name] = String(value);
        } else if (mapping.default_value) {
          dynamicMappings[mapping.pdf_field_name] = mapping.default_value;
        }
      });
      
      // Add current date
      dynamicMappings['date'] = new Date().toLocaleDateString();
      dynamicMappings['Date'] = new Date().toLocaleDateString();

      fields.forEach(field => {
        const fieldName = field.getName();
        const value = dynamicMappings[fieldName];
        
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