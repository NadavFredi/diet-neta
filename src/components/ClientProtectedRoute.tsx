import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route for client/trainee users only
 * Also allows access when admin is in impersonation mode
 * Redirects to login if not authenticated, or to coach dashboard if not a trainee and not impersonating
 */
const ClientProtectedRoute = ({ children }: ClientProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);
  const { isImpersonating } = useAppSelector((state) => state.impersonation);

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

  // Allow access if user is a trainee OR if admin is impersonating
  if (user?.role !== 'trainee' && !isImpersonating) {
    // If user is a coach/admin and not impersonating, redirect to coach dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ClientProtectedRoute;

