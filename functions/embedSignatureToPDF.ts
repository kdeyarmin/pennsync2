import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      pdf_url, 
      signatures, // Array of signature objects
      signature_data_url, // Legacy support
      signer_name, // Legacy support
      signature_date,
      form_data = {},
      patient_id,
      document_type 
    } = await req.json();

    // Support both single signature (legacy) and multiple signatures
    const signatureArray = signatures || [{
      field_name: 'signature',
      signature_data_url,
      signer_name,
      signer_role: 'Patient',
      signature_date: signature_date || new Date().toISOString()
    }];

    // Validate required fields
    if (!pdf_url || signatureArray.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: pdf_url and signatures' 
      }, { status: 400 });
    }

    // Fetch the original PDF
    const pdfResponse = await fetch(pdf_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Pre-fill form fields if any
    const form = pdfDoc.getForm();
    if (form && Object.keys(form_data).length > 0) {
      try {
        const fields = form.getFields();
        Object.entries(form_data).forEach(([fieldName, value]) => {
          try {
            const field = form.getTextField(fieldName);
            if (field) field.setText(String(value));
          } catch (e) {
            console.log(`Could not fill field ${fieldName}:`, e.message);
          }
        });
      } catch (e) {
        console.log('Form filling warning:', e.message);
      }
    }

    // Embed all signatures
    let yOffset = 150;
    const signatureWidth = 180;
    const signatureHeight = 70;
    const fontSize = 9;

    for (const sig of signatureArray) {
      // Convert base64 signature to bytes
      const signatureBase64 = sig.signature_data_url.split(',')[1];
      const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

      // Embed the signature image
      const signatureImage = await pdfDoc.embedPng(signatureBytes);

      // Draw signature image
      lastPage.drawImage(signatureImage, {
        x: 50,
        y: yOffset,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Add signature text info
      lastPage.drawText(`${sig.signer_role}: ${sig.signer_name}`, {
        x: 50,
        y: yOffset - 15,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Date: ${new Date(sig.signature_date).toLocaleDateString()}`, {
        x: 50,
        y: yOffset - 28,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      yOffset -= 120; // Move down for next signature
    }

    // Save the modified PDF
    const signedPdfBytes = await pdfDoc.save();

    // Upload the signed PDF to Base44 storage
    const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const fileName = `signed-${document_type || 'document'}-${patient_id || 'unknown'}-${Date.now()}.pdf`;
    
    // Create a File object from the blob
    const file = new File([blob], fileName, { type: 'application/pdf' });

    // Upload using Base44 integration
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Log the signature event
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'document_signed',
      details: {
        document_type,
        patient_id,
        signatures: signatureArray.map(s => ({
          role: s.signer_role,
          name: s.signer_name,
          date: s.signature_date
        })),
        form_data,
        original_pdf: pdf_url,
        signed_pdf: uploadResult.file_url
      },
      page: 'pdf_signature'
    });

    return Response.json({
      success: true,
      signed_pdf_url: uploadResult.file_url,
      signatures: signatureArray.map(s => ({ role: s.signer_role, name: s.signer_name })),
      signature_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF signature error:', error);
    return Response.json({ 
      error: error.message || 'Failed to sign PDF' 
    }, { status: 500 });
  }
});