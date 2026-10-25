import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, Lock, CheckCircle2, AlertCircle, Mail, CreditCard,
  KeyRound, ArrowRight, MessageCircle, RefreshCw, ExternalLink 
} from 'lucide-react';

export default function StudentVerify() {
  const { token } = useParams();
  
  const [invitationData, setInvitationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Verification Step: 1 = Roll + Email Input -> 2 = OTP Verification -> 3 = Success (Join Group)
  const [step, setStep] = useState(1);
  
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [verifiedGroupLink, setVerifiedGroupLink] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Load invitation details on mount
  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getInvitationInfo(token);
        setInvitationData(data);
        if (data.student?.rollNumber) {
          setRollNumber(data.student.rollNumber);
        }
        if (data.student?.isVerified) {
          setStep(3);
          setVerifiedGroupLink(data.drive.whatsappGroupLink);
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    }
    loadInvitation();
  }, [token]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => setResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Step 1 Submit: Validate Roll No & Email -> Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setRequestingOtp(true);

    try {
      const res = await api.requestOtp(token, rollNumber.trim(), email.trim());
      setMaskedEmail(res.maskedEmail);
      setStep(2);
      setResendCountdown(60);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your roll number and registered email.');
    } finally {
      setRequestingOtp(false);
    }
  };

  // Step 2 Submit: Validate OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyingOtp(true);

    try {
      const res = await api.verifyOtp(token, rollNumber.trim(), otpCode.trim());
      setVerifiedGroupLink(res.whatsappGroupLink);
      setStep(3);
      triggerConfetti();
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Validating Invitation Credentials...</span>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="glass-panel rounded-3xl p-8 max-w-md text-center space-y-4 border border-rose-500/30">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-['Outfit'] font-bold text-xl text-white">Invalid Invitation Link</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const { drive, student } = invitationData;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Glow Top Bar Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-b-full shadow-lg shadow-emerald-500/50" />

        {/* Drive Info Badge Header */}
        <div className="text-center space-y-2 pb-4 border-b border-slate-800/80">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Placement Verification Portal
          </div>
          
          <h1 className="font-['Outfit'] font-bold text-2xl text-white">
            {drive.companyName}
          </h1>
          <p className="text-sm font-medium text-emerald-400">{drive.driveName} ({drive.placementRound})</p>
          <p className="text-xs text-slate-400">Drive Date: {drive.driveDate}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ROLL NUMBER + EMAIL INPUT */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5 animate-in fade-in duration-200">
            {student?.name ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Candidate Profile</div>
                  <div className="text-sm font-semibold text-white">{student.name}</div>
                  {student.rollNumber && (
                    <div className="text-[11px] font-mono text-emerald-300">Roll: {student.rollNumber}</div>
                  )}
                </div>
                {student.maskedEmail && (
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Registered Email</div>
                    <div className="font-mono text-emerald-300 text-xs">{student.maskedEmail}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-slate-100">Step 1: Student Identity Verification</div>
                <p className="text-slate-400">
                  Enter your registered Roll Number and Email to receive a 6-digit verification code.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Roll Number *</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={25}
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 23471A05F2"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Registered Gmail / Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="e.g. student@gmail.com"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={requestingOtp || !rollNumber.trim() || !email.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {requestingOtp ? 'Validating Student Record & Sending OTP...' : (
                <>
                  <span>Verify Eligibility &amp; Send OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: ENTER OTP CODE */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1 text-center">
              <div className="font-bold text-sm">Verification OTP Dispatched to Email!</div>
              <p className="text-emerald-200">
                A 6-digit verification code has been sent to <strong>{maskedEmail}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 text-center block">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative max-w-xs mx-auto">
                <KeyRound className="w-5 h-5 text-emerald-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-slate-900 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-2xl pl-12 pr-4 py-3 text-center text-2xl font-mono tracking-widest text-emerald-300 placeholder-slate-700 focus:outline-none shadow-lg shadow-emerald-950"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {verifyingOtp ? 'Verifying OTP Code...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP &amp; Unlock WhatsApp Group Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              {resendCountdown > 0 ? (
                <span className="text-xs text-slate-500">
                  Resend OTP in <strong>{resendCountdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Resend OTP via Email
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS & JOIN OFFICIAL WHATSAPP GROUP */}
        {step === 3 && (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="font-['Outfit'] font-bold text-2xl text-white">
                Verification Successful!
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                You have been verified for the <strong>{drive.companyName}</strong> placement drive. Click below to join the official WhatsApp updates group.
              </p>
            </div>

            {/* Official WhatsApp Group Join Button */}
            <div className="p-2">
              <a
                href={verifiedGroupLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <MessageCircle className="w-6 h-6 fill-slate-950" />
                <span>Join Official WhatsApp Group</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            {/* One-Time Security Enforcement Notice */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Single-Use Token Verified
              </div>
              <p>
                Your roll number has been recorded as verified for this placement drive.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
