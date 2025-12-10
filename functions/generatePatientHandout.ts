import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/c39653ba3_PennHomeHealthInc.png';

const handoutTemplates = {
  'chf': {
    title: 'Congestive Heart Failure (CHF)',
    sections: [
      {
        heading: 'What is CHF?',
        content: 'Congestive Heart Failure (CHF) occurs when your heart doesn\'t pump blood as well as it should. This causes fluid to build up in your lungs and other parts of your body.'
      },
      {
        heading: 'Warning Signs',
        bullets: [
          'Shortness of breath, especially when lying down',
          'Swelling in legs, ankles, or feet',
          'Rapid weight gain (2-3 pounds in a day)',
          'Persistent cough or wheezing',
          'Fatigue and weakness',
          'Irregular or rapid heartbeat'
        ]
      },
      {
        heading: 'Self-Care Tips',
        bullets: [
          'Weigh yourself daily at the same time',
          'Limit salt intake to less than 2 grams per day',
          'Limit fluid intake as directed by your doctor',
          'Take all medications as prescribed',
          'Elevate your legs when sitting',
          'Stay active with approved exercises'
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'Weight gain of 2-3 pounds in one day or 5 pounds in a week',
          'Increased swelling in legs, ankles, or abdomen',
          'Increased shortness of breath',
          'New or worsening cough',
          'Difficulty sleeping due to breathing problems'
        ]
      },
      {
        heading: 'Emergency - Call 911 If:',
        bullets: [
          'Severe shortness of breath',
          'Chest pain or pressure',
          'Fainting or severe weakness',
          'Coughing up pink, frothy mucus'
        ]
      }
    ]
  },
  'copd': {
    title: 'Chronic Obstructive Pulmonary Disease (COPD)',
    sections: [
      {
        heading: 'What is COPD?',
        content: 'COPD is a chronic lung disease that makes it hard to breathe. It includes emphysema and chronic bronchitis. The airways become inflamed and narrowed, making it difficult to get air in and out of your lungs.'
      },
      {
        heading: 'Common Symptoms',
        bullets: [
          'Chronic cough with mucus',
          'Shortness of breath, especially during activities',
          'Wheezing',
          'Chest tightness',
          'Frequent respiratory infections',
          'Fatigue'
        ]
      },
      {
        heading: 'Managing Your COPD',
        bullets: [
          'STOP SMOKING - this is the most important step',
          'Use your inhalers exactly as prescribed',
          'Practice pursed-lip breathing',
          'Stay active with pulmonary rehabilitation',
          'Avoid lung irritants (smoke, dust, fumes)',
          'Get vaccinated (flu and pneumonia shots)'
        ]
      },
      {
        heading: 'Breathing Techniques',
        bullets: [
          'Pursed-lip breathing: Breathe in through nose, breathe out slowly through pursed lips',
          'Diaphragmatic breathing: Focus on belly breathing',
          'Take breaks during activities',
          'Use oxygen as prescribed'
        ]
      },
      {
        heading: 'Call Your Doctor If:',
        bullets: [
          'Increased shortness of breath',
          'Change in mucus color (yellow, green, or bloody)',
          'Increased cough or wheezing',
          'Fever over 100.4°F',
          'Confusion or extreme fatigue',
          'Chest pain'
        ]
      }
    ]
  },
  'diabetes': {
    title: 'Diabetes Management',
    sections: [
      {
        heading: 'Understanding Diabetes',
        content: 'Diabetes is a condition where your body cannot properly use or produce insulin, leading to high blood sugar levels. Managing your blood sugar is essential to prevent complications.'
      },
      {
        heading: 'Blood Sugar Targets',
        bullets: [
          'Before meals: 80-130 mg/dL',
          'Two hours after meals: Less than 180 mg/dL',
          'Bedtime: 100-140 mg/dL',
          'Your doctor may set different targets for you'
        ]
      },
      {
        heading: 'Daily Management',
        bullets: [
          'Check blood sugar as directed',
          'Take medications at the same time each day',
          'Eat regular, balanced meals',
          'Limit sugary foods and drinks',
          'Exercise regularly (30 minutes most days)',
          'Check your feet daily for cuts or sores'
        ]
      },
      {
        heading: 'Signs of Low Blood Sugar (Hypoglycemia)',
        bullets: [
          'Shaking or trembling',
          'Sweating',
          'Fast heartbeat',
          'Dizziness or lightheadedness',
          'Hunger',
          'Confusion or irritability',
          'TREAT IMMEDIATELY: 15g fast-acting carbs (juice, glucose tablets)'
        ]
      },
      {
        heading: 'Signs of High Blood Sugar (Hyperglycemia)',
        bullets: [
          'Increased thirst',
          'Frequent urination',
          'Blurred vision',
          'Fatigue',
          'Headache',
          'Slow-healing wounds'
        ]
      },
      {
        heading: 'Foot Care',
        bullets: [
          'Inspect feet daily for cuts, blisters, or redness',
          'Wash feet daily and dry thoroughly',
          'Never go barefoot',
          'Wear properly fitted shoes',
          'Trim toenails carefully',
          'Report any foot problems immediately'
        ]
      }
    ]
  },
  'hypertension': {
    title: 'High Blood Pressure (Hypertension)',
    sections: [
      {
        heading: 'What is High Blood Pressure?',
        content: 'High blood pressure occurs when the force of blood against your artery walls is too high. Often called the "silent killer," it usually has no symptoms but can lead to heart attack, stroke, and kidney disease.'
      },
      {
        heading: 'Blood Pressure Goals',
        bullets: [
          'Normal: Less than 120/80 mmHg',
          'Your target may be different based on your health',
          'Know your personal blood pressure goal'
        ]
      },
      {
        heading: 'Lifestyle Changes',
        bullets: [
          'Reduce sodium (salt) to less than 2,300mg per day',
          'Eat plenty of fruits, vegetables, and whole grains',
          'Limit alcohol consumption',
          'Quit smoking',
          'Maintain a healthy weight',
          'Exercise regularly (30 minutes most days)',
          'Manage stress through relaxation techniques'
        ]
      },
      {
        heading: 'Taking Your Blood Pressure at Home',
        bullets: [
          'Use a validated home blood pressure monitor',
          'Measure at the same time each day',
          'Sit quietly for 5 minutes before measuring',
          'Keep arm supported at heart level',
          'Take 2-3 readings, 1 minute apart',
          'Keep a log of your readings'
        ]
      },
      {
        heading: 'Medications',
        bullets: [
          'Take all medications as prescribed',
          'Don\'t stop medications without talking to your doctor',
          'Report side effects to your healthcare team',
          'Use a pill organizer to stay organized',
          'Refill prescriptions on time'
        ]
      },
      {
        heading: 'Call Your Doctor If:',
        bullets: [
          'Blood pressure is consistently above your target',
          'You experience side effects from medications',
          'Severe headache with blurred vision',
          'Chest pain or shortness of breath',
          'Nosebleeds that won\'t stop'
        ]
      }
    ]
  },
  'stroke': {
    title: 'Stroke Recovery and Prevention',
    sections: [
      {
        heading: 'What is a Stroke?',
        content: 'A stroke occurs when blood flow to part of the brain is blocked or a blood vessel bursts. Brain cells begin to die, which can cause lasting brain damage, disability, or death.'
      },
      {
        heading: 'Remember F.A.S.T.',
        bullets: [
          'F - Face drooping: Does one side of the face droop?',
          'A - Arm weakness: Is one arm weak or numb?',
          'S - Speech difficulty: Is speech slurred or hard to understand?',
          'T - Time to call 911: If you see any of these signs, call 911 immediately'
        ]
      },
      {
        heading: 'Recovery Tips',
        bullets: [
          'Attend all therapy sessions (physical, occupational, speech)',
          'Practice exercises at home as instructed',
          'Take medications to prevent another stroke',
          'Use assistive devices as recommended',
          'Ask for help when needed',
          'Be patient - recovery takes time'
        ]
      },
      {
        heading: 'Preventing Another Stroke',
        bullets: [
          'Control blood pressure',
          'Manage diabetes',
          'Lower cholesterol',
          'Quit smoking',
          'Eat a heart-healthy diet',
          'Exercise regularly',
          'Limit alcohol',
          'Take blood thinners as prescribed'
        ]
      },
      {
        heading: 'Safety at Home',
        bullets: [
          'Remove tripping hazards (rugs, cords)',
          'Install grab bars in bathroom',
          'Use non-slip mats in tub/shower',
          'Keep walkways clear and well-lit',
          'Wear non-slip footwear',
          'Keep frequently used items within easy reach'
        ]
      },
      {
        heading: 'Call 911 Immediately If:',
        bullets: [
          'New or worsening stroke symptoms',
          'Sudden severe headache',
          'Sudden vision changes',
          'Sudden trouble walking or balance problems',
          'Sudden confusion or trouble speaking'
        ]
      }
    ]
  },
  'wound_care': {
    title: 'Wound Care Instructions',
    sections: [
      {
        heading: 'Keeping Your Wound Clean',
        content: 'Proper wound care is essential for healing and preventing infection. Follow your nurse\'s instructions carefully.'
      },
      {
        heading: 'Daily Wound Care',
        bullets: [
          'Wash hands thoroughly before touching wound',
          'Clean wound as instructed by your nurse',
          'Apply dressings exactly as shown',
          'Keep wound dry between dressing changes',
          'Don\'t remove dressings unless instructed',
          'Dispose of used dressings in plastic bag'
        ]
      },
      {
        heading: 'Signs Your Wound is Healing',
        bullets: [
          'Wound is getting smaller',
          'Less drainage',
          'Pink or red tissue in wound bed',
          'Less pain',
          'No foul odor'
        ]
      },
      {
        heading: 'Signs of Infection - Call Your Nurse',
        bullets: [
          'Increased redness around wound',
          'Increased swelling',
          'Increased pain',
          'Warmth around wound',
          'Pus or cloudy drainage',
          'Foul odor',
          'Fever over 100.4°F',
          'Red streaks from wound',
          'Wound getting larger instead of smaller'
        ]
      },
      {
        heading: 'Promoting Healing',
        bullets: [
          'Eat a balanced diet with protein',
          'Stay hydrated - drink 6-8 glasses of water daily',
          'Take vitamins as prescribed',
          'Elevate affected area when possible',
          'Avoid smoking - it slows healing',
          'Keep blood sugar controlled if diabetic',
          'Follow weight-bearing restrictions'
        ]
      },
      {
        heading: 'Supplies',
        bullets: [
          'Keep enough supplies on hand',
          'Store in a clean, dry place',
          'Check expiration dates',
          'Reorder before running out',
          'Tell your nurse if supplies are low'
        ]
      }
    ]
  },
  'fall_prevention': {
    title: 'Fall Prevention at Home',
    sections: [
      {
        heading: 'Why Fall Prevention Matters',
        content: 'Falls are a leading cause of injury in older adults. Most falls happen at home. The good news is that many falls can be prevented with simple changes to your home and habits.'
      },
      {
        heading: 'Home Safety Checklist',
        bullets: [
          'Remove throw rugs or secure with non-slip backing',
          'Keep floors clear of clutter, cords, and small objects',
          'Install grab bars in bathroom (tub, shower, toilet)',
          'Use non-slip mats in tub and shower',
          'Ensure good lighting in all rooms and hallways',
          'Use nightlights in bedroom, bathroom, and hallways',
          'Keep stairways clear and well-lit',
          'Install handrails on both sides of stairs',
          'Secure loose carpeting',
          'Store frequently used items within easy reach'
        ]
      },
      {
        heading: 'Personal Safety',
        bullets: [
          'Wear non-slip, well-fitting footwear',
          'Don\'t wear loose clothing that can cause tripping',
          'Use assistive devices (cane, walker) as prescribed',
          'Rise slowly from sitting or lying position',
          'Don\'t rush - take your time',
          'Turn on lights before entering a room',
          'Use step stool with handle, never stand on chairs',
          'Keep phone within reach',
          'Consider a medical alert system'
        ]
      },
      {
        heading: 'Medications and Falls',
        bullets: [
          'Some medications can cause dizziness or drowsiness',
          'Review all medications with your doctor',
          'Be extra careful when starting new medications',
          'Don\'t mix alcohol with medications',
          'Stand up slowly if medications cause dizziness'
        ]
      },
      {
        heading: 'Stay Strong and Active',
        bullets: [
          'Exercise regularly to maintain strength and balance',
          'Practice balance exercises as recommended',
          'Stay active but know your limits',
          'Have vision checked yearly',
          'Eat a healthy diet to maintain bone strength',
          'Get adequate calcium and vitamin D'
        ]
      },
      {
        heading: 'If You Do Fall',
        bullets: [
          'Stay calm',
          'Check for injuries before getting up',
          'Roll to your side, push up to hands and knees',
          'Crawl to sturdy furniture and pull yourself up',
          'Rest before resuming activities',
          'Call for help if you can\'t get up',
          'Tell your doctor about all falls'
        ]
      }
    ]
  },
  'pain_management': {
    title: 'Pain Management',
    sections: [
      {
        heading: 'Understanding Pain',
        content: 'Pain is your body\'s way of signaling that something needs attention. Managing pain effectively helps you heal, stay active, and maintain quality of life.'
      },
      {
        heading: 'Describing Your Pain',
        content: 'Help your healthcare team understand your pain by describing:',
        bullets: [
          'Location: Where exactly does it hurt?',
          'Intensity: On a scale of 0-10, how severe is it?',
          'Quality: Sharp, dull, burning, aching, shooting?',
          'Timing: Constant or comes and goes?',
          'What makes it better or worse?',
          'How it affects your daily activities'
        ]
      },
      {
        heading: 'Medication Safety',
        bullets: [
          'Take pain medication as prescribed',
          'Don\'t wait until pain is severe - stay ahead of it',
          'Take with food if it upsets your stomach',
          'Don\'t mix with alcohol',
          'Store medications safely away from children',
          'Dispose of unused medications properly',
          'Tell your doctor about all medications you take',
          'Report side effects immediately'
        ]
      },
      {
        heading: 'Non-Drug Pain Relief',
        bullets: [
          'Apply ice for acute injuries (first 48 hours)',
          'Apply heat for chronic pain or muscle tension',
          'Practice deep breathing and relaxation',
          'Try meditation or guided imagery',
          'Use distraction (music, TV, reading)',
          'Gentle exercise or stretching',
          'Massage',
          'Position changes',
          'Rest when needed'
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'Pain is not controlled with prescribed medications',
          'New or different pain',
          'Pain interferes with sleep or daily activities',
          'Side effects from pain medications',
          'Signs of infection (fever, redness, swelling)',
          'Chest pain or shortness of breath',
          'Severe abdominal pain'
        ]
      }
    ]
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { condition, patientName, patientEmail, action, selectedSections, customNotes } = await req.json();
    
    if (!condition || !handoutTemplates[condition]) {
      return Response.json({ error: 'Invalid condition' }, { status: 400 });
    }

    const template = handoutTemplates[condition];
    
    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Skip logo in Deno environment (FileReader not available)
    yPos += 10;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Patient name if provided
    if (patientName) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Prepared for: ${patientName}`, margin, yPos);
      yPos += 10;
    }

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;
    doc.setTextColor(0);

    // Filter sections based on selection
    const sectionsToInclude = selectedSections 
      ? template.sections.filter(section => selectedSections[section.heading]?.included)
      : template.sections;

    // Content sections
    doc.setFontSize(11);
    sectionsToInclude.forEach(section => {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      // Section heading
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text(section.heading, margin, yPos);
      yPos += 8;

      // Section content
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      
      if (section.content) {
        const lines = doc.splitTextToSize(section.content, pageWidth - 2 * margin);
        lines.forEach(line => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      if (section.bullets) {
        // Filter bullets based on selection
        const bulletsToInclude = selectedSections?.[section.heading]?.bullets
          ? section.bullets.filter((bullet, idx) => selectedSections[section.heading].bullets[idx])
          : section.bullets;
        
        bulletsToInclude.forEach(bullet => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;
          }
          const bulletLines = doc.splitTextToSize(`• ${bullet}`, pageWidth - 2 * margin - 5);
          bulletLines.forEach((line, idx) => {
            doc.text(line, margin + (idx === 0 ? 0 : 5), yPos);
            yPos += 6;
          });
        });
        yPos += 3;
      }
      
      yPos += 5;
    });

    // Custom notes section
    if (customNotes && customNotes.trim()) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos += 10;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text('Special Instructions from Your Nurse', margin, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0);
      const notesLines = doc.splitTextToSize(customNotes, pageWidth - 2 * margin);
      notesLines.forEach(line => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 10;
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Penn Home Health Inc. | For questions, contact your nurse', pageWidth / 2, footerY, { align: 'center' });
    doc.text('This information is for educational purposes only. Always follow your doctor\'s advice.', pageWidth / 2, footerY + 5, { align: 'center' });

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // If action is email, send it
    if (action === 'email' && patientEmail) {
      await base44.integrations.Core.SendEmail({
        to: patientEmail,
        subject: `Patient Education: ${template.title}`,
        body: `
          <p>Dear ${patientName || 'Patient'},</p>
          
          <p>Attached is educational information about ${template.title} from Penn Home Health Inc.</p>
          
          <p>Please review this information and contact your nurse if you have any questions.</p>
          
          <p>Best regards,<br>Penn Home Health Team</p>
        `
      });

      return Response.json({ 
        success: true, 
        message: `Handout emailed to ${patientEmail}` 
      });
    }

    // Return PDF as base64 for download
    return Response.json({
      success: true,
      pdf: base64Pdf,
      filename: `${condition}_handout.pdf`
    });

  } catch (error) {
    console.error('Error generating handout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});