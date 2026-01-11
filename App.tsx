
import React, { useState, useEffect, useMemo } from 'react';
import { BookProject, StoryTemplate, VisualStyle, AppView, Language, User } from './types';
import IdeaSpark from './components/IdeaSpark';
import CharacterStudio from './components/CharacterStudio';
import DirectorMode from './components/DirectorMode';
import ThePress from './components/ThePress';
import BookLibrary from './components/BookLibrary';
import ReadingPlaza from './components/ReadingPlaza';
import BrandStory from './components/BrandStory';
import MyProfile from './components/MyProfile';
import Login from './components/Login';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [lang, setLang] = useState<Language>('zh');
  const [bgColor, setBgColor] = useState<string>('#F9F6F0');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReward, setShowReward] = useState(false); // To trigger the celebratory gift box

  const [user, setUser] = useState<User>({
    isLoggedIn: false,
    username: '',
    coins: 0,
    isFirstRecharge: true
  });
  
  const [project, setProject] = useState<BookProject>({
    id: Math.random().toString(36).substr(2, 9),
    title: '',
    originalIdea: '',
    template: StoryTemplate.HERO_JOURNEY,
    pages: [],
    characterDescription: '',
    visualStyle: VisualStyle.WATERCOLOR,
    currentStep: 'idea',
    createdAt: Date.now()
  });

  const [history, setHistory] = useState<BookProject[]>([]);

  const lightenColor = (hex: string, amount: number) => {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    r = Math.min(255, Math.floor(r + amount));
    g = Math.min(255, Math.floor(g + amount));
    b = Math.min(255, Math.floor(b + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const isDarkBg = useMemo(() => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }, [bgColor]);

  const safeSave = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (key === 'dreamloom_history' && Array.isArray(data)) {
        const pruned = data.slice(0, 2);
        try { localStorage.setItem(key, JSON.stringify(pruned)); } catch (err) {
            localStorage.removeItem('dreamloom_history');
        }
      }
    }
  };

  useEffect(() => {
    const cardBg = isDarkBg ? lightenColor(bgColor, 25) : '#FFFFFF';
    const textMain = isDarkBg ? '#F9F6F0' : '#2C211D';
    const textSub = isDarkBg ? 'rgba(249,246,240,0.5)' : 'rgba(44,33,29,0.5)';
    const borderColor = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(234,111,35,0.1)';
    const shadow = isDarkBg ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)';

    document.documentElement.style.setProperty('--bg-paper', bgColor);
    document.documentElement.style.setProperty('--card-bg', cardBg);
    document.documentElement.style.setProperty('--text-main', textMain);
    document.documentElement.style.setProperty('--text-sub', textSub);
    document.documentElement.style.setProperty('--border-color', borderColor);
    document.documentElement.style.setProperty('--card-shadow', shadow);
  }, [bgColor, isDarkBg]);

  useEffect(() => {
    const savedUser = localStorage.getItem('dreamloom_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      if (parsed.isLoggedIn) setCurrentView('studio');
    }
    const savedHistory = localStorage.getItem('dreamloom_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedLang = localStorage.getItem('dreamloom_lang') as Language;
    if (savedLang) setLang(savedLang);
    const savedBg = localStorage.getItem('dreamloom_bg');
    if (savedBg) setBgColor(savedBg);
  }, []);

  useEffect(() => {
    if (user.isLoggedIn) {
      safeSave('dreamloom_user', user);
    }
  }, [user]);

  // Fix: Added missing updateProject function to synchronize current project state with history
  const updateProject = (updates: Partial<BookProject>) => {
    setProject(prev => {
      const updated = { ...prev, ...updates };
      
      setHistory(prevHistory => {
        const index = prevHistory.findIndex(p => p.id === updated.id);
        let newHistory;
        if (index !== -1) {
          newHistory = [...prevHistory];
          newHistory[index] = updated;
        } else {
          newHistory = [updated, ...prevHistory];
        }
        safeSave('dreamloom_history', newHistory);
        return newHistory;
      });
      
      return updated;
    });
  };

  // Fix: Added missing deductCoins function to handle virtual currency transactions
  const deductCoins = (amount: number): boolean => {
    if (user.coins < amount) {
      alert(lang === 'zh' ? '金豆不足，请先充值' : 'Not enough beans, please recharge');
      return false;
    }
    setUser(prev => ({ ...prev, coins: prev.coins - amount }));
    return true;
  };

  const handleLogin = (username: string, method: 'wechat' | 'phone' | 'guest') => {
    const initialCoins = 80;
    setUser({ isLoggedIn: true, username, coins: initialCoins, isFirstRecharge: true });
    setCurrentView('studio');
    setShowReward(true); // Trigger the gift modal
  };

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const t = {
    zh: { studio: '创作室', plaza: '广场', brand: '品牌', library: '书架', profile: '我的', coins: '金豆' },
    en: { studio: 'Studio', plaza: 'Plaza', brand: 'Brand', library: 'Library', profile: 'Me', coins: 'Beans' }
  }[lang];

  return (
    <div className={`min-h-screen flex flex-col bg-[var(--bg-paper)] transition-all duration-500`} style={{ color: 'var(--text-main)' }}>
      {user.isLoggedIn && (
        <header className={`bg-[var(--card-bg)]/90 backdrop-blur-md border-b border-[var(--border-color)] py-3 px-4 md:px-6 sticky top-0 z-[60] shadow-sm`}>
          <div className="max-w-7xl mx-auto flex justify-between items-center relative">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('studio')}>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-[#EA6F23] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <svg viewBox="0 0 100 100" className="w-5 h-5 md:w-7 md:h-7">
                   <path d="M50 5 L63 40 L98 40 L70 60 L80 95 L50 75 L20 95 L30 60 L2 40 L37 40 Z" fill={isDarkBg ? "#F9F6F0" : "#2C211D"}  />
                   <circle cx="35" cy="50" r="8" fill="#EA6F23" stroke={isDarkBg ? "#F9F6F0" : "#2C211D"} strokeWidth="2" />
                   <circle cx="65" cy="50" r="8" fill="#EA6F23" stroke={isDarkBg ? "#F9F6F0" : "#2C211D"} strokeWidth="2" />
                 </svg>
              </div>
              <h1 className={`text-base md:text-lg font-header font-bold`} style={{ color: 'var(--text-main)' }}>DreamLoom</h1>
            </div>
            
            <nav className="hidden md:flex items-center bg-[var(--text-main)]/5 p-1 rounded-2xl gap-1">
              <NavTab active={currentView === 'studio'} onClick={() => handleNavClick('studio')} icon="fa-wand-sparkles" label={t.studio} />
              <NavTab active={currentView === 'plaza'} onClick={() => handleNavClick('plaza')} icon="fa-globe" label={t.plaza} />
              <NavTab active={currentView === 'brand'} onClick={() => handleNavClick('brand')} icon="fa-feather-pointed" label={t.brand} />
              <NavTab active={currentView === 'library'} onClick={() => handleNavClick('library')} icon="fa-book" label={t.library} />
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#EA6F23]/5 rounded-full border border-[#EA6F23]/10">
                <i className="fas fa-seedling text-[#EA6F23] text-xs"></i>
                <span className="text-sm font-bold text-[#EA6F23]">{user.coins}</span>
              </div>
              <button onClick={() => setCurrentView('profile')} className={`hidden md:flex w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${currentView === 'profile' ? 'border-[#EA6F23]' : 'border-[var(--card-bg)] shadow-sm hover:border-[#EA6F23]/30'}`}>
                <div className="w-full h-full bg-[#EA6F23]/10 flex items-center justify-center text-[#EA6F23]"><i className="fas fa-user text-sm"></i></div>
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center text-[var(--text-main)]">
                <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-[var(--card-bg)] border-b border-[var(--border-color)] shadow-2xl p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 z-50">
              <MobileMenuItem active={currentView === 'studio'} onClick={() => handleNavClick('studio')} icon="fa-wand-sparkles" label={t.studio} />
              <MobileMenuItem active={currentView === 'plaza'} onClick={() => handleNavClick('plaza')} icon="fa-globe" label={t.plaza} />
              <MobileMenuItem active={currentView === 'brand'} onClick={() => handleNavClick('brand')} icon="fa-feather-pointed" label={t.brand} />
              <MobileMenuItem active={currentView === 'library'} onClick={() => handleNavClick('library')} icon="fa-book" label={t.library} />
              <div className="h-[1px] bg-[var(--border-color)] my-1"></div>
              <MobileMenuItem active={currentView === 'profile'} onClick={() => handleNavClick('profile')} icon="fa-user" label={t.profile} />
            </div>
          )}
        </header>
      )}

      {/* Celebratory Reward Modal */}
      {showReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in"></div>
          <div className="relative bg-white rounded-[4rem] p-12 max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
             <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-[#EA6F23] rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-[#FFD700] to-[#EA6F23] w-full h-full rounded-full flex items-center justify-center text-white text-5xl shadow-xl animate-bounce">
                  <i className="fas fa-gift"></i>
                </div>
                {/* Decorative particles */}
                <div className="absolute -top-4 -right-4 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute -bottom-4 -left-4 w-4 h-4 bg-orange-400 rounded-full animate-ping delay-75"></div>
             </div>
             
             <div className="space-y-2">
                <h2 className="text-3xl font-header font-bold text-[#1A1A1A]">
                  {lang === 'zh' ? '欢迎，造梦师！' : 'Welcome, Dreamer!'}
                </h2>
                <p className="text-[#A0A0A0] font-medium text-sm leading-relaxed px-4">
                  {lang === 'zh' ? '我们为您准备了一份特殊的入驻礼包，助你开启第一场梦境。' : 'A special gift for your first adventure!'}
                </p>
             </div>

             <div className="bg-[#FDF6F0] rounded-[2rem] p-6 flex items-center justify-center gap-4 border border-orange-50">
                <span className="text-5xl font-black font-header text-[#EA6F23]">80</span>
                <div className="text-left flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 text-[#EA6F23] font-black text-sm uppercase tracking-widest">
                      <i className="fas fa-seedling text-xs"></i>
                      <span>{t.coins}</span>
                   </div>
                   <span className="text-[10px] text-[#C0C0C0] font-bold">已自动存入钱包</span>
                </div>
             </div>

             <button 
              onClick={() => setShowReward(false)}
              className="w-full py-5 btn-candy text-white rounded-[2rem] font-bold text-lg shadow-xl hover:brightness-105 active:scale-95 transition-all"
             >
               {lang === 'zh' ? '开启魔法旅程' : 'Start My Journey'}
             </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 w-full">
          {currentView === 'login' ? <Login onLogin={handleLogin} lang={lang} /> : 
           currentView === 'plaza' ? <ReadingPlaza lang={lang} onUseStyle={(style) => { setProject(p => ({ ...p, visualStyle: style, currentStep: 'idea', id: Math.random().toString(36).substr(2, 9), pages: [] })); setCurrentView('studio'); }} onUseIdea={(idea) => { setProject(p => ({ ...p, originalIdea: idea, currentStep: 'idea', id: Math.random().toString(36).substr(2, 9), pages: [] })); setCurrentView('studio'); }} /> :
           currentView === 'brand' ? <BrandStory lang={lang} isDark={isDarkBg} /> :
           currentView === 'profile' ? <MyProfile user={user} setUser={setUser} lang={lang} setLang={setLang} bgColor={bgColor} setBgColor={setBgColor} history={history} isDark={isDarkBg} /> :
           currentView === 'library' ? <BookLibrary history={history} onSelect={(b) => { setProject(b); setCurrentView('studio'); }} onDelete={(id) => {
             const newHistory = history.filter(x => x.id !== id);
             setHistory(newHistory);
             safeSave('dreamloom_history', newHistory);
           }} onNewProject={() => {
             setProject({ id: Math.random().toString(36).substr(2, 9), title: '', originalIdea: '', template: StoryTemplate.HERO_JOURNEY, pages: [], characterDescription: '', visualStyle: VisualStyle.WATERCOLOR, currentStep: 'idea', createdAt: Date.now() });
             setCurrentView('studio');
           }} /> :
           <>
             {project.currentStep === 'idea' && <IdeaSpark project={project} onNext={updateProject} lang={lang} isDark={isDarkBg} />}
             {project.currentStep === 'character' && <CharacterStudio project={project} onNext={updateProject} onBack={() => updateProject({ currentStep: 'idea' })} userCoins={user.coins} deductCoins={deductCoins} lang={lang} isDark={isDarkBg} />}
             {project.currentStep === 'director' && <DirectorMode project={project} onNext={updateProject} onBack={() => updateProject({ currentStep: 'character' })} userCoins={user.coins} deductCoins={deductCoins} lang={lang} isDark={isDarkBg} />}
             {project.currentStep === 'press' && <ThePress project={project} onBack={() => updateProject({ currentStep: 'director' })} lang={lang} isDark={isDarkBg} />}
           </>
          }
        </div>
      </main>
    </div>
  );
};

const NavTab: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs ${active ? 'bg-[#EA6F23] text-white shadow-sm' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'}`}>
    <i className={`fas ${icon}`}></i>
    <span className="inline">{label}</span>
  </button>
);

const MobileMenuItem: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-sm ${active ? 'bg-[#EA6F23]/10 text-[#EA6F23]' : 'text-[var(--text-main)] active:bg-[var(--text-main)]/5'}`}>
    <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${active ? 'bg-[#EA6F23] text-white' : 'bg-[var(--text-main)]/5'}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <span>{label}</span>
  </button>
);

export default App;
