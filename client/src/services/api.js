const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  // If body is FormData, do not set Content-Type header manually
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      throw new Error(`The API returned invalid JSON (HTTP ${response.status}). Restart the backend and try again.`);
    }
  } else {
    const detail = response.status === 404
      ? 'The API route was not found. Restart the backend so it loads the latest routes.'
      : 'The server returned an unexpected response. Check that the backend server is running.';
    throw new Error(`${detail} (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected server error occurred');
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  getCurrentUser: () => request('/auth/me'),

  // Drives
  getDrives: () => request('/drives'),
  getDriveDetail: (id) => request(`/drives/${id}`),
  createDrive: (driveData) => request('/drives', { method: 'POST', body: driveData }),
  deleteDrive: (id) => request(`/drives/${id}`, { method: 'DELETE' }),
  previewFile: (formData) => request('/drives/preview-file', { method: 'POST', body: formData }),
  uploadShortlist: (driveId, formData) => request(`/drives/${driveId}/upload-shortlist`, { method: 'POST', body: formData }),
  sendInvitations: (driveId, all = false) => request(`/drives/${driveId}/send-invitations${all ? '?all=true' : ''}`, { method: 'POST' }),
  resendInvitation: (driveId, studentId) => request(`/drives/${driveId}/students/${studentId}/resend`, { method: 'POST' }),

  // Student Verification (Public API)
  getInvitationInfo: (token) => request(`/verify/invitation/${token}`),
  requestOtp: (token, rollNumber, email) => request('/verify/request-otp', { method: 'POST', body: { token, rollNumber, email } }),
  verifyOtp: (token, rollNumber, otpCode) => request('/verify/verify-otp', { method: 'POST', body: { token, rollNumber, otpCode } }),

  // Admin Analytics & Settings
  getMetrics: () => request('/admin/metrics'),
  getSettings: () => request('/admin/settings'),
  updateSettings: (settings) => request('/admin/settings', { method: 'POST', body: { settings } }),
  testEmailSettings: () => request('/admin/test-email', { method: 'POST' }),
  getExportUrl: (driveId, format = 'xlsx') => `${API_BASE}/admin/drives/${driveId}/export?format=${format}`
};
