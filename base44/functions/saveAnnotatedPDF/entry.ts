import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';

// Parse a "#RRGGBB" string into a pdf-lib color, defaulting to black. A missing
// or malformed annotation.color previously threw (slice on undefined) or fed NaN
// into rgb() — either aborting the whole request with a 500.
const hexToRgb = (hex) => {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return rgb(0, 0, 0);
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  );
};

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
          color: hexToRgb(annotation.color),
        });
      } else if (annotation.type === 'highlight') {
        page.drawRectangle({
          x: annotation.x,
          y: height - annotation.y - annotation.height,
          width: annotation.width,
          height: annotation.height,
          color: hexToRgb(annotation.color),
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
            color: hexToRgb(annotation.color),
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