import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

const AuthRedirect = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default AuthRedirect;














