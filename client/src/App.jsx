import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DrivesList from './pages/DrivesList';
import CreateDrive from './pages/CreateDrive';
import DriveDetail from './pages/DriveDetail';
import StudentVerify from './pages/StudentVerify';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Inter',sans-serif]">
      <Navbar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          
          {/* Public Student Verification Portal */}
          <Route path="/verify-invite/:token" element={<StudentVerify />} />

          {/* Protected Admin Routes */}
          <Route path="/" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/drives" element={<ProtectedRoute><DrivesList /></ProtectedRoute>} />
          <Route path="/drives/create" element={<ProtectedRoute><CreateDrive /></ProtectedRoute>} />
          <Route path="/drives/:id" element={<ProtectedRoute><DriveDetail /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-400">
        Placement Drive Email Invitations &amp; WhatsApp Group Portal &copy; 2026
      </footer>
    </div>
  );
}
