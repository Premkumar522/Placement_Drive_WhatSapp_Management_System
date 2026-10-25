import db from '../db.js';

// A link sent to a student's phone must point to the deployed application,
// never to the coordinator's localhost address.
export function getPublicAppUrl(req) {
  const configuredUrl = db.prepare(`SELECT value FROM system_settings WHERE key = 'public_app_url'`).get()?.value?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.trim()) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, '');
  }

  // Use origin from client request header (e.g., http://localhost:5173 from Vite dev server or production domain)
  const origin = req?.headers?.origin || (req?.headers?.referer ? new URL(req.headers.referer).origin : null);
  if (origin && !origin.includes('undefined')) {
    return origin.replace(/\/$/, '');
  }

  const host = req?.get ? req.get('host') : null;
  const protocol = req?.protocol || 'http';
  if (host) {
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
}
