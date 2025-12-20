/**
 * Login Logic
 * 
 * Handles all business logic and state management for the Login page.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type LoginMethod = 'phone' | 'email';

export const useLogin = () => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { handleLogin: authHandleLogin, isLoading } = useAuth();

  const handleMethodToggle = (method: LoginMethod) => {
    setLoginMethod(method);
    // Clear inputs when switching methods
    setPhoneNumber('');
    setEmail('');
    setPassword('');
  };

  const handlePhoneChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    setPhoneNumber(numericValue);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleLogin = () => {
    if (loginMethod === 'phone') {
      // For phone login, we'll use a mock email for now
      // In a real implementation, this would be handled differently
      const mockEmail = `phone_${phoneNumber}@temp.com`;
      authHandleLogin(mockEmail, 'default123');
    } else {
      // Email login with password
      if (!email || !password) {
        return;
      }
      authHandleLogin(email, password);
    }
  };

  return {
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
  };
};



