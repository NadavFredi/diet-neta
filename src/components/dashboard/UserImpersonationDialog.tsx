/**
 * UserImpersonationDialog Component
 * 
 * Dialog for searching and impersonating users by name or phone
 */

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { startImpersonation } from '@/store/slices/impersonationSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { User, Phone } from 'lucide-react';

interface UserImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomerWithUser {
  id: string; // customer_id
  full_name: string;
  phone: string;
  email: string | null;
  user_id: string | null;
}

export const UserImpersonationDialog: React.FC<UserImpersonationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  // Only show for admins/managers
  if (!user || (user.role !== 'admin' && user.role !== 'user')) {
    return null;
  }

  // Search for customers by name or phone
  useEffect(() => {
    if (!open || !searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    const searchCustomers = async () => {
      setIsLoading(true);
      try {
        const query = searchQuery.trim();
        
        // Search by name or phone
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name, phone, email, user_id')
          .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .not('user_id', 'is', null) // Only customers with user_id (trainees)
          .limit(20)
          .order('full_name', { ascending: true });

        if (error) {
          throw error;
        }

        setCustomers((data || []) as CustomerWithUser[]);
      } catch (error: any) {
        toast({
          title: 'שגיאה',
          description: 'נכשל בחיפוש משתמשים',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, toast]);

  const handleSelectUser = async (customer: CustomerWithUser) => {
    if (!customer.user_id) {
      toast({
        title: 'שגיאה',
        description: 'למשתמש זה אין חשבון פעיל',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Store current location before navigating
      const currentLocation = location.pathname + location.search;
      
      // Start impersonation
      dispatch(
        startImpersonation({
          userId: customer.user_id,
          customerId: customer.id,
          originalUser: {
            id: user.id,
            email: user.email || '',
            role: user.role || 'user',
          },
          previousLocation: currentLocation,
        })
      );

      // Close dialog and navigate to client dashboard
      onOpenChange(false);
      navigate('/client/dashboard');
      
      toast({
        title: 'מצב תצוגה פעיל',
        description: `אתה צופה במערכת בעיניו של ${customer.full_name}`,
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
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="חפש לפי שם או טלפון..."
        value={searchQuery}
        onValueChange={setSearchQuery}
        dir="rtl"
      />
      <CommandList dir="rtl">
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            מחפש...
          </div>
        )}
        {!isLoading && customers.length === 0 && searchQuery.trim() && (
          <CommandEmpty>לא נמצאו משתמשים</CommandEmpty>
        )}
        {!isLoading && searchQuery.trim() && customers.length > 0 && (
          <CommandGroup heading="משתמשים">
            {customers.map((customer) => (
              <CommandItem
                key={customer.id}
                value={`${customer.full_name} ${customer.phone}`}
                onSelect={() => handleSelectUser(customer)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#5B6FB9]/10 text-[#5B6FB9] flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm">{customer.full_name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};