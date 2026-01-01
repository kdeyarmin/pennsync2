import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guide_type } = await req.json();

    // Generate guide content using AI
    const guideContent = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive, step-by-step user guide for: ${guide_type}

${guide_type === 'referral_intake' ? `
REFERRAL INTAKE PROCESS GUIDE

Create detailed instructions for staff entering and uploading referrals:

**INTRODUCTION**
- Purpose of the referral intake system
- Benefits of AI-powered extraction
- Overview of the workflow

**STEP-BY-STEP INSTRUCTIONS**

1. ACCESSING THE REFERRAL INTAKE PAGE
   - Navigation from dashboard
   - What you'll see on the page

2. UPLOADING A REFERRAL DOCUMENT
   - Click "Upload New Referral" button
   - Supported file types (PDF, PNG, JPG, TIFF)
   - File size limits
   - Drag and drop option

3. AI PROCESSING
   - What happens during processing (5 stages)
   - Typical processing time
   - Progress indicators to watch

4. REVIEWING EXTRACTED DATA
   - Patient demographics section
   - Diagnoses and medical history
   - Medications
   - Functional status
   - Insurance information
   - Clinical summary

5. VERIFYING AI-EXTRACTED FIELDS
   - Look for confidence indicators
   - Yellow flags = requires verification
   - How to edit incorrect data
   - Using the confidence score

6. PATIENT MATCHING
   - Automatic patient match detection
   - Reviewing suggested matches
   - Confirming existing patient vs creating new
   - Resolving duplicate warnings

7. COMPLETING THE REFERRAL FORM
   - Required fields (marked with *)
   - Referral source
   - Referral date
   - Priority level
   - Assigning to nurse

8. AI FEATURES AVAILABLE
   - AI-generated admission note
   - OASIS pre-assessment
   - Care plan suggestions
   - How to use each feature

9. GENERATING ADMISSION PACKET
   - Click "Generate Admission Packet" button
   - What's included in the packet
   - Downloading the PDF
   - Saving the processed referral URL

10. TROUBLESHOOTING
    - Poor quality scans
    - Missing information
    - AI confidence issues
    - When to manually enter data

**BEST PRACTICES**
- Quality of source documents
- When to verify AI suggestions
- Communication with nursing staff

**TIPS FOR SUCCESS**
- Use clear, high-resolution scans
- Review all yellow-flagged fields
- Double-check patient matching
- Assign to appropriate nurse based on territory` : `

ADMISSION VISIT DOCUMENTATION GUIDE

Create detailed instructions for nurses completing admission visits:

**INTRODUCTION**
- Purpose of admission documentation
- Medicare compliance requirements
- AI assistance overview

**STEP-BY-STEP INSTRUCTIONS**

1. PREPARING FOR THE VISIT
   - Review referral data in patient chart
   - Check pre-populated admission note
   - Review AI-generated care plan suggestions
   - Verify patient demographics

2. ACCESSING SMART NOTE ASSISTANT
   - Navigate to "Smart Notes" or "Quick Note"
   - Select the patient
   - Choose "Admission" as visit type
   - Pre-populated fields you'll see

3. DURING THE PATIENT VISIT
   - Using voice dictation (optional)
   - Recording vital signs
   - Documenting assessment findings
   - Taking photos of wounds (if applicable)

4. COMPLETING THE ASSESSMENT
   - Head-to-toe assessment
   - Functional status evaluation
   - Safety assessment
   - Medication reconciliation
   - Homebound justification

5. USING AI ASSISTANCE
   - Real-time suggestions while typing
   - Compliance checker feedback
   - Missing element alerts
   - OASIS alignment indicators

6. DOCUMENTING IN SOAP FORMAT
   - Subjective: Patient complaints, history
   - Objective: Vital signs, physical exam
   - Assessment: Clinical summary, homebound status
   - Plan: Interventions, frequency, goals

7. REVIEWING AI-GENERATED NOTE
   - Click "Enhance Note" button
   - Review AI-formatted SOAP note
   - Edit as needed for accuracy
   - Use "Review Quality" feature

8. QUALITY REVIEW FEATURES
   - Compliance score (aim for 85%+)
   - Missing elements highlighted
   - Vague language suggestions
   - PDGM optimization tips
   - Quick wins to address

9. ADDRESSING DOCUMENTATION GAPS
   - Copy suggested text
   - Add specific measurements
   - Include homebound justification
   - Document skilled need clearly

10. COMPLETING OASIS ASSESSMENT
    - Use AI OASIS pre-assessment
    - Verify each item against actual findings
    - Review confidence scores
    - Flag items needing clarification

11. FINALIZING CARE PLANS
    - Review AI-suggested care plans
    - Modify based on actual visit
    - Set realistic goals
    - Assign appropriate frequencies

12. SAVING DOCUMENTATION
    - Click "Save to Patient Chart"
    - Verify it's saved under correct visit
    - Send family update if applicable
    - Close any auto-generated tasks

**MEDICARE COMPLIANCE CHECKLIST**
□ Homebound status clearly documented
□ Skilled need justified
□ Specific functional measurements
□ Vital signs documented
□ Safety assessment completed
□ Medication reconciliation done
□ Patient/caregiver teaching documented
□ Goals are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)

**BEST PRACTICES**
- Review referral data before visit
- Use voice dictation during visit
- Be specific with measurements
- Document skilled nursing interventions
- Verify AI suggestions against actual findings
- Use compliance checker before saving

**COMMON PITFALLS TO AVOID**
- Vague language ("appears," "seems")
- Missing homebound justification
- Non-specific functional assessments
- Incomplete vital signs
- Weak skilled need documentation

**TIPS FOR SUCCESS**
- Use AI assistance but verify everything
- Document what YOU observed
- Include patient/caregiver quotes
- Specify assistance levels for ADLs
- Compare to baseline when possible`}

