import React, { useState } from 'react';
import { api } from '../services/api';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, RefreshCw, Mail } from 'lucide-react';

export default function ExcelUploader({ driveId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('valid'); // valid | invalid | duplicates
  const [error, setError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setImportSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.previewFile(formData);
      setPreview(res);
      if (res.validCount > 0) setActiveTab('valid');
      else if (res.invalidCount > 0) setActiveTab('invalid');
      else setActiveTab('duplicates');
    } catch (err) {
      setError(err.message || 'Failed to parse Excel/CSV file');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !driveId) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.uploadShortlist(driveId, formData);
      setImportSuccess(res.message);
      setPreview(null);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to import student shortlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* File Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-900/60 rounded-2xl p-8 text-center transition-all group cursor-pointer"
      >
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={(e) => handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
            <FileSpreadsheet className="w-7 h-7" />
          </div>

          <div>
            <h4 className="font-['Outfit'] font-bold text-base text-slate-100 mb-1">
              Upload Shortlisted Student Excel or CSV File
            </h4>
            <p className="text-xs text-slate-400">
              Drag &amp; drop your file here, or <span className="text-emerald-400 font-semibold underline">browse file (.xlsx, .xls, .csv)</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 w-full max-w-lg">
            <span className="font-semibold text-slate-300">Expected Columns:</span>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-semibold">Student Name</code>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-semibold">Roll Number</code>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-semibold">Gmail / Email *</code>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">Phone (Optional)</code>
          </div>
        </div>
      </div>

      {/* Error / Success Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {importSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center justify-center p-6 text-slate-400 gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Validating student records...</span>
        </div>
      )}

      {/* Preview Table & Data Cleaning Summary */}
      {preview && !loading && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5 animate-in fade-in duration-200">
          
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Total Rows Parsed</div>
              <div className="text-xl font-bold text-slate-100">{preview.totalParsed}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-semibold mb-1">Valid &amp; Ready</div>
              <div className="text-xl font-bold text-emerald-300">{preview.validCount}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-xs text-amber-400 font-semibold mb-1">Duplicates Skipped</div>
              <div className="text-xl font-bold text-amber-300">{preview.duplicateCount}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="text-xs text-rose-400 font-semibold mb-1">Invalid Records</div>
              <div className="text-xl font-bold text-rose-300">{preview.invalidCount}</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('valid')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'valid'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid Records ({preview.validCount})
            </button>

            {preview.duplicateCount > 0 && (
              <button
                onClick={() => setActiveTab('duplicates')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'duplicates'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Duplicates ({preview.duplicateCount})
              </button>
            )}

            {preview.invalidCount > 0 && (
              <button
                onClick={() => setActiveTab('invalid')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'invalid'
                    ? 'bg-rose-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Invalid Records ({preview.invalidCount})
              </button>
            )}
          </div>

          {/* Records Table View */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
            {activeTab === 'valid' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Gmail / Email Address</th>
                    <th className="p-3">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preview.validRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">{rec.studentName}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{rec.rollNumber}</td>
                      <td className="p-3 text-cyan-300 font-mono text-[11px]">{rec.email}</td>
                      <td className="p-3 text-slate-400">{rec.normalizedPhone || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'duplicates' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Row</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preview.duplicateRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono text-amber-400">{rec.rowIndex}</td>
                      <td className="p-3 font-semibold text-white">{rec.studentName}</td>
                      <td className="p-3 font-mono">{rec.rollNumber}</td>
                      <td className="p-3 font-mono text-slate-400">{rec.normalizedEmail || 'N/A'}</td>
                      <td className="p-3 text-amber-300 font-medium">{rec.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'invalid' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Row</th>
                    <th className="p-3">Raw Name</th>
                    <th className="p-3">Raw Roll</th>
                    <th className="p-3">Raw Email</th>
                    <th className="p-3">Validation Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preview.invalidRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono text-rose-400">{rec.rowIndex}</td>
                      <td className="p-3 text-slate-300">{rec.rawName}</td>
                      <td className="p-3 font-mono text-slate-300">{rec.rawRoll}</td>
                      <td className="p-3 text-slate-400">{rec.rawEmail}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {rec.reasons.map((r, i) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-medium">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Only <strong className="text-emerald-400">{preview.validCount} valid student record(s)</strong> will be imported into the drive.
            </span>

            <button
              onClick={handleConfirmImport}
              disabled={preview.validCount === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>Confirm &amp; Import Shortlist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
