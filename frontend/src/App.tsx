import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PassListPage from './pages/passes/PassListPage';
import CreatePassPage from './pages/passes/CreatePassPage';
import PassDetailPage from './pages/passes/PassDetailPage';
import VisitorListPage from './pages/visitors/VisitorListPage';
import GateTerminalPage from './pages/terminal/GateTerminalPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import CreateSecurityPassPage from './pages/securityPass/CreateSecurityPassPage';
import SecurityPassListPage from './pages/securityPass/SecurityPassListPage';
import SecurityPassRespondPage from './pages/securityPass/SecurityPassRespondPage';
import GuestRoute from './routes/GuestRoute';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import './App.css';

function App() {
  const { checkAuthSession } = useAuth();

  useEffect(() => {
    checkAuthSession();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Guest routes wrapped in GuestRoute and AuthLayout */}
        <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected routes wrapped in ProtectedRoute and DashboardLayout */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/passes" element={<PassListPage />} />
          <Route path="/passes/new" element={<CreatePassPage />} />
          <Route path="/passes/:id" element={<PassDetailPage />} />
          <Route path="/security-pass" element={<SecurityPassListPage />} />
          <Route path="/security-pass/new" element={<CreateSecurityPassPage />} />
          <Route path="/visitors" element={<VisitorListPage />} />
          <Route path="/terminal" element={<GateTerminalPage />} />
          <Route path="/audit" element={<AuditLogsPage />} />
        </Route>

        {/* Public Security Pass approval response page (clicked from email, no auth) */}
        <Route path="/security-pass/respond" element={<SecurityPassRespondPage />} />

        {/* Access denied page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Default route redirecting to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
