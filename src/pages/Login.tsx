import LoginView from './LoginView';
import { useLoginLogic } from './LoginLogic';

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
  } = useLoginLogic();

  return (
    <LoginView
      loginMethod={loginMethod}
      phoneNumber={phoneNumber}
      email={email}
      password={password}
      isLoading={isLoading}
      onMethodToggle={handleMethodToggle}
      onPhoneChange={handlePhoneChange}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onLogin={handleLogin}
    />
  );
};

export default Login;
