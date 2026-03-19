import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Root } from './Root';

export function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Root />;
}
