import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-store';
import { homePath } from '../../lib/roles';
import FullScreenLoader from '../layout/FullScreenLoader';

/** Routes only for signed-out users (login, register, verify, forgot). */
export default function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={homePath(user.role)} replace />;
  return children;
}
