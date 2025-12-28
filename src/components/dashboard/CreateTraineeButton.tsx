/**
 * CreateTraineeButton Component
 * 
 * Button to create trainee user with password and send details via WhatsApp
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, MessageCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createTraineeUserWithPassword } from '@/store/slices/invitationSlice';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendWhatsAppMessage, replacePlaceholders, formatPhoneNumber } from '@/services/greenApiService';

interface CreateTraineeButtonProps {
  customerId: string;
  leadId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export const CreateTraineeButton: React.FC<CreateTraineeButtonProps> = ({
  customerId,
  leadId,
  customerEmail,
  customerName,
  customerPhone,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.invitation);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userCreated, setUserCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

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

    if (!password || password.length < 6) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמאות אינן תואמות',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create user with password
      const result = await dispatch(
        createTraineeUserWithPassword({
          email,
          password,
          customerId,
          leadId: leadId || null,
        })
      ).unwrap();

      setUserCreated(true);
      setCreatedUserId(result.userId);

      toast({
        title: 'הצלחה',
        description: 'משתמש מתאמן נוצר בהצלחה!',
      });
    } catch (error: any) {
      console.error('[CreateTraineeButton] Error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'נכשל ביצירת משתמש מתאמן';
      if (error?.message) {
        if (error.message.includes('permission denied')) {
          errorMessage = 'אין הרשאה ליצור משתמשים. אנא ודא שאתה מחובר כמנהל.';
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

  const handleSendWhatsApp = async () => {
    if (!customerPhone) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין ללקוח',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // Default template for trainee user credentials
      const defaultTemplate = `שלום {{name}},

חשבון המשתמש שלך נוצר בהצלחה!

פרטי הכניסה:
📧 אימייל: {{email}}
🔑 סיסמה: {{password}}

ניתן להתחבר בכתובת:
{{login_url}}

בברכה,
צוות DietNeta`;

      const placeholders = {
        name: customerName || 'לקוח',
        email: email,
        password: password,
        login_url: `${window.location.origin}/login`,
      };

      const message = replacePlaceholders(defaultTemplate, placeholders);

      const result = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message,
      });

      if (result.success) {
        toast({
          title: 'הצלחה',
          description: 'פרטי הכניסה נשלחו בהצלחה ב-WhatsApp!',
        });
      } else {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      console.error('[CreateTraineeButton] WhatsApp error:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת הודעת WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsSendingWhatsApp(false);
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
            צור משתמש עם סיסמה ושלוח את פרטי הכניסה דרך WhatsApp
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
              disabled={isLoading || userCreated}
            />
          </div>

          {!userCreated && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500">מינימום 6 תווים</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </>
          )}

          {userCreated && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="mt-2">
                <p className="font-semibold mb-2 text-green-800">משתמש נוצר בהצלחה!</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>אימייל:</strong> {email}</p>
                  <p><strong>סיסמה:</strong> {password}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {customerName && (
            <div className="text-sm text-gray-600">
              <strong>לקוח:</strong> {customerName}
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsDialogOpen(false);
              setUserCreated(false);
              setPassword('');
              setConfirmPassword('');
              setEmail(customerEmail || '');
              setCreatedUserId(null);
            }}
            disabled={isLoading || isSendingWhatsApp}
            className="w-full sm:w-auto"
          >
            {userCreated ? 'סגור' : 'ביטול'}
          </Button>
          {!userCreated ? (
            <Button
              onClick={handleCreateTrainee}
              disabled={isLoading || !email || !password || password !== confirmPassword}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור משתמש'
              )}
            </Button>
          ) : (
            customerPhone && (
              <Button
                onClick={handleSendWhatsApp}
                disabled={isSendingWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 ml-2" />
                    שלח פרטי כניסה ב-WhatsApp
                  </>
                )}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
