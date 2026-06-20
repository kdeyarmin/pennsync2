import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.account_type !== 'agency_admin' && user.account_type !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      reportType,
      businessLine,
      dateStart,
      dateEnd,
      employeeId,
      courseId,
      planId,
      status
    } = await req.json();

    let data = [];
    let headers = [];

    if (reportType === 'transcript') {
      // Employee transcript CSV
      const certificates = await base44.asServiceRole.entities.TrainingCertificate.filter(
        { user_id: employeeId, revoked: false },
        '-issued_at'
      );

      headers = ['Completion Date', 'Course', 'Score', 'Pass', 'Certificate ID'];
      data = certificates.map(cert => ({
        'Completion Date': new Date(cert.issued_at).toLocaleDateString(),
        'Course': cert.course_title || 'Unknown',
        'Score': cert.score ? `${cert.score}%` : 'N/A',
        'Pass': cert.score && cert.score >= 80 ? 'Yes' : 'No',
        'Certificate ID': cert.certificate_id || 'N/A'
      }));
    } else if (reportType === 'roster') {
      // Course roster CSV
      const query = { course_id: courseId };
      if (businessLine && businessLine !== 'all') {
        query.business_line = businessLine;
      }

      const assignments = await base44.asServiceRole.entities.TrainingAssignment.filter(query, '-created_date');
      
      headers = ['Employee', 'Assigned Date', 'Due Date', 'Status', 'Completion Date', 'Score', 'Attempts'];
      data = assignments.map(a => ({
        'Employee': a.assigned_to_user_id || 'N/A',
        'Assigned Date': new Date(a.created_date).toLocaleDateString(),
        'Due Date': a.due_date || 'N/A',
        'Status': a.status || 'pending',
        'Completion Date': a.completion_date ? new Date(a.completion_date).toLocaleDateString() : 'Not Completed',
        'Score': a.score || 'N/A',
        'Attempts': a.attempt_count || '0'
      }));
    } else if (reportType === 'plan-compliance') {
      // Learning plan compliance CSV
      const enrollments = await base44.asServiceRole.entities.PlanEnrollment.filter(
        { plan_id: planId },
        '-enrolled_at'
      );

      headers = ['Employee', 'Enrollment Date', 'Status', 'Progress %', 'Completed / Total'];
      data = enrollments.map(e => ({
        'Employee': e.user_name || 'Unknown',
        'Enrollment Date': new Date(e.enrolled_at).toLocaleDateString(),
        'Status': e.status || 'active',
        'Progress %': Math.round(e.progress_percentage || 0),
        'Completed / Total': `${e.courses_completed || 0} / ${e.courses_total || 0}`
      }));
    } else if (reportType === 'overdue') {
      // Overdue assignments CSV
      const query = { status: 'overdue' };
      if (businessLine && businessLine !== 'all') {
        query.business_line = businessLine;
      }

      const overdue = await base44.asServiceRole.entities.TrainingAssignment.filter(query, '-due_date');

      headers = ['Employee', 'Course', 'Due Date', 'Days Overdue'];
      data = overdue.map(a => ({
        'Employee': a.assigned_to_user_id || 'N/A',
        'Course': a.course_title || 'Unknown',
        'Due Date': a.due_date || 'N/A',
        'Days Overdue': Math.ceil((new Date() - new Date(a.due_date)) / (1000 * 60 * 60 * 24))
      }));
    } else if (reportType === 'expiring') {
      // Certificate expiration CSV
      const query = {
        revoked: false,
        expiration_date: { $ne: null }
      };
      if (businessLine && businessLine !== 'all') {
        query.business_line = businessLine;
      }

      const expiring = await base44.asServiceRole.entities.TrainingCertificate.filter(query, 'expiration_date');

      headers = ['Employee', 'Course', 'Issued Date', 'Expiration Date', 'Days Until Expiry'];
      data = expiring.map(c => {
        const daysUntilExpiry = Math.ceil((new Date(c.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          'Employee': c.user_name || 'Unknown',
          'Course': c.course_title || 'Unknown',
          'Issued Date': new Date(c.issued_at).toLocaleDateString(),
          'Expiration Date': new Date(c.expiration_date).toLocaleDateString(),
          'Days Until Expiry': daysUntilExpiry
        };
      });
    }

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        // Only blank null/undefined — `|| ''` wrongly blanked legitimate 0s
        // (Days Until Expiry / Days Overdue / Progress % for a cert due today).
        const raw = row[h];
        const val = raw === undefined || raw === null ? '' : raw;
        let cell = String(val);
        // CSV formula-injection guard: a cell starting with =, +, -, @ or a
        // leading tab/CR is executed as a formula by Excel/Sheets even inside
        // quotes. Prefix a single quote so an AI-generated course title like
        // "=cmd|..." renders as text. Only text cells — numbers stay numeric so
        // a negative count (e.g. Days Until Expiry) isn't turned into a string.
        if (typeof raw !== 'number' && /^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
        const escaped = cell.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report_${reportType}_${new Date().getTime()}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV export failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});