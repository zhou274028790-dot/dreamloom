
import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "./services/firebase";
import { BookProject, StoryTemplate, VisualStyle, AppView, Language, User } from './types';
import { getUserProfile, syncUserProfile, saveProjectToCloud, loadUserProjects, deleteProjectFromCloud } from './services/dataService';

import IdeaSpark from './components/IdeaSpark';
import CharacterStudio from './components/CharacterStudio';
import DirectorMode from './components/DirectorMode';
import ThePress from './components/ThePress';
import BookLibrary from './components/BookLibrary';
import ReadingPlaza from './components/ReadingPlaza';
import BrandStory from './components/BrandStory';
import MyProfile from './components/MyProfile';
import Login from './components/Login';

// 生成随机提取码 A123-B4 格式
const generateExtractionCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆的 I, O
  const digits = '123456789';
  const rL = (len: number) => Array.from({length: len}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const rD = (len: number) => Array.from({length: len}, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `${rL(1)}${rD(3)}-${rL(1)}${rD(1)}`;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [lang, setLang] = useState<Language>('zh');
  const [bgColor, setBgColor] = useState<string>('#F9F6F0');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

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
    extractionCode: generateExtractionCode(),
    currentStep: 'idea',
    createdAt: Date.now()
  });

  const [history, setHistory] = useState<BookProject[]>([]);

  useEffect(() => {
    const checkKey = async () => {
      if (process.env.API_KEY && process.env.API_KEY !== "undefined" && process.env.API_KEY.length > 5) {
        setHasKey(true);
        return;
      }
      const win = window as any;
      if (win.aistudio) {
        try {
          const selected = await win.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          setHasKey(false);
        }
      } else {
        setHasKey(!!process.env.API_KEY); 
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    const win = window as any;
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUid(fbUser.uid);
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          setUser({ ...profile, isLoggedIn: true });
          const projects = await loadUserProjects(fbUser.uid);
          setHistory(projects);
        }
      } else {
        setFirebaseUid(null);
        setUser(prev => ({ ...prev, isLoggedIn: false }));
        setCurrentView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const isDarkBg = useMemo(() => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }, [bgColor]);

  useEffect(() => {
    const hex = bgColor.replace('#', '');
    const adjust = isDarkBg ? 30 : 0;
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + adjust);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + adjust);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + adjust);
    
    const cardBg = isDarkBg ? `rgba(${r}, ${g}, ${b}, 0.7)` : '#FFFFFF';
    const borderColor = isDarkBg ? `rgba(${r+20}, ${g+20}, ${b+20}, 0.3)` : 'rgba(234, 111, 35, 0.1)';
    const textMain = isDarkBg ? '#FFFFFF' : '#2C211D';
    const textSub = isDarkBg ? 'rgba(255, 255, 255, 0.45)' : 'rgba(44, 33, 29, 0.5)';

    document.documentElement.style.setProperty('--bg-paper', bgColor);
    document.documentElement.style.setProperty('--text-main', textMain);
    document.documentElement.style.setProperty('--text-sub', textSub);
    document.documentElement.style.setProperty('--card-bg', cardBg);
    document.documentElement.style.setProperty('--border-color', borderColor);
    document.documentElement.style.setProperty('--card-shadow', isDarkBg ? '0 15px 50px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0, 0, 0, 0.05)');
  }, [bgColor, isDarkBg]);

  const updateProject = async (updates: Partial<BookProject>) => {
    setProject(prev => {
      const updated = { ...prev, ...updates };
      if (firebaseUid) {
        saveProjectToCloud(firebaseUid, updated).catch(console.error);
        setHistory(prevH => {
           const idx = prevH.findIndex(p => p.id === updated.id);
           if (idx !== -1) {
             const newH = [...prevH];
             newH[idx] = updated;
             return newH;
           }
           return [updated, ...prevH];
        });
      }
      return updated;
    });
  };

  const deductCoins = (amount: number): boolean => {
    if (user.coins < amount) {
      alert(lang === 'zh' ? '金豆不足，请先充值' : 'Not enough beans');
      return false;
    }
    const newCoins = user.coins - amount;
    setUser(prev => ({ ...prev, coins: newCoins }));
    if (firebaseUid) {
      syncUserProfile(firebaseUid, { coins: newCoins }).catch(console.error);
    }
    return true;
  };

  const handleLogin = async (username: string, method: string) => {
    try {
      const cred = await signInAnonymously(auth);
      const profile = await getUserProfile(cred.user.uid);
      if (profile) {
        setUser({ ...profile, isLoggedIn: true });
      } else {
        const newUser = { username, coins: 80, isFirstRecharge: true, isLoggedIn: true };
        await syncUserProfile(cred.user.uid, newUser);
        setUser(newUser);
        setShowReward(true);
      }
      setFirebaseUid(cred.user.uid);
      const projects = await loadUserProjects(cred.user.uid);
      setHistory(projects);
      setCurrentView('library');
    } catch (e: any) {
      alert(`登录失败: ${e.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUid(null);
    setUser(p => ({ ...p, isLoggedIn: false, username: '', coins: 0 }));
    setCurrentView('login');
    setIsMenuOpen(false);
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full card-dynamic p-10 rounded-[3rem] shadow-2xl space-y-8 animate-in zoom-in-95">
           <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto">
              <i className="fas fa-key"></i>
           </div>
           <div className="space-y-2">
              <h2 className="text-2xl font-bold font-header">关联密钥以开启创作</h2>
              <p className="opacity-60 text-sm font-medium">检测到未激活 API Key。</p>
           </div>
           <button onClick={handleOpenKeySelector} className="btn-candy w-full py-4 text-white rounded-2xl font-bold shadow-xl">
             选择密钥
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[var(--bg-paper)] transition-all duration-500`} style={{ color: 'var(--text-main)' }}>
      {user.isLoggedIn && currentView !== 'login' && (
        <header className={`bg-[var(--card-bg)] backdrop-blur-3xl border-b border-[var(--border-color)] py-3 px-4 md:px-6 sticky top-0 z-[60] shadow-sm`}>
           <div className="max-w-7xl mx-auto flex justify-between items-center relative">
             <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('library')}>
                <div className="w-10 h-10 bg-[#EA6F23] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transform rotate-3 transition-transform group-hover:rotate-0">
                  <i className="fas fa-magic text-white text-sm"></i>
                </div>
                <h1 className="text-lg md:text-xl font-header font-bold tracking-tight">DreamLoom</h1>
             </div>
             
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-4 py-1.5 bg-[#EA6F23]/10 rounded-full border border-[#EA6F23]/20 shadow-inner">
                 <i className="fas fa-seedling text-[#EA6F23] text-[10px]"></i>
                 <span className="text-xs font-black text-[#EA6F23]">{user.coins}</span>
               </div>
               <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--text-main)]/5 rounded-2xl transition-all active:scale-90">
                  <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
               </button>
             </div>

             {isMenuOpen && (
               <div className="absolute top-16 right-0 w-52 bg-[var(--card-bg)] rounded-[2rem] shadow-2xl border border-[var(--border-color)] p-3 animate-in zoom-in-95 z-[70] backdrop-blur-3xl">
                  <MenuBtn icon="fa-compass" label={lang === 'zh' ? '灵感工坊' : 'Studio'} active={currentView === 'studio'} onClick={() => { setCurrentView('studio'); setIsMenuOpen(false); }} />
                  <MenuBtn icon="fa-book" label={lang === 'zh' ? '作品集' : 'Library'} active={currentView === 'library'} onClick={() => { setCurrentView('library'); setIsMenuOpen(false); }} />
                  <MenuBtn icon="fa-map" label={lang === 'zh' ? '阅读广场' : 'Plaza'} active={currentView === 'plaza'} onClick={() => { setCurrentView('plaza'); setIsMenuOpen(false); }} />
                  <div className="h-[1px] bg-[var(--border-color)] my-2"></div>
                  <MenuBtn icon="fa-user" label={lang === 'zh' ? '个人中心' : 'Profile'} active={currentView === 'profile'} onClick={() => { setCurrentView('profile'); setIsMenuOpen(false); }} />
                  <MenuBtn icon="fa-sign-out-alt" label={lang === 'zh' ? '退出当前账号' : 'Logout'} active={false} onClick={handleLogout} />
               </div>
             )}
           </div>
        </header>
      )}

      <main className="flex-1 overflow-x-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 w-full">
          {currentView === 'login' ? <Login onLogin={handleLogin} onLogout={handleLogout} currentUser={user} lang={lang} /> : 
           currentView === 'plaza' ? <ReadingPlaza lang={lang} onUseStyle={(style) => { setProject(p => ({ ...p, visualStyle: style, currentStep: 'idea', id: Math.random().toString(36).substr(2, 9), pages: [] })); setCurrentView('studio'); }} onUseIdea={(idea) => { setProject(p => ({ ...p, originalIdea: idea, currentStep: 'idea', id: Math.random().toString(36).substr(2, 9), pages: [] })); setCurrentView('studio'); }} /> :
           currentView === 'brand' ? <BrandStory lang={lang} isDark={isDarkBg} /> :
           currentView === 'profile' ? <MyProfile user={user} setUser={setUser} lang={lang} setLang={setLang} bgColor={bgColor} setBgColor={setBgColor} history={history} isDark={isDarkBg} /> :
           currentView === 'library' ? <BookLibrary history={history} onSelect={(b) => { setProject(b); setCurrentView('studio'); }} onDelete={async (id) => {
             await deleteProjectFromCloud(id);
             setHistory(h => h.filter(p => p.id !== id));
           }} onNewProject={() => {
             setProject({ id: Math.random().toString(36).substr(2, 9), title: '', originalIdea: '', template: StoryTemplate.HERO_JOURNEY, pages: [], characterDescription: '', visualStyle: VisualStyle.WATERCOLOR, extractionCode: generateExtractionCode(), currentStep: 'idea', createdAt: Date.now() });
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

      {showReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReward(false)}></div>
          <div className="relative bg-[var(--card-bg)] p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 max-w-sm w-full zoom-in-95 border border-[var(--border-color)]">
             <div className="w-24 h-24 bg-yellow-400 rounded-[2rem] flex items-center justify-center text-white text-5xl mx-auto shadow-xl animate-bounce">
                <i className="fas fa-gift"></i>
             </div>
             <div className="space-y-3">
                <h3 className="text-3xl font-bold font-header">新造梦师礼包</h3>
                <p className="opacity-60 font-medium leading-relaxed">赠送 80 颗金豆。</p>
             </div>
             <button onClick={() => setShowReward(false)} className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold shadow-2xl">立即开启</button>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuBtn: React.FC<{ icon: string, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-bold text-sm transition-all ${active ? 'bg-[#EA6F23] text-white shadow-xl' : 'text-[var(--text-sub)] hover:bg-[var(--text-main)]/5'}`}>
    <i className={`fas ${icon} ${active ? '' : 'opacity-40'}`}></i>
    {label}
  </button>
);

export default App;
