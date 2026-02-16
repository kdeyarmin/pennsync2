import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { fax_log_id, document_url } = await req.json();

    if (!fax_log_id || !document_url) {
      return Response.json({ 
        error: 'Missing fax_log_id or document_url' 
      }, { status: 400 });
    }

    // Use AI to extract text from the document
    const ocrPrompt = `Extract all text content from this document. 
Return the complete text in a clean, readable format.
Preserve structure where possible (paragraphs, lists, etc.).
If you cannot read the text clearly, indicate sections with [UNCLEAR].

Document URL: ${document_url}

Return JSON: {"text": "extracted text", "confidence": 0-100}`;

    let ocrResult;
    try {
      ocrResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: ocrPrompt,
        file_urls: [document_url],
        response_json_schema: {
          type: "object",
          properties: {
            text: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Mark as processed but failed
      await base44.asServiceRole.entities.FaxLog.update(fax_log_id, {
        ocr_processed: true,
        ocr_text: '[OCR FAILED: ' + error.message + ']',
        ocr_confidence: 0
      });

      return Response.json({ 
        success: false,
        error: error.message 
      });
    }

    // Update fax log with OCR results
    await base44.asServiceRole.entities.FaxLog.update(fax_log_id, {
      ocr_text: ocrResult.text || '',
      ocr_processed: true,
      ocr_confidence: ocrResult.confidence || 0
    });

    return Response.json({
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      characters: ocrResult.text?.length || 0
    });

  } catch (error) {
    console.error('Process fax OCR error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});