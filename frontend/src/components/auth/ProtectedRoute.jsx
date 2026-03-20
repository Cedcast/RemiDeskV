import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoading } from '../common/Loading';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Platform admins should not access business owner dashboard routes
  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
