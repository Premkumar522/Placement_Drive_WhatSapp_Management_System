import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Strips all non-alphanumeric characters and converts to uppercase for reliable roll matching.
 * e.g., "23471A05F2", "23471a05f2", " 23471A05F2 ", "23471-A05F2" all clean to "23471A05F2".
 */
function cleanRoll(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Standardizes email string for case-insensitive matching.
 */
function cleanEmail(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Resolves drive context and student information from token.
 * Supports both student invitation_token and direct drive_id.
 */
function resolveContextFromToken(token) {
  if (!token) return null;

  // 1. Try to find student by personal invitation token
  const student = db.prepare(`
    SELECT s.*, d.company_name, d.drive_name, d.placement_round, d.drive_date, d.whatsapp_group_link
    FROM shortlisted_students s
    JOIN drives d ON s.drive_id = d.id
    WHERE s.invitation_token = ?
  `).get(token);

  if (student) {
    return {
      driveId: student.drive_id,
      invitedStudent: student,
      drive: {
        companyName: student.company_name,
        driveName: student.drive_name,
        placementRound: student.placement_round,
        driveDate: student.drive_date,
        whatsappGroupLink: student.whatsapp_group_link
      }
    };
  }

  // 2. Fallback: check if token is a drive ID
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(token);
  if (drive) {
    return {
      driveId: drive.id,
      invitedStudent: null,
      drive: {
        companyName: drive.company_name,
        driveName: drive.drive_name,
        placementRound: drive.placement_round,
        driveDate: drive.drive_date,
        whatsappGroupLink: drive.whatsapp_group_link
      }
    };
  }

  return null;
}

// Get invitation details by token or drive ID
router.get('/invitation/:token', (req, res) => {
  const { token } = req.params;
  const context = resolveContextFromToken(token);

  if (!context) {
    return res.status(404).json({ error: 'Invalid or non-existent invitation link.' });
  }

  const { invitedStudent, drive } = context;
  const isVerified = invitedStudent && invitedStudent.status === 'VERIFIED';

  const maskedEmail = (invitedStudent && invitedStudent.email)
    ? `${invitedStudent.email.slice(0, 2)}***@${invitedStudent.email.split('@')[1]}`
    : '';

  return res.json({
    student: invitedStudent ? {
      name: invitedStudent.student_name,
      rollNumber: invitedStudent.roll_number,
      maskedEmail,
      status: invitedStudent.status,
      verifiedAt: invitedStudent.verified_at,
      isVerified
    } : null,
    drive: {
      companyName: drive.companyName,
      driveName: drive.driveName,
      placementRound: drive.placementRound,
      driveDate: drive.driveDate,
      whatsappGroupLink: isVerified ? drive.whatsappGroupLink : null
    }
  });
});

// Step 1: Validate Student Roll No & Email, then Send OTP
router.post('/request-otp', async (req, res) => {
  const { token, rollNumber, email } = req.body;

  if (!token || !rollNumber || !email) {
    return res.status(400).json({ error: 'Token, Roll Number, and Gmail/Email are required.' });
  }

  const context = resolveContextFromToken(token);
  if (!context) {
    return res.status(404).json({ error: 'Invalid invitation link.' });
  }

  const { driveId } = context;

  // Retrieve all shortlisted students in this drive
  const rawStudents = db.prepare(`SELECT * FROM shortlisted_students WHERE drive_id = ?`).all(driveId);
  const driveStudents = rawStudents.map(s => ({
    ...s,
    drive_name: context.drive.driveName,
    company_name: context.drive.companyName,
    whatsapp_group_link: context.drive.whatsappGroupLink
  }));

  const inputRollClean = cleanRoll(rollNumber);
  const inputEmailClean = cleanEmail(email);

  if (!inputRollClean) {
    return res.status(400).json({ error: 'Please enter a valid Roll Number.' });
  }

  if (!inputEmailClean || !inputEmailClean.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid Gmail / Email address.' });
  }

  // Find candidate by matching cleaned roll number
  const student = driveStudents.find(s => cleanRoll(s.roll_number) === inputRollClean);

  if (!student) {
    return res.status(400).json({ 
      error: `Roll Number "${rollNumber.trim().toUpperCase()}" does not match our shortlisted records for this drive. Please ensure you are shortlisted.` 
    });
  }

  // Validate student email against registered record
  const studentEmailClean = cleanEmail(student.email);
  if (studentEmailClean !== inputEmailClean) {
    const masked = student.email ? `${student.email.slice(0, 2)}***@${student.email.split('@')[1]}` : 'your registered email';
    return res.status(400).json({ 
      error: `Gmail/Email does not match our registered shortlist record for Roll Number ${student.roll_number}. Expected format: ${masked}` 
    });
  }

  if (student.status === 'VERIFIED') {
    return res.status(400).json({
      error: 'This student record has already been verified and unlocked.',
      isAlreadyVerified: true,
      verifiedAt: student.verified_at,
      whatsappGroupLink: student.whatsapp_group_link
    });
  }

  // Check rate limiting: max 3 OTPs generated in 5 minutes
  const recentOtps = db.prepare(`
    SELECT COUNT(*) as count FROM otps 
    WHERE student_id = ? AND created_at > datetime('now', '-5 minutes')
  `).get(student.id);

  if (recentOtps && recentOtps.count >= 3) {
    return res.status(429).json({ error: 'Too many OTP requests. Please wait 5 minutes before trying again.' });
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = uuidv4();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Deactivate existing unused OTPs for this student
  db.prepare(`UPDATE otps SET is_used = 1 WHERE student_id = ?`).run(student.id);

  // Insert new OTP
  db.prepare(`
    INSERT INTO otps (id, student_id, roll_number, normalized_phone, email, otp_code, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(otpId, student.id, student.roll_number, student.normalized_phone || '', student.email, otpCode, expiresAt);

  // Update status to OTP_SENT
  db.prepare(`UPDATE shortlisted_students SET status = 'OTP_SENT' WHERE id = ?`).run(student.id);

  const delivery = await sendOtpEmail({
    recipientEmail: student.email,
    studentName: student.student_name,
    driveName: student.drive_name,
    otpCode
  });

  // Verify email delivery success
  if (!delivery.success) {
    console.error(`[OTP email delivery failed] student=${student.id}: ${delivery.error || delivery.message}`);
    return res.status(502).json({
      error: delivery.error || 'Could not deliver the OTP code to your email. Please contact the placement coordinator.',
      deliveryFailed: true
    });
  }

  const maskedEmail = `${student.email.slice(0, 2)}***@${student.email.split('@')[1]}`;

  return res.json({
    message: `Verification OTP sent to ${maskedEmail}`,
    maskedEmail,
    studentName: student.student_name,
    rollNumber: student.roll_number,
    expiresInSeconds: 600
  });
});

// Step 2: Validate OTP & Unlock WhatsApp Group Join Link
router.post('/verify-otp', (req, res) => {
  const { token, rollNumber, otpCode } = req.body;

  if (!token || !rollNumber || !otpCode) {
    return res.status(400).json({ error: 'Token, Roll Number, and OTP Code are required.' });
  }

  const context = resolveContextFromToken(token);
  if (!context) {
    return res.status(404).json({ error: 'Invalid invitation link.' });
  }

  const { driveId } = context;

  const rawStudents = db.prepare(`SELECT * FROM shortlisted_students WHERE drive_id = ?`).all(driveId);
  const driveStudents = rawStudents.map(s => ({
    ...s,
    drive_name: context.drive.driveName,
    company_name: context.drive.companyName,
    whatsapp_group_link: context.drive.whatsappGroupLink
  }));

  const inputRollClean = cleanRoll(rollNumber);
  const student = driveStudents.find(s => cleanRoll(s.roll_number) === inputRollClean);

  if (!student) {
    return res.status(400).json({ error: 'Student record not found in shortlisted students for this drive.' });
  }

  if (student.status === 'VERIFIED') {
    return res.json({
      message: 'Student already verified.',
      isVerified: true,
      verifiedAt: student.verified_at,
      whatsappGroupLink: student.whatsapp_group_link,
      companyName: student.company_name,
      driveName: student.drive_name
    });
  }

  // Find latest active OTP
  const otpRecord = db.prepare(`
    SELECT * FROM otps 
    WHERE student_id = ? AND is_used = 0
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(student.id);

  if (!otpRecord) {
    return res.status(400).json({ error: 'No active OTP found. Please request a new OTP.' });
  }

  // Check expiry
  if (new Date() > new Date(otpRecord.expires_at)) {
    db.prepare(`UPDATE otps SET is_used = 1 WHERE id = ?`).run(otpRecord.id);
    return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
  }

  // Check attempts
  if (otpRecord.attempts >= 5) {
    db.prepare(`UPDATE otps SET is_used = 1 WHERE id = ?`).run(otpRecord.id);
    return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
  }

  if (otpRecord.otp_code !== String(otpCode).trim()) {
    db.prepare(`UPDATE otps SET attempts = attempts + 1 WHERE id = ?`).run(otpRecord.id);
    return res.status(400).json({ error: 'Incorrect OTP code. Please check your email message.' });
  }

  // Mark OTP as used
  db.prepare(`UPDATE otps SET is_used = 1 WHERE id = ?`).run(otpRecord.id);

  // Update student verification status
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  db.prepare(`
    UPDATE shortlisted_students 
    SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP, verification_ip = ?, verification_user_agent = ?
    WHERE id = ?
  `).run(clientIp, userAgent, student.id);

  return res.json({
    message: 'Verification successful! You may now join the WhatsApp group.',
    isVerified: true,
    studentName: student.student_name,
    companyName: student.company_name,
    driveName: student.drive_name,
    whatsappGroupLink: student.whatsapp_group_link
  });
});

export default router;
