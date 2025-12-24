/**
 * InviteAccept Page
 * 
 * Secure invitation acceptance page
 * User can set their password when accepting the invitation
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { verifyToken } from '@/utils/crypto';

export const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'password_setup' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const token = searchParams.get('token');
  const invitationId = searchParams.get('invitation');

  useEffect(() => {
    const acceptInvitation = async () => {
      if (!token || !invitationId) {
        setStatus('error');
        setErrorMessage('קישור לא תקין. חסרים פרמטרים נדרשים.');
        return;
      }

      try {
        // Get invitation
        const { data: invitation, error: fetchError } = await supabase
          .from('user_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();

        if (fetchError || !invitation) {
          setStatus('error');
          setErrorMessage('הזמנה לא נמצאה');
          return;
        }

        // Check if already accepted
        if (invitation.status === 'accepted') {
          setStatus('error');
          setErrorMessage('הזמנה זו כבר אושרה בעבר');
          return;
        }

        // Check if expired or revoked
        if (invitation.status === 'expired' || invitation.status === 'revoked') {
          setStatus('error');
          setErrorMessage(
            invitation.status === 'expired'
              ? 'הזמנה פגה. אנא בקש הזמנה חדשה.'
              : 'הזמנה בוטלה'
          );
          return;
        }

        // Verify token
        const isValid = await verifyToken(token, invitation.token_hash, invitation.token_salt);
        if (!isValid) {
          setStatus('error');
          setErrorMessage('קישור לא תקין או פג תוקף');
          return;
        }

        // Check expiration
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < new Date()) {
          // Update status to expired
          await supabase
            .from('user_invitations')
            .update({ status: 'expired' })
            .eq('id', invitationId);
          
          setStatus('error');
          setErrorMessage('הזמנה פגה. אנא בקש הזמנה חדשה.');
          return;
        }

        // Store invitation for password setup
        setInvitation(invitation);

        // If user doesn't exist yet, create it
        let userId = invitation.user_id;
        
        if (!userId) {
          // Create user account (without password - they'll set it)
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.email,
            email_confirm: true, // Auto-confirm email since they're using invitation
            user_metadata: {
              role: 'trainee',
              invitation_id: invitationId,
            },
          });

          if (createError) {
            console.error('[InviteAccept] Error creating user:', createError);
            // If user already exists, try to get their ID
            if (createError.message.includes('already registered')) {
              const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = users?.find(u => u.email === invitation.email);
              if (existingUser) {
                userId = existingUser.id;
              } else {
                setStatus('error');
                setErrorMessage('שגיאה ביצירת משתמש. המשתמש כבר קיים.');
                return;
              }
            } else {
              setStatus('error');
              setErrorMessage('שגיאה ביצירת משתמש');
              return;
            }
          } else if (newUser?.user) {
            userId = newUser.user.id;
            
            // Update invitation with user_id
            await supabase
              .from('user_invitations')
              .update({ user_id: userId })
              .eq('id', invitationId);

            // Update invitation state with user_id
            invitation.user_id = userId;

            // Link customer to user_id if customer_id exists in invitation
            if (invitation.customer_id) {
              await supabase
                .from('customers')
                .update({ user_id: userId })
                .eq('id', invitation.customer_id);
              
              console.log('[InviteAccept] Linked customer to user (initial):', {
                customer_id: invitation.customer_id,
                user_id: userId,
              });
            }

            // Create profile with trainee role
            await supabase
              .from('profiles')
              .upsert({
                id: userId,
                email: invitation.email,
                role: 'trainee',
                full_name: invitation.email.split('@')[0], // Temporary name
              }, {
                onConflict: 'id',
              });
          }
        }

        // Update invitation state with user_id if it was set
        if (userId) {
          invitation.user_id = userId;
          setInvitation({ ...invitation, user_id: userId });
        }

        // Show password setup form
        // User will set their password, and we'll handle login after
        setStatus('password_setup');
      } catch (error: any) {
        console.error('[InviteAccept] Error:', error);
        setStatus('error');
        setErrorMessage(error?.message || 'שגיאה בעת אישור ההזמנה');
      }
    };

    acceptInvitation();
  }, [token, invitationId, navigate]);

  const handleSetPassword = async () => {
    if (!password || password.length < 6) {
      setErrorMessage('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('הסיסמאות אינן תואמות');
      return;
    }

    setIsSettingPassword(true);
    setErrorMessage('');

    try {
      let userId = invitation?.user_id;

      // If user doesn't exist yet, create it first
      if (!userId) {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: invitation.email,
          password: password, // Set password directly
          email_confirm: true,
          user_metadata: {
            role: 'trainee',
            invitation_id: invitationId,
          },
        });

        if (createError) {
          console.error('[InviteAccept] Error creating user:', createError);
          setErrorMessage('שגיאה ביצירת משתמש');
          setIsSettingPassword(false);
          return;
        }

        if (newUser?.user) {
          userId = newUser.user.id;
          
          // Update invitation with user_id
          await supabase
            .from('user_invitations')
            .update({ user_id: userId })
            .eq('id', invitationId);

          // Link customer to user_id if customer_id exists in invitation
          if (invitation.customer_id) {
            await supabase
              .from('customers')
              .update({ user_id: userId })
              .eq('id', invitation.customer_id);
          }

          // Create profile with trainee role and customer_id
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: invitation.email,
              role: 'trainee',
              full_name: invitation.email.split('@')[0],
            }, {
              onConflict: 'id',
            });
        }
      } else {
        // User exists, update their password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password: password,
          }
        );

        if (updateError) {
          console.error('[InviteAccept] Error setting password:', updateError);
          setErrorMessage('שגיאה בהגדרת הסיסמה');
          setIsSettingPassword(false);
          return;
        }
      }

      // Link customer to user_id if customer_id exists in invitation
      if (invitation.customer_id && userId) {
        const { error: linkError } = await supabase
          .from('customers')
          .update({ user_id: userId })
          .eq('id', invitation.customer_id);
        
        if (linkError) {
          console.error('[InviteAccept] Error linking customer to user:', linkError);
          // Don't fail - the user can still log in, admin can link manually
        } else {
          console.log('[InviteAccept] Successfully linked customer to user:', {
            customer_id: invitation.customer_id,
            user_id: userId,
          });
        }
      } else {
        console.warn('[InviteAccept] Cannot link customer - missing customer_id or user_id:', {
          customer_id: invitation.customer_id,
          user_id: userId,
        });
      }

      // Update invitation status
      await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      // Log audit
      await supabase.from('invitation_audit_log').insert({
        invitation_id: invitationId,
        action: 'accepted',
        metadata: { email: invitation.email, customer_id: invitation.customer_id },
      });

      // Sign in the user with their new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (signInError) {
        console.error('[InviteAccept] Error signing in:', signInError);
        setStatus('error');
        setErrorMessage('הסיסמה הוגדרה בהצלחה, אך נכשל בכניסה. אנא התחבר ידנית.');
        setIsSettingPassword(false);
        return;
      }

      // Wait a moment for auth state to update, then redirect
      setStatus('success');
      setTimeout(() => {
        // Force a full page reload to ensure auth state is properly initialized
        window.location.href = '/client/dashboard';
      }, 1000);
    } catch (error: any) {
      console.error('[InviteAccept] Error:', error);
      setErrorMessage(error?.message || 'שגיאה בהגדרת הסיסמה');
      setIsSettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">אישור הזמנה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#5B6FB9]" />
              <p className="text-gray-600">מאמת את ההזמנה...</p>
            </div>
          )}

          {status === 'password_setup' && invitation && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  <p className="font-semibold mb-2">ברוך הבא! {invitation.email}</p>
                  <p className="text-sm">אנא הגדר סיסמה לחשבון שלך</p>
                </AlertDescription>
              </Alert>

              {errorMessage && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="text-sm">{errorMessage}</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הכנס סיסמה (לפחות 6 תווים)"
                      disabled={isSettingPassword}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSettingPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הכנס שוב את הסיסמה"
                    disabled={isSettingPassword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password && confirmPassword) {
                        handleSetPassword();
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleSetPassword}
                  disabled={isSettingPassword || !password || !confirmPassword}
                  className="w-full bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      מגדיר סיסמה...
                    </>
                  ) : (
                    'הגדר סיסמה והתחבר'
                  )}
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-semibold mb-2">הסיסמה הוגדרה בהצלחה!</p>
                <p className="text-sm">מעביר אותך למערכת...</p>
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">שגיאה באישור ההזמנה</p>
                <p className="text-sm">{errorMessage}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/login')}
                >
                  חזור לעמוד התחברות
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
