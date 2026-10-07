import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-store';
import { homePath } from '../../lib/roles';
import FullScreenLoader from '../layout/FullScreenLoader';

/**
 * Gate a route behind authentication and (optionally) a set of allowed roles.
 * `allow` is an array of role strings; omit it to allow any signed-in user.
 */
export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return children;
}
