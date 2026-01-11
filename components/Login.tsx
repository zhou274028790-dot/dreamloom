
import React, { useState } from 'react';
import { Language } from '../types';

interface Props {
  onLogin: (name: string, method: 'wechat' | 'phone' | 'guest') => void;
  lang: Language;
}

const Login: React.FC<Props> = ({ onLogin, lang }) => {
  const [method, setMethod] = useState<'wechat' | 'phone' | 'guest'>('wechat');
  const [phone, setPhone] = useState('');
  const [guestName, setGuestName] = useState('');

  const t = {
    zh: { 
      welcome: 'DreamLoom AI 绘本', 
      sub: '让每个孩子的梦想，都能被翻阅', 
      wechatBtn: '微信一键登录',
      phoneBtn: '手机验证码登录',
      guestBtn: '游客快速开启',
      placeholderPhone: '请输入手机号',
      placeholderGuest: '给你的工作室起个名',
      agree: '登录即代表同意《用户协议》与《隐私政策》',
      identity: '官方合作'
    },
    en: { 
      welcome: 'DreamLoom AI', 
      sub: 'Turn every dream into a readable book', 
      wechatBtn: 'Login with WeChat',
      phoneBtn: 'Login with Phone',
      guestBtn: 'Quick Start',
      placeholderPhone: 'Enter phone number',
      placeholderGuest: 'Enter your studio name',
      agree: 'By logging in, you agree to our Terms',
      identity: 'Official Partner'
    }
  }[lang];

  const handleLogin = () => {
    const randomNum = Math.floor(Math.random() * 900 + 100).toString();
    const defaultName = `造梦师${randomNum}`;
    const finalName = method === 'guest' ? (guestName || defaultName) : (phone ? `用户${phone.slice(-4)}` : defaultName);
    onLogin(finalName, method);
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-orange-200/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-100/30 rounded-full blur-[120px]"></div>

      <div className="max-w-[440px] w-full bg-white px-8 py-16 rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-700 relative z-10">
        
        {/* Brand Logo Section */}
        <div className="relative">
           <div className="w-28 h-28 bg-[#EA6F23] rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_30px_-5px_rgba(234,111,35,0.3)] transform transition-transform hover:scale-105">
              <svg viewBox="0 0 100 100" className="w-16 h-16">
                <path d="M50 5 L63 40 L98 40 L70 60 L80 95 L50 75 L20 95 L30 60 L2 40 L37 40 Z" fill="#1a1a1a" />
                <circle cx="35" cy="50" r="8" fill="#f97316" stroke="#1a1a1a" strokeWidth="2" />
                <circle cx="65" cy="50" r="8" fill="#f97316" stroke="#1a1a1a" strokeWidth="2" />
              </svg>
              <div className="absolute -top-1 -right-1 bg-white text-[#EA6F23] text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm border border-orange-50">PRO</div>
           </div>
        </div>

        {/* Text Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">{t.welcome}</h1>
          <p className="text-[#A0A0A0] text-sm font-medium">{t.sub}</p>
        </div>

        {/* Primary Action */}
        <div className="w-full space-y-6">
          {method === 'wechat' ? (
            <button 
              onClick={handleLogin}
              className="w-full py-5 bg-[#07C160] text-white rounded-[2rem] font-bold text-lg shadow-[0_10px_20px_-5px_rgba(7,193,96,0.3)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <i className="fab fa-weixin text-2xl"></i>
              {t.wechatBtn}
            </button>
          ) : method === 'phone' ? (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
               <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.placeholderPhone}
                  className="w-full px-8 py-5 bg-[#F8F8F8] border-none rounded-[2rem] focus:ring-2 focus:ring-[#EA6F23]/20 outline-none transition-all text-sm font-bold"
                />
                <button 
                  onClick={handleLogin}
                  disabled={!phone}
                  className="w-full py-5 bg-[#EA6F23] text-white rounded-[2rem] font-bold text-lg shadow-lg disabled:bg-gray-200 transition-all"
                >
                  确定登录
                </button>
            </div>
          ) : (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
               <input 
                  type="text" 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t.placeholderGuest}
                  className="w-full px-8 py-5 bg-[#F8F8F8] border-none rounded-[2rem] focus:ring-2 focus:ring-[#EA6F23]/20 outline-none transition-all text-sm font-bold text-center"
                />
                <button 
                  onClick={handleLogin}
                  className="w-full py-5 bg-[#1a1a1a] text-white rounded-[2rem] font-bold text-lg shadow-lg hover:bg-black transition-all"
                >
                  {t.guestBtn}
                </button>
            </div>
          )}

          {/* Method Switcher */}
          <div className="flex justify-center gap-6">
            <button onClick={() => setMethod('wechat')} className={`text-sm font-bold transition-colors ${method === 'wechat' ? 'text-[#EA6F23]' : 'text-[#D0D0D0]'}`}>微信</button>
            <button onClick={() => setMethod('phone')} className={`text-sm font-bold transition-colors ${method === 'phone' ? 'text-[#EA6F23]' : 'text-[#D0D0D0]'}`}>手机</button>
            <button onClick={() => setMethod('guest')} className={`text-sm font-bold transition-colors ${method === 'guest' ? 'text-[#EA6F23]' : 'text-[#D0D0D0]'}`}>游客</button>
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-6 pt-4">
          <p className="text-[11px] text-[#C0C0C0] font-medium leading-relaxed px-4">{t.agree}</p>
          <div className="text-[10px] text-[#E0E0E0] font-black uppercase tracking-[0.3em]">{t.identity}</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
