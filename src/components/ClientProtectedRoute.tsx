import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route for client/trainee users only
 * Redirects to login if not authenticated, or to coach dashboard if not a trainee
 */
const ClientProtectedRoute = ({ children }: ClientProtectedRouteProps) => {
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'trainee') {
    // If user is a coach/admin, redirect to coach dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ClientProtectedRoute;

