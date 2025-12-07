import LoginView from './LoginView';
import { useLoginLogic } from './LoginLogic';

const Login = () => {
  const {
    loginMethod,
    phoneNumber,
    email,
    handleMethodToggle,
    handlePhoneChange,
    handleEmailChange,
    handleLogin,
  } = useLoginLogic();

  return (
    <LoginView
      loginMethod={loginMethod}
      phoneNumber={phoneNumber}
      email={email}
      onMethodToggle={handleMethodToggle}
      onPhoneChange={handlePhoneChange}
      onEmailChange={handleEmailChange}
      onLogin={handleLogin}
    />
  );
};

export default Login;
