import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisResults } = await req.json();

    if (!analysisResults) {
      return Response.json({ error: 'No analysis results provided' }, { status: 400 });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    // Helper function to check if we need a new page
    const checkNewPage = (neededHeight = 30) => {
      if (y + neededHeight > 270) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    // Helper function to add wrapped text
    const addWrappedText = (text, x, startY, maxWidth, lineHeight = 5) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line, index) => {
        checkNewPage(lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    };

    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // Blue
    doc.text('OASIS Analysis Report', margin, y);
    y += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 15;

    // Score Overview Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Score Overview', margin, y);
    y += 8;

    // Draw score boxes
    const scores = [
      { label: 'Overall', value: analysisResults.overall_score },
      { label: 'Accuracy', value: analysisResults.accuracy_score },
      { label: 'Compliance', value: analysisResults.compliance_score },
      { label: 'Revenue Opt.', value: analysisResults.revenue_optimization_score }
    ];

    const boxWidth = (contentWidth - 15) / 4;
    scores.forEach((score, index) => {
      const x = margin + (index * (boxWidth + 5));
      
      // Box background color based on score
      if (score.value >= 80) {
        doc.setFillColor(220, 252, 231); // Green
      } else if (score.value >= 60) {
        doc.setFillColor(254, 249, 195); // Yellow
      } else {
        doc.setFillColor(254, 226, 226); // Red
      }
      
      doc.roundedRect(x, y, boxWidth, 25, 2, 2, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(score.label, x + 5, y + 8);
      
      doc.setFontSize(16);
      if (score.value >= 80) {
        doc.setTextColor(22, 163, 74);
      } else if (score.value >= 60) {
        doc.setTextColor(202, 138, 4);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(`${score.value}%`, x + 5, y + 20);
    });
    y += 35;

    // Summary
    if (analysisResults.summary) {
      checkNewPage(40);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(30, 64, 175);
      y += 7;
      addWrappedText(analysisResults.summary, margin + 5, y, contentWidth - 10, 5);
      y += 10;
    }

    // Key Recommendations
    if (analysisResults.key_recommendations?.length > 0) {
      checkNewPage(50);
      doc.setFontSize(14);
      doc.setTextColor(67, 56, 202);
      doc.text('Key Recommendations', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      analysisResults.key_recommendations.forEach((rec, index) => {
        checkNewPage(15);
        doc.setTextColor(67, 56, 202);
        doc.text(`${index + 1}.`, margin, y);
        doc.setTextColor(0, 0, 0);
        addWrappedText(rec, margin + 8, y, contentWidth - 10, 5);
        y += 3;
      });
      y += 5;
    }

    // Strengths
    if (analysisResults.strengths?.length > 0) {
      checkNewPage(40);
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74);
      doc.text('Strengths', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      analysisResults.strengths.forEach((strength) => {
        checkNewPage(10);
        doc.text(`• ${strength}`, margin + 5, y);
        y += 6;
      });
      y += 5;
    }

    // Accuracy Issues
    if (analysisResults.accuracy_issues?.length > 0) {
      checkNewPage(40);
      doc.setFontSize(14);
      doc.setTextColor(202, 138, 4);
      doc.text(`Accuracy Issues (${analysisResults.accuracy_issues.length})`, margin, y);
      y += 8;

      analysisResults.accuracy_issues.forEach((issue, index) => {
        checkNewPage(35);
        doc.setFillColor(254, 252, 232);
        doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Item: ${issue.item || 'N/A'}`, margin + 5, y + 7);
        
        // Severity badge
        const severityColors = {
          high: [220, 38, 38],
          medium: [202, 138, 4],
          low: [59, 130, 246]
        };
        const color = severityColors[issue.severity] || severityColors.medium;
        doc.setTextColor(...color);
        doc.text(`[${(issue.severity || 'medium').toUpperCase()}]`, margin + 60, y + 7);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const issueText = doc.splitTextToSize(`Issue: ${issue.issue || ''}`, contentWidth - 15);
        doc.text(issueText[0], margin + 5, y + 15);
        
        const recText = doc.splitTextToSize(`Recommendation: ${issue.recommendation || ''}`, contentWidth - 15);
        doc.setTextColor(22, 163, 74);
        doc.text(recText[0], margin + 5, y + 23);
        
        y += 35;
      });
      y += 5;
    }

    // Compliance Concerns
    if (analysisResults.compliance_concerns?.length > 0) {
      checkNewPage(40);
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(`Compliance Concerns (${analysisResults.compliance_concerns.length})`, margin, y);
      y += 8;

      analysisResults.compliance_concerns.forEach((concern) => {
        checkNewPage(40);
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Area: ${concern.area || 'N/A'}`, margin + 5, y + 7);
        
        const severityColors = {
          high: [220, 38, 38],
          medium: [202, 138, 4],
          low: [59, 130, 246]
        };
        const color = severityColors[concern.severity] || severityColors.medium;
        doc.setTextColor(...color);
        doc.text(`[${(concern.severity || 'medium').toUpperCase()}]`, margin + 80, y + 7);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const issueText = doc.splitTextToSize(`Issue: ${concern.issue || ''}`, contentWidth - 15);
        doc.text(issueText[0], margin + 5, y + 15);
        
        if (concern.cms_reference) {
          doc.setTextColor(100, 100, 100);
          doc.text(`CMS Ref: ${concern.cms_reference}`, margin + 5, y + 22);
        }
        
        doc.setTextColor(22, 163, 74);
        const recText = doc.splitTextToSize(`Recommendation: ${concern.recommendation || ''}`, contentWidth - 15);
        doc.text(recText[0], margin + 5, y + 30);
        
        y += 40;
      });
      y += 5;
    }

    // Revenue Tips
    if (analysisResults.revenue_tips?.length > 0) {
      checkNewPage(40);
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74);
      doc.text(`Revenue Optimization Tips (${analysisResults.revenue_tips.length})`, margin, y);
      y += 8;

      analysisResults.revenue_tips.forEach((tip) => {
        checkNewPage(45);
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(margin, y, contentWidth, 40, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Category: ${tip.category || 'N/A'}`, margin + 5, y + 7);
        
        const impactColors = {
          high: [22, 163, 74],
          medium: [202, 138, 4],
          low: [59, 130, 246]
        };
        const color = impactColors[tip.potential_impact] || impactColors.medium;
        doc.setTextColor(...color);
        doc.text(`[${(tip.potential_impact || 'medium').toUpperCase()} IMPACT]`, margin + 60, y + 7);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const currentText = doc.splitTextToSize(`Current: ${tip.current_documentation || ''}`, contentWidth - 15);
        doc.text(currentText[0], margin + 5, y + 15);
        
        const oppText = doc.splitTextToSize(`Opportunity: ${tip.opportunity || ''}`, contentWidth - 15);
        doc.text(oppText[0], margin + 5, y + 23);
        
        doc.setTextColor(22, 163, 74);
        const actionText = doc.splitTextToSize(`Action: ${tip.specific_action || ''}`, contentWidth - 15);
        doc.text(actionText[0], margin + 5, y + 31);
        
        y += 45;
      });
      y += 5;
    }

    // Audit Risk Areas
    if (analysisResults.audit_risk_areas?.length > 0) {
      checkNewPage(40);
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.text(`Audit Risk Areas (${analysisResults.audit_risk_areas.length})`, margin, y);
      y += 8;

      analysisResults.audit_risk_areas.forEach((risk) => {
        checkNewPage(35);
        doc.setFillColor(255, 247, 237);
        doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Area: ${risk.area || 'N/A'}`, margin + 5, y + 7);
        
        const riskColors = {
          high: [220, 38, 38],
          medium: [202, 138, 4],
          low: [59, 130, 246]
        };
        const color = riskColors[risk.risk_level] || riskColors.medium;
        doc.setTextColor(...color);
        doc.text(`[${(risk.risk_level || 'medium').toUpperCase()} RISK]`, margin + 80, y + 7);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const expText = doc.splitTextToSize(`Explanation: ${risk.explanation || ''}`, contentWidth - 15);
        doc.text(expText[0], margin + 5, y + 15);
        
        doc.setTextColor(22, 163, 74);
        const mitText = doc.splitTextToSize(`Mitigation: ${risk.mitigation || ''}`, contentWidth - 15);
        doc.text(mitText[0], margin + 5, y + 23);
        
        y += 35;
      });
    }

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('Generated by OASIS Analyzer', margin, 290);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=OASIS_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});