
import React, { useState } from 'react';
import { Language, User } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

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
      registerBtn: '立即注册',
      placeholderAccount: '请输入手机号或邮箱',
      placeholderPassword: '请设置登录密码',
      placeholderConfirm: '请再次输入密码',
      placeholderCode: '验证码',
      sendCode: '发送验证码',
      codeSent: '验证码已发送',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      alreadyIn: '已登录为',
      errNotFound: '账号未注册，请先注册',
      errExists: '该账号已注册，请直接登录',
      errEmpty: '请填写完整信息',
      errPasswordMismatch: '两次密码输入不一致',
      errCode: '验证码无效',
      registerSuccess: '注册成功，请登录',
      loginFail: '账号校验失败，请重试'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      loginTab: 'Login',
      registerTab: 'Sign Up',
      loginBtn: 'Start Creating',
      registerBtn: 'Sign Up',
      placeholderAccount: 'Phone or Email',
      placeholderPassword: 'Set Password',
      placeholderConfirm: 'Confirm Password',
      placeholderCode: 'Code',
      sendCode: 'Get Code',
      codeSent: 'Sent',
      agree: 'By continuing, you agree to our Terms',
      alreadyIn: 'Logged in as',
      errNotFound: 'Account not found, please register',
      errExists: 'Account exists, please login',
      errEmpty: 'Fill all fields',
      errPasswordMismatch: 'Passwords do not match',
      errCode: 'Invalid code',
      registerSuccess: 'Success, please login',
      loginFail: 'Login failed'
    }
  }[lang];

  // 核心样式优化：文字颜色强制深灰 (#333333)，背景使用微妙的半透明色
  const inputStyle = "w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none font-bold text-sm text-[#333333] transition-all placeholder:text-gray-400 shadow-inner";

  const handleSendCode = async () => {
    if (!inputValue) {
      setErrorMsg(t.errEmpty);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", inputValue));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setErrorMsg(t.errNotFound);
        setIsLoading(false);
        return;
      }

      setTimeout(() => {
        setIsCodeSent(true);
        setIsLoading(false);
        setErrorMsg('');
        alert(lang === 'zh' ? "【造梦系统】验证码：1234" : "Demo Code: 1234");
      }, 600);
    } catch (e) {
      setErrorMsg(t.loginFail);
      setIsLoading(false);
    }
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
      try {
        const q = query(collection(db, "users"), where("username", "==", inputValue));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setErrorMsg(t.errExists);
          setIsLoading(false);
          return;
        }
        
        await addDoc(collection(db, "users"), {
          username: inputValue,
          coins: 80,
          createdAt: Date.now()
        });
        
        setIsLoading(false);
        alert(t.registerSuccess);
        setView('login');
        setIsCodeSent(false);
      } catch (e) {
        setErrorMsg("注册失败");
        setIsLoading(false);
      }
    } else {
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
        <div className="max-w-[440px] w-full bg-white/95 backdrop-blur-xl p-12 rounded-[4rem] shadow-2xl flex flex-col items-center space-y-8 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-xl">
             <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">{t.alreadyIn}</h2>
            <p className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full font-black text-xs">{currentUser.username}</p>
          </div>
          <button onClick={() => onLogin(currentUser.username, 'email', false)} className="btn-candy w-full py-5 text-white rounded-3xl font-bold shadow-xl">
             {t.loginBtn}
          </button>
          <button onClick={onLogout} className="text-gray-300 font-bold text-xs hover:text-red-500 transition-colors">退出账号</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-orange-50 to-transparent"></div>
      
      <div className="max-w-[440px] w-full bg-white/98 backdrop-blur-2xl p-10 md:p-12 rounded-[4rem] shadow-2xl border border-white flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
           <i className="fas fa-star text-white text-3xl"></i>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-header text-gray-900 leading-tight">{t.welcome}</h1>
          <p className="text-gray-400 text-xs font-medium">{t.sub}</p>
        </div>

        <div className="w-full">
          <div className="flex gap-10 border-b border-gray-100 mb-8 justify-center">
            <button onClick={() => { setView('login'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'login' ? 'text-orange-500' : 'text-gray-300'}`}>
              {t.loginTab}
              {view === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
            <button onClick={() => { setView('register'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'register' ? 'text-orange-500' : 'text-gray-300'}`}>
              {t.registerTab}
              {view === 'register' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.placeholderAccount}
              className={inputStyle}
            />

            {view === 'register' ? (
              <>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.placeholderPassword}
                  className={inputStyle}
                />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.placeholderConfirm}
                  className={inputStyle}
                />
              </>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder={t.placeholderCode}
                  className={`${inputStyle} flex-1`}
                />
                <button 
                  type="button" 
                  onClick={handleSendCode}
                  disabled={isLoading || isCodeSent}
                  className={`px-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${isCodeSent ? 'bg-green-50 text-green-500 border-green-100' : 'bg-white text-orange-500 border-orange-100 hover:bg-orange-50 shadow-sm'}`}
                >
                  {isCodeSent ? t.codeSent : t.sendCode}
                </button>
              </div>
            )}

            {errorMsg && <p className="text-red-500 text-[10px] font-black uppercase py-1">{errorMsg}</p>}

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
