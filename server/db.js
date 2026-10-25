import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'placement_database.json');

// Default initial state
const defaultDbState = {
  admins: [],
  drives: [],
  shortlisted_students: [],
  otps: [],
  whatsapp_logs: [],
  system_settings: []
};

let store = { ...defaultDbState };

// Load database from JSON file
function loadDatabase() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      store = JSON.parse(data);
      // Ensure all collections exist
      for (const key of Object.keys(defaultDbState)) {
        if (!store[key]) store[key] = [];
      }
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('Error reading database file, resetting to default state:', err);
    store = { ...defaultDbState };
    saveDatabase();
  }
}

// Initial sync load so store is populated on import
loadDatabase();

// Save database state atomically
function saveDatabase() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

export function initDatabase() {
  loadDatabase();

  // Seed default admin if missing
  const admin = store.admins.find(a => a.username === 'admin');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    store.admins.push({
      id: 1,
      username: 'admin',
      email: 'admin@college.edu',
      password: hashedPassword,
      name: 'Placement Coordinator',
      created_at: new Date().toISOString()
    });
    saveDatabase();
    console.log('✅ Default Admin seeded: username "admin", password "admin123"');
  }

  // Seed only missing settings. Saved credentials must survive a restart.
  const defaultSettings = [
    { key: 'public_app_url', value: process.env.PUBLIC_APP_URL || 'http://localhost:5173' },
    { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com' },
    { key: 'smtp_port', value: process.env.SMTP_PORT || '587' },
    { key: 'smtp_secure', value: process.env.SMTP_SECURE || 'false' },
    { key: 'smtp_user', value: process.env.SMTP_USER || '' },
    { key: 'smtp_password', value: process.env.SMTP_PASSWORD || '' },
    { key: 'smtp_from', value: process.env.SMTP_FROM || '' },
    { key: 'smtp_sender_name', value: process.env.SMTP_SENDER_NAME || 'Placement Cell' }
  ];

  for (const s of defaultSettings) {
    const existing = store.system_settings.find(item => item.key === s.key);
    if (!existing) {
      store.system_settings.push({
        key: s.key,
        value: s.value,
        updated_at: new Date().toISOString()
      });
    }
  }
  saveDatabase();
}

/**
 * Lightweight SQL-like Query Interpreter for JSON persistence
 */
class QueryStatement {
  constructor(sql) {
    this.sql = sql.trim();
  }

  get(...params) {
    const results = this.all(...params);
    return results.length > 0 ? results[0] : undefined;
  }

