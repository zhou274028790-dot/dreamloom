
import React, { useState } from 'react';
import { Language, BookProject, User } from '../types';

interface Props {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  lang: Language;
  setLang: (l: Language) => void;
  bgColor: string;
  setBgColor: (c: string) => void;
  history: BookProject[];
  isDark?: boolean;
}

const MyProfile: React.FC<Props> = ({ user, setUser, lang, setLang, bgColor, setBgColor, history, isDark }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'orders' | 'settings'>('wallet');
  const [isPaying, setIsPaying] = useState(false);
  const [editingName, setEditingName] = useState(user.username);

  const handleRecharge = (amount: number, coins: number) => {
    setIsPaying(true);
    setTimeout(() => {
      setUser(prev => ({
        ...prev,
        coins: prev.coins + coins,
        isFirstRecharge: amount === 3.9 ? false : prev.isFirstRecharge
      }));
      setIsPaying(false);
      alert(lang === 'zh' ? `支付成功！${coins}颗金豆已到账。` : `Success! ${coins} Beans added.`);
    }, 1200);
  };

  const handleUpdateName = () => {
    setUser(prev => ({ ...prev, username: editingName }));
    alert(lang === 'zh' ? '用户名已更新' : 'Username updated');
  };

  const t = {
    zh: {
      wallet: '造梦钱包', orders: '我的订单', settings: '梦境设置',
      balance: '金豆余额', rechargeTitle: '获取更多金豆',
      first: '新造梦师专享', firstPrice: '¥ 3.9', firstCoins: '50 🌿',
      standard: '基础造梦包', standardPrice: '¥ 10', standardCoins: '100 🌿',
      unlimited: '奇迹造梦包', unlimitedPrice: '¥ 39.9', unlimitedCoins: '500 🌿',
      paying: '正在通过加密通道处理支付...',
      editName: '修改用户名',
      save: '保存',
      switchLang: '语言切换',
      switchBg: '页面背景色',
      empty: '暂无内容'
    },
    en: {
      wallet: 'Wallet', orders: 'Orders', settings: 'Settings',
      balance: 'Beans', rechargeTitle: 'Buy Beans',
      first: 'New Dreamer', firstPrice: '¥ 3.9', firstCoins: '50 🌿',
      standard: 'Basic', standardPrice: '¥ 10', standardCoins: '100 🌿',
      unlimited: 'Miracle', unlimitedPrice: '¥ 39.9', unlimitedCoins: '500 🌿',
      paying: 'Processing payment...',
      editName: 'Edit Username',
      save: 'Save',
      switchLang: 'Language',
      switchBg: 'Background Color',
      empty: 'No Content'
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

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 animate-in relative">
      {isPaying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] shadow-2xl text-center space-y-4 animate-in">
             <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
             <p className="font-bold text-[var(--text-main)] text-sm">{t.paying}</p>
          </div>
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

      <div className="flex-1 card-dynamic rounded-[3rem] p-8 min-h-[500px]">
        {activeTab === 'wallet' && (
          <div className="space-y-10 animate-in">
             <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-100/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                  <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest opacity-80">{t.balance}</p>
                  <div className="text-5xl font-bold font-header flex items-center gap-4">
                    <i className="fas fa-seedling text-yellow-300"></i>
                    <span>{user.coins}</span>
                  </div>
                </div>
                <button className="px-6 py-2 bg-white/20 rounded-xl text-xs font-bold border border-white/30">历史记录</button>
             </div>

             <div className="space-y-6">
                <h4 className="font-header font-bold text-xl">{t.rechargeTitle}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {user.isFirstRecharge && (
                    <RechargeCard title={t.first} price={t.firstPrice} coins={t.firstCoins} onClick={() => handleRecharge(3.9, 50)} highlight={true} isDark={isDark} />
                  )}
                  <RechargeCard title={t.standard} price={t.standardPrice} coins={t.standardCoins} onClick={() => handleRecharge(10, 100)} highlight={false} isDark={isDark} />
                  <RechargeCard title={t.unlimited} price={t.unlimitedPrice} coins={t.unlimitedCoins} onClick={() => handleRecharge(39.9, 500)} highlight={false} isDark={isDark} />
                </div>
             </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
            <i className="fas fa-box-open text-5xl"></i>
            <p className="text-sm font-bold">{t.empty}</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in">
             {/* 用户名编辑 */}
             <div className="space-y-4">
                <h4 className="text-sm font-black opacity-30 uppercase tracking-widest">{t.editName}</h4>
                <div className="flex gap-3">
                   <input 
                    type="text" 
                    value={editingName} 
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-6 py-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl focus:ring-4 focus:ring-[#EA6F23]/10 outline-none font-bold text-[var(--text-main)] shadow-inner transition-all placeholder:text-[var(--text-sub)]"
                   />
                   <button 
                    onClick={handleUpdateName}
                    className="px-8 py-4 bg-[#EA6F23] text-white rounded-2xl font-bold shadow-lg hover:bg-[#EA6F23]/90 active:scale-95 transition-all"
                   >
                     {t.save}
                   </button>
                </div>
             </div>

             {/* 语言切换 */}
             <div className="space-y-4">
                <h4 className="text-sm font-black opacity-30 uppercase tracking-widest">{t.switchLang}</h4>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setLang('zh')}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border-2 ${lang === 'zh' ? 'border-[#EA6F23] bg-[#EA6F23]/5 text-[#EA6F23]' : 'border-[var(--text-main)]/5 bg-[var(--text-main)]/5 text-[var(--text-sub)]'}`}
                   >
                     中文
                   </button>
                   <button 
                    onClick={() => setLang('en')}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border-2 ${lang === 'en' ? 'border-[#EA6F23] bg-[#EA6F23]/5 text-[#EA6F23]' : 'border-[var(--text-main)]/5 bg-[var(--text-main)]/5 text-[var(--text-sub)]'}`}
                   >
                     English
                   </button>
                </div>
             </div>

             {/* 背景色修改 */}
             <div className="space-y-4">
                <h4 className="text-sm font-black opacity-30 uppercase tracking-widest">{t.switchBg}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                   {bgColors.map(color => (
                     <button 
                      key={color.value}
                      onClick={() => setBgColor(color.value)}
                      className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${bgColor === color.value ? 'border-[#EA6F23] bg-[#EA6F23]/5' : 'border-[var(--text-main)]/5 bg-[var(--text-main)]/5'}`}
                     >
                       <div className="w-8 h-8 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: color.value }}></div>
                       <span className={`text-[10px] font-black ${bgColor === color.value ? 'text-[#EA6F23]' : 'text-[var(--text-sub)]'}`}>{color.name}</span>
                       {bgColor === color.value && <i className="fas fa-check-circle absolute top-2 right-2 text-[#EA6F23] text-[10px]"></i>}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SideBtn: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-transparent text-[var(--text-sub)] hover:bg-[var(--text-main)]/5'}`}>
    <i className={`fas ${icon}`}></i>
    <span className="text-xs">{label}</span>
  </button>
);

const RechargeCard: React.FC<{ title: string, price: string, coins: string, onClick: () => void, highlight: boolean, isDark?: boolean }> = ({ title, price, coins, onClick, highlight, isDark }) => (
  <button onClick={onClick} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] ${highlight ? 'border-[#EA6F23] bg-[#EA6F23]/5' : 'border-transparent bg-[var(--text-main)]/5'}`}>
    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{title}</span>
    <span className="text-2xl font-bold font-header">{price}</span>
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${highlight ? 'bg-[#EA6F23] text-white' : 'bg-[#EA6F23]/10 text-[#EA6F23]'}`}>
       <i className="fas fa-seedling"></i> {coins}
    </div>
  </button>
);

export default MyProfile;
