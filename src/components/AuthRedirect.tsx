import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

const AuthRedirect = () => {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-2"></div>
          <p className="text-sm text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === 'trainee') {
      return <Navigate to="/client/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default AuthRedirect;




