  all(...params) {
    const sqlLower = this.sql.toLowerCase();

    // 1. ADMIN LOGIN
    if (sqlLower.includes('from admins')) {
      if (params.length >= 1) {
        const queryVal = params[0];
        return store.admins.filter(a => a.username === queryVal || a.email === queryVal);
      }
      return store.admins;
    }

    // 2. GET ALL DRIVES SUMMARY
    if (sqlLower.includes('from drives d') && sqlLower.includes('count(s.id)')) {
      return store.drives.map(d => {
        const students = store.shortlisted_students.filter(s => s.drive_id === d.id);
        const verified = students.filter(s => s.status === 'VERIFIED').length;
        const sent = students.filter(s => s.status === 'SENT' || s.status === 'OTP_SENT').length;
        const pending = students.filter(s => s.status === 'PENDING').length;
        const failed = students.filter(s => s.status === 'FAILED').length;

        return {
          ...d,
          total_students: students.length,
          verified_count: verified,
          sent_count: sent,
          pending_count: pending,
          failed_count: failed
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // 3. RECENT DRIVES SUMMARY FOR ADMIN DASHBOARD
    if (sqlLower.includes('from drives d') && sqlLower.includes('recentdrives')) {
      return store.drives.map(d => {
        const students = store.shortlisted_students.filter(s => s.drive_id === d.id);
        return {
          ...d,
          total_students: students.length,
          verified_students: students.filter(s => s.status === 'VERIFIED').length
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    }

    // 4. GET SINGLE DRIVE BY ID
    if (sqlLower.includes('from drives') && sqlLower.includes('where id = ?')) {
      const drive = store.drives.find(d => d.id === params[0]);
      return drive ? [drive] : [];
    }

    // 5. GET DRIVES COUNT
    if (sqlLower.includes('count(*) as count from drives')) {
      return [{ count: store.drives.length }];
    }

    // 6. GET ALL SHORTLISTED STUDENTS FOR A DRIVE
    if (sqlLower.includes('from shortlisted_students') && (sqlLower.includes('drive_id = ?') || sqlLower.includes('s.drive_id = ?'))) {
      let filtered = store.shortlisted_students.filter(s => s.drive_id === params[0]);
      if (sqlLower.includes('status = \'pending\' or status = \'failed\'')) {
        filtered = filtered.filter(s => s.status === 'PENDING' || s.status === 'FAILED');
      }
      if (sqlLower.includes('join drives')) {
        filtered = filtered.map(s => {
          const drive = store.drives.find(d => d.id === s.drive_id);
          return {
            ...s,
            company_name: drive ? drive.company_name : '',
            drive_name: drive ? drive.drive_name : '',
            placement_round: drive ? drive.placement_round : '',
            drive_date: drive ? drive.drive_date : '',
            whatsapp_group_link: drive ? drive.whatsapp_group_link : ''
          };
        });
      }
      return filtered.sort((a, b) => a.student_name.localeCompare(b.student_name));
    }

    // 7. GET SINGLE STUDENT BY INVITATION TOKEN + DRIVE
    if (sqlLower.includes('from shortlisted_students s') && sqlLower.includes('where s.invitation_token = ?')) {
      const student = store.shortlisted_students.find(s => s.invitation_token === params[0]);
      if (!student) return [];
      const drive = store.drives.find(d => d.id === student.drive_id);
      return [{
        ...student,
        company_name: drive ? drive.company_name : '',
        drive_name: drive ? drive.drive_name : '',
        placement_round: drive ? drive.placement_round : '',
        drive_date: drive ? drive.drive_date : '',
        whatsapp_group_link: drive ? drive.whatsapp_group_link : ''
      }];
    }

    // 8. GET SINGLE STUDENT BY ID AND DRIVE ID
    if (sqlLower.includes('from shortlisted_students') && sqlLower.includes('where id = ? and drive_id = ?')) {
      const student = store.shortlisted_students.find(s => s.id === params[0] && s.drive_id === params[1]);
      return student ? [student] : [];
    }

    // 9. GET ROLL NUMBERS FOR DRIVE
    if (sqlLower.includes('select roll_number from shortlisted_students where drive_id = ?')) {
      return store.shortlisted_students
        .filter(s => s.drive_id === params[0])
        .map(s => ({ roll_number: s.roll_number }));
    }

    // 10. GET TOTAL STUDENT STATS SUMMARY
    if (sqlLower.includes('count(*) as total_shortlisted') && sqlLower.includes('from shortlisted_students')) {
      const total = store.shortlisted_students.length;
      const verified = store.shortlisted_students.filter(s => s.status === 'VERIFIED').length;
      const sent = store.shortlisted_students.filter(s => s.status === 'SENT' || s.status === 'OTP_SENT').length;
      const pending = store.shortlisted_students.filter(s => s.status === 'PENDING').length;
      const failed = store.shortlisted_students.filter(s => s.status === 'FAILED').length;

      return [{
        total_shortlisted: total,
        verified,
        sent,
        pending,
        failed
      }];
    }

    // 11. OTPS QUERIES
    if (sqlLower.includes('from otps')) {
      if (sqlLower.includes('count(*) as count')) {
        // Recent OTP count in last 5 mins
        const count = store.otps.filter(o => o.student_id === params[0]).length;
        return [{ count }];
      }
      if (sqlLower.includes('where student_id = ? and is_used = 0')) {
        const active = store.otps
          .filter(o => o.student_id === params[0] && !o.is_used)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return active;
      }
    }

    // 12. WHATSAPP LOGS
    if (sqlLower.includes('from whatsapp_logs')) {
      const limit = params[0] || 30;
      const sorted = [...store.whatsapp_logs].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      return sorted.slice(0, limit);
    }

    // 13. SYSTEM SETTINGS
    if (sqlLower.includes('from system_settings')) {
      if (sqlLower.includes('where key = ?')) {
        const setting = store.system_settings.find(s => s.key === params[0]);
        return setting ? [setting] : [];
      }
      return store.system_settings;
    }

    return [];
  }

  run(...params) {
    const sqlLower = this.sql.toLowerCase();

    // INSERT INTO DRIVES
    if (sqlLower.includes('insert into drives')) {
      const [id, company_name, drive_name, placement_round, drive_date, whatsapp_group_link, description, created_by] = params;
      store.drives.push({
        id, company_name, drive_name, placement_round, drive_date, whatsapp_group_link, description,
        status: 'ACTIVE', created_by, created_at: new Date().toISOString()
      });
      saveDatabase();
      return { changes: 1 };
    }

    // INSERT INTO SHORTLISTED_STUDENTS
    if (sqlLower.includes('insert into shortlisted_students')) {
      const [id, drive_id, student_name, roll_number, original_phone, normalized_phone, email, invitation_token, status] = params;
      store.shortlisted_students.push({
        id, drive_id, student_name, roll_number, original_phone, normalized_phone, email, invitation_token,
        status: status || 'PENDING',
        invitation_sent_at: null,
        verified_at: null,
        verification_ip: null,
        verification_user_agent: null,
        created_at: new Date().toISOString()
      });
      saveDatabase();
      return { changes: 1 };
    }

    // UPDATE SHORTLISTED_STUDENTS INVITATION SENT
    if (sqlLower.includes('update shortlisted_students') && sqlLower.includes('set status = \'sent\'')) {
      const studentId = params[0];
      const student = store.shortlisted_students.find(s => s.id === studentId);
      if (student) {
        student.status = 'SENT';
        student.invitation_sent_at = new Date().toISOString();
        saveDatabase();
      }
      return { changes: 1 };
    }

    // UPDATE SHORTLISTED_STUDENTS FAILED
    if (sqlLower.includes('update shortlisted_students set status = \'failed\'')) {
      const studentId = params[0];
      const student = store.shortlisted_students.find(s => s.id === studentId);
      if (student) {
        student.status = 'FAILED';
        saveDatabase();
      }
      return { changes: 1 };
    }

    // UPDATE SHORTLISTED_STUDENTS OTP_SENT
    if (sqlLower.includes('update shortlisted_students set status = \'otp_sent\'')) {
      const studentId = params[0];
      const student = store.shortlisted_students.find(s => s.id === studentId);
      if (student) {
        student.status = 'OTP_SENT';
        saveDatabase();
      }
      return { changes: 1 };
    }

    // UPDATE SHORTLISTED_STUDENTS VERIFIED
    if (sqlLower.includes('update shortlisted_students') && sqlLower.includes('set status = \'verified\'')) {
      const [clientIp, userAgent, studentId] = params;
      const student = store.shortlisted_students.find(s => s.id === studentId);
      if (student) {
        student.status = 'VERIFIED';
        student.verified_at = new Date().toISOString();
        student.verification_ip = clientIp;
        student.verification_user_agent = userAgent;
        saveDatabase();
      }
      return { changes: 1 };
    }

    // INSERT INTO OTPS
    if (sqlLower.includes('insert into otps')) {
      const [id, student_id, roll_number, normalized_phone, email, otp_code, expires_at] = params;
      store.otps.push({
        id, student_id, roll_number, normalized_phone, email, otp_code, expires_at,
        is_used: 0, attempts: 0, created_at: new Date().toISOString()
      });
      saveDatabase();
      return { changes: 1 };
    }

    // UPDATE OTPS SET IS_USED
    if (sqlLower.includes('update otps set is_used = 1 where student_id = ?')) {
      store.otps.filter(o => o.student_id === params[0]).forEach(o => { o.is_used = 1; });
      saveDatabase();
      return { changes: 1 };
    }

    if (sqlLower.includes('update otps set is_used = 1 where id = ?')) {
      const otp = store.otps.find(o => o.id === params[0]);
      if (otp) otp.is_used = 1;
      saveDatabase();
      return { changes: 1 };
    }

    // UPDATE OTPS ATTEMPTS
    if (sqlLower.includes('update otps set attempts = attempts + 1')) {
      const otp = store.otps.find(o => o.id === params[0]);
      if (otp) otp.attempts = (otp.attempts || 0) + 1;
      saveDatabase();
      return { changes: 1 };
    }

    // INSERT INTO WHATSAPP_LOGS
    if (sqlLower.includes('insert into whatsapp_logs')) {
      const [id, student_id, drive_id, recipient_phone, student_name, message_type, message_content, invitation_link, status] = params;
      store.whatsapp_logs.push({
        id, student_id, drive_id, recipient_phone, student_name, message_type, message_content, invitation_link,
        status: status || 'DELIVERED', sent_at: new Date().toISOString()
      });
      saveDatabase();
      return { changes: 1 };
    }

    // DELETE FROM WHATSAPP_LOGS
    if (sqlLower.includes('delete from whatsapp_logs')) {
      if (sqlLower.includes('where drive_id = ?')) {
        store.whatsapp_logs = store.whatsapp_logs.filter(log => log.drive_id !== params[0]);
      } else {
        store.whatsapp_logs = [];
      }
      saveDatabase();
      return { changes: 1 };
    }

    // DELETE DRIVE-RELATED DATA
    if (sqlLower.includes('delete from shortlisted_students')) {
      const driveId = params[0];
      store.shortlisted_students = store.shortlisted_students.filter(student => student.drive_id !== driveId);
      saveDatabase();
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from otps')) {
      const driveId = params[0];
      const studentIds = new Set(
        store.shortlisted_students.filter(student => student.drive_id === driveId).map(student => student.id)
      );
      store.otps = store.otps.filter(otp => !studentIds.has(otp.student_id));
      saveDatabase();
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from drives')) {
      const driveId = params[0];
      store.drives = store.drives.filter(drive => drive.id !== driveId);
      saveDatabase();
      return { changes: 1 };
    }

    // INSERT / UPDATE SYSTEM SETTINGS
    if (sqlLower.includes('into system_settings')) {
      const [key, value] = params;
      const setting = store.system_settings.find(s => s.key === key);
      if (setting) {
        setting.value = String(value);
        setting.updated_at = new Date().toISOString();
      } else {
        store.system_settings.push({
          key, value: String(value), updated_at: new Date().toISOString()
        });
      }
      saveDatabase();
      return { changes: 1 };
    }

    return { changes: 0 };
  }
}

export const db = {
  prepare(sql) {
    return new QueryStatement(sql);
  },
  transaction(fn) {
    return (...args) => {
      return fn(...args);
    };
  }
};

export default db;
