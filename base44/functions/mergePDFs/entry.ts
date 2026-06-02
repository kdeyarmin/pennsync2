import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdf_urls } = await req.json();

    if (!pdf_urls || pdf_urls.length < 2) {
      return Response.json({ 
        error: 'At least 2 PDF URLs required' 
      }, { status: 400 });
    }

    // Create new PDF document
    const mergedPdf = await PDFDocument.create();

    // Fetch and merge each PDF
    for (const url of pdf_urls) {
      const response = await fetch(url);
      const pdfBytes = await response.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `merged-${Date.now()}.pdf`, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'pdfs_merged',
      details: {
        source_pdfs: pdf_urls,
        merged_pdf: uploadResult.file_url,
        pdf_count: pdf_urls.length
      },
      page: 'pdf_merger'
    });

    return Response.json({
      success: true,
      merged_pdf_url: uploadResult.file_url
    });

  } catch (error) {
    console.error('PDF merge error:', error);
    return Response.json({ 
      error: error.message || 'Failed to merge PDFs' 
    }, { status: 500 });
  }
});