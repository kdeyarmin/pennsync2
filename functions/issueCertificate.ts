import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should be called by the system, not directly by users
        // Verify it's being called internally or by admin
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assignment_id, user_id, course_id, score } = await req.json();

        if (!assignment_id || !user_id || !course_id) {
            return Response.json({ 
                error: 'assignment_id, user_id, and course_id are required' 
            }, { status: 400 });
        }

        // Fetch assignment and course details
        const assignment = await base44.asServiceRole.entities.TrainingAssignment.get('TrainingAssignment', assignment_id);
        const course = await base44.asServiceRole.entities.TrainingCourse.get('TrainingCourse', course_id);
        const userData = await base44.asServiceRole.entities.User.filter({ email: user_id });

        if (!assignment || !course) {
            return Response.json({ error: 'Assignment or course not found' }, { status: 404 });
        }

        const userName = userData && userData.length > 0 ? userData[0].full_name : user_id;

        // Check if certificate already exists
        const existingCerts = await base44.asServiceRole.entities.TrainingCertificate.filter({
            assignment_id,
            user_id
        });

        if (existingCerts && existingCerts.length > 0) {
            // Certificate already exists, return it
            return Response.json({
                success: true,
                certificate: existingCerts[0],
                message: 'Certificate already issued'
            });
        }

        // Generate unique certificate ID
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Generate verification hash
        const verificationData = `${user_id}|${course_id}|${assignment.completion_date || new Date().toISOString()}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(verificationData);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const verificationHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Calculate expiration date
        let expirationDate = null;
        if (course.certificate_valid_months) {
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + course.certificate_valid_months);
            expirationDate = expDate.toISOString().split('T')[0];
        }

        // Create certificate record
        const certificateData = {
            user_id,
            user_name: userName,
            assignment_id,
            course_id,
            course_title: course.title,
            training_category: course.category,
            business_line: course.business_line_scope,
            annual_cycle_year: course.annual_cycle_year,
            certificate_id: certificateId,
            issued_at: new Date().toISOString(),
            completion_date: assignment.completion_date || new Date().toISOString(),
            expiration_date: expirationDate,
            score: score !== undefined ? score : assignment.score_percentage,
            hours: course.ceu_hours,
            verification_hash: verificationHash,
            revoked: false
        };

        const certificate = await base44.asServiceRole.entities.TrainingCertificate.create(certificateData);

        // Generate PDF asynchronously by calling the PDF generation function
        try {
            await base44.asServiceRole.functions.invoke('generateTrainingCertificatePDF', {
                certificate_id: certificateId
            });
        } catch (pdfError) {
            console.error('PDF generation failed, but certificate created:', pdfError);
        }

        // Update assignment with certificate ID
        await base44.asServiceRole.entities.TrainingAssignment.update(assignment_id, {
            certificate_id: certificateId
        });

        return Response.json({
            success: true,
            certificate,
            certificate_id: certificateId
        });

    } catch (error) {
        console.error('Certificate issuance error:', error);
        return Response.json({ 
            error: 'Failed to issue certificate',
            details: error.message 
        }, { status: 500 });
    }
});