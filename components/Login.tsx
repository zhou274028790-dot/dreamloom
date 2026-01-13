
import React, { useState } from 'react';
import { Language, User } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props {
  onLogin: (name: string, method: string, isRegistering: boolean) => void;
  onLogout: () => void;
  currentUser: User;
  lang: Language;
}

const Login: React.FC<Props> = ({ onLogin, onLogout, currentUser, lang }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [inputValue, setInputValue] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);

  const t = {
    zh: { 
      welcome: 'DreamLoom AI 绘本', 
      sub: '记录每一个天马行空的梦想', 
      loginTab: '造梦师登录',
      registerTab: '加入创作室',
      loginBtn: '进入创作工坊',
      registerBtn: '立即注册并加入',
      placeholderAccount: '请输入手机号或邮箱',
      placeholderPassword: '请设置登录密码',
      placeholderConfirm: '请再次输入密码',
      placeholderCode: '输入验证码',
      sendCode: '获取验证码',
      codeSent: '验证码已发送',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      alreadyIn: '已作为造梦师登录',
      switch: '切换账号',
      errNotFound: '账号未找到，请先注册',
      errExists: '该账号已注册，请直接登录',
      errEmpty: '请输入完整信息',
      errPasswordMismatch: '两次输入的密码不一致',
      errChecking: '正在核对梦境身份...',
      errCode: '验证码错误',
      registerSuccess: '注册成功，请登录'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      loginTab: 'Login',
      registerTab: 'Sign Up',
      loginBtn: 'Start Creating',
      registerBtn: 'Join Now',
      placeholderAccount: 'Phone or Email',
      placeholderPassword: 'Set Password',
      placeholderConfirm: 'Confirm Password',
      placeholderCode: 'Verification Code',
      sendCode: 'Get Code',
      codeSent: 'Code Sent',
      agree: 'By continuing, you agree to our Terms',
      alreadyIn: 'Logged in as',
      switch: 'Switch Account',
      errNotFound: 'Account not found, please register',
      errExists: 'Account exists, please login',
      errEmpty: 'Please fill all fields',
      errPasswordMismatch: 'Passwords do not match',
      errChecking: 'Checking identity...',
      errCode: 'Invalid code',
      registerSuccess: 'Success! Please login'
    }
  }[lang];

  const handleSendCode = async () => {
    if (!inputValue) {
      setErrorMsg(t.errEmpty);
      return;
    }
    setIsLoading(true);
    // 检查账号是否存在
    const q = query(collection(db, "users"), where("username", "==", inputValue));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      setErrorMsg(t.errNotFound);
      setIsLoading(false);
      return;
    }

    // 模拟发送验证码
    setTimeout(() => {
      setIsCodeSent(true);
      setIsLoading(false);
      setErrorMsg('');
      alert(lang === 'zh' ? "【模拟系统】验证码 1234 已发送" : "Demo Code: 1234 sent");
    }, 800);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (view === 'register') {
      if (!inputValue || !password || !confirmPassword) {
        setErrorMsg(t.errEmpty);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t.errPasswordMismatch);
        return;
      }
      setIsLoading(true);
      // 检查是否已存在
      const q = query(collection(db, "users"), where("username", "==", inputValue));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setErrorMsg(t.errExists);
        setIsLoading(false);
        return;
      }
      
      // 执行注册
      await onLogin(inputValue, 'email', true);
      setIsLoading(false);
      alert(t.registerSuccess);
      setView('login');
      setIsCodeSent(false);
      setVerificationCode('');
    } else {
      // 登录流
      if (!inputValue || !verificationCode) {
        setErrorMsg(t.errEmpty);
        return;
      }
      if (verificationCode !== '1234') {
        setErrorMsg(t.errCode);
        return;
      }
      setIsLoading(true);
      onLogin(inputValue, 'email', false);
    }
  };

  if (currentUser.isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-[440px] w-full bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[4rem] shadow-2xl border border-white flex flex-col items-center space-y-10 animate-in zoom-in-95">
          <div className="w-24 h-24 bg-[#EA6F23] rounded-[2.5rem] flex items-center justify-center text-white text-4xl shadow-xl rotate-3">
             <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold font-header text-gray-900">{t.alreadyIn}</h2>
            <div className="px-6 py-2 bg-orange-50 text-[#EA6F23] rounded-full font-black text-sm border border-orange-100">{currentUser.username}</div>
          </div>
          <button onClick={() => onLogin(currentUser.username, 'email', false)} className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl">
             {t.loginBtn}
          </button>
          <button onClick={onLogout} className="text-gray-400 font-bold text-xs hover:text-red-500 transition-colors">
             {t.switch}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-orange-100/50 to-transparent"></div>
      
      <div className="max-w-[440px] w-full bg-white/90 backdrop-blur-2xl p-10 md:p-12 rounded-[4rem] shadow-2xl border border-white flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-[#EA6F23] to-[#F28C4F] rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
           <i className="fas fa-star text-white text-3xl"></i>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-header text-gray-900">{t.welcome}</h1>
          <p className="text-gray-400 text-xs font-medium">{t.sub}</p>
        </div>

        <div className="w-full">
          <div className="flex gap-8 border-b border-gray-100 mb-8 justify-center">
            <button onClick={() => { setView('login'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'login' ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              {t.loginTab}
              {view === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
            <button onClick={() => { setView('register'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'register' ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              {t.registerTab}
              {view === 'register' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.placeholderAccount}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none font-bold text-sm transition-all"
            />

            {view === 'register' ? (
              <>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.placeholderPassword}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none font-bold text-sm transition-all"
                />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.placeholderConfirm}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none font-bold text-sm transition-all"
                />
              </>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder={t.placeholderCode}
                  className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none font-bold text-sm transition-all"
                />
                <button 
                  type="button" 
                  onClick={handleSendCode}
                  disabled={isLoading || isCodeSent}
                  className={`px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isCodeSent ? 'bg-green-50 text-green-500 border-green-100' : 'bg-white text-[#EA6F23] border-[#EA6F23]/20 hover:bg-orange-50'}`}
                >
                  {isCodeSent ? t.codeSent : t.sendCode}
                </button>
              </div>
            )}

            {errorMsg && <p className="text-red-500 text-[10px] font-black uppercase text-center">{errorMsg}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className="btn-candy w-full py-5 text-white rounded-3xl font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (view === 'register' ? t.registerBtn : t.loginBtn)}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-gray-300 font-medium px-4">{t.agree}</p>
      </div>
    </div>
  );
};

export default Login;
