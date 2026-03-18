import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoading } from '../common/Loading';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;

  return children;
};

export default AdminRoute;
