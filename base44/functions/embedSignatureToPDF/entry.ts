import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdf_url, signatures, template_fields } = await req.json();

    if (!pdf_url || !signatures || !template_fields) {
      return Response.json({ 
        error: 'Missing required parameters: pdf_url, signatures, and template_fields required' 
      }, { status: 400 });
    }

    // Fetch the original PDF
    const pdfResponse = await fetch(pdf_url);
    if (!pdfResponse.ok) {
      return Response.json({ error: 'Failed to fetch PDF' }, { status: 400 });
    }
    
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Process each signature
    for (const sig of signatures) {
      // Find the corresponding field from template
      const field = template_fields.find(f => f.id === sig.field_id);
      if (!field) continue;

      const page = pages[field.page || 0];
      if (!page) continue;

      // Decode base64 signature image
      const signatureImageBytes = Uint8Array.from(
        atob(sig.signature_data_url.split(',')[1]),
        c => c.charCodeAt(0)
      );

      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      const { width, height } = page.getSize();

      // Draw signature at field position
      page.drawImage(signatureImage, {
        x: field.x,
        y: height - field.y - field.height, // PDF coordinates are bottom-up
        width: field.width,
        height: field.height
      });

      // Add timestamp if requested
      if (sig.add_timestamp) {
        const timestamp = new Date(sig.signed_date).toLocaleString();
        page.drawText(`Signed: ${timestamp}`, {
          x: field.x,
          y: height - field.y - field.height - 15,
          size: 8,
          color: { r: 0.5, g: 0.5, b: 0.5 }
        });
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Upload the signed PDF
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `signed_${Date.now()}.pdf`, { type: 'application/pdf' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ 
      signed_pdf_url: uploadResult.file_url,
      success: true
    });
  } catch (error) {
    console.error('Error embedding signatures:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});