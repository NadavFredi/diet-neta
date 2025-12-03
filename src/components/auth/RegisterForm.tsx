import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RegisterFormProps {
  onSubmit: (email: string, password: string, confirmPassword: string) => void;
  isLoading: boolean;
}

export const RegisterForm = ({ onSubmit, isLoading }: RegisterFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password, confirmPassword);
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/logo.svg" 
            alt="Easy Flow Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">הרשמה</CardTitle>
        <CardDescription className="text-center text-blue-100 mt-2">
          צור חשבון חדש
        </CardDescription>
      </div>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">אימייל</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">סיסמה</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
            />
            <p className="text-xs text-gray-500">מינימום 6 תווים</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold">אימות סיסמה</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
            disabled={isLoading}
          >
            {isLoading ? 'נרשם...' : 'הרשמה'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">כבר יש לך חשבון? </span>
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
            התחבר
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

