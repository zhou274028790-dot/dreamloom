
import React, { useState } from 'react';
import { Language } from '../types';

interface Props {
  onLogin: (name: string, method: 'email' | 'phone' | 'wechat' | 'guest') => void;
  lang: Language;
}

const Login: React.FC<Props> = ({ onLogin, lang }) => {
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
      wechat: '微信一键登录',
      guest: '游客快速试用',
      agree: '登录即代表同意《用户协议》与《隐私政策》'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Visualize your wildest dreams', 
      primaryBtn: 'Start Creating',
      placeholderEmail: 'Enter your email',
      placeholderPhone: 'Enter phone number',
      placeholderGuest: 'Studio nickname',
      wechat: 'WeChat Login',
      guest: 'Guest Mode',
      agree: 'By continuing, you agree to our Terms'
    }
  }[lang];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (method !== 'guest' && !inputValue) return;
    const finalName = method === 'guest' ? (inputValue || `造梦师${Math.floor(Math.random()*900+100)}`) : inputValue;
    onLogin(finalName, method);
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-orange-50 to-transparent"></div>
      
      <div className="max-w-[420px] w-full bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-white flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="w-24 h-24 bg-[#EA6F23] rounded-[2.5rem] flex items-center justify-center shadow-xl rotate-3 transform transition-transform hover:rotate-0">
           <i className="fas fa-star text-white text-4xl"></i>
           <div className="absolute -top-2 -right-2 bg-white text-[#EA6F23] text-[9px] font-black px-2 py-1 rounded-full border shadow-sm">PRO</div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-header tracking-tight">{t.welcome}</h1>
          <p className="text-gray-400 text-sm font-medium">{t.sub}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="flex gap-4 border-b border-gray-100 pb-2">
            <button type="button" onClick={() => setMethod('email')} className={`text-sm font-bold pb-2 transition-all ${method === 'email' ? 'text-[#EA6F23] border-b-2 border-[#EA6F23]' : 'text-gray-300'}`}>邮箱</button>
            <button type="button" onClick={() => setMethod('phone')} className={`text-sm font-bold pb-2 transition-all ${method === 'phone' ? 'text-[#EA6F23] border-b-2 border-[#EA6F23]' : 'text-gray-300'}`}>手机</button>
          </div>

          <div className="space-y-3">
             <div className="relative">
                <i className={`fas ${method === 'email' ? 'fa-envelope' : 'fa-mobile-alt'} absolute left-5 top-1/2 -translate-y-1/2 text-gray-300`}></i>
                <input 
                  type={method === 'email' ? 'email' : 'tel'} 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={method === 'email' ? t.placeholderEmail : t.placeholderPhone}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
                  required={method !== 'guest'}
                />
             </div>
             <div className="relative">
                <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-[#EA6F23]/20 focus:ring-4 focus:ring-[#EA6F23]/5 outline-none transition-all font-bold text-sm"
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

        <div className="w-full space-y-6">
           <div className="flex items-center gap-4 text-gray-200">
              <div className="flex-1 h-[1px] bg-current"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">或其他方式</span>
              <div className="flex-1 h-[1px] bg-current"></div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => onLogin('微信用户', 'wechat')} className="flex items-center justify-center gap-2 py-4 bg-green-50 text-green-600 rounded-2xl font-bold text-xs hover:bg-green-100 transition-all">
                <i className="fab fa-weixin text-lg"></i> {t.wechat}
              </button>
              <button onClick={() => setMethod('guest')} className="flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold text-xs hover:bg-gray-100 transition-all">
                <i className="fas fa-user-secret text-lg"></i> {t.guest}
              </button>
           </div>
        </div>

        <p className="text-[10px] text-gray-300 font-medium px-4">{t.agree}</p>
      </div>
    </div>
  );
};

export default Login;
