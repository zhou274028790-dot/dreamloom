
import React, { useState } from 'react';
import { Language, User } from '../types';

interface Props {
  onLogin: (name: string, method: 'email' | 'phone' | 'wechat' | 'guest') => void;
  onLogout: () => void;
  currentUser: User;
  lang: Language;
}

const Login: React.FC<Props> = ({ onLogin, onLogout, currentUser, lang }) => {
  const [method, setMethod] = useState<'email' | 'phone' | 'wechat' | 'guest'>('email');
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');

  const t = {
    zh: { 
      welcome: 'DreamLoom AI 绘本', 
      sub: '记录每一个天马行空的梦想', 
      primaryBtn: '进入创作工坊',
      placeholderEmail: '请输入邮箱地址',
      placeholderPhone: '请输入手机号',
      placeholderGuest: '起一个工作室代号',
      wechat: '微信登录',
      guest: '游客体验',
      other: '其他方式登录',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      alreadyIn: '已作为造梦师登录',
      switch: '切换账号'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      primaryBtn: 'Start Creating',
      placeholderEmail: 'Enter your email',
      placeholderPhone: 'Enter phone number',
      placeholderGuest: 'Studio nickname',
      wechat: 'WeChat',
      guest: 'Guest Mode',
      other: 'Other Methods',
      agree: 'By continuing, you agree to our Terms',
      alreadyIn: 'Already logged in as',
      switch: 'Switch Account'
    }
  }[lang];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (method !== 'guest' && !inputValue) return;
    const finalName = method === 'guest' ? (inputValue || `造梦师${Math.floor(Math.random()*900+100)}`) : inputValue;
    onLogin(finalName, method);
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
             <button onClick={() => onLogin(currentUser.username, 'guest')} className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-all">
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
        <div className="w-24 h-24 bg-gradient-to-br from-[#EA6F23] to-[#F28C4F] rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3 transform transition-transform hover:rotate-0">
           <i className="fas fa-star text-white text-4xl"></i>
           <div className="absolute -top-2 -right-2 bg-white text-[#EA6F23] text-[9px] font-black px-2 py-1 rounded-full border shadow-sm">PRO</div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-header tracking-tight text-gray-900">{t.welcome}</h1>
          <p className="text-gray-400 text-sm font-medium">{t.sub}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="flex gap-6 border-b border-gray-100 pb-2 mb-4 justify-center">
            <button type="button" onClick={() => setMethod('email')} className={`text-sm font-bold pb-2 transition-all relative ${method === 'email' ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              邮箱登录
              {method === 'email' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
            <button type="button" onClick={() => setMethod('phone')} className={`text-sm font-bold pb-2 transition-all relative ${method === 'phone' ? 'text-[#EA6F23]' : 'text-gray-300'}`}>
              手机登录
              {method === 'phone' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA6F23] rounded-full"></div>}
            </button>
          </div>

          <div className="space-y-4">
             <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 flex justify-center">
                  <i className={`fas ${method === 'email' ? 'fa-envelope' : 'fa-mobile-alt'} text-gray-300`}></i>
                </div>
                <input 
                  type={method === 'email' ? 'email' : 'tel'} 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={method === 'email' ? t.placeholderEmail : t.placeholderPhone}
                  className="w-full pl-14 pr-6 py-4.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
                  required={method !== 'guest'}
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
                  placeholder="请输入登录密码"
                  className="w-full pl-14 pr-6 py-4.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
                  required={method !== 'guest'}
                />
             </div>
          </div>

          <button 
            type="submit"
            className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl hover:-translate-y-1 active:scale-95 transition-all"
          >
            {t.primaryBtn}
          </button>
        </form>

        <div className="w-full space-y-6 pt-4">
           <div className="flex items-center gap-4 text-gray-200">
              <div className="flex-1 h-[0.5px] bg-current"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">{t.other}</span>
              <div className="flex-1 h-[0.5px] bg-current"></div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => onLogin('微信用户', 'wechat')} className="flex items-center justify-center gap-3 py-4 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-100 transition-all shadow-sm">
                <i className="fab fa-weixin text-lg"></i> {t.wechat}
              </button>
              <button onClick={() => setMethod('guest')} className="flex items-center justify-center gap-3 py-4 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold text-xs hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm">
                <i className="fas fa-user-secret text-lg"></i> {t.guest}
              </button>
           </div>
        </div>

        <p className="text-[10px] text-gray-300 font-medium px-4 leading-relaxed">{t.agree}</p>
      </div>
    </div>
  );
};

export default Login;
