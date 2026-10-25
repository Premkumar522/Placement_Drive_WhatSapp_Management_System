import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Briefcase, Users, CheckCircle2, Send, Clock, AlertCircle, TrendingUp, 
  PlusCircle, ArrowUpRight, RefreshCw, ExternalLink, Mail
} from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentDrives, setRecentDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMetrics();
      setMetrics(data.metrics);
      setRecentDrives(data.recentDrives || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    window.addEventListener('placement-drive-deleted', fetchDashboardData);
    return () => window.removeEventListener('placement-drive-deleted', fetchDashboardData);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Loading Placement Analytics Dashboard...</span>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Placement Drives', value: metrics?.totalDrives || 0, icon: Briefcase, color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30' },
    { title: 'Shortlisted Students', value: metrics?.totalShortlisted || 0, icon: Users, color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30' },
    { title: 'Verified & Joined Group', value: metrics?.verifiedStudents || 0, icon: CheckCircle2, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
    { title: 'Email Invitations Sent', value: metrics?.invitationsSent || 0, icon: Send, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30' },
    { title: 'Invitations Pending', value: metrics?.invitationsPending || 0, icon: Clock, color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' },
    { title: 'Failed Delivery', value: metrics?.failedInvitations || 0, icon: AlertCircle, color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            Automated Email Dispatch &amp; Student Verification
          </div>
          <h1 className="font-['Outfit'] font-bold text-3xl text-white">
            Placement Drive Dashboard
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Upload student shortlists, send email invitations from Admin Gmail, and track roll-number OTP verification before unlocking group access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            to="/drives/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Placement Drive</span>
          </Link>
        </div>
      </div>

      {/* Verification Rate Metric Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-1 glass-card rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Overall Verification Rate</div>
            <div className="text-4xl font-extrabold font-['Outfit'] text-white">
              {metrics?.verificationRate}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Percentage of shortlisted students who verified their roll number &amp; unlocked the official WhatsApp group.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Verified: <strong className="text-emerald-400">{metrics?.verifiedStudents}</strong></span>
            <span>Total Shortlisted: <strong className="text-slate-200">{metrics?.totalShortlisted}</strong></span>
          </div>
        </div>

        {/* 6 Grid Metrics */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="glass-card rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400 font-medium">{card.title}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} border shadow-sm`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-['Outfit'] text-slate-100">{card.value}</div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Recent Placement Drives Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-['Outfit'] font-bold text-lg text-slate-100">Recent Placement Drives</h3>
            <p className="text-xs text-slate-400">Overview of student shortlists and email verification progress</p>
          </div>
          
          <Link
            to="/drives"
            className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
          >
            View All Drives
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentDrives.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm font-medium">No placement drives created yet.</p>
            <Link to="/drives/create" className="text-xs text-emerald-400 underline font-semibold mt-1 inline-block">
              Create your first placement drive
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Company &amp; Drive</th>
                  <th className="p-3.5">Round</th>
                  <th className="p-3.5">Drive Date</th>
                  <th className="p-3.5">Shortlisted</th>
                  <th className="p-3.5">Verified</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentDrives.map((drive) => {
                  const pct = drive.total_students > 0 ? Math.round((drive.verified_students / drive.total_students) * 100) : 0;
                  return (
                    <tr key={drive.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-base">{drive.company_name}</div>
                        <div className="text-xs text-slate-400">{drive.drive_name}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700">
                          {drive.placement_round}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-400">{drive.drive_date}</td>
                      <td className="p-3.5 font-semibold text-slate-200">{drive.total_students}</td>
                      <td className="p-3.5 font-semibold text-emerald-400">{drive.verified_students}</td>
                      <td className="p-3.5 w-36">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <Link
                          to={`/drives/${drive.id}`}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all"
                        >
                          Manage Drive
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
