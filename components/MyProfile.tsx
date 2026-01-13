
import React, { useState } from 'react';
import { Language, BookProject, User } from '../types';
import { redeemCodeFromCloud, syncUserProfile } from '../services/dataService';
import { auth } from '../services/firebase';

interface Props {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  handleLogout: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  bgColor: string;
  setBgColor: (c: string) => void;
  history: BookProject[];
  isDark?: boolean;
}

const MyProfile: React.FC<Props> = ({ user, setUser, handleLogout, lang, setLang, bgColor, setBgColor, history, isDark }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'orders' | 'settings'>('wallet');
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'verifying' | 'success'>('none');
  const [lastRecharge, setLastRecharge] = useState(0);
  const [editingName, setEditingName] = useState(user.username);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRedeem = async () => {
    if (!redeemCodeInput.trim()) return;
    setErrorMsg('');
    setPaymentStatus('verifying');
    
    const result = await redeemCodeFromCloud(auth.currentUser?.uid || '', redeemCodeInput);
    
    if (result.success) {
      setUser(prev => ({ ...prev, coins: prev.coins + (result.value || 0) }));
      setLastRecharge(result.value || 0);
      setPaymentStatus('success');
      setRedeemCodeInput('');
    } else {
      setPaymentStatus('none');
      setErrorMsg(result.message);
    }
  };

  const handleUpdateName = () => {
    setUser(prev => ({ ...prev, username: editingName }));
    syncUserProfile(auth.currentUser?.uid || '', { username: editingName });
    alert(lang === 'zh' ? '用户名已更新' : 'Username updated');
  };

  const t = {
    zh: {
      wallet: '造梦钱包', orders: '我的订单', settings: '梦境设置',
      balance: '金豆余额', rechargeTitle: '获取更多金豆',
      redeemPlaceholder: '请输入激活码 (如: DREAM-888)',
      redeemBtn: '立即兑换',
      goShop: '还没有码？前往【小红书店铺】购买激活卡片',
      verifying: '正在校验兑换码，请稍候...',
      successTitle: '🎉 兑换成功！',
      successSub: '金豆已存入你的梦境账户。',
      continue: '继续造梦',
      editName: '修改用户名',
      save: '保存',
      switchLang: '语言切换',
      switchBg: '页面背景色',
      empty: '暂无订单记录',
      logout: '退出当前账号',
      logoutConfirm: '确定要退出当前账号吗？您的作品将保存在云端。'
    },
    en: {
      wallet: 'Wallet', orders: 'Orders', settings: 'Settings',
      balance: 'Beans', rechargeTitle: 'Get More Beans',
      redeemPlaceholder: 'Enter activation code',
      redeemBtn: 'Redeem Now',
      goShop: 'No code? Visit our store to buy',
      verifying: 'Verifying code...',
      successTitle: '🎉 Success!',
      successSub: 'Beans added to your account.',
      continue: 'Continue Dreaming',
      editName: 'Edit Username',
      save: 'Save',
      switchLang: 'Language',
      switchBg: 'Background Color',
      empty: 'No orders found',
      logout: 'Logout Account',
      logoutConfirm: 'Log out? Your work is safely stored in the cloud.'
    }
  }[lang];

  const bgColors = [
    { name: lang === 'zh' ? '原纸' : 'Paper', value: '#F9F6F0' },
    { name: lang === 'zh' ? '极简' : 'White', value: '#FFFFFF' },
    { name: lang === 'zh' ? '抹茶' : 'Matcha', value: '#F0F9F4' },
    { name: lang === 'zh' ? '梦幻' : 'Dreamy', value: '#F4F0F9' },
    { name: lang === 'zh' ? '暖心' : 'Warm', value: '#FFF8F0' },
    { name: lang === 'zh' ? '巧克力' : 'Cocoa', value: '#2C211D' },
    { name: lang === 'zh' ? '森林绿' : 'Forest', value: '#1B3022' },
    { name: lang === 'zh' ? '深海蓝' : 'Ocean', value: '#0B2447' },
    { name: lang === 'zh' ? '午夜紫' : 'Midnight', value: '#1A1A2E' },
    { name: lang === 'zh' ? '岩石灰' : 'Slate', value: '#2D3436' },
  ];

  const confirmLogout = () => {
    if (confirm(t.logoutConfirm)) {
      handleLogout();
    }
  };

  // 统一输入框样式：深色模式下自动变暗
  const inputClassName = `w-full px-8 py-5 rounded-[2rem] border border-[var(--border-color)] focus:ring-4 focus:ring-orange-500/10 outline-none font-bold shadow-inner transition-all bg-[var(--text-main)]/[0.05] text-[var(--text-main)]`;

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 animate-in relative">
      
      {/* 支付状态蒙层 */}
      {paymentStatus !== 'none' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 text-center animate-in fade-in">
          {paymentStatus === 'verifying' ? (
            <div className="space-y-6">
               <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-bold text-white text-xl animate-pulse">{t.verifying}</p>
            </div>
          ) : (
            <div className="bg-[var(--card-bg)] p-12 rounded-[4rem] shadow-2xl space-y-8 animate-in zoom-in-95 max-w-sm w-full border border-[var(--border-color)]">
               <div className="relative">
                  <div className="text-7xl mb-4 text-center">🌸 🎊 🌿</div>
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-4xl mx-auto shadow-lg shadow-green-100 animate-bounce">
                    <i className="fas fa-check"></i>
                  </div>
               </div>
               <div className="space-y-2 text-center">
                 <h3 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{t.successTitle}</h3>
                 <p className="text-green-600 font-bold">+{lastRecharge} 🌿</p>
                 <p className="opacity-40 text-xs px-6 leading-relaxed" style={{ color: 'var(--text-main)' }}>{t.successSub}</p>
               </div>
               <button 
                onClick={() => setPaymentStatus('none')}
                className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold shadow-xl active:scale-95 transition-all"
               >
                 {t.continue}
               </button>
            </div>
          )}
        </div>
      )}

      <div className="md:w-64 space-y-4">
        <div className="card-dynamic rounded-[2.5rem] p-8 text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
             <div className="absolute inset-0 bg-orange-500 rounded-full blur-lg opacity-20"></div>
             <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 rounded-full flex items-center justify-center text-white text-3xl shadow-inner">
                <i className="fas fa-wand-magic-sparkles"></i>
             </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg font-header">{user.username}</h3>
            <span className="inline-block px-3 py-0.5 bg-[#EA6F23]/10 text-[#EA6F23] rounded-full text-[9px] font-black uppercase tracking-widest">造梦专家</span>
          </div>
        </div>
        <nav className="space-y-2">
          <SideBtn active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon="fa-wallet" label={t.wallet} />
          <SideBtn active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon="fa-shopping-bag" label={t.orders} />
          <SideBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon="fa-cog" label={t.settings} />
        </nav>
      </div>

      <div className="flex-1 card-dynamic rounded-[3rem] p-8 min-h-[500px] flex flex-col bg-[var(--card-bg)] border border-[var(--border-color)] shadow-[var(--card-shadow)]">
        <div className="flex-1">
          {activeTab === 'wallet' && (
            <div className="space-y-10 animate-in h-full">
               <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest opacity-80">{t.balance}</p>
                    <div className="text-5xl font-bold font-header flex items-center gap-4">
                      <i className="fas fa-seedling text-yellow-300"></i>
                      <span>{user.coins}</span>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-white/20 rounded-xl text-xs font-bold border border-white/30 hover:bg-white/30 transition-all">历史记录</button>
               </div>

               <div className="space-y-8 py-4">
                  <div className="space-y-2 text-center sm:text-left">
                    <h4 className="font-header font-bold text-xl" style={{ color: 'var(--text-main)' }}>{t.rechargeTitle}</h4>
                    <p className="text-xs opacity-40 font-medium" style={{ color: 'var(--text-main)' }}>使用您在店铺购买的 12 位激活码进行兑换。</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                       <input 
                        type="text" 
                        value={redeemCodeInput}
                        onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                        placeholder={t.redeemPlaceholder}
                        className={inputClassName}
                        style={{ textAlign: 'center', letterSpacing: '0.1em' }}
                       />
                       {errorMsg && <p className="text-red-500 text-xs font-bold text-center animate-in shake">{errorMsg}</p>}
                    </div>

                    <button 
                      onClick={handleRedeem}
                      disabled={!redeemCodeInput.trim()}
                      className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
                    >
                      {t.redeemBtn}
                    </button>

                    <div className="text-center">
                       <button 
                        onClick={() => window.open('https://www.xiaohongshu.com', '_blank')}
                        className="text-xs font-bold text-orange-500/60 hover:text-orange-600 transition-all border-b border-orange-200"
                       >
                         {t.goShop} <i className="fas fa-external-link-alt ml-1"></i>
                       </button>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
              <i className="fas fa-box-open text-5xl" style={{ color: 'var(--text-main)' }}></i>
              <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{t.empty}</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-10 animate-in h-full flex flex-col">
               {/* 用户名编辑 */}
               <div className="space-y-4">
                  <h4 className="text-sm font-black opacity-30 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>{t.editName}</h4>
                  <div className="flex gap-3">
                     <input 
                      type="text" 
                      value={editingName} 
                      onChange={(e) => setEditingName(e.target.value)}
                      className={inputClassName}
                      style={{ padding: '1rem 1.5rem', borderRadius: '1rem' }}
                     />
                     <button 
                      onClick={handleUpdateName}
                      className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                     >
                       {t.save}
                     </button>
                  </div>
               </div>

               {/* 背景色 */}
               <div className="space-y-4">
                  <h4 className="text-sm font-black opacity-30 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>{t.switchBg}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                     {bgColors.map(color => (
                       <button 
                        key={color.value}
                        onClick={() => setBgColor(color.value)}
                        className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${bgColor === color.value ? 'border-orange-500 bg-orange-50/10' : 'border-[var(--border-color)] bg-[var(--text-main)]/[0.05]'}`}
                       >
                         <div className="w-8 h-8 rounded-full border border-black/5" style={{ backgroundColor: color.value }}></div>
                         <span className={`text-[10px] font-black ${bgColor === color.value ? 'text-orange-600' : 'opacity-40'}`} style={{ color: bgColor === color.value ? undefined : 'var(--text-main)' }}>{color.name}</span>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="pt-12 mt-auto text-center">
                  <button 
                    onClick={confirmLogout}
                    className="py-4 px-8 text-gray-400 font-bold text-xs hover:text-red-400 hover:bg-red-50/10 rounded-2xl transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    {t.logout}
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SideBtn: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-orange-500 text-white shadow-lg' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-[var(--text-main)]/5'}`} style={{ color: active ? undefined : 'var(--text-main)' }}>
    <i className={`fas ${icon}`}></i>
    <span className="text-xs">{label}</span>
  </button>
);

export default MyProfile;
