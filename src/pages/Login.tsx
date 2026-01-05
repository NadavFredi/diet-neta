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
import { useLogin, type LoginMethod } from './Login';

const Login = () => {
  const {
    loginMethod,
    phoneNumber,
    email,
    password,
    isLoading,
    handleMethodToggle,
    handlePhoneChange,
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">נטע הירש- דיאטה</h1>
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">ברוכים הבאים</h2>
              <p className="text-sm text-gray-600">
                התחבר לחשבון שלך כדי להמשיך
              </p>
            </div>

            {/* Method Toggle */}
            <div className="mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleMethodToggle('phone')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    loginMethod === 'phone'
                      ? 'bg-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={loginMethod === 'phone' ? { color: '#5B6FB9' } : {}}
                >
                  טלפון
                </button>
                <button
                  type="button"
                  onClick={() => handleMethodToggle('email')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    loginMethod === 'email'
                      ? 'bg-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={loginMethod === 'email' ? { color: '#5B6FB9' } : {}}
                >
                  אימייל
                </button>
              </div>
            </div>

            {/* Input Field */}
            <div className="mb-6">
              {loginMethod === 'phone' ? (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    מספר טלפון
                  </Label>
                    <div 
                      className="flex rounded-lg border border-gray-300 overflow-hidden transition-all focus-within:border-[#5B6FB9] focus-within:ring-2 focus-within:ring-[#5B6FB9]/20" 
                      dir="ltr"
                    >
                    <div className="flex items-center gap-2 px-4 bg-gray-50 border-r border-gray-300 min-w-[100px]">
                      <span className="text-lg">🇮🇱</span>
                      <span className="text-sm font-medium text-gray-700">+972</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="הכנס את מספר הטלפון שלך"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Login Button */}
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogin();
              }}
              disabled={isLoading || (loginMethod === 'email' && (!email || !password)) || (loginMethod === 'phone' && !phoneNumber)}
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
      <footer className="mt-auto" dir="rtl">
        <div
          className="text-white"
          style={{
            backgroundColor: "#5B6FB9",
          }}
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
            <div className="flex items-center gap-3 md:flex-row">
              <img
                src="/logo.svg"
                alt="Easy Flow logo"
                className="h-10 w-auto"
              />
              <div className="text-right text-sm md:text-base">
                <p className="font-semibold">Easy Flow</p>
                <p className="text-xs opacity-90 md:text-sm">
                  פתרונות טכנולוגיים, אוטומציה, וCRM לעסקים חכמים
                </p>
              </div>
            </div>
            <a
              href="https://easyflow.co.il"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline-offset-4 hover:underline md:text-base"
            >
              Easyflow.co.il
            </a>
          </div>
        </div>
      </footer>

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
