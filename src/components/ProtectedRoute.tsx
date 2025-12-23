import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route for coach/admin users only
 * Redirects trainees to client dashboard
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

  // Debug logging
  console.log('[ProtectedRoute] State:', { 
    isAuthenticated, 
    isLoading, 
    user, 
    role: user?.role,
    email: user?.email 
  });

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect trainees to client dashboard immediately
  if (user?.role === 'trainee') {
    console.log('[ProtectedRoute] Trainee detected, redirecting to /client/dashboard');
    // Use window.location for immediate redirect to prevent any rendering of manager dashboard
    if (typeof window !== 'undefined') {
      window.location.href = '/client/dashboard';
      return null; // Return null while redirecting
    }
    return <Navigate to="/client/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;





















