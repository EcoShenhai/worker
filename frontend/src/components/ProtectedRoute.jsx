import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="auth-wrap"><span className="spinner" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  // Force a password change on first login before anything else.
  if (user.requiresPasswordChange) return <Navigate to="/change-password" replace />;
  return <Layout>{children}</Layout>;
}
