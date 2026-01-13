/**
 * Login UI Component
 * 
 * Pure presentation component - all logic is in Login.ts
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { MessageCircle } from 'lucide-react';
import { useLogin } from './Login';
import { AppFooter } from '@/components/layout/AppFooter';

const Login = () => {
  const {
    email,
    password,
    isLoading,
    handleEmailChange,
    handlePasswordChange,
    handleLogin,
  } = useLogin();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            {/* Logo Area */}
            <div className="text-center mb-6">
              <div className="flex flex-row items-center justify-center gap-6 mb-3">
                <img
                  src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg"
                  alt="Diet Neta Logo"
                  className="h-12 w-auto object-contain max-h-12"
                />
                <div className="h-8 w-px bg-gray-200"></div>
                <img
                  src="/logo.svg"
                  alt="Easy Flow Logo"
                  className="h-12 w-auto object-contain max-h-12"
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">ברוכים הבאים</h2>
              <p className="text-sm text-gray-600">
                התחבר לחשבון שלך כדי להמשיך
              </p>
            </div>

            {/* Input Field */}
            <div className="mb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="הכנס את כתובת האימייל שלך"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        e.preventDefault();
                        handleLogin();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    סיסמה
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="הכנס את הסיסמה שלך"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        e.preventDefault();
                        handleLogin();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogin();
              }}
              disabled={isLoading || !email || !password}
              className="w-full h-11 text-white font-semibold mb-4 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: "#5B6FB9",
              }}
            >
              {isLoading ? 'מתחבר...' : 'כניסה למערכת'}
            </Button>

            {/* Separator */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">או</span>
              </div>
            </div>

            {/* Registration Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                אין לך חשבון?{' '}
                <a href="#" className="font-medium hover:opacity-80 transition-opacity" style={{ color: '#5B6FB9' }}>
                  צור קשר עם המנהל
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <AppFooter className="mt-auto" />

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/972XXXXXXXXX"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50"
        aria-label="צור קשר ב-WhatsApp"
      >
        <MessageCircle className="h-7 w-7 text-white fill-current" />
      </a>
    </div>
  );
};

export default Login;
