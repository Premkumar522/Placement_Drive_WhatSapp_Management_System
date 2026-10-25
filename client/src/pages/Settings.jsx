import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Mail, CheckCircle2, AlertCircle, Save, RefreshCw, Globe, ShieldCheck, KeyRound } from 'lucide-react';

export default function Settings() {
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('Placement Cell');
  const [publicAppUrl, setPublicAppUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await api.getSettings();
        const s = data.settings || {};
        setSmtpHost(s.smtp_host || 'smtp.gmail.com');
        setSmtpPort(s.smtp_port || '587');
        setSmtpUser(s.smtp_user || '');
        setSmtpPassword(s.smtp_password || '');
        setSmtpFrom(s.smtp_from || s.smtp_user || '');
        setSmtpSenderName(s.smtp_sender_name || 'Placement Cell');
        setPublicAppUrl(s.public_app_url || window.location.origin);
      } catch (err) {
        setError(err.message || 'Failed to load system settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      await api.updateSettings({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpPort === '465' ? 'true' : 'false',
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        smtp_from: smtpFrom || smtpUser,
        smtp_sender_name: smtpSenderName,
        public_app_url: publicAppUrl
      });
      setSuccess('Admin email delivery and system settings saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setSuccess('');
    setError('');
    try {
      // First save the current settings if modified
      await api.updateSettings({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpPort === '465' ? 'true' : 'false',
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        smtp_from: smtpFrom || smtpUser,
        smtp_sender_name: smtpSenderName,
        public_app_url: publicAppUrl
      });

      const result = await api.testEmailSettings();
      setSuccess(result.message);
    } catch (err) {
      setError(err.message || 'Gmail SMTP connection failed. Check your App Password.');
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Loading Email Settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      <div>
        <h1 className="font-['Outfit'] font-bold text-3xl text-white">System Settings</h1>
        <p className="text-slate-400 text-sm">
          Configure the Admin Gmail account used to dispatch bulk student invitations and verification OTPs.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-8">
        
        {/* Admin Email Delivery Section */}
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="font-['Outfit'] font-bold text-xl text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              Admin Gmail SMTP Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              All student placement invitation emails and 6-digit verification codes are sent directly from this email account.
            </p>
          </div>

          {/* Google App Password Guide Callout */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <KeyRound className="w-4 h-4" />
              How to configure Gmail SMTP with Google App Password:
            </div>
            <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1">
              <li>Enable <strong>2-Step Verification</strong> on your Google Account (<code className="text-slate-300">myaccount.google.com/security</code>).</li>
              <li>Go to <strong>App passwords</strong> (<code className="text-slate-300">myaccount.google.com/apppasswords</code>).</li>
              <li>Create a new App Password named e.g. <em>"PlacementPortal"</em> and copy the 16-character code.</li>
              <li>Paste the code into the <strong>Gmail App Password</strong> field below.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Admin Gmail Account *</label>
              <input
                type="email"
                required
                value={smtpUser}
                onChange={(e) => {
                  setSmtpUser(e.target.value);
                  if (!smtpFrom) setSmtpFrom(e.target.value);
                }}
                placeholder="placement.admin@gmail.com"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Gmail 16-Digit App Password *</label>
              <input
                type="password"
                required
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Sender Display Name</label>
              <input
                type="text"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                placeholder="e.g. College Placement Cell"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Sender Reply-To Email</label>
              <input
                type="email"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="placement@college.edu"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SMTP Server Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SMTP Port</label>
              <select
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none"
              >
                <option value="587">587 (TLS / STARTTLS - Default for Gmail)</option>
                <option value="465">465 (SSL)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testingEmail || !smtpUser || !smtpPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{testingEmail ? 'Testing Gmail Connection...' : 'Test Gmail SMTP Connection'}</span>
            </button>
          </div>
        </div>

        {/* Public Application URL */}
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <div>
            <h2 className="font-['Outfit'] font-bold text-xl text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Public Application URL
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Used to generate the student invitation links in emails (e.g. <code className="text-emerald-400 font-mono">{publicAppUrl || 'http://localhost:5173'}/verify-invite/token</code>).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={publicAppUrl}
                onChange={(e) => setPublicAppUrl(e.target.value)}
                placeholder="https://placement.example.edu or http://localhost:5173"
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPublicAppUrl(window.location.origin)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 whitespace-nowrap cursor-pointer transition-colors"
              >
                Use Current URL
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              When deployed, set this to your public domain (e.g. <code className="text-slate-400">https://placement.college.edu</code>) so students can click the link from their phones.
            </p>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:scale-105 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
