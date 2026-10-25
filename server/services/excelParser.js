import xlsx from 'xlsx';
import Papa from 'papaparse';

/**
 * Normalizes phone numbers to standard 10-digit format with +91 country code.
 * Handles Excel floating point numbers (e.g., 8712151559.0), scientific notation, spaces, dashes, +91/91/0 prefixes.
 * @param {string|number} phone 
 * @returns {string|null} normalized phone e.g. "+918712151559" or null if invalid
 */
export function normalizePhoneNumber(phone) {
  if (phone === undefined || phone === null || phone === '') return null;
  
  let str = String(phone).trim();

  // If floating point from Excel e.g. "8712151559.0" -> remove trailing .0
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }

  // Handle scientific notation e.g. "8.71215e+09"
  if (/e\+/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = Math.round(num).toString();
    }
  }

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');

  // Strip leading 0 if 11 digits (e.g., 08712151559 -> 8712151559)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Strip country code 91 if 12 digits (e.g., 918712151559 -> 8712151559)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }

  // Strip 091 if 13 digits (e.g., 0918712151559 -> 8712151559)
  if (digits.length === 13 && digits.startsWith('091')) {
    digits = digits.substring(3);
  }

  // Valid 10-digit Indian mobile number (starting with 5, 6, 7, 8, 9)
  if (digits.length === 10 && /^[5-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  // Generic 10 digit fallback
  if (digits.length === 10 && /^\d{10}$/.test(digits)) {
    return `+91${digits}`;
  }

  return null;
}

/**
 * Normalizes roll numbers by trimming, uppercasing, stripping extra whitespace.
 * Accepts any standard college roll format between 4 and 25 alphanumeric chars.
 * @param {string|number} roll 
 * @returns {string|null}
 */
export function normalizeRollNumber(roll) {
  if (roll === undefined || roll === null || roll === '') return null;
  let str = String(roll).trim().toUpperCase();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  // Strip inner spaces
  str = str.replace(/\s+/g, '');
  return /^[A-Z0-9\-_/.]{1,30}$/.test(str) ? str : null;
}

/**
 * Normalizes email by trimming, lowercasing, and regex validation.
 * @param {string} email
 * @returns {string|null}
 */
export function normalizeEmail(email) {
  if (email === undefined || email === null || email === '') return null;
  const normalized = String(email).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

/**
 * Detects headers from raw row object with exact and fuzzy matching.
 */
function findValueByPossibleKeys(row, keys) {
  const rowKeys = Object.keys(row);
  
  // 1. Exact cleaned match
  for (const key of keys) {
    const targetClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = rowKeys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }

  // 2. Substring/partial match (e.g., "Contact Number" matching "contact")
  for (const key of keys) {
    const targetClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (targetClean.length < 3) continue;
    const matchedKey = rowKeys.find(k => {
      const kClean = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return kClean.includes(targetClean) || targetClean.includes(kClean);
    });
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }

  return '';
}

/**
 * Parses buffer or file content (Excel or CSV) and validates student data.
 * @param {Buffer} fileBuffer 
 * @param {string} mimeType 
 * @param {string} originalName 
 */
export function parseAndValidateStudentList(fileBuffer, mimeType, originalName) {
  let rawRows = [];

  const isCsv = originalName.endsWith('.csv') || mimeType === 'text/csv';

  if (isCsv) {
    const csvText = fileBuffer.toString('utf8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
  } else {
    // XLSX or XLS
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false }); // raw: false formats numbers as string text
  }

  const validRecords = [];
  const duplicateRecords = [];
  const invalidRecords = [];

  const seenRollNumbers = new Set();
  const seenPhones = new Set();
  const seenEmails = new Set();

  rawRows.forEach((row, index) => {
    const rowIndex = index + 2; // Accounting for 1-indexed header

    const studentName = findValueByPossibleKeys(row, [
      'student name', 'name', 'full name', 'student_name', 'fullname', 'candidate name', 'student',
      'candidate_name', 'name of student', 'name of the student'
    ]);

    const rawRoll = findValueByPossibleKeys(row, [
      'roll number', 'roll no', 'roll_number', 'roll', 'registration no', 'reg no', 'id', 'rollno', 'regno',
      'htno', 'ht_no', 'hallticket', 'hall ticket', 'hall ticket number', 'hallticketno', 'reg_no', 'pin', 'pin no'
    ]);

    let rawPhone = findValueByPossibleKeys(row, [
      'contact number', 'contact_number', 'contactnumber', 'contact no', 'contact_no', 'contactno', 'contact',
      'whatsapp number', 'whatsapp/phone number', 'whatsapp', 'phone number', 'phone_number', 'phonenumber',
      'phone', 'mobile', 'mobile number', 'mobile_number', 'mobilenumber', 'ph number', 'ph_number', 'ph.no',
      'ph no', 'phone no', 'phone_no', 'mobile no', 'mobile_no', 'ph', 'tel', 'cell', 'cell number', 'contactnum'
    ]);

    // Fallback 1: Value-based detection for phone if header is missing
    if (!rawPhone) {
      const values = Object.values(row);
      for (const val of values) {
        if (!val) continue;
        const valStr = String(val).trim();
        const digits = valStr.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 13 && valStr !== studentName && valStr !== rawRoll) {
          rawPhone = valStr;
          break;
        }
      }
    }

    const rawEmail = findValueByPossibleKeys(row, [
      'email', 'email address', 'email_address', 'gmail', 'gmail id', 'gmail address', 'student email',
      'mail', 'mail id', 'mail_id', 'mailid', 'email id', 'email_id', 'emailid'
    ]);

    const rollNumber = normalizeRollNumber(rawRoll);
    const normalizedEmail = normalizeEmail(rawEmail);
    const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) : '';

    const issues = [];

    if (!studentName) issues.push('Missing Student Name');
    if (!rollNumber) issues.push('Invalid Roll Number (must be at least 4 alphanumeric characters)');
    if (!normalizedEmail) issues.push(`Invalid or Missing Gmail/Email (${rawEmail || 'empty'})`);
    if (rawPhone && !normalizedPhone) {
      issues.push(`Invalid Phone Number format (${rawPhone}) - Must be 10 digits if provided`);
    }

    if (issues.length > 0) {
      invalidRecords.push({
        rowIndex,
        rawName: studentName || 'N/A',
        rawRoll: rawRoll || 'N/A',
        rawPhone: rawPhone || 'N/A',
        rawEmail: rawEmail || 'N/A',
        reasons: issues
      });
      return;
    }

    // Check duplicate roll number in current batch
    if (seenRollNumbers.has(rollNumber)) {
      duplicateRecords.push({
        rowIndex,
        studentName,
        rollNumber,
        normalizedEmail,
        reason: `Duplicate Roll Number (${rollNumber}) in upload file`
      });
      return;
    }

    // Check duplicate email in current batch
    if (seenEmails.has(normalizedEmail)) {
      duplicateRecords.push({
        rowIndex,
        studentName,
        rollNumber,
        normalizedEmail,
        reason: `Duplicate Email (${normalizedEmail}) in upload file`
      });
      return;
    }

    // Check duplicate phone if provided
    if (normalizedPhone && seenPhones.has(normalizedPhone)) {
      duplicateRecords.push({
        rowIndex,
        studentName,
        rollNumber,
        normalizedPhone,
        reason: `Duplicate Phone Number (${normalizedPhone}) in upload file`
      });
      return;
    }

    // Valid record
    seenRollNumbers.add(rollNumber);
    seenEmails.add(normalizedEmail);
    if (normalizedPhone) seenPhones.add(normalizedPhone);

    validRecords.push({
      studentName,
      rollNumber,
      originalPhone: rawPhone ? String(rawPhone).trim() : 'N/A',
      normalizedPhone: normalizedPhone || 'N/A',
      email: normalizedEmail
    });
  });

  return {
    totalParsed: rawRows.length,
    validRecords,
    duplicateRecords,
    invalidRecords,
    validCount: validRecords.length,
    duplicateCount: duplicateRecords.length,
    invalidCount: invalidRecords.length
  };
}
