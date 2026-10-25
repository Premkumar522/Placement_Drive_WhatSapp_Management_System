import nodemailer from 'nodemailer';
import db from '../db.js';

function getSetting(key) {
  return db.prepare(`SELECT value FROM system_settings WHERE key = ?`).get(key)?.value?.trim() || '';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

/**
 * Creates a reusable nodemailer transporter based on current system settings.
 */
export function createMailTransporter() {
  const host = getSetting('smtp_host') || 'smtp.gmail.com';
  const port = Number(getSetting('smtp_port') || 587);
  const secure = getSetting('smtp_secure') === 'true' || port === 465;
  const user = getSetting('smtp_user');
  const password = getSetting('smtp_password').replace(/\s+/g, '');

  if (!user || !password) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    pool: true,
    maxConnections: 3,
    maxMessages: 100
  });
}

function getSenderAddress(companyName = '') {
  const user = getSetting('smtp_user');
  const fromEmail = getSetting('smtp_from') || user;
  const customSenderName = getSetting('smtp_sender_name');
  const displayName = customSenderName || (companyName ? `Placement Cell - ${companyName}` : 'Placement Cell');
  return `"${displayName}" <${fromEmail}>`;
}

/**
 * Sends a placement drive invitation email with personal verification link.
 */
export async function sendInvitationEmail({
  recipientEmail,
  studentName,
  companyName,
  driveName,
  placementRound,
  invitationLink,
  transporter = null
}) {
  const activeTransporter = transporter || createMailTransporter();

  if (!activeTransporter) {
    return {
      success: false,
      error: 'Admin Gmail SMTP settings are incomplete. Please configure your Gmail and Google App Password in Settings.'
    };
  }

  const from = getSenderAddress(companyName);
  const cleanEmail = (recipientEmail || '').trim().toLowerCase();

  const subject = `Invitation: ${companyName} Placement Drive - ${placementRound}`;

  const plainText = `Dear ${studentName},

Congratulations! You have been shortlisted for the upcoming selection round of ${companyName} (${driveName}).

Placement Round: ${placementRound}

To access the official WhatsApp group for this drive, you must verify your student details using your secure personal invitation link below:
${invitationLink}

Instructions:
1. Click the invitation link above.
2. Enter your registered Roll Number and Email address.
3. Enter the 6-digit verification code sent to your email.
4. Once verified, click "Join WhatsApp Group" to join the official drive updates group.

Regards,
Placement Cell`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(companyName)} - Placement Invitation</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
    
    <!-- Top Gradient Header Banner -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #0d9488 50%, #059669 100%); padding: 28px 32px; text-align: left;">
      <div style="display: inline-block; padding: 4px 12px; background-color: rgba(2, 44, 34, 0.25); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #022c22; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        Official Shortlist Invitation
      </div>
      <h1 style="margin: 0; color: #022c22; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
        ${escapeHtml(companyName)}
      </h1>
      <p style="margin: 4px 0 0 0; color: #064e3b; font-size: 13px; font-weight: 600;">
        ${escapeHtml(driveName)}
      </p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 32px 32px 24px 32px;">
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #f8fafc; line-height: 1.5;">
        Dear <strong>${escapeHtml(studentName)}</strong>,
      </p>

      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px 0;">
        Congratulations! You have been shortlisted for the next round of campus recruitment for <strong>${escapeHtml(companyName)}</strong>.
      </p>

      <!-- Drive Information Card -->
      <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; width: 36%;">Company:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${escapeHtml(companyName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Drive Title:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${escapeHtml(driveName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Shortlisted Round:</td>
            <td style="padding: 6px 0; color: #34d399; font-weight: 700;">${escapeHtml(placementRound)}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0 24px 0;">
        <a href="${escapeHtml(invitationLink)}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #022c22; font-weight: 800; font-size: 14px; text-decoration: none; padding: 15px 32px; border-radius: 12px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35); letter-spacing: 0.01em;">
          Verify &amp; Join WhatsApp Group &rarr;
        </a>
      </div>

      <!-- Security Notice Box -->
      <div style="background-color: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 8px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #a7f3d0; line-height: 1.6;">
        <strong>How to access the official group:</strong><br>
        1. Click the button above to open your personal verification portal.<br>
        2. Enter your registered <strong>Roll Number</strong> and <strong>Email</strong>.<br>
        3. Enter the 6-digit OTP code sent to your email to verify your identity.<br>
        4. Once verified, click <strong>"Join WhatsApp Group"</strong> to connect with the placement coordinators and receive immediate drive announcements.
      </div>

      <!-- Fallback Raw URL -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.5; word-break: break-all;">
        If the button does not open, copy and paste this verification URL into your browser:<br>
        <a href="${escapeHtml(invitationLink)}" style="color: #38bdf8; text-decoration: underline;">${escapeHtml(invitationLink)}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #060a12; padding: 18px 32px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
      Official Placement Cell Invitation &bull; Confidential &bull; Single-Use Token
    </div>

  </div>
