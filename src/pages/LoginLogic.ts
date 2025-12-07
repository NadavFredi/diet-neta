import { useState } from 'react';

export type LoginMethod = 'phone' | 'email';

export const useLoginLogic = () => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const handleMethodToggle = (method: LoginMethod) => {
    setLoginMethod(method);
    // Clear inputs when switching methods
    setPhoneNumber('');
    setEmail('');
  };

  const handlePhoneChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    setPhoneNumber(numericValue);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  const handleLogin = () => {
    if (loginMethod === 'phone') {
      console.log('Login attempt with phone:', phoneNumber);
      // Mock login - in real implementation, this would call an API
    } else {
      console.log('Login attempt with email:', email);
      // Mock login - in real implementation, this would call an API
    }
  };

  return {
    loginMethod,
    phoneNumber,
    email,
    handleMethodToggle,
    handlePhoneChange,
    handleEmailChange,
    handleLogin,
  };
};

