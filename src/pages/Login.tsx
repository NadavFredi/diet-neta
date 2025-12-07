import { LoginForm } from '@/components/auth/LoginForm';
import { useLoginPage } from './Login';

const Login = () => {
  const { isLoading, handleLogin } = useLoginPage();

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 relative overflow-hidden min-h-[calc(100vh-200px)]" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Login;
