import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { parseAndValidateStudentList } from '../services/excelParser.js';
import { sendInvitationEmail, createMailTransporter } from '../services/emailService.js';
import { getPublicAppUrl } from '../services/publicUrl.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Get all drives with summary counts
router.get('/', authenticateToken, (req, res) => {
  const drives = db.prepare(`
    SELECT 
      d.*,
      COUNT(s.id) as total_students,
      SUM(CASE WHEN s.status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN s.status = 'SENT' OR s.status = 'OTP_SENT' THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN s.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN s.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
    FROM drives d
    LEFT JOIN shortlisted_students s ON d.id = s.drive_id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all();

  return res.json({ drives });
});

// Delete a placement drive and all data associated with it
router.delete('/:id', authenticateToken, (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.id);

  if (!drive) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  db.prepare(`DELETE FROM otps WHERE student_id IN (SELECT id FROM shortlisted_students WHERE drive_id = ?)`)
    .run(req.params.id);
  db.prepare(`DELETE FROM shortlisted_students WHERE drive_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM whatsapp_logs WHERE drive_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM drives WHERE id = ?`).run(req.params.id);

  return res.json({ message: 'Placement drive deleted successfully' });
});

// Create new Placement Drive
router.post('/', authenticateToken, (req, res) => {
  const { company_name, drive_name, placement_round, drive_date, whatsapp_group_link, description } = req.body;

  if (!company_name || !drive_name || !placement_round || !drive_date || !whatsapp_group_link) {
    return res.status(400).json({ error: 'Missing required fields: company_name, drive_name, placement_round, drive_date, whatsapp_group_link' });
  }

  // Basic URL validation
  if (!whatsapp_group_link.startsWith('http')) {
    return res.status(400).json({ error: 'WhatsApp group link must be a valid URL starting with http:// or https://' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO drives (id, company_name, drive_name, placement_round, drive_date, whatsapp_group_link, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, company_name, drive_name, placement_round, drive_date, whatsapp_group_link, description || '', req.user.id);

  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(id);

  return res.status(201).json({ message: 'Drive created successfully', drive });
});

// Get drive details and student shortlist
router.get('/:id', authenticateToken, (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.id);

  if (!drive) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  const rawStudents = db.prepare(`
    SELECT id, drive_id, student_name, roll_number, original_phone, normalized_phone, email, invitation_token, status, invitation_sent_at, verified_at, created_at
    FROM shortlisted_students
    WHERE drive_id = ?
    ORDER BY student_name ASC
  `).all(req.params.id);

  const students = rawStudents;

  const stats = {
    total: students.length,
    verified: students.filter(s => s.status === 'VERIFIED').length,
    sent: students.filter(s => s.status === 'SENT' || s.status === 'OTP_SENT').length,
    pending: students.filter(s => s.status === 'PENDING').length,
    failed: students.filter(s => s.status === 'FAILED').length
  };

  return res.json({ drive, students, stats });
});

// Preview uploaded student list file without persisting
router.post('/preview-file', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = parseAndValidateStudentList(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    return res.json(result);
  } catch (error) {
    console.error('File parsing error:', error);
    return res.status(400).json({ error: `Failed to parse file: ${error.message}` });
  }
});

// Save shortlisted students. Invitations are sent when the admin confirms dispatch.
router.post('/:id/upload-shortlist', authenticateToken, upload.single('file'), (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.id);
  if (!drive) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No Excel or CSV file uploaded' });
  }

  try {
    const parseResult = parseAndValidateStudentList(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const { validRecords } = parseResult;

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: 'No valid student records found in file',
        parseResult
      });
    }

    // Existing roll numbers in this drive to prevent duplicates
    const existing = db.prepare(`SELECT roll_number FROM shortlisted_students WHERE drive_id = ?`).all(req.params.id);
    const existingRolls = new Set(existing.map(e => e.roll_number));

    const insertStmt = db.prepare(`
      INSERT INTO shortlisted_students (id, drive_id, student_name, roll_number, original_phone, normalized_phone, email, invitation_token, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    let addedCount = 0;
    let skippedExistingCount = 0;

    const insertTransaction = db.transaction((records) => {
      for (const rec of records) {
        if (existingRolls.has(rec.roll_number)) {
          skippedExistingCount++;
          continue;
        }

        const id = uuidv4();
        const invitationToken = uuidv4();

        insertStmt.run(
          id,
          req.params.id,
          rec.studentName,
          rec.rollNumber,
          rec.originalPhone,
          rec.normalizedPhone,
          rec.email,
          invitationToken
        );
        addedCount++;
      }
    });

    insertTransaction(validRecords);

    return res.json({
      message: `Shortlist imported! ${addedCount} student(s) added. Send invitation emails when you are ready.`,
      addedCount,
      skippedExistingCount,
      parseResult
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: `Failed to process upload: ${error.message}` });
  }
});

// Email invitations to all unverified students in the drive
router.post('/:id/send-invitations', authenticateToken, async (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.id);
  if (!drive) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  // Create shared transporter for the batch
  const transporter = createMailTransporter();
  if (!transporter) {
    return res.status(400).json({
      error: 'Admin Gmail SMTP settings are incomplete. Please configure your Gmail and Google App Password in Settings before sending invitations.'
    });
  }

  // Verify SMTP before starting bulk send
  try {
    await transporter.verify();
  } catch (verifyErr) {
    return res.status(400).json({
      error: `Admin Gmail SMTP connection failed: ${verifyErr.message}. Please check your Gmail credentials in Settings.`
    });
  }

  // Get base URL of current server/frontend for generating links
  const appBaseUrl = getPublicAppUrl(req);

  // Dispatch invitations that are pending or previously failed, or all unverified if requested
  const sendToAllUnverified = req.query.all === 'true';
  let students = db.prepare(`
    SELECT * FROM shortlisted_students 
    WHERE drive_id = ? AND (status = 'PENDING' OR status = 'FAILED')
  `).all(req.params.id);

  if (students.length === 0 && sendToAllUnverified) {
    students = db.prepare(`
      SELECT * FROM shortlisted_students 
      WHERE drive_id = ? AND status != 'VERIFIED'
    `).all(req.params.id);
  }

  if (students.length === 0) {
    return res.json({
      message: 'All students in this drive have already received invitations.',
      sentCount: 0,
      failedCount: 0,
      totalAttempted: 0
    });
  }

  let sentCount = 0;
  let failedCount = 0;
  const sendFailures = [];

  for (const student of students) {
    const inviteUrl = `${appBaseUrl}/verify-invite/${student.invitation_token}`;

    try {
      const result = await sendInvitationEmail({
        recipientEmail: student.email,
        studentName: student.student_name,
        companyName: drive.company_name,
        driveName: drive.drive_name,
        placementRound: drive.placement_round,
        invitationLink: inviteUrl,
        transporter
      });

      if (result.success) {
        db.prepare(`
          UPDATE shortlisted_students 
          SET status = 'SENT', invitation_sent_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(student.id);
        sentCount++;
      } else {
        db.prepare(`UPDATE shortlisted_students SET status = 'FAILED' WHERE id = ?`).run(student.id);
        failedCount++;
        sendFailures.push({ studentName: student.student_name, error: result.error || 'Email delivery failed' });
      }
    } catch (err) {
      console.error(`Failed emailing invitation to ${student.student_name}:`, err);
      db.prepare(`UPDATE shortlisted_students SET status = 'FAILED' WHERE id = ?`).run(student.id);
      failedCount++;
      sendFailures.push({ studentName: student.student_name, error: err.message });
    }
  }

  const failureSummary = sendFailures.length > 0
    ? ` (${failedCount} failed delivery. First failure: ${sendFailures[0].studentName} - ${sendFailures[0].error})`
    : '';

  return res.json({
    message: `Batch invitations dispatched! ${sentCount} sent successfully.${failureSummary}`,
    sentCount,
    failedCount,
    totalAttempted: students.length,
    sendFailures
  });
});

// Resend an invitation email to one student
router.post('/:driveId/students/:studentId/resend', authenticateToken, async (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.driveId);
  const student = db.prepare(`SELECT * FROM shortlisted_students WHERE id = ? AND drive_id = ?`).get(req.params.studentId, req.params.driveId);

  if (!drive || !student) {
    return res.status(404).json({ error: 'Drive or student record not found' });
  }

  const appBaseUrl = getPublicAppUrl(req);
  const inviteUrl = `${appBaseUrl}/verify-invite/${student.invitation_token}`;

  const result = await sendInvitationEmail({
    recipientEmail: student.email,
    studentName: student.student_name,
    companyName: drive.company_name,
    driveName: drive.drive_name,
    placementRound: drive.placement_round,
    invitationLink: inviteUrl
  });

  if (result.success) {
    db.prepare(`
      UPDATE shortlisted_students 
      SET status = 'SENT', invitation_sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(student.id);
    return res.json({ message: `Invitation resent successfully to ${student.student_name}` });
  } else {
    db.prepare(`UPDATE shortlisted_students SET status = 'FAILED' WHERE id = ?`).run(student.id);
    return res.status(500).json({ error: result.error || 'Failed to send invitation email' });
  }
});

export default router;
