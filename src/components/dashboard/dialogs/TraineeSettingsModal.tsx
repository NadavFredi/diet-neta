/**
 * TraineeSettingsModal Component
 * 
 * Modal for managing trainee user settings:
 * - Reset password (sends via WhatsApp)
 * - Delete trainee user
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Key, Trash2, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';

interface TraineeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeUserId: string | null;
  traineeEmail: string | null;
  traineeName: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
}

// Default template for trainee password reset (same as creation)
const DEFAULT_TRAINEE_TEMPLATE = `שלום {{name}},

סיסמת הכניסה שלך אופסה!

פרטי הכניסה החדשים:
📧 אימייל: {{email}}
🔑 סיסמה: {{password}}

ניתן להתחבר בכתובת:
{{login_url}}

בברכה,
צוות DietNeta`;

export const TraineeSettingsModal = ({
  isOpen,
  onClose,
  traineeUserId,
  traineeEmail,
  traineeName,
  customerPhone,
  customerId,
}: TraineeSettingsModalProps) => {
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Generate random password helper
  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#';
  };

  // Open password dialog
  const handleOpenPasswordDialog = () => {
    setNewPassword(generateRandomPassword());
    setShowPasswordDialog(true);
  };

  // Reset password with manually entered password and send via WhatsApp
  const handleResetPassword = async () => {
    if (!traineeUserId) {
      toast({
        title: 'שגיאה',
        description: 'חסר מזהה משתמש',
        variant: 'destructive',
      });
      return;
    }

    if (!customerPhone) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין ללקוח. לא ניתן לשלוח את הסיסמה ב-WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      // Update password using Supabase Admin API (uses user ID, not email)
      // This will automatically invalidate the old password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        traineeUserId,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      // Send password via WhatsApp (same logic as CreateTraineeButton)
      // Email is optional - use placeholder if not available
      const placeholders = {
        name: traineeName || 'לקוח',
        email: traineeEmail || 'לא זמין',
        password: newPassword,
        login_url: `${window.location.origin}/login`,
      };

      // Get template from localStorage (same as trainee creation)
      // Replace "נוצר" (created) with "אופס" (reset) in the template for password reset
      const savedTemplate = localStorage.getItem('traineeUserMessageTemplate');
      let templateContent = savedTemplate || DEFAULT_TRAINEE_TEMPLATE;
      // Replace account creation language with password reset language if using default template
      if (!savedTemplate) {
        templateContent = DEFAULT_TRAINEE_TEMPLATE;
      } else {
        // If using saved template, adapt it for password reset
        templateContent = templateContent
          .replace(/חשבון.*נוצר/, 'סיסמה אופסה')
          .replace(/נוצר בהצלחה/, 'אופסה בהצלחה');
      }
      const message = replacePlaceholders(templateContent, placeholders);

      const result = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }

      toast({
        title: 'הצלחה',
        description: 'הסיסמה החדשה נשמרה ונשלחה בהצלחה ב-WhatsApp!',
        variant: 'default',
      });

      // Close dialog and reset state
      setShowPasswordDialog(false);
      setNewPassword('');
      setShowPassword(false);
    } catch (error: any) {
      console.error('[TraineeSettingsModal] Error resetting password:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל באיפוס הסיסמה או בשליחתה',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Delete trainee user
  const handleDeleteTrainee = async () => {
    if (!traineeUserId) {
      toast({
        title: 'שגיאה',
        description: 'חסר מזהה משתמש',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user from auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(traineeUserId);

      if (authError) throw authError;

      // Also delete from profiles table if exists
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', traineeUserId);

      if (profileError) {
        console.warn('[TraineeSettingsModal] Error deleting profile:', profileError);
        // Don't throw - auth user is already deleted
      }

      toast({
        title: 'הצלחה',
        description: 'משתמש המתאמן נמחק בהצלחה',
        variant: 'default',
      });

      setShowDeleteConfirm(false);
      onClose();
      
      // Reload page to reflect changes
      window.location.reload();
    } catch (error: any) {
      console.error('[TraineeSettingsModal] Error deleting trainee:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת המשתמש',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
        <DialogContent className="max-w-md w-[95vw] p-0" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-bold text-gray-900">הגדרות מתאמן</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-6">
            {/* User Info */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">מתאמן</Label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{traineeName || '—'}</p>
                <p className="text-xs text-gray-600 mt-1">{traineeEmail || '—'}</p>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">סיסמה</Label>
              
              <Button
                type="button"
                onClick={handleOpenPasswordDialog}
                disabled={!customerPhone}
                className="w-full"
                variant="outline"
              >
                <Key className="h-4 w-4 ml-2" />
                איפוס סיסמה
              </Button>
              {!customerPhone && (
                <p className="text-xs text-red-500">
                  ⚠️ מספר טלפון לא זמין. לא ניתן לשלוח את הסיסמה החדשה ב-WhatsApp.
                </p>
              )}
              <p className="text-xs text-gray-500">
                תוכל ליצור סיסמה חדשה באופן ידני ולשלוח אותה ללקוח ב-WhatsApp. הסיסמה הישנה לא תהיה תקינה יותר.
              </p>
            </div>

            {/* Delete Section */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <Label className="text-sm font-semibold text-red-700">פעולות מסוכנות</Label>
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                מחק משתמש מתאמן
              </Button>
              <p className="text-xs text-gray-500">
                ⚠️ פעולה זו תמחק את משתמש המתאמן לצמיתות ולא ניתן לבטל אותה.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את משתמש המתאמן <strong>{traineeName || traineeEmail}</strong> לצמיתות.
              <br />
              <br />
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrainee}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  מוחק...
                </>
              ) : (
                'מחק'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
