import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Pages
import { LoginPage, RegisterPage } from './pages/auth';
import {
  DashboardPage,
  AppointmentsManagePage,
  BusinessManagePage,
  ClientsPage,
} from './pages/business';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Business owner protected routes */}
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/appointments"
              element={
                <ProtectedRoute>
                  <AppointmentsManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/business"
              element={
                <ProtectedRoute>
                  <BusinessManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/clients"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Auth routes without Layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Catch-all: redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
