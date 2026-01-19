/**
 * ViewAsClientButton Component
 * 
 * Secure "View as Client" button for admin impersonation mode
 */

import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { startImpersonation, stopImpersonation } from '@/store/slices/impersonationSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ViewAsClientButtonProps {
  customerId: string;
  userId?: string | null;
}

export const ViewAsClientButton: React.FC<ViewAsClientButtonProps> = ({
  customerId,
  userId,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);

  // Only show for admins/managers
  if (!user || (user.role !== 'admin' && user.role !== 'user')) {
    return null;
  }

  // If already impersonating this user, show exit button
  if (isImpersonating && userId) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              dispatch(stopImpersonation());
              // Navigate back to previous location or default to dashboard
              const returnPath = previousLocation || '/dashboard';
              navigate(returnPath);
              toast({
                title: 'יציאה ממצב תצוגה',
                description: 'חזרת למצב מנהל',
              });
            }}
            className="h-9 w-9 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" dir="rtl">
          <p>יציאה ממצב תצוגה</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const handleViewAsClient = async () => {
    if (!userId || !customerId) {
      toast({
        title: 'שגיאה',
        description: 'חסר מידע על המשתמש',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Store current location (pathname + search params) before navigating
      const currentLocation = location.pathname + location.search;
      
      // Store original user info and previous location
      dispatch(
        startImpersonation({
          userId,
          customerId,
          originalUser: {
            id: user.id,
            email: user.email || '',
            role: user.role || 'user',
          },
          previousLocation: currentLocation,
        })
      );

      // Navigate to client dashboard
      navigate('/client/dashboard');
      
      toast({
        title: 'מצב תצוגה פעיל',
        description: 'אתה צופה בממשק הלקוח. לחץ על "יציאה ממצב תצוגה" כדי לחזור.',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: 'נכשל בכניסה למצב תצוגה',
        variant: 'destructive',
      });
    }
  };

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          onClick={handleViewAsClient}
          disabled={!userId || !customerId}
          className="h-9 w-9 bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200 rounded-lg"
        >
          <Eye className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" dir="rtl">
        <p>צפה כמתאמן</p>
      </TooltipContent>
    </Tooltip>
  );
};
