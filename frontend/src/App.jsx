import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { AdminLayout, OwnerLayout } from './components/layout';
import { ProtectedRoute, AdminRoute } from './components/auth';

// Pages
import {
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  CheckEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/auth';
import {
  DashboardPage,
  AppointmentsManagePage,
  BusinessManagePage,
  ClientsPage,
  BillingPage,
  SettingsPage,
} from './pages/business';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminBusinessesPage,
  AdminBusinessDetailPage,
  AdminSubscriptionsPage,
  AdminPaymentsPage,
  AdminNotificationsPage,
  AdminAuditLogPage,
} from './pages/admin';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ReschedulePage from './pages/ReschedulePage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Public reschedule portal (token-based, no auth required) */}
          <Route path="/reschedule/:token" element={<ReschedulePage />} />

          {/* Business owner protected routes with sidebar layout */}
          <Route
            element={
              <ProtectedRoute>
                <OwnerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/appointments" element={<AppointmentsManagePage />} />
            <Route path="/dashboard/business" element={<SettingsPage />} />
            <Route path="/dashboard/clients" element={<ClientsPage />} />
            <Route path="/dashboard/billing" element={<BillingPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
          </Route>

          {/* Superadmin protected routes */}
          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
            <Route path="/admin/businesses/:id" element={<AdminBusinessDetailPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
          </Route>

          {/* Auth routes without Layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Catch-all: redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