</body>
</html>`;

  try {
    await activeTransporter.sendMail({
      from,
      to: cleanEmail,
      subject,
      text: plainText,
      html
    });
    return { success: true };
  } catch (error) {
    console.error(`[SMTP invitation delivery failed to ${cleanEmail}]:`, error);
    return { success: false, error: error.message || 'SMTP delivery failed' };
  }
}

/**
 * Sends a 6-digit OTP verification code email to a student.
 */
export async function sendOtpEmail({ recipientEmail, studentName, driveName, otpCode }) {
  const transporter = createMailTransporter();

  if (!transporter) {
    return {
      success: false,
      error: 'Admin Gmail SMTP settings are incomplete. Configure Gmail SMTP in Settings.'
    };
  }

  const from = getSenderAddress();
  const cleanEmail = (recipientEmail || '').trim().toLowerCase();

  const plainText = `Dear ${studentName},

Your placement verification OTP for ${driveName} is: ${otpCode}

This code expires in 10 minutes. Enter this code on the verification portal to unlock your official WhatsApp group link.

Do not share this code with anyone.

Regards,
Placement Cell`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification OTP - ${escapeHtml(driveName)}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
    
    <div style="background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); padding: 24px 28px; text-align: left;">
      <h1 style="margin: 0; color: #022c22; font-size: 20px; font-weight: 800;">
        Student Verification Code
      </h1>
      <p style="margin: 4px 0 0 0; color: #064e3b; font-size: 12px; font-weight: 600;">
        ${escapeHtml(driveName)}
      </p>
    </div>

    <div style="padding: 32px 28px; text-align: center;">
      <p style="font-size: 15px; margin: 0 0 12px 0; color: #f8fafc; text-align: left;">
        Dear <strong>${escapeHtml(studentName)}</strong>,
      </p>

      <p style="font-size: 13px; color: #cbd5e1; text-align: left; line-height: 1.6; margin: 0 0 24px 0;">
        Use the 6-digit one-time code below to verify your student identity and unlock the official WhatsApp group join link for <strong>${escapeHtml(driveName)}</strong>.
      </p>

      <!-- OTP Display Box -->
      <div style="margin: 20px auto 24px auto; padding: 20px 32px; background-color: #020617; border: 2px dashed #10b981; border-radius: 16px; display: inline-block;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #34d399; display: block;">
          ${escapeHtml(otpCode)}
        </span>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
      </p>

      <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #1e293b; text-align: left; font-size: 11px; color: #64748b; line-height: 1.5;">
        If you did not request this verification code, please ignore this email or contact your college placement coordinator.
      </div>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to: cleanEmail,
      subject: `Placement verification code: ${otpCode} (${driveName})`,
      text: plainText,
      html
    });
    return { success: true };
  } catch (error) {
    console.error(`[SMTP OTP delivery failed to ${cleanEmail}]:`, error);
    return { success: false, error: error.message || 'Could not send verification OTP email' };
  }
}

/**
 * Tests connection to configured Gmail SMTP server.
 */
export async function testSmtpConnection() {
  const host = getSetting('smtp_host') || 'smtp.gmail.com';
  const port = Number(getSetting('smtp_port') || 587);
  const secure = getSetting('smtp_secure') === 'true' || port === 465;
  const user = getSetting('smtp_user');
  const password = getSetting('smtp_password').replace(/\s+/g, '');

  if (!user || !password) {
    return {
      success: false,
      error: 'Enter the Admin Gmail address and Google App Password, then save settings first.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password }
    });
    await transporter.verify();
    return {
      success: true,
      message: `Gmail SMTP connected successfully! Mails will be dispatched from "${user}".`
    };
  } catch (error) {
    console.error('[SMTP connection test failed]:', error);
    return {
      success: false,
      error: `Gmail SMTP connection failed: ${error.message}`
    };
  }
}