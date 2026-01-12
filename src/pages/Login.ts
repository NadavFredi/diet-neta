/**
 * Login Logic
 * 
 * Handles all business logic and state management for the Login page.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { handleLogin: authHandleLogin, isLoading } = useAuth();

  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleLogin = () => {
    // Email login with password
    if (!email || !password) {
      return;
    }
    authHandleLogin(email, password);
  };

  return {
    email,
    password,
    isLoading,
    handleEmailChange,
    handlePasswordChange,
    handleLogin,
  };
};






