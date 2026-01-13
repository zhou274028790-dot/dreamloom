
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [method, setMethod] = useState<'email' | 'guest'>('email');
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = {
    zh: { 
      welcome: 'DreamLoom AI 绘本', 
      sub: '记录每一个天马行空的梦想', 
      loginTab: '造梦师登录',
      registerTab: '加入创作室',
      primaryBtn: isRegistering ? '立即加入' : '进入创作工坊',
      placeholderEmail: '请输入邮箱/账号',
      placeholderGuest: '起一个工作室代号',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      alreadyIn: '已作为造梦师登录',
      switch: '切换账号',
      errNotFound: '账号未找到，请先注册',
      errEmpty: '请输入完整信息',
      errChecking: '正在核对梦境身份...'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      loginTab: 'Dreamer Login',
      registerTab: 'Register Studio',
      primaryBtn: isRegistering ? 'Join Now' : 'Start Creating',
      placeholderEmail: 'Email / Username',
      placeholderGuest: 'Studio nickname',
      agree: 'By continuing, you agree to our Terms',
      alreadyIn: 'Already logged in as',
      switch: 'Switch Account',
      errNotFound: 'Account not found, please register',
      errEmpty: 'Please fill all fields',
      errChecking: 'Checking dreamer identity...'
    }
  }[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!inputValue || !password) {
      setErrorMsg(t.errEmpty);
      return;
    }

    setIsLoading(true);

    try {
      if (!isRegistering) {
        // 登录逻辑：检查用户是否存在
        const q = query(collection(db, "users"), where("username", "==", inputValue));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          // 同时也检查邮箱
          const qEmail = query(collection(db, "users"), where("email", "==", inputValue));
          const snapEmail = await getDocs(qEmail);
          
          if (snapEmail.empty) {
            setErrorMsg(t.errNotFound);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // 这里的逻辑交给 App.tsx 处理真正的 Firebase Auth 和数据同步
      onLogin(inputValue, method, isRegistering);
    } catch (err) {
      setErrorMsg("服务器连接失败，请检查网络");
    } finally {
      setIsLoading(false);
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
          <div className="w-full space-y-4">
             <button onClick={() => onLogin(currentUser.username, 'guest', false)} className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-all">
               {t.primaryBtn}
             </button>
             <button onClick={onLogout} className="w-full py-3 text-gray-400 font-bold text-xs hover:text-gray-600">
               <i className="fas fa-sign-out-alt mr-1"></i> {t.switch}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-orange-100/50 to-transparent"></div>
      
      <div className="max-w-[440px] w-full bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="w-24 h-24 bg-gradient-to-br from-[#EA6F23] to-[#F28C4F] rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3">
           <i className="fas fa-star text-white text-4xl"></i>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-header tracking-tight text-gray-900">{t.welcome}</h1>
          <p className="text-gray-400 text-sm font-medium">{t.sub}</p>
        </div>

        <div className="w-full space-y-6">
          <div className="flex gap-8 border-b border-gray-100 pb-2 mb-4 justify-center">
            <button onClick={() => { setIsRegistering(false); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${!isRegistering ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              {t.loginTab}
              {!isRegistering && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
            <button onClick={() => { setIsRegistering(true); setErrorMsg(''); }} className={`text-sm font-bold pb-2 transition-all relative ${isRegistering ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              {t.registerTab}
              {isRegistering && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
          </div>

          <form onSubmit={handleAuth} className="w-full space-y-5">
            <div className="space-y-4">
               <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 flex justify-center">
                    <i className="fas fa-user text-gray-300"></i>
                  </div>
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t.placeholderEmail}
                    className="w-full pl-14 pr-6 py-4.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
                  />
               </div>
               <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 flex justify-center">
                    <i className="fas fa-lock text-gray-300"></i>
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-14 pr-6 py-4.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
                  />
               </div>
            </div>

            {errorMsg && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> {t.errChecking}</> : t.primaryBtn}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-gray-300 font-medium px-4 leading-relaxed">{t.agree}</p>
      </div>
    </div>
  );
};

export default Login;
