import { useRecoilValue } from 'recoil';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticatedState } from '../../state';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useRecoilValue(isAuthenticatedState);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
