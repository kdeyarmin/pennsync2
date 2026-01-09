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
      signature_data_url, 
      signer_name, 
      signature_date,
      patient_id,
      document_type 
    } = await req.json();

    // Validate required fields
    if (!pdf_url || !signature_data_url || !signer_name) {
      return Response.json({ 
        error: 'Missing required fields: pdf_url, signature_data_url, signer_name' 
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

    // Convert base64 signature to bytes
    const signatureBase64 = signature_data_url.split(',')[1];
    const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

    // Embed the signature image
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    // Get the last page (typically where signature goes)
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Calculate signature dimensions and position
    const signatureWidth = 200;
    const signatureHeight = 80;
    const signatureX = 50;
    const signatureY = 100;

    // Draw signature image
    lastPage.drawImage(signatureImage, {
      x: signatureX,
      y: signatureY,
      width: signatureWidth,
      height: signatureHeight,
    });

    // Add signature text info below the image
    const fontSize = 10;
    lastPage.drawText(`Signed by: ${signer_name}`, {
      x: signatureX,
      y: signatureY - 15,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`Date: ${new Date(signature_date).toLocaleDateString()}`, {
      x: signatureX,
      y: signatureY - 30,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

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
        signer_name,
        signature_date,
        original_pdf: pdf_url,
        signed_pdf: uploadResult.file_url
      },
      page: 'pdf_signature'
    });

    return Response.json({
      success: true,
      signed_pdf_url: uploadResult.file_url,
      signer_name,
      signature_date
    });

  } catch (error) {
    console.error('PDF signature error:', error);
    return Response.json({ 
      error: error.message || 'Failed to sign PDF' 
    }, { status: 500 });
  }
});