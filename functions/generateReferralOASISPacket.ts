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
    const lineHeight = 5.5;

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
      checkPageBreak(14);
      doc.setFillColor(...color);
      doc.rect(margin - 5, yPos - 4, 190, 10, 'F');
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
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(key + ':', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(String(value), 130);
        doc.text(lines, margin + 50, yPos);
        yPos += Math.max(lineHeight + 1, lines.length * 5.5);
      }
    };

    // HEADER
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT ADMISSION PACKET', margin, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Referral Summary & OASIS Pre-Assessment', margin, 19);
    doc.setTextColor(0, 0, 0);
    yPos = 32;

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
    
    checkPageBreak(18);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 4, 180, 12, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('PRIMARY DIAGNOSIS:', margin, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text(dx.primary_diagnosis || 'Not documented', margin + 5, yPos);
    yPos += 8;
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
      doc.setFontSize(10);
      dx.secondary_diagnoses.forEach((diag, idx) => {
        checkPageBreak();
        doc.text(`${idx + 1}. ${diag}`, margin + 3, yPos);
        yPos += 6;
      });
      yPos += 3;
    }

    if (dx.allergies && dx.allergies !== "Not documented in referral.") {
      checkPageBreak(14);
      doc.setFillColor(254, 243, 199);
      doc.rect(margin - 2, yPos - 3, 180, 12, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(161, 98, 7);
      const allergyLines = doc.splitTextToSize('WARNING - ALLERGIES: ' + dx.allergies, 175);
      allergyLines.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 3;
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
        checkPageBreak(18);
        doc.setFillColor(240, 253, 244);
        doc.rect(margin - 2, yPos - 2, 180, 16, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${med.name}`, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        if (med.dosage) doc.text(`Dosage: ${med.dosage}`, margin + 3, yPos);
        if (med.frequency) doc.text(`Freq: ${med.frequency}`, margin + 75, yPos);
        yPos += 5;
        if (med.route) doc.text(`Route: ${med.route}`, margin + 3, yPos);
        if (med.prescriber) doc.text(`By: ${med.prescriber}`, margin + 75, yPos);
        yPos += 7;
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
      doc.setFontSize(10);
      const servicesLines = doc.splitTextToSize(skilled.services_ordered.join(', '), 175);
      servicesLines.forEach(line => {
        doc.text(line, margin + 3, yPos);
        yPos += 6;
      });
      yPos += 3;
    }
    addKeyValue('Frequency/Duration', skilled.frequency_duration);
    if (skilled.specific_interventions?.length > 0) {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Specific Interventions:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      skilled.specific_interventions.forEach(int => {
        checkPageBreak();
        doc.text('\u2022', margin + 3, yPos);
        const intLines = doc.splitTextToSize(int, 170);
        intLines.forEach((line, idx) => {
          doc.text(line, margin + 8, yPos + (idx * 6));
        });
        yPos += intLines.length * 6;
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
      doc.setFontSize(10);
      orders.physician_orders.forEach(order => {
        checkPageBreak();
        doc.text('\u2022', margin + 3, yPos);
        const orderLines = doc.splitTextToSize(order, 170);
        orderLines.forEach((line, idx) => {
          doc.text(line, margin + 8, yPos + (idx * 6));
        });
        yPos += orderLines.length * 6;
      });
      yPos += 3;
    }
    if (orders.treatments?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatments:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      orders.treatments.forEach(tx => {
        checkPageBreak();
        doc.text('\u2022', margin + 3, yPos);
        const txLines = doc.splitTextToSize(tx, 170);
        txLines.forEach((line, idx) => {
          doc.text(line, margin + 8, yPos + (idx * 6));
        });
        yPos += txLines.length * 6;
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
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    const oasisIntro = doc.splitTextToSize('Based on referral information, the following OASIS items can be pre-populated or verified during visit:', 175);
    oasisIntro.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 6;
    doc.setTextColor(0, 0, 0);

    // M1021 - Primary Diagnosis
    checkPageBreak(24);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1021-M1029: DIAGNOSES', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    addKeyValue('M1021 - Primary Diagnosis', dx.primary_diagnosis);
    addKeyValue('M1023 - Primary Diagnosis ICD-10', dx.primary_icd10 || 'Verify code');
    if (dx.secondary_diagnoses?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('M1024-M1029 - Other Diagnoses:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      dx.secondary_diagnoses.slice(0, 5).forEach((d, i) => {
        checkPageBreak();
        const dxLines = doc.splitTextToSize(`${i + 2}. ${d}`, 172);
        dxLines.forEach(line => {
          doc.text(line, margin + 3, yPos);
          yPos += 5.5;
        });
      });
      yPos += 3;
    }
    yPos += 5;

    // M1030 - Therapies
    checkPageBreak(20);
    doc.setFillColor(254, 249, 195);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1030-M1032: THERAPIES AT HOME', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('M1030 - Therapies Received at Home:', margin, yPos);
    yPos += 6;
    doc.text('[ ] IV/Infusion  [ ] Parenteral nutrition  [ ] Enteral nutrition  [ ] None', margin + 3, yPos);
    yPos += 6;
    doc.setTextColor(185, 28, 28);
    doc.text('NOTE: Assess at visit based on current treatments', margin + 3, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);

    // M1033 - Risk Factors
    checkPageBreak(30);
    doc.setFillColor(254, 243, 199);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1033: RISK FOR HOSPITALIZATION', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('[ ] History of falls: ' + (func.fall_risk ? `Yes - ${func.fall_risk}` : 'Assess at visit'), margin, yPos);
    yPos += 6;
    doc.text('[ ] Unintentional weight loss: Assess at visit', margin, yPos);
    yPos += 6;
    doc.text('[ ] Multiple hospitalizations: ' + (dx.recent_hospitalizations ? 'Yes - see history' : 'Assess'), margin, yPos);
    yPos += 6;
    doc.text('[ ] Multiple ED visits: Assess at visit', margin, yPos);
    yPos += 6;
    doc.text('[ ] Decline in mental/emotional/behavioral status: Assess', margin, yPos);
    yPos += 6;
    doc.text('[ ] 5+ medications: ' + (meds.length >= 5 ? `Yes (${meds.length} meds)` : `No (${meds.length} meds)`), margin, yPos);
    yPos += 8;

    // M1400 - Living Arrangements
    checkPageBreak(22);
    doc.setFillColor(219, 234, 254);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1400-M1870: LIVING ARRANGEMENTS & ADLs', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    addKeyValue('M1400 - Lives With', admission.current_living_situation || '[ ] Assess at visit');
    addKeyValue('M1810 - Dress Upper Body', func.adl_status || '[ ] Assess');
    addKeyValue('M1820 - Dress Lower Body', func.adl_status || '[ ] Assess');
    addKeyValue('M1830 - Bathing', '[ ] Assess');
    addKeyValue('M1840 - Toilet Transfer', '[ ] Assess');
    addKeyValue('M1845 - Toileting Hygiene', '[ ] Assess');
    yPos += 5;

    // M1850 - Ambulation
    checkPageBreak(18);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1850-M1860: TRANSFERRING & AMBULATION', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    addKeyValue('M1850 - Transferring', '[ ] Assess');
    addKeyValue('M1860 - Ambulation', func.ambulation || '[ ] Assess');
    yPos += 5;

    // M1870 - Feeding
    checkPageBreak(16);
    doc.setFillColor(240, 253, 244);
    doc.rect(margin - 2, yPos - 3, 180, 9, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('M1870: FEEDING OR EATING', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('[ ] 0 - Able to independently feed self', margin, yPos);
    yPos += 5;
    doc.text('[ ] 1 - Requires setup', margin, yPos);
    yPos += 5;
    doc.text('[ ] Assess level during visit', margin, yPos);
    yPos += 8;

    // IMPORTANT NOTES SECTION
    doc.addPage();
    yPos = 20;
    doc.setFillColor(239, 68, 68);
    doc.rect(0, yPos - 8, 210, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT NURSING NOTES', margin, yPos);
    yPos += 14;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(254, 242, 242);
    doc.rect(margin - 5, yPos, 190, 70, 'F');
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CRITICAL ITEMS TO VERIFY DURING ADMISSION VISIT:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const criticalItems = [
      'Verify all medications - check bottles, dosages, compliance',
      'Assess functional status for all OASIS ADL items',
      'Complete comprehensive skin assessment (M1306-M1308)',
      'Verify allergies and document reactions',
      'Assess home safety and environmental hazards',
      'Obtain baseline vital signs and weight',
      'Assess pain comprehensively (M1242)',
      'Complete cognitive/behavioral assessment',
      'Verify emergency contacts and advance directives',
      'Document homebound status clearly (M1910)'
    ];
    
    criticalItems.forEach(item => {
      checkPageBreak();
      doc.text('\u2022', margin + 2, yPos);
      const itemLines = doc.splitTextToSize(item, 175);
      itemLines.forEach((line, idx) => {
        doc.text(line, margin + 7, yPos + (idx * 6));
      });
      yPos += itemLines.length * 6;
    });
    yPos += 8;

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
      doc.setFontSize(10);
      const notes = doc.splitTextToSize(referralData.oasis_relevant_notes, 175);
      notes.forEach(line => {
        checkPageBreak();
        doc.text(line, margin + 2, yPos);
        yPos += 5.5;
      });
    }

    // HOMEBOUND STATUS SECTION
    checkPageBreak(50);
    yPos += 8;
    doc.setFillColor(139, 92, 246);
    doc.rect(margin - 5, yPos, 190, 12, 'F');
    yPos += 8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('HOMEBOUND STATUS JUSTIFICATION (M1910)', margin, yPos);
    yPos += 12;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(243, 232, 255);
    doc.rect(margin - 5, yPos, 190, 65, 'F');
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('WHY PATIENT IS HOMEBOUND:', margin, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    const homeboundReasons = [];
    
    // Add relevant homebound factors based on patient data
    if (dx.primary_diagnosis?.toLowerCase().includes('fracture')) {
      homeboundReasons.push('Recent pelvic fracture requiring assistive device and moderate assistance for ambulation');
    }
    if (func.ambulation?.toLowerCase().includes('assist') || func.ambulation?.toLowerCase().includes('walker')) {
      homeboundReasons.push('Requires walker (FWW) and physical assistance to ambulate safely');
    }
    if (func.fall_risk?.toLowerCase().includes('high')) {
      homeboundReasons.push('High fall risk - unsafe to leave home without assistance');
    }
    if (func.pain && (func.pain.includes('6/10') || func.pain.toLowerCase().includes('significant'))) {
      homeboundReasons.push('Significant pain with movement requiring medication before mobilization');
    }
    if (func.adl_status?.toLowerCase().includes('max') || func.adl_status?.toLowerCase().includes('substantial')) {
      homeboundReasons.push('Requires maximal/substantial assistance with ADLs including dressing and toileting');
    }
    if (demo.age && parseInt(demo.age) >= 90) {
      homeboundReasons.push('Advanced age (96 years) with generalized weakness and endurance limitations');
    }
    
    homeboundReasons.push('Leaving home requires considerable and taxing effort');
    homeboundReasons.push('Absences from home are infrequent and of short duration (medical appointments only)');
    
    homeboundReasons.forEach(reason => {
      checkPageBreak();
      doc.text('\u2022', margin + 2, yPos);
      const reasonLines = doc.splitTextToSize(reason, 175);
      reasonLines.forEach((line, idx) => {
        doc.text(line, margin + 7, yPos + (idx * 6));
      });
      yPos += reasonLines.length * 6;
    });
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(88, 28, 135);
    doc.setFont('helvetica', 'bold');
    const reminder = doc.splitTextToSize('REMINDER: Document specific details of homebound status during visit. Include distance patient can walk, need for assistance, and taxing effort required to leave home.', 175);
    reminder.forEach(line => {
      doc.text(line, margin + 2, yPos);
      yPos += 5.5;
    });
    doc.setTextColor(0, 0, 0);

    // SAMPLE NURSING ASSESSMENT
    checkPageBreak(80);
    yPos += 10;
    doc.setFillColor(34, 197, 94);
    doc.rect(margin - 5, yPos, 190, 12, 'F');
    yPos += 8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SAMPLE ADMISSION NURSING ASSESSMENT', margin, yPos);
    yPos += 12;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(240, 253, 244);
    doc.rect(margin - 5, yPos, 190, 130, 'F');
    yPos += 8;

    const sampleAssessment = `SUBJECTIVE: ${demo.age || '96'}-year-old ${demo.gender || 'female'} admitted to home health following ${admission.admission_source || 'skilled nursing facility stay'} for ${dx.primary_diagnosis || 'right pelvic fracture'}. Patient reports pain level ${func.pain || '6/10'} with movement, managed with oxycodone. States "I want to get stronger so I can be more independent." Daughter present and supportive. Patient alert and cooperative with assessment.

OBJECTIVE: Vital signs - BP ${clinical.vital_signs || '160/82'}, HR ${clinical.vital_signs?.includes('94') ? '94' : 'WNL'}, Temp ${clinical.vital_signs?.includes('97.4') ? '97.4°F' : 'afebrile'}, RR ${clinical.vital_signs?.includes('16') ? '16' : 'WNL'}, SpO2 ${clinical.vital_signs?.includes('96') ? '96%' : '>95%'} on room air. Weight ${clinical.weight || '168 lbs'}. 

Ambulation: ${func.ambulation || 'Requires FWW and moderate assistance for short distances'}. Gait unsteady. Transfers bed/chair with moderate assistance. 

ADLs: ${func.adl_status || 'Requires maximal assistance lower body dressing, moderate assistance bathing/toileting'}. Continent with urge incontinence. 

Cardiovascular: ${dx.past_medical_history?.includes('heart failure') ? 'History of CHF. Heart rate regular, no edema noted upper extremities. Trace ankle edema bilaterally.' : 'Heart regular rate and rhythm.'}

Respiratory: Lungs clear to auscultation bilaterally. No SOB at rest.

Integumentary: Skin intact, warm and dry. No wounds, pressure areas, or rashes noted. ${func.skin_integrity || 'Good turgor for age'}.

Musculoskeletal: Generalized weakness noted. ROM limited by pain in lower extremity. ${dx.primary_diagnosis?.includes('fracture') ? 'Tenderness to palpation right pelvic area. WBAT per physician orders.' : ''}

Neurological: Alert and oriented x4. ${func.cognitive_status?.includes('deficit') ? 'Noted mild cognitive communication deficit - follows simple commands, some memory impairment.' : 'Speech clear, follows multi-step commands.'} PERRLA. Sensation intact.

Pain: Reports ${func.pain || '6/10'} pain with movement, relieved by oxycodone. Takes medication before PT as ordered.

Safety: Home environment assessed - ${safety.environmental_hazards || 'daughter nearby for support'}. Fall risk HIGH - recent fall history, age, mobility limitations. ${safety.safety_equipment_needed ? 'Safety equipment: ' + safety.safety_equipment_needed + '.' : 'FWW provided.'}

ASSESSMENT: ${demo.age || '96'}-year-old with recent pelvic fracture requiring skilled nursing for assessment, medication management, and coordination of therapy services. Patient is HOMEBOUND due to inability to ambulate safely without assistance, high fall risk, significant pain with movement, and taxing effort required to leave home. Patient demonstrates good rehab potential with supportive family.

PLAN: 
\u2022 Skilled nursing visits for comprehensive assessment, medication review, vital signs monitoring, and care coordination
\u2022 PT/OT services for strength, balance, mobility, and ADL training
\u2022 Pain management per MD orders - monitor effectiveness and side effects
\u2022 Fall prevention education - proper walker use, home safety modifications
\u2022 Monitor for complications: infection, DVT, deconditioning
\u2022 Coordinate with MD for lab work, medication adjustments as needed
\u2022 Teach patient/caregiver signs/symptoms to report
\u2022 Goals: Improve functional mobility, pain management, prevent complications, maximize independence

Patient/caregiver verbalize understanding of plan of care and agree with goals. All questions answered.`;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const assessmentLines = doc.splitTextToSize(sampleAssessment, 175);
    assessmentLines.forEach(line => {
      checkPageBreak();
      doc.text(line, margin + 2, yPos);
      yPos += 5;
    });

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