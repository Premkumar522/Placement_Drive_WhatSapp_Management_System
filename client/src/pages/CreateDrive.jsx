import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ExcelUploader from '../components/ExcelUploader';
import { 
  Briefcase, Calendar, Link as LinkIcon, FileText, CheckCircle2, 
  ArrowRight, ShieldCheck, Sparkles, AlertCircle, Mail
} from 'lucide-react';

export default function CreateDrive() {
  const [step, setStep] = useState(1); // 1: Drive Details -> 2: Upload Shortlist -> 3: Email Invitations
  const [createdDrive, setCreatedDrive] = useState(null);
  
  // Step 1 Form fields
  const [companyName, setCompanyName] = useState('');
  const [driveName, setDriveName] = useState('');
  const [placementRound, setPlacementRound] = useState('Technical Round 1');
  const [driveDate, setDriveDate] = useState(new Date().toISOString().split('T')[0]);
  const [whatsappLink, setWhatsappLink] = useState('https://chat.whatsapp.com/PlacementDriveGroup123');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadStats, setUploadStats] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const navigate = useNavigate();

  // Handle Step 1: Create Drive
  const handleCreateDriveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.createDrive({
        company_name: companyName,
        drive_name: driveName,
        placement_round: placementRound,
        drive_date: driveDate,
        whatsapp_group_link: whatsappLink,
        description
      });

      setCreatedDrive(res.drive);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create placement drive');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Success
  const handleUploadSuccess = (res) => {
    setUploadStats(res);
  };

  // Handle Step 3: Email invitation links to the uploaded shortlist.
  const handleSendInvitations = async () => {
    if (!createdDrive || !uploadStats?.addedCount) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.sendInvitations(createdDrive.id);
      setSendResult(res);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to send invitation emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Wizard Header */}
      <div>
        <h1 className="font-['Outfit'] font-bold text-3xl text-white">Create Placement Drive</h1>
        <p className="text-slate-400 text-sm">
          Set up a new placement drive, upload shortlisted students, and email verification links.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-3.5 rounded-2xl border transition-all ${
          step === 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 
          step > 1 ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
            Drive Setup
          </div>
          <div className="text-xs text-slate-300 font-medium truncate">Company & Group</div>
        </div>

        <div className={`p-3.5 rounded-2xl border transition-all ${
          step === 2 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 
          step > 2 ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
            Shortlist Upload
          </div>
          <div className="text-xs text-slate-300 font-medium truncate">Excel / CSV File</div>
        </div>

        <div className={`p-3.5 rounded-2xl border transition-all ${
          step === 3 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
            Dispatch
          </div>
          <div className="text-xs text-slate-300 font-medium truncate">Email Invitations</div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: DRIVE DETAILS FORM */}
      {step === 1 && (
        <form onSubmit={handleCreateDriveSubmit} className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <h2 className="font-['Outfit'] font-bold text-xl text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            1. Placement Drive Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google India, TCS, Infosys"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Drive Name / Title *</label>
              <input
                type="text"
                required
                value={driveName}
                onChange={(e) => setDriveName(e.target.value)}
                placeholder="e.g. Software Engineer Hiring 2026"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Placement Round *</label>
              <select
                value={placementRound}
                onChange={(e) => setPlacementRound(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Aptitude / Coding Round">Aptitude / Coding Round</option>
                <option value="Technical Round 1">Technical Round 1</option>
                <option value="Technical Round 2">Technical Round 2</option>
                <option value="HR / Managerial Round">HR / Managerial Round</option>
                <option value="Final Offer Selected Candidates">Final Offer Selected Candidates</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Drive Date *</label>
              <input
                type="date"
                required
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Official WhatsApp Group Join URL *</span>
              <span className="text-[10px] text-emerald-400 font-normal">Only verified students will gain access</span>
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              <input
                type="url"
                required
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description / Instructions for Students</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Group for shortlisted B.Tech CSE & IT students appearing for Round 1 technical interview."
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:scale-105 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>Proceed to Shortlist Upload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: UPLOAD SHORTLIST */}
      {step === 2 && createdDrive && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Drive Created</span>
              <h2 className="font-['Outfit'] font-bold text-xl text-white">
                Upload Shortlisted Students for {createdDrive.company_name}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
              {createdDrive.placement_round}
            </span>
          </div>

          <ExcelUploader driveId={createdDrive.id} onUploadSuccess={handleUploadSuccess} />

          {/* Proceed Action when students uploaded */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Back to Drive Details
            </button>

            <button
              type="button"
              onClick={handleSendInvitations}
              disabled={loading || !uploadStats?.addedCount}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:scale-105 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Mail className="w-4 h-4" />
              <span>
                {loading
                  ? 'Dispatching Invitation Emails...'
                  : `Send Bulk Email Invitations (${uploadStats?.addedCount || 0} Students)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DISPATCH CONFIRMATION */}
      {step === 3 && sendResult && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 text-center animate-in fade-in duration-300">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xl ${
            sendResult.failedCount > 0
              ? 'bg-rose-500/10 border border-rose-500/40 text-rose-400 shadow-rose-900/30'
              : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shadow-emerald-900/30'
          }`}>
            {sendResult.failedCount > 0
              ? <AlertCircle className="w-8 h-8" />
              : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h2 className="font-['Outfit'] font-bold text-2xl text-white">
              Invitation Emails Processed
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {sendResult.failedCount > 0
                ? 'Some invitation emails were rejected. See each student\'s delivery error below, correct the SMTP or recipient issue, then retry failed emails.'
                : 'Invitation links were accepted by the configured email server. Students can use their personal link to verify their details.'}
            </p>
            {sendResult.failedCount > 0 && sendResult.message && (
              <p className="text-xs text-rose-300 max-w-xl mx-auto">{sendResult.message}</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Invitations Sent:</span>
              <strong className="text-emerald-400">{sendResult.sentCount || 0}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Failed:</span>
              <strong className={sendResult.failedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{sendResult.failedCount || 0}</strong>
            </div>
          </div>

          {(sendResult.sendFailures || []).length > 0 && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-left text-sm space-y-1 max-w-xl mx-auto">
            <div className="font-semibold">Some emails could not be sent. Check SMTP settings and retry:</div>
            {sendResult.sendFailures.map((failure) => (
              <div key={`${failure.studentName}-${failure.error}`}>{failure.studentName}: {failure.error}</div>
            ))}
          </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {(sendResult.failedCount || 0) > 0 && (
            <button
              onClick={() => { setSendResult(null); setStep(2); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs hover:bg-slate-700 transition-all"
            >
              <Mail className="w-4 h-4" />
              Retry Failed Emails
            </button>
          )}
          <button
              onClick={() => navigate(`/drives/${createdDrive.id}`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:scale-105 shadow-md shadow-emerald-500/20 transition-all"
            >
              Go to Drive Management Page
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
