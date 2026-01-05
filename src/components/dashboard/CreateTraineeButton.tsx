/**
 * CreateTraineeButton Component
 * 
 * Secure button to create trainee user from lead without passwords
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createTraineeInvitation, sendInvitationEmail } from '@/store/slices/invitationSlice';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CreateTraineeButtonProps {
  customerId: string;
  leadId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
}

export const CreateTraineeButton: React.FC<CreateTraineeButtonProps> = ({
  customerId,
  leadId,
  customerEmail,
  customerName,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading, lastCreatedInvitation } = useAppSelector((state) => state.invitation);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail || '');
  const [magicLink, setMagicLink] = useState<string | null>(null);

  // Check if user is admin/manager
  const canCreateTrainee = user?.role === 'admin' || user?.role === 'user';

  if (!canCreateTrainee) {
    return null;
  }

  const handleCreateTrainee = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן כתובת אימייל תקינה',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create invitation (no password)
      const result = await dispatch(
        createTraineeInvitation({
          email,
          customerId,
          leadId: leadId || null,
          expiresInDays: 7,
        })
      ).unwrap();

      // Send invitation email
      const emailResult = await dispatch(
        sendInvitationEmail({ invitationId: result.invitation.id })
      ).unwrap();

      setMagicLink(emailResult.magicLink);

      toast({
        title: 'הצלחה',
        description: 'הזמנה נשלחה בהצלחה. המשתמש יקבל אימייל עם קישור כניסה.',
      });
    } catch (error: any) {
      console.error('[CreateTraineeButton] Error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'נכשל ביצירת משתמש מתאמן';
      if (error?.message) {
        if (error.message.includes('permission denied')) {
          errorMessage = 'אין הרשאה ליצור הזמנות. אנא ודא שאתה מחובר כמנהל.';
        } else if (error.message.includes('already exists')) {
          errorMessage = 'משתמש זה כבר קיים במערכת.';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'שגיאה',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          size="default"
          className="bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200 text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" strokeWidth={2.5} />
          <span>צור משתמש מתאמן</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור משתמש מתאמן</DialogTitle>
          <DialogDescription>
            המשתמש יקבל אימייל עם קישור כניסה מאובטח. לא נדרש סיסמה.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">כתובת אימייל</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isLoading || !!magicLink}
            />
          </div>

          {magicLink && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mt-2">
                <p className="font-semibold mb-2">קישור כניסה נוצר בהצלחה!</p>
                <p className="text-sm text-gray-600 mb-2">
                  הקישור נשלח לאימייל. ניתן גם להעתיק את הקישור הבא:
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs break-all font-mono">
                  {magicLink}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  הקישור תקף ל-7 ימים בלבד
                </p>
              </AlertDescription>
            </Alert>
          )}

          {customerName && (
            <div className="text-sm text-gray-600">
              <strong>לקוח:</strong> {customerName}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsDialogOpen(false);
              setMagicLink(null);
              setEmail(customerEmail || '');
            }}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            onClick={handleCreateTrainee}
            disabled={isLoading || !email || !!magicLink}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                יוצר...
              </>
            ) : (
              'צור ושלוח הזמנה'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
