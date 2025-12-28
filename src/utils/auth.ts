import { UserType } from '@/store/slices/authSlice';

export const determineUserType = (email: string): UserType => {
  const lowerEmail = email.toLowerCase();
  if (lowerEmail.includes('admin') || lowerEmail.includes('trainer') || lowerEmail.includes('gym')) {
    return 'client';
  }
  return 'endCustomer';
};

export const getUserTypeLabel = (type: UserType): string => {
  return type === 'client' ? 'לקוח עסקי' : 'לקוח קצה';
};
























