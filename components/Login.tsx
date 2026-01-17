
import React, { useState } from 'react';
import { Language, User } from '../types';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface Props {
  onLogout: () => void;
  currentUser: User;
  lang: Language;
}

const Login: React.FC<Props> = ({ onLogout, currentUser, lang }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = {
    zh: { 
      welcome: 'DreamLoom AI 绘本', 
      sub: '记录每一个天马行空的梦想', 
      loginTab: '造梦师登录',
      registerTab: '加入创作室',
      loginBtn: '进入创作工坊',
      registerBtn: '立即注册',
      placeholderAccount: '请输入注册邮箱',
      placeholderPassword: '请输入登录密码',
      placeholderConfirm: '请再次输入密码',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      alreadyIn: '已登录为',
      errEmpty: '请填写完整信息',
      errPasswordMismatch: '两次密码输入不一致',
      errAuth: '邮箱或密码错误，请检查',
      errRegister: '注册失败，可能邮箱已被占用',
      registerSuccess: '注册成功！'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      loginTab: 'Login',
      registerTab: 'Sign Up',
      loginBtn: 'Start Creating',
      registerBtn: 'Sign Up',
      placeholderAccount: 'Email Address',
      placeholderPassword: 'Enter Password',
      placeholderConfirm: 'Confirm Password',
      agree: 'By continuing, you agree to our Terms',
      alreadyIn: 'Logged in as',
      errEmpty: 'Fill all fields',
      errPasswordMismatch: 'Passwords do not match',
      errAuth: 'Invalid email or password',
      errRegister: 'Sign up failed',
      registerSuccess: 'Success!'
    }
  }[lang];

  const inputStyle = "w-full px-6 py-4 bg-[var(--text-main)]/5 border border-[var(--border-color)] rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none font-bold text-sm text-[var(--text-main)] transition-all placeholder:text-[var(--text-main)]/20 shadow-inner";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (view === 'register') {
      if (!email || !password || !confirmPassword) {
        setErrorMsg(t.errEmpty);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t.errPasswordMismatch);
        return;
      }
      setIsLoading(true);
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        // 注册成功后，onAuthStateChanged 会自动处理后续逻辑
      } catch (e: any) {
        console.error(e);
        setErrorMsg(t.errRegister);
        setIsLoading(false);
      }
    } else {
      if (!email || !password) {
        setErrorMsg(t.errEmpty);
        return;
      }
      setIsLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // 登录成功后，onAuthStateChanged 会触发同步数据
      } catch (e: any) {
        console.error(e);
        setErrorMsg(t.errAuth);
        setIsLoading(false);
      }
    }
  };

  if (currentUser.isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-[440px] w-full bg-[var(--card-bg)] backdrop-blur-xl p-12 rounded-[4rem] shadow-2xl flex flex-col items-center space-y-8 animate-in zoom-in-95 border border-[var(--border-color)]">
          <div className="w-20 h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-xl">
             <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{t.alreadyIn}</h2>
            <p className="px-4 py-1.5 bg-orange-500/10 text-orange-500 rounded-full font-black text-xs">{currentUser.username}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-candy w-full py-5 text-white rounded-3xl font-bold shadow-xl">
             {t.loginBtn}
          </button>
          <button onClick={onLogout} className="text-gray-400 font-bold text-xs hover:text-red-500 transition-colors">退出账号</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-orange-500/5 to-transparent"></div>
      
      <div className="max-w-[440px] w-full bg-[var(--card-bg)] backdrop-blur-2xl p-10 md:p-12 rounded-[4rem] shadow-2xl border border-[var(--border-color)] flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
           <i className="fas fa-star text-white text-3xl"></i>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-header leading-tight" style={{ color: 'var(--text-main)' }}>{t.welcome}</h1>
          <p className="opacity-40 text-xs font-medium" style={{ color: 'var(--text-main)' }}>{t.sub}</p>
        </div>

        <div className="w-full">
          <div className="flex gap-10 border-b border-[var(--border-color)] mb-8 justify-center">
            <button onClick={() => { setView('login'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'login' ? 'text-orange-500' : 'opacity-30'}`} style={{ color: view === 'login' ? undefined : 'var(--text-main)' }}>
              {t.loginTab}
              {view === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
            <button onClick={() => { setView('register'); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${view === 'register' ? 'text-orange-500' : 'opacity-30'}`} style={{ color: view === 'register' ? undefined : 'var(--text-main)' }}>
              {t.registerTab}
              {view === 'register' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholderAccount}
              className={inputStyle}
            />

            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.placeholderPassword}
              className={inputStyle}
            />

            {view === 'register' && (
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.placeholderConfirm}
                className={inputStyle}
              />
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

        <p className="text-[10px] opacity-30 font-medium px-4" style={{ color: 'var(--text-main)' }}>{t.agree}</p>
      </div>
    </div>
  );
};

export default Login;
