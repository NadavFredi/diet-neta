import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { determineUserType, getUserTypeLabel } from '@/utils/auth';

export const useAuth = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);

    // Mock login - simulate API call
    setTimeout(() => {
      const userType = determineUserType(email);
      
      dispatch(login({ email, type: userType }));
      
      toast({
        title: 'התחברות בוצעה בהצלחה',
        description: `ברוך הבא! ${getUserTypeLabel(userType)}`,
      });

      navigate('/dashboard');
      setIsLoading(false);
    }, 500);
  };

  const handleRegister = async (email: string, password: string, confirmPassword: string) => {
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

    setIsLoading(true);

    // Mock registration - simulate API call
    setTimeout(() => {
      const userType = determineUserType(email);
      
      dispatch(login({ email, type: userType }));
      
      toast({
        title: 'הרשמה בוצעה בהצלחה',
        description: `ברוך הבא! ${getUserTypeLabel(userType)}`,
      });

      navigate('/dashboard');
      setIsLoading(false);
    }, 500);
  };

  return {
    isAuthenticated,
    isLoading,
    handleLogin,
    handleRegister,
  };
};





