import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { original_pdf_url, annotations, total_pages } = await req.json();

    if (!original_pdf_url || !annotations) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Fetch original PDF
    const pdfResponse = await fetch(original_pdf_url);
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Apply annotations to each page
    for (const annotation of annotations) {
      const page = pages[annotation.page - 1];
      if (!page) continue;

      const { height } = page.getSize();

      if (annotation.type === 'text') {
        page.drawText(annotation.text, {
          x: annotation.x,
          y: height - annotation.y,
          size: annotation.fontSize || 16,
          color: rgb(
            parseInt(annotation.color.slice(1, 3), 16) / 255,
            parseInt(annotation.color.slice(3, 5), 16) / 255,
            parseInt(annotation.color.slice(5, 7), 16) / 255
          ),
        });
      } else if (annotation.type === 'highlight') {
        page.drawRectangle({
          x: annotation.x,
          y: height - annotation.y - annotation.height,
          width: annotation.width,
          height: annotation.height,
          color: rgb(
            parseInt(annotation.color.slice(1, 3), 16) / 255,
            parseInt(annotation.color.slice(3, 5), 16) / 255,
            parseInt(annotation.color.slice(5, 7), 16) / 255
          ),
          opacity: 0.3,
        });
      } else if (annotation.type === 'draw') {
        // Draw path as series of lines
        for (let i = 1; i < annotation.path.length; i++) {
          const from = annotation.path[i - 1];
          const to = annotation.path[i];
          
          page.drawLine({
            start: { x: from.x, y: height - from.y },
            end: { x: to.x, y: height - to.y },
            thickness: annotation.lineWidth || 2,
            color: rgb(
              parseInt(annotation.color.slice(1, 3), 16) / 255,
              parseInt(annotation.color.slice(3, 5), 16) / 255,
              parseInt(annotation.color.slice(5, 7), 16) / 255
            ),
          });
        }
      }
    }

    // Save PDF
    const annotatedPdfBytes = await pdfDoc.save();
    const blob = new Blob([annotatedPdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `annotated-${Date.now()}.pdf`, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'pdf_annotated',
      details: {
        original_pdf: original_pdf_url,
        annotated_pdf: uploadResult.file_url,
        annotation_count: annotations.length
      },
      page: 'pdf_editor'
    });

    return Response.json({
      success: true,
      annotated_pdf_url: uploadResult.file_url
    });

  } catch (error) {
    console.error('PDF annotation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to annotate PDF' 
    }, { status: 500 });
  }
});