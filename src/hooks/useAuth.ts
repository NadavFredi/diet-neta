import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, logoutUser, initializeAuth } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export const useAuth = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note: Auth initialization is now handled by AuthInitializer component at app level

  const handleLogin = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      
      toast({
        title: 'התחברות בוצעה בהצלחה',
        description: `ברוך הבא! ${result.user.full_name || result.user.email}`,
      });

      // Redirect immediately - use window.location for reliable navigation
      // The loginUser thunk already updated the Redux state
      
      // Use window.location for immediate, reliable navigation
      // This bypasses any React Router state issues
      if (result.user.role === 'trainee') {
        // Small delay to ensure Redux state is fully updated
        setTimeout(() => {
          window.location.href = '/client/dashboard';
        }, 100);
      } else {
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      }
    } catch (error: any) {
      // Handle both regular errors and rejected thunk errors
      // When using rejectWithValue, error is in error.payload
      // When throwing normally, error is in error.message
      let errorMessage = 'אימייל או סיסמה שגויים';
      
      if (error?.payload) {
        // Rejected thunk with rejectWithValue
        errorMessage = String(error.payload);
      } else if (error?.message) {
        // Regular error
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'שגיאה בהתחברות',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (email: string, password: string, confirmPassword: string, fullName?: string) => {
    if (password !== confirmPassword) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמאות אינן תואמות',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
            role: 'trainee', // Default to trainee for new registrations
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user returned from signup');

      toast({
        title: 'הרשמה בוצעה בהצלחה',
        description: 'אנא בדוק את האימייל שלך לאימות החשבון',
      });

      // After signup, the profile will be created automatically via trigger
      // We can initialize auth to get the user data
      await dispatch(initializeAuth());
      
      navigate('/client/dashboard');
    } catch (error: any) {
      toast({
        title: 'שגיאה בהרשמה',
        description: error?.message || 'לא ניתן היה ליצור חשבון',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast({
        title: 'התנתקת בהצלחה',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה להתנתק',
        variant: 'destructive',
      });
    }
  };

  return {
    isAuthenticated,
    isLoading: isSubmitting, // Only show loading when actually submitting, not during auth init
    user,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};




















