import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoading } from '../common/Loading';

export const ProtectedRoute = ({ children, requireBusinessOwner = false }) => {
  const { isAuthenticated, isBusinessOwner, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireBusinessOwner && !isBusinessOwner()) {
    return <Navigate to="/businesses" replace />;
  }

  return children;
};

export default ProtectedRoute;
