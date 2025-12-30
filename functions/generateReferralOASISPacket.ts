import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const { referralData } = await req.json();

    if (!referralData) {
      return Response.json({ error: 'Referral data required' }, { status: 400 });
    }

    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const lineHeight = 7;

    const checkPageBreak = (neededSpace = 20) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    const addText = (text, fontSize = 10, isBold = false, color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, 180);
      checkPageBreak(lines.length * lineHeight);
      doc.text(lines, margin, yPos);
      yPos += lines.length * lineHeight;
    };

    const addSectionHeader = (title, color = [37, 99, 235]) => {
      checkPageBreak(15);
      doc.setFillColor(...color);
      doc.rect(margin - 5, yPos - 5, 190, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);
    };

    const addKeyValue = (key, value) => {
      if (value && value !== "Not documented in referral.") {
        checkPageBreak();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(key + ':', margin, yPos);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(String(value), 130);
        doc.text(lines, margin + 50, yPos);
        yPos += Math.max(lineHeight, lines.length * 6);
      }
    };

    // HEADER
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT ADMISSION PACKET', margin, 15);
    doc.setFontSize(11);
    doc.text('Referral Summary & OASIS Pre-Assessment', margin, 23);
    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // PATIENT DEMOGRAPHICS
    addSectionHeader('PATIENT DEMOGRAPHICS', [37, 99, 235]);
    const demo = referralData.demographics || {};
    addKeyValue('Full Name', demo.full_name);
    addKeyValue('Date of Birth', demo.date_of_birth);
    addKeyValue('Age', demo.age);
    addKeyValue('Gender', demo.gender);
    addKeyValue('Address', demo.address);
    addKeyValue('Phone', demo.phone);
    addKeyValue('Emergency Contact', demo.emergency_contact);
    addKeyValue('Emergency Phone', demo.emergency_phone);
    addKeyValue('Relationship', demo.emergency_relationship);
    yPos += 5;

    // INSURANCE & PHYSICIANS
    addSectionHeader('INSURANCE & PHYSICIANS', [99, 102, 241]);
    addKeyValue('Primary Insurance', demo.insurance_primary);
    addKeyValue('Secondary Insurance', demo.insurance_secondary);
    addKeyValue('Policy Numbers', demo.policy_numbers);
    addKeyValue('Referring Physician', demo.referring_physician);
    addKeyValue('Referring Physician Contact', demo.referring_physician_contact);
    addKeyValue('Primary Care Physician', demo.primary_care_physician);
    addKeyValue('PCP Contact', demo.pcp_contact);
    yPos += 5;

    // ADMISSION DETAILS
    addSectionHeader('ADMISSION INFORMATION', [139, 92, 246]);
    const admission = referralData.admission_details || {};
    addKeyValue('Admission Source', admission.admission_source);
    addKeyValue('Admission Date', admission.admission_date);
    addKeyValue('Referral Date', admission.referral_date);
    addKeyValue('Referral Reason', admission.referral_reason);
    addKeyValue('Prior Living Situation', admission.prior_living_situation);
    addKeyValue('Current Living Situation', admission.current_living_situation);
    addKeyValue('Support System', admission.support_system);
    yPos += 5;

    // DIAGNOSES - HIGHLIGHTED
    addSectionHeader('DIAGNOSES & MEDICAL HISTORY', [220, 38, 38]);
    const dx = referralData.diagnoses || {};
    
    checkPageBreak(25);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 5, 180, 15, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('PRIMARY DIAGNOSIS:', margin, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.text(dx.primary_diagnosis || 'Not documented', margin + 5, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

    if (dx.primary_icd10) {
      addKeyValue('ICD-10 Code', dx.primary_icd10);
    }

    if (dx.secondary_diagnoses?.length > 0) {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Secondary Diagnoses:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      dx.secondary_diagnoses.forEach((diag, idx) => {
        checkPageBreak();
        doc.text(`  ${idx + 1}. ${diag}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 3;
    }

    if (dx.allergies && dx.allergies !== "Not documented in referral.") {
      checkPageBreak(15);
      doc.setFillColor(254, 243, 199);
      doc.rect(margin - 2, yPos - 4, 180, 12, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(161, 98, 7);
      doc.text('⚠ ALLERGIES: ' + dx.allergies, margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);
    }

    if (dx.past_medical_history?.length > 0) {
      addKeyValue('Past Medical History', dx.past_medical_history.join(', '));
    }
    if (dx.surgical_history?.length > 0) {
      addKeyValue('Surgical History', dx.surgical_history.join(', '));
    }
    addKeyValue('Recent Hospitalizations', dx.recent_hospitalizations);
    yPos += 5;

    // MEDICATIONS
    addSectionHeader('CURRENT MEDICATIONS', [34, 197, 94]);
    const meds = referralData.medications || [];
    if (meds.length > 0) {
      meds.forEach((med, idx) => {
        checkPageBreak(20);
        doc.setFillColor(240, 253, 244);
        doc.rect(margin - 2, yPos - 3, 180, 18, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${med.name}`, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (med.dosage) doc.text(`   Dosage: ${med.dosage}`, margin + 5, yPos);
        if (med.frequency) doc.text(`Frequency: ${med.frequency}`, margin + 80, yPos);
        yPos += 5;
        if (med.route) doc.text(`   Route: ${med.route}`, margin + 5, yPos);
        if (med.prescriber) doc.text(`Prescriber: ${med.prescriber}`, margin + 80, yPos);
        yPos += 8;
      });
    } else {
      addText('No medications documented in referral', 10);
    }
    yPos += 5;

    // FUNCTIONAL STATUS - OASIS RELEVANT
    doc.addPage();
    yPos = 20;
    addSectionHeader('FUNCTIONAL STATUS (OASIS-E RELEVANT)', [168, 85, 247]);
    const func = referralData.functional_status || {};
    addKeyValue('Ambulation', func.ambulation);
    addKeyValue('ADL Status', func.adl_status);
    addKeyValue('Fall Risk', func.fall_risk);
    addKeyValue('Cognitive Status', func.cognitive_status);
    addKeyValue('Vision', func.vision);
    addKeyValue('Hearing', func.hearing);
    addKeyValue('Skin Integrity', func.skin_integrity);
    addKeyValue('Wounds', func.wounds);
    addKeyValue('Pain', func.pain);
    addKeyValue('Continence', func.continence);
    yPos += 5;

    // CLINICAL INFORMATION
    addSectionHeader('CLINICAL INFORMATION', [236, 72, 153]);
    const clinical = referralData.clinical_info || {};
    addKeyValue('Vital Signs', clinical.vital_signs);
    addKeyValue('Weight', clinical.weight);
    addKeyValue('Lab Values', clinical.lab_values);
    addKeyValue('Diagnostic Results', clinical.diagnostic_results);
    addKeyValue('Procedures', clinical.procedures);
    yPos += 5;

    // SKILLED NEEDS
    addSectionHeader('SKILLED NEEDS & SERVICES', [251, 146, 60]);
    const skilled = referralData.skilled_needs || {};
    if (skilled.services_ordered?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Services Ordered:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(skilled.services_ordered.join(', '), margin + 5, yPos);
      yPos += 8;
    }
    addKeyValue('Frequency/Duration', skilled.frequency_duration);
    if (skilled.specific_interventions?.length > 0) {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Specific Interventions:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      skilled.specific_interventions.forEach(int => {
        checkPageBreak();
        doc.text(`  • ${int}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 3;
    }
    if (skilled.dme_supplies?.length > 0) {
      addKeyValue('DME/Supplies Needed', skilled.dme_supplies.join(', '));
    }
    addKeyValue('Goals of Care', skilled.goals_of_care);
    yPos += 5;

    // PSYCHOSOCIAL
    addSectionHeader('PSYCHOSOCIAL ASSESSMENT', [236, 72, 153]);
    const psycho = referralData.psychosocial || {};
    addKeyValue('Mental Health', psycho.mental_health);
    addKeyValue('Caregiver Information', psycho.caregiver_info);
    addKeyValue('Language', psycho.language);
    addKeyValue('Cultural Needs', psycho.cultural_needs);
    addKeyValue('Advance Directives', psycho.advance_directives);
    yPos += 5;

    // ORDERS & TREATMENTS
    addSectionHeader('PHYSICIAN ORDERS & TREATMENTS', [5, 150, 105]);
    const orders = referralData.orders_treatments || {};
    if (orders.physician_orders?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Physician Orders:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      orders.physician_orders.forEach(order => {
        checkPageBreak();
        doc.text(`  • ${order}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 3;
    }
    if (orders.treatments?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatments:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      orders.treatments.forEach(tx => {
        checkPageBreak();
        doc.text(`  • ${tx}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 3;
    }
    addKeyValue('Diet', orders.diet);
    addKeyValue('Activity Restrictions', orders.activity_restrictions);
    yPos += 5;

    // SAFETY CONCERNS
    addSectionHeader('SAFETY CONCERNS', [239, 68, 68]);
    const safety = referralData.safety_concerns || {};
    addKeyValue('Environmental Hazards', safety.environmental_hazards);
    if (safety.safety_equipment_needed?.length > 0) {
      addKeyValue('Safety Equipment Needed', safety.safety_equipment_needed.join(', '));
    }
    if (safety.high_risk_conditions?.length > 0) {
      addKeyValue('High Risk Conditions', safety.high_risk_conditions.join(', '));
    }

    // OASIS PRE-FILLED ITEMS
    doc.addPage();
    yPos = 20;
    addSectionHeader('OASIS-E PRE-ASSESSMENT GUIDE', [5, 150, 105]);
    
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Based on referral information, the following OASIS items can be pre-populated or verified during visit:', margin, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

    // M1000 - Demographics
    checkPageBreak(30);
    doc.setFillColor(219, 234, 254);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1000-M1060: ADMINISTRATIVE INFORMATION', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addKeyValue('M1005 - Medicare Number', demo.policy_numbers || 'Verify at visit');
    addKeyValue('M1010 - Medicaid Number', 'Verify at visit');
    addKeyValue('M1016 - Physician Name', demo.primary_care_physician || demo.referring_physician);
    addKeyValue('M1018 - Physician Phone', demo.pcp_contact || demo.referring_physician_contact);
    yPos += 5;

    // M1021 - Primary Diagnosis
    checkPageBreak(25);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1021-M1029: DIAGNOSES', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addKeyValue('M1021 - Primary Diagnosis', dx.primary_diagnosis);
    addKeyValue('M1023 - Primary Diagnosis ICD-10', dx.primary_icd10 || 'Verify code');
    if (dx.secondary_diagnoses?.length > 0) {
      doc.text('M1024-M1029 - Other Diagnoses:', margin, yPos);
      yPos += 6;
      dx.secondary_diagnoses.slice(0, 5).forEach((d, i) => {
        checkPageBreak();
        doc.text(`  ${i + 2}. ${d}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 3;
    }
    yPos += 5;

    // M1030 - Therapies
    checkPageBreak(20);
    doc.setFillColor(254, 249, 195);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1030-M1032: THERAPIES AT HOME', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('M1030 - Therapies Received at Home:', margin, yPos);
    yPos += 6;
    doc.text('☐ IV/Infusion therapy  ☐ Parenteral nutrition  ☐ Enteral nutrition  ☐ None', margin + 5, yPos);
    yPos += 6;
    doc.text('⚠ Assess at visit based on current treatments', margin + 5, yPos);
    yPos += 10;

    // M1033 - Risk Factors
    checkPageBreak(30);
    doc.setFillColor(254, 243, 199);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1033: RISK FOR HOSPITALIZATION', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('History of falls: ' + (func.fall_risk ? `Yes - ${func.fall_risk}` : '☐ Assess at visit'), margin, yPos);
    yPos += 6;
    doc.text('Unintentional weight loss: ☐ Assess at visit', margin, yPos);
    yPos += 6;
    doc.text('Multiple hospitalizations: ' + (dx.recent_hospitalizations ? 'Yes - see history' : '☐ Assess'), margin, yPos);
    yPos += 6;
    doc.text('Multiple ED visits: ☐ Assess at visit', margin, yPos);
    yPos += 6;
    doc.text('Decline in mental/emotional/behavioral status: ☐ Assess', margin, yPos);
    yPos += 6;
    doc.text('5+ medications: ' + (meds.length >= 5 ? `Yes (${meds.length} medications)` : `No (${meds.length} medications)`), margin, yPos);
    yPos += 10;

    // M1400 - Dyspnea
    checkPageBreak(20);
    doc.setFillColor(219, 234, 254);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1400-M1870: LIVING ARRANGEMENTS & SENSORY STATUS', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addKeyValue('M1400 - Lives With', admission.current_living_situation || '☐ Assess at visit');
    addKeyValue('M1810 - Able to Dress Upper Body', func.adl_status || '☐ Assess at visit');
    addKeyValue('M1820 - Able to Dress Lower Body', func.adl_status || '☐ Assess at visit');
    addKeyValue('M1830 - Bathing', '☐ Assess at visit');
    addKeyValue('M1840 - Toilet Transferring', '☐ Assess at visit');
    addKeyValue('M1845 - Toileting Hygiene', '☐ Assess at visit');
    yPos += 5;

    // M1850 - Ambulation
    checkPageBreak(20);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1850-M1860: TRANSFERRING & AMBULATION', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addKeyValue('M1850 - Transferring', '☐ Assess at visit');
    addKeyValue('M1860 - Ambulation/Locomotion', func.ambulation || '☐ Assess at visit');
    yPos += 5;

    // M1870 - Feeding
    checkPageBreak(15);
    doc.setFillColor(240, 253, 244);
    doc.rect(margin - 2, yPos - 4, 180, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1870: FEEDING OR EATING', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('☐ 0 - Able to independently feed self', margin, yPos);
    yPos += 5;
    doc.text('☐ 1 - Able to feed self independently but requires setup', margin, yPos);
    yPos += 5;
    doc.text('☐ Assess level during visit', margin, yPos);
    yPos += 10;

    // IMPORTANT NOTES SECTION
    doc.addPage();
    yPos = 20;
    doc.setFillColor(239, 68, 68);
    doc.rect(0, yPos - 10, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ IMPORTANT NURSING NOTES', margin, yPos);
    yPos += 15;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(254, 242, 242);
    doc.rect(margin - 5, yPos, 190, 70, 'F');
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CRITICAL ITEMS TO VERIFY DURING ADMISSION VISIT:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const criticalItems = [
      '☐ Verify all medications - check actual bottles, dosages, and compliance',
      '☐ Assess actual functional status for all OASIS ADL items',
      '☐ Complete comprehensive skin assessment (M1306-M1308)',
      '☐ Verify allergies and document reactions',
      '☐ Assess home safety and environmental hazards',
      '☐ Obtain baseline vital signs and weight',
      '☐ Assess pain comprehensively (M1242)',
      '☐ Complete cognitive/behavioral assessment',
      '☐ Verify emergency contacts and advance directives',
      '☐ Document homebound status clearly (M1910)'
    ];
    
    criticalItems.forEach(item => {
      doc.text(item, margin + 2, yPos);
      yPos += 6;
    });
    yPos += 10;

    if (referralData.oasis_relevant_notes) {
      checkPageBreak(30);
      doc.setFillColor(219, 234, 254);
      doc.rect(margin - 5, yPos, 190, 40, 'F');
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AI-GENERATED OASIS NOTES:', margin, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const notes = doc.splitTextToSize(referralData.oasis_relevant_notes, 175);
      notes.forEach(line => {
        checkPageBreak();
        doc.text(line, margin + 2, yPos);
        yPos += 5;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="admission_packet_${Date.now()}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    }, { status: 500 });
  }
});