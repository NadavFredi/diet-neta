/**
 * CreateTraineeButton Component
 * 
 * Button to create trainee user with password and send details via WhatsApp
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, MessageCircle, Settings, Eye, EyeOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createTraineeUserWithPassword } from '@/store/slices/invitationSlice';
import { startImpersonation } from '@/store/slices/impersonationSlice';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
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
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { fetchTemplates } from '@/store/slices/automationSlice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Flow configs for template labels (same as LeadAutomationCard)
const DEFAULT_FLOW_CONFIGS = [
  {
    key: 'customer_journey_start',
    label: 'תחילת מסע לקוח ותיאום פגישה',
  },
  {
    key: 'intro_questionnaire',
    label: 'שליחת שאלון הכרות לאחר קביעת שיחה',
  },
];

// Load custom flows from localStorage
const loadCustomFlows = (): Array<{ key: string; label: string }> => {
  try {
    const stored = localStorage.getItem('custom_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[CreateTraineeButton] Error loading custom flows:', error);
  }
  return [];
};

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
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.invitation);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail || '');
  const [password, setPassword] = useState('');
  const [userCreated, setUserCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [userExists, setUserExists] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('default');
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Default template for trainee user credentials
  const DEFAULT_TRAINEE_TEMPLATE = `שלום {{name}},

חשבון המשתמש שלך נוצר בהצלחה!

פרטי הכניסה:
📧 אימייל: {{email}}
🔑 סיסמה: {{password}}

ניתן להתחבר בכתובת:
{{login_url}}

בברכה,
צוות DietNeta`;

  // Load template from localStorage on mount
  useEffect(() => {
    const savedTemplate = localStorage.getItem('traineeUserMessageTemplate');
    if (savedTemplate) {
      setMessageTemplate(savedTemplate);
    } else {
      setMessageTemplate(DEFAULT_TRAINEE_TEMPLATE);
    }
  }, []);

  // Save template to localStorage when it changes
  useEffect(() => {
    if (messageTemplate) {
      localStorage.setItem('traineeUserMessageTemplate', messageTemplate);
    }
  }, [messageTemplate]);

  // Load WhatsApp templates from automation flows
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const result = await dispatch(fetchTemplates()).unwrap();
        setTemplates(result);
      } catch (error) {
        console.error('[CreateTraineeButton] Error loading templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    if (isDialogOpen) {
      loadTemplates();
    }
  }, [dispatch, isDialogOpen]);

  // Check if customer already has a user account
  useEffect(() => {
    const checkExistingUser = async () => {
      if (!customerId) {
        setIsCheckingUser(false);
        return;
      }

      try {
        // Check if customer has a user_id
        const { data: customer, error } = await supabase
          .from('customers')
          .select('user_id, email')
          .eq('id', customerId)
          .maybeSingle();

        if (error) {
          console.error('[CreateTraineeButton] Error checking customer:', error);
          setIsCheckingUser(false);
          return;
        }

        if (customer?.user_id) {
          // Customer has a user account - check if it's a trainee
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', customer.user_id)
            .maybeSingle();

          if (profile && profile.role === 'trainee') {
            setExistingUserId(customer.user_id);
            setUserExists(true);
            // Update email if customer has email but we don't have it
            if (customer.email && !email) {
              setEmail(customer.email);
            }
          }
        } else if (customerEmail) {
          // Check if a user exists with this email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('email', customerEmail)
            .maybeSingle();

          if (profile && profile.role === 'trainee') {
            setExistingUserId(profile.id);
            setUserExists(true);
          }
        }
      } catch (error) {
        console.error('[CreateTraineeButton] Error checking existing user:', error);
      } finally {
        setIsCheckingUser(false);
      }
    };

    checkExistingUser();
  }, [customerId, customerEmail, email]);

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
      
      const errorMessage = error?.message || '';
      
      // Check if session is invalid - prompt to re-login
      if (errorMessage.includes('SESSION_MISMATCH') || errorMessage.includes('Session expired') || errorMessage.includes('log out and log back in') || errorMessage.includes('Invalid JWT')) {
        // Clear session immediately
        await supabase.auth.signOut();
        localStorage.removeItem('supabase_url');
        
        toast({
          title: 'סשן לא תקין',
          description: 'הסשן שלך לא תקין. מעביר לדף ההתחברות...',
          variant: 'destructive',
        });
        // Redirect immediately
        window.location.href = '/login';
        return;
      }
      
      // Check if user already exists
      if (errorMessage.includes('already exists') || errorMessage.includes('already been registered')) {
        // User exists - fetch their user ID and show "Watch as User" button
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, role, email')
            .eq('email', email)
            .maybeSingle();
          
          if (existingProfile && existingProfile.id) {
            setExistingUserId(existingProfile.id);
            setUserExists(true);
            toast({
              title: 'משתמש כבר קיים',
              description: 'המשתמש כבר קיים במערכת. תוכל לצפות כמשתמש זה.',
            });
            return;
          }
        } catch (fetchError) {
          console.error('[CreateTraineeButton] Error fetching existing user:', fetchError);
        }
      }
      
      // Provide more helpful error messages for other errors
      let displayMessage = 'נכשל ביצירת משתמש מתאמן';
      if (error?.message) {
        if (error.message.includes('permission denied')) {
          displayMessage = 'אין הרשאה ליצור משתמשים. אנא ודא שאתה מחובר כמנהל.';
        } else {
          displayMessage = error.message;
        }
      } else if (typeof error === 'string') {
        displayMessage = error;
      }
      
      toast({
        title: 'שגיאה',
        description: displayMessage,
        variant: 'destructive',
      });
    }
  };

  const handleWatchAsUser = async () => {
    if (!existingUserId || !customerId) {
      toast({
        title: 'שגיאה',
        description: 'חסר מידע על המשתמש',
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
          userId: existingUserId,
          customerId,
          originalUser: {
            id: user!.id,
            email: user!.email || '',
            role: user!.role || 'user',
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
      console.error('[CreateTraineeButton] Error starting impersonation:', error);
      toast({
        title: 'שגיאה',
        description: 'נכשל בכניסה למצב תצוגה',
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
      // If a template is selected, use it; otherwise use the default trainee template
      let templateContent = messageTemplate || DEFAULT_TRAINEE_TEMPLATE;
      let buttons: Array<{ id: string; text: string }> | undefined = undefined;

      if (selectedTemplateKey && selectedTemplateKey !== 'default' && templates[selectedTemplateKey]) {
        const selectedTemplate = templates[selectedTemplateKey];
        templateContent = selectedTemplate.template_content || templateContent;
        buttons = selectedTemplate.buttons;
      }

      const placeholders = {
        name: customerName || 'לקוח',
        email: email,
        password: password,
        login_url: `${window.location.origin}/login`,
      };

      const message = replacePlaceholders(templateContent, placeholders);

      // Process buttons if they exist
      const processedButtons = buttons?.map(btn => ({
        id: btn.id,
        text: replacePlaceholders(btn.text, placeholders),
      }));

      const result = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message,
        buttons: processedButtons,
      });

      if (result.success) {
        toast({
          title: 'הצלחה',
          description: 'ההודעה נשלחה בהצלחה ב-WhatsApp!',
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

  // If user exists, show "Watch as User" button that directly triggers impersonation
  if (userExists && existingUserId && !isCheckingUser) {
    return (
      <Button
        size="default"
        onClick={handleWatchAsUser}
        className="bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200 text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2"
      >
        <Eye className="h-5 w-5" strokeWidth={2.5} />
        <span>צפה כמתאמן</span>
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
            <Button
              size="icon"
              className="h-9 w-9 bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200 rounded-lg"
              disabled={isCheckingUser}
            >
              {isCheckingUser ? (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
              ) : (
                <UserPlus className="h-5 w-5" strokeWidth={2.5} />
              )}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
          <TooltipContent side="bottom" align="center" dir="rtl">
            <p>{isCheckingUser ? 'בודק...' : 'צור משתמש מתאמן'}</p>
          </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>צור משתמש מתאמן</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTemplateEditorOpen(true)}
              disabled={isLoading || userCreated || isSendingWhatsApp}
              className="h-7 px-2 text-xs text-gray-600 hover:text-black hover:bg-gray-50"
            >
              <Settings className="h-3 w-3 ml-1" />
              ערוך טמפלייט
            </Button>
          </DialogTitle>
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
              className="text-left"
              dir="ltr"
            />
          </div>

          {!userCreated && (
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    minLength={6}
                    className="pr-10 text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">מינימום 6 תווים</p>
              </div>
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

          {userExists && !userCreated && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="mt-2">
                <p className="font-semibold mb-2 text-blue-800">משתמש כבר קיים במערכת</p>
                <p className="text-sm text-blue-700 mb-3">
                  המשתמש עם האימייל {email} כבר קיים במערכת. תוכל לצפות בממשק שלו.
                </p>
                <Button
                  onClick={handleWatchAsUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  <Eye className="h-4 w-4 ml-2" />
                  צפה כמשתמש
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {customerName && (
            <div className="text-sm text-gray-600">
              <strong>לקוח:</strong> {customerName}
            </div>
          )}

          {/* WhatsApp Template Selection */}
          {customerPhone && (userCreated || userExists) && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="whatsapp-template">שלח תבנית WhatsApp</Label>
              <Select
                value={selectedTemplateKey}
                onValueChange={setSelectedTemplateKey}
                disabled={isSendingWhatsApp || isLoadingTemplates}
              >
                <SelectTrigger id="whatsapp-template" className="w-full">
                  <SelectValue placeholder="בחר תבנית (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">תבנית ברירת מחדל (פרטי כניסה)</SelectItem>
                  {Object.entries(templates).map(([key, template]) => {
                    // Get flow label from DEFAULT_FLOW_CONFIGS, custom flows, or use key
                    const allFlows = [...DEFAULT_FLOW_CONFIGS, ...loadCustomFlows()];
                    const flowConfig = allFlows.find(f => f.key === key);
                    const label = flowConfig?.label || key;
                    return (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendWhatsApp}
                disabled={isSendingWhatsApp || !customerPhone}
                className="w-full bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 ml-2" />
                    שלח תבנית WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsDialogOpen(false);
              setUserCreated(false);
              setUserExists(false);
              setPassword('');
              setEmail(customerEmail || '');
              setCreatedUserId(null);
              setExistingUserId(null);
              setSelectedTemplateKey('default');
            }}
            disabled={isLoading || isSendingWhatsApp}
            className="w-full sm:w-auto"
          >
            {userCreated || userExists ? 'סגור' : 'ביטול'}
          </Button>
          {!userCreated && !userExists ? (
            <Button
              onClick={handleCreateTrainee}
              disabled={isLoading || !email || !password || password.length < 6}
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
          ) : null}
        </DialogFooter>
      </DialogContent>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onOpenChange={setIsTemplateEditorOpen}
        flowKey="trainee_user_credentials"
        flowLabel="פרטי כניסה למתאמן"
        initialTemplate={messageTemplate || DEFAULT_TRAINEE_TEMPLATE}
        onSave={async (template, buttons, media) => {
          setMessageTemplate(template);
          localStorage.setItem('traineeUserMessageTemplate', template);
        }}
      />
    </Dialog>
  );
};
