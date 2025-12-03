import { RegisterForm } from '@/components/auth/RegisterForm';
import { useRegisterPage } from './Register';

const Register = () => {
  const { isLoading, handleRegister } = useRegisterPage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4" dir="rtl">
      <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
    </div>
  );
};

export default Register;
