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
      annotations,
      patient_id,
      document_type 
    } = await req.json();

    if (!pdf_url || !annotations) {
      return Response.json({ 
        error: 'Missing required fields: pdf_url and annotations' 
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

    // Embed annotations for each page
    for (const [pageNumStr, pageAnnotations] of Object.entries(annotations)) {
      const pageNum = parseInt(pageNumStr);
      if (pageNum < 1 || pageNum > pages.length || !pageAnnotations || pageAnnotations.length === 0) {
        continue;
      }

      const page = pages[pageNum - 1];
      const { height } = page.getSize();

      for (const annotation of pageAnnotations) {
        // PDF coordinates start from bottom-left, canvas from top-left
        const pdfY = height - annotation.y;

        if (annotation.type === 'text') {
          page.drawText(annotation.text, {
            x: annotation.x,
            y: pdfY,
            size: annotation.fontSize || 14,
            color: rgb(0, 0, 0),
          });
        } else if (annotation.type === 'date') {
          page.drawText(annotation.text, {
            x: annotation.x,
            y: pdfY,
            size: 12,
            color: rgb(0, 0, 0),
          });
        } else if (annotation.type === 'signature' && annotation.signatureDataUrl) {
          // Convert base64 signature to bytes
          const signatureBase64 = annotation.signatureDataUrl.split(',')[1];
          const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

          // Embed the signature image
          const signatureImage = await pdfDoc.embedPng(signatureBytes);

          // Draw signature image
          page.drawImage(signatureImage, {
            x: annotation.x,
            y: pdfY - annotation.height,
            width: annotation.width,
            height: annotation.height,
          });
        }
      }
    }

    // Save the modified PDF
    const signedPdfBytes = await pdfDoc.save();

    // Upload the signed PDF to Base44 storage
    const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const fileName = `signed-${document_type || 'document'}-${patient_id || 'unknown'}-${Date.now()}.pdf`;
    
    const file = new File([blob], fileName, { type: 'application/pdf' });

    // Upload using Base44 integration
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Count signatures
    const signatureCount = Object.values(annotations).reduce((count, pageAnnots) => {
      return count + pageAnnots.filter(a => a.type === 'signature').length;
    }, 0);

    // Log the signature event
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'document_signed',
      details: {
        document_type,
        patient_id,
        signature_count: signatureCount,
        total_annotations: Object.values(annotations).reduce((sum, arr) => sum + arr.length, 0),
        original_pdf: pdf_url,
        signed_pdf: uploadResult.file_url
      },
      page: 'pdf_signature'
    });

    return Response.json({
      success: true,
      signed_pdf_url: uploadResult.file_url,
      signature_count: signatureCount,
      signature_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF annotation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process PDF annotations' 
    }, { status: 500 });
  }
});