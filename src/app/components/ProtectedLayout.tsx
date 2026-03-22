import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Root } from './Root';

export function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const guestAllowed =
    location.pathname === '/' ||
    location.pathname === '/alerts' ||
    location.pathname.startsWith('/room/');

  if (!isAuthenticated && !guestAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <Root />;
}