Format this as a clear, professional user guide with:
- Section headers
- Numbered steps
- Bullet points for details
- Call-out boxes for important notes
- Tips and warnings
- Troubleshooting section

Keep language simple and non-technical. Include specific button names and field labels.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" },
                subsections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subheading: { type: "string" },
                      steps: {
                        type: "array",
                        items: { type: "string" }
                      },
                      notes: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(guideContent.title, pageWidth / 2, 20, { align: 'center' });

    yPosition = 45;

    // Helper function to check if we need a new page
    const checkNewPage = (neededSpace) => {
      if (yPosition + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Helper function to add wrapped text
    const addWrappedText = (text, fontSize, color, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      
      checkNewPage(lines.length * (fontSize * 0.4));
      
      lines.forEach(line => {
        doc.text(line, margin, yPosition);
        yPosition += fontSize * 0.4;
      });
    };

    // Process sections
    guideContent.sections.forEach((section, sectionIndex) => {
      // Section header with background
      checkNewPage(15);
      doc.setFillColor(243, 244, 246);
      doc.rect(margin - 2, yPosition - 5, contentWidth + 4, 12, 'F');
      addWrappedText(section.heading, 16, [31, 41, 55], true);
      yPosition += 5;

      // Section content
      if (section.content) {
        addWrappedText(section.content, 10, [75, 85, 99]);
        yPosition += 3;
      }

      // Subsections
      section.subsections?.forEach((subsection, subIndex) => {
        checkNewPage(20);
        
        // Subsection heading
        doc.setFillColor(219, 234, 254);
        doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');
        addWrappedText(subsection.subheading, 12, [30, 64, 175], true);
        yPosition += 3;

        // Steps
        subsection.steps?.forEach((step, stepIndex) => {
          checkNewPage(10);
          doc.setFillColor(59, 130, 246);
          doc.circle(margin + 3, yPosition - 1.5, 2, 'F');
          
          doc.setFontSize(10);
          doc.setTextColor(55, 65, 81);
          doc.setFont(undefined, 'normal');
          const stepLines = doc.splitTextToSize(step, contentWidth - 10);
          stepLines.forEach((line, lineIndex) => {
            doc.text(line, margin + 8, yPosition);
            yPosition += 4;
          });
        });

        // Notes (call-out boxes)
        subsection.notes?.forEach((note) => {
          checkNewPage(15);
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(251, 191, 36);
          const noteLines = doc.splitTextToSize(note, contentWidth - 10);
          const boxHeight = (noteLines.length * 4) + 4;
          doc.rect(margin, yPosition - 2, contentWidth, boxHeight, 'FD');
          
          doc.setFontSize(9);
          doc.setTextColor(146, 64, 14);
          doc.setFont(undefined, 'bold');
          doc.text('💡 TIP:', margin + 3, yPosition + 2);
          
          doc.setFont(undefined, 'normal');
          noteLines.forEach((line, idx) => {
            doc.text(line, margin + 15, yPosition + 2 + (idx * 4));
          });
          yPosition += boxHeight + 3;
        });

        yPosition += 3;
      });

      yPosition += 5;
    });

    // Footer on each page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Penn Sync Healthcare - ${guideContent.title} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${guide_type}_guide.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating user guide:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});