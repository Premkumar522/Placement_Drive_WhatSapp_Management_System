import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Briefcase, PlusCircle, Search, Calendar, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';

export default function DrivesList() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [deletingDriveId, setDeletingDriveId] = useState(null);

  const fetchDrives = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDrives();
      setDrives(data.drives || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch placement drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleDelete = async (drive) => {
    const confirmed = window.confirm(
      `Delete "${drive.company_name} - ${drive.drive_name}"? This will permanently remove the drive and its shortlisted students.`
    );

    if (!confirmed) return;

    setDeletingDriveId(drive.id);
    setError('');
    try {
      await api.deleteDrive(drive.id);
      setDrives((currentDrives) => currentDrives.filter((currentDrive) => currentDrive.id !== drive.id));
      window.dispatchEvent(new Event('placement-drive-deleted'));
    } catch (err) {
      setError(err.message || 'Failed to delete placement drive');
    } finally {
      setDeletingDriveId(null);
    }
  };

  const filteredDrives = drives.filter(d => 
    d.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.drive_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.placement_round.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] font-bold text-3xl text-white">Placement Drives</h1>
          <p className="text-slate-400 text-sm">Manage student shortlists, WhatsApp group links, and invitations</p>
        </div>

        <Link
          to="/drives/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Drive</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by company name, drive title, or placement round..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm">Fetching Placement Drives...</span>
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-3 border border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-200 text-lg">No Placement Drives Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'No drives match your search query.' : 'Create a placement drive to upload shortlisted students and email invitation links.'}
          </p>
          {!searchTerm && (
            <Link
              to="/drives/create"
              className="inline-block px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs mt-2"
            >
              + Create Drive
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrives.map((drive) => {
            const verifiedCount = drive.verified_count || 0;
            const totalCount = drive.total_students || 0;
            const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

            return (
              <div
                key={drive.id}
                className="glass-card rounded-3xl p-6 border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {drive.placement_round}
                      </span>
                      <h3 className="font-['Outfit'] font-bold text-xl text-white mt-1">
                        {drive.company_name}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium">{drive.drive_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDelete(drive);
                        }}
                        disabled={deletingDriveId === drive.id}
                        aria-label={`Delete ${drive.company_name} ${drive.drive_name}`}
                        title="Delete drive"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <Briefcase className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Drive Date: <strong className="text-slate-200">{drive.drive_date}</strong></span>
                  </div>

                  {drive.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {drive.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Shortlisted</div>
                      <div className="font-bold text-slate-200">{totalCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Sent</div>
                      <div className="font-bold text-cyan-400">{drive.sent_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Verified</div>
                      <div className="font-bold text-emerald-400">{verifiedCount}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Verification Progress</span>
                      <span className="font-semibold text-emerald-400">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link
                    to={`/drives/${drive.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-slate-800 text-slate-200 hover:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Manage Drive & Shortlist</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
