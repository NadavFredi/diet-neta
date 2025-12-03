import { LoginForm } from '@/components/auth/LoginForm';
import { useLoginPage } from './Login';

const Login = () => {
  const { isLoading, handleLogin } = useLoginPage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4" dir="rtl">
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
    </div>
  );
};

export default Login;
