import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ParticipantLogin } from './pages/ParticipantLogin';
import { HuntPage } from './pages/HuntPage';
import { PublicLeaderboard } from './pages/PublicLeaderboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminWarningPopup } from './components/AdminWarningPopup';

import { FakeQRPage } from './pages/FakeQRPage';

// Route Guards
const ParticipantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, token, isDeviceApproved, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
        Loading Sovereign Hunt...
      </div>
    );
  }

  if (!token || role !== 'PARTICIPANT') {
    return <Navigate to="/" replace />;
  }

  if (!isDeviceApproved) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
        Authenticating Game Master...
      </div>
    );
  }

  if (!token || role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const RootRoute: React.FC = () => {
  const { role, isDeviceApproved } = useAuth();
  if (role === 'PARTICIPANT' && isDeviceApproved) {
    return <Navigate to="/hunt" replace />;
  }
  if (role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <ParticipantLogin />;
};

export const AppContent: React.FC = () => {
  return (
    <Router>
      <AdminWarningPopup />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/hunt"
          element={
            <ParticipantRoute>
              <HuntPage />
            </ParticipantRoute>
          }
        />
        <Route path="/leaderboard" element={<PublicLeaderboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="/fake-qr" element={<FakeQRPage />} />
        <Route path="/trap" element={<FakeQRPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
