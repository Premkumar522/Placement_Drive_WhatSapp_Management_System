import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import ExcelUploader from '../components/ExcelUploader';
import { 
  Briefcase, Users, CheckCircle2, Send, Clock, AlertCircle,
  Download, RefreshCw, Search, ShieldCheck, Mail, ArrowLeft, ExternalLink, Copy 
} from 'lucide-react';

export default function DriveDetail() {
  const { id } = useParams();
  const [drive, setDrive] = useState(null);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState('');
  const [sendFailures, setSendFailures] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [error, setError] = useState('');
  const [sendingBatch, setSendingBatch] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = (student) => {
    const origin = window.location.origin;
    const url = `${origin}/verify-invite/${student.invitation_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchDriveData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDriveDetail(id);
      setDrive(data.drive);
      setStudents(data.students || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message || 'Failed to load drive details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveData();
  }, [id]);

  const handleResend = async (studentId, studentName) => {
    setActionMessage('');
    setSendFailures([]);
    setResendingId(studentId);
    try {
      await api.resendInvitation(id, studentId);
      setActionMessage(`Invitation email successfully resent to ${studentName}`);
      fetchDriveData();
    } catch (err) {
      setError(err.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleSendAll = async () => {
    setActionMessage('');
    setSendFailures([]);
    setSendingBatch(true);
    try {
      const pendingCount = (stats.pending || 0) + (stats.failed || 0);
      const res = await api.sendInvitations(id, pendingCount === 0);
      setActionMessage(res.message);
      setSendFailures(res.sendFailures || []);
      fetchDriveData();
    } catch (err) {
      setError(err.message || 'Failed to dispatch batch invitations');
    } finally {
      setSendingBatch(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.normalized_phone || '').includes(searchTerm) ||
                          (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Loading Placement Drive Shortlist...</span>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-400 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="font-bold text-xl text-white">Placement Drive Not Found</h2>
        <Link to="/drives" className="text-xs text-emerald-400 underline font-semibold">
          Return to Placement Drives List
        </Link>
      </div>
    );
  }

  const pendingCount = (stats.pending || 0) + (stats.failed || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* Back Link */}
      <Link to="/drives" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Placement Drives
      </Link>

      {/* Header Info Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              {drive.placement_round}
            </span>
            <h1 className="font-['Outfit'] font-bold text-3xl text-white">
              {drive.company_name}
            </h1>
            <p className="text-slate-300 text-sm font-medium">{drive.drive_name}</p>
            <div className="text-xs text-slate-400">Drive Date: {drive.drive_date}</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={api.getExportUrl(drive.id, 'xlsx')}
              download
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Excel (.xlsx)
            </a>

            <button
              onClick={handleSendAll}
              disabled={sendingBatch || students.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {sendingBatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Emails from Admin Gmail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {pendingCount > 0
                      ? `Send Bulk Invitation Emails (${pendingCount} Pending)`
                      : 'Resend Invitations to All Unverified'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WhatsApp Group Link Note */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300 truncate">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Target Official WhatsApp Group Link:</span>
            <a
              href={drive.whatsapp_group_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 font-mono font-semibold hover:underline truncate"
            >
              {drive.whatsapp_group_link}
            </a>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 hidden sm:inline">
            Unlocked Post-OTP Verification
          </span>
        </div>
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sendFailures.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Some invitation emails could not be delivered:</span>
          </div>
          <div className="space-y-1 text-xs">
            {sendFailures.map((failure, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20">
                <strong>{failure.studentName}</strong>: {failure.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Shortlisted</div>
          <div className="text-2xl font-bold font-['Outfit'] text-slate-100">{stats.total || 0}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20">
          <div className="text-xs text-emerald-400 font-semibold mb-1">Verified &amp; Joined Group</div>
          <div className="text-2xl font-bold font-['Outfit'] text-emerald-400">{stats.verified || 0}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-cyan-500/20">
          <div className="text-xs text-cyan-400 font-semibold mb-1">Invitations Emailed</div>
          <div className="text-2xl font-bold font-['Outfit'] text-cyan-400">{stats.sent || 0}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-amber-500/20">
          <div className="text-xs text-amber-400 font-semibold mb-1">Pending Email</div>
          <div className="text-2xl font-bold font-['Outfit'] text-amber-400">{stats.pending || 0}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-500/20">
          <div className="text-xs text-rose-400 font-semibold mb-1">Delivery Failed</div>
          <div className="text-2xl font-bold font-['Outfit'] text-rose-400">{stats.failed || 0}</div>
        </div>
      </div>

      {/* Expandable Excel Uploader */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-['Outfit'] font-bold text-lg text-white">Append Additional Student Shortlist</h3>
            <p className="text-xs text-slate-400">Upload an Excel (.xlsx/.xls) or CSV file with Student Name, Roll Number, Gmail/Email</p>
          </div>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
          >
            {showUploader ? 'Hide Uploader' : '+ Upload Excel/CSV File'}
          </button>
        </div>

        {showUploader && (
          <div className="pt-2 animate-in fade-in duration-200">
            <ExcelUploader driveId={drive.id} onUploadSuccess={() => { fetchDriveData(); setShowUploader(false); }} />
          </div>
        )}
      </div>

      {/* Shortlisted Student Records Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-['Outfit'] font-bold text-xl text-white">Shortlisted Students List</h3>
            <p className="text-xs text-slate-400">Student credentials, email dispatch status, and verification records</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, roll no, email..."
                className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Statuses ({students.length})</option>
              <option value="VERIFIED">Verified &amp; Joined ({stats.verified || 0})</option>
              <option value="SENT">Invitation Sent ({stats.sent || 0})</option>
              <option value="PENDING">Pending Email ({stats.pending || 0})</option>
              <option value="FAILED">Delivery Failed ({stats.failed || 0})</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Roll Number</th>
                <th className="p-3.5">Gmail / Email</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Invitation Emailed</th>
                <th className="p-3.5">Verified At</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No student records match your query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isVerified = student.status === 'VERIFIED';
                  const isSent = student.status === 'SENT' || student.status === 'OTP_SENT';

                  return (
                    <tr key={student.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 font-semibold text-white">{student.student_name}</td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">{student.roll_number}</td>
                      <td className="p-3.5 text-slate-300 font-mono text-[11px]">{student.email || 'Not provided'}</td>
                      <td className="p-3.5">
                        {isVerified && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified &amp; Joined
                          </span>
                        )}
                        {isSent && (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <Send className="w-3 h-3" />
                            Invitation Sent
                          </span>
                        )}
                        {student.status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            Pending Email
                          </span>
                        )}
                        {student.status === 'FAILED' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            Delivery Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {student.invitation_sent_at ? new Date(student.invitation_sent_at).toLocaleString() : 'Not Sent'}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {student.verified_at ? new Date(student.verified_at).toLocaleString() : '-'}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/verify-invite/${student.invitation_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open student verification page in new tab"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 inline-flex items-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(student)}
                            title="Copy invitation link"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer inline-flex items-center"
                          >
                            {copiedId === student.id ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {!isVerified && (
                            <button
                              onClick={() => handleResend(student.id, student.student_name)}
                              disabled={resendingId === student.id}
                              className="text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                              {resendingId === student.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="w-3 h-3 text-emerald-400" />
                                  <span>Resend</span>
                                </>
                              )}
                            </button>
                          )}
                          {isVerified && (
                            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
