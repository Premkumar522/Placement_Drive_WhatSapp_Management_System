import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import xlsx from 'xlsx';
import { testSmtpConnection } from '../services/emailService.js';

const router = express.Router();

// Get Admin System Metrics & Analytics
router.get('/metrics', authenticateToken, (req, res) => {
  const drivesCount = db.prepare(`SELECT COUNT(*) as count FROM drives`).get().count;
  
  const studentStats = db.prepare(`
    SELECT 
      COUNT(*) as total_shortlisted,
      SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN status = 'SENT' OR status = 'OTP_SENT' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
    FROM shortlisted_students
  `).get();

  const total = studentStats.total_shortlisted || 0;
  const verified = studentStats.verified || 0;
  const verificationRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0';

  // Recent drives list
  const recentDrives = db.prepare(`
    SELECT 
      d.id, d.company_name, d.drive_name, d.placement_round, d.drive_date, d.status, d.created_at,
      COUNT(s.id) as total_students,
      SUM(CASE WHEN s.status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_students
    FROM drives d
    LEFT JOIN shortlisted_students s ON d.id = s.drive_id
    GROUP BY d.id
    ORDER BY d.created_at DESC
    LIMIT 5
  `).all();

  return res.json({
    metrics: {
      totalDrives: drivesCount,
      totalShortlisted: total,
      verifiedStudents: verified,
      invitationsSent: studentStats.sent || 0,
      invitationsPending: studentStats.pending || 0,
      failedInvitations: studentStats.failed || 0,
      verificationRate: `${verificationRate}%`
    },
    recentDrives
  });
});

// System Settings
router.get('/settings', authenticateToken, (req, res) => {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  return res.json({ settings });
});

// Update System Settings
router.post('/settings', authenticateToken, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required' });
  }

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const updateTx = db.transaction((setObj) => {
    for (const [key, value] of Object.entries(setObj)) {
      upsert.run(key, String(value || ''));
    }
  });

  updateTx(settings);

  return res.json({ message: 'System settings updated successfully' });
});

// Test Admin Gmail SMTP Connection
router.post('/test-email', authenticateToken, async (req, res) => {
  const result = await testSmtpConnection();
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ message: result.message });
});

// Export Drive Shortlisted & Verified Students as Excel/CSV
router.get('/drives/:id/export', authenticateToken, (req, res) => {
  const drive = db.prepare(`SELECT * FROM drives WHERE id = ?`).get(req.params.id);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }

  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

  const students = db.prepare(`
    SELECT student_name, roll_number, email, normalized_phone, status, invitation_sent_at, verified_at
    FROM shortlisted_students
    WHERE drive_id = ?
    ORDER BY student_name ASC
  `).all(req.params.id);

  const exportData = students.map(s => ({
    'Student Name': s.student_name,
    'Roll Number': s.roll_number,
    'Email Address': s.email,
    'Phone': s.normalized_phone,
    'Status': s.status,
    'Invitation Sent At': s.invitation_sent_at || 'Not Sent',
    'Verified At': s.verified_at || 'Not Verified'
  }));

  const worksheet = xlsx.utils.json_to_sheet(exportData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');

  const fileName = `${drive.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_${drive.drive_name.replace(/[^a-zA-Z0-9]/g, '_')}_Shortlist.${format}`;

  if (format === 'csv') {
    const csvContent = xlsx.utils.sheet_to_csv(worksheet);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csvContent);
  } else {
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }
});

export default router;
