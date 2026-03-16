import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Pages
import HomePage from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/auth';
import {
  BusinessListPage,
  BusinessDetailPage,
  MyAppointmentsPage,
} from './pages/customer';
import {
  DashboardPage,
  AppointmentsManagePage,
  BusinessManagePage,
} from './pages/business';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes with Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/businesses" element={<BusinessListPage />} />
            <Route path="/businesses/:id" element={<BusinessDetailPage />} />
            
            {/* Customer protected routes */}
            <Route
              path="/my-appointments"
              element={
                <ProtectedRoute>
                  <MyAppointmentsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Business owner protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/appointments"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <AppointmentsManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/business"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <BusinessManagePage />
                </ProtectedRoute>
              }
            />
          </Route>
          
          {/* Auth routes without Layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
