
import React, { useState, useEffect, useRef } from 'react';
import { BookProject, StoryPage, VisualStyle, Language } from '../types';
import { generateSceneImage, editPageImage, generateNextPageSuggestion } from '../services/geminiService';

interface Props {
  project: BookProject;
  onNext: (updates: Partial<BookProject>) => void;
  onBack: () => void;
  userCoins: number;
  deductCoins: (amount: number) => boolean;
  lang: Language;
}

const DirectorMode: React.FC<Props> = ({ project, onNext, onBack, userCoins, deductCoins, lang }) => {
  const [pages, setPages] = useState<StoryPage[]>(project.pages);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAddingPages, setIsAddingPages] = useState(false);
  const [polishingIndex, setPolishingIndex] = useState<number | null>(null);
  const [polishInstruction, setPolishInstruction] = useState('');
  const [showCharacterDetails, setShowCharacterDetails] = useState(false);
  
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project.pages.length > 0 && pages.length === 0) {
      setPages(project.pages);
    }
  }, [project.pages]);

  useEffect(() => {
    if (thumbnailScrollRef.current) {
      const activeThumb = thumbnailScrollRef.current.children[activeIndex] as HTMLElement;
      if (activeThumb) {
        thumbnailScrollRef.current.scrollTo({
          left: activeThumb.offsetLeft - thumbnailScrollRef.current.offsetWidth / 2 + activeThumb.offsetWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeIndex]);

  const handleTextChange = (index: number, newText: string) => {
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
  };

  const addFourPages = async () => {
    if (pages.length >= 48) {
      alert(lang === 'zh' ? "已达到最大页数限制(48页)" : "Max page limit reached (48 pages)");
      return;
    }
    setIsAddingPages(true);
    try {
      const storyPages = pages.filter(p => p.type === 'story');
      const lastStoryText = storyPages[storyPages.length - 1]?.text || "";
      const suggestions = await generateNextPageSuggestion(project.originalIdea, lastStoryText);
      
      const newPages: StoryPage[] = suggestions.map((s) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: 'story',
        pageNumber: 0,
        text: s.text || "",
        visualPrompt: s.visualPrompt || "",
        isGenerating: false
      }));

      const backPageIndex = pages.findIndex(p => p.type === 'back');
      const updatedPages = [...pages];
      updatedPages.splice(backPageIndex === -1 ? updatedPages.length : backPageIndex, 0, ...newPages);
      
      const finalPages = updatedPages.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      setPages(finalPages);
      setActiveIndex(backPageIndex === -1 ? pages.length : backPageIndex);
    } catch (err) {
      console.error("Extend error:", err);
    } finally {
      setIsAddingPages(false);
    }
  };

  const handleRedraw = async (index: number) => {
    const page = pages[index];
    if (page.isGenerating) return;
    if (!deductCoins(5)) return;

    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isGenerating: true };
      return updated;
    });

    try {
      const newImg = await generateSceneImage(
        page.text, 
        page.visualPrompt, 
        project.characterDescription, 
        project.characterSeedImage!, 
        project.visualStyle,
        project.styleDescription
      );
      
      setPages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], imageUrl: newImg, isGenerating: false };
        return updated;
      });
    } catch (err) {
      alert("Redraw failed.");
      setPages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isGenerating: false };
        return updated;
      });
    }
  };

  const handlePolishSubmit = async () => {
    if (polishingIndex === null || !polishInstruction.trim()) return;
    const index = polishingIndex;
    const page = pages[index];

    if (!deductCoins(5)) {
      setPolishingIndex(null);
      return;
    }

    setPolishingIndex(null);
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isGenerating: true };
      return updated;
    });

    try {
      const newImg = await editPageImage(
        page.imageUrl!, 
        project.characterSeedImage!, 
        polishInstruction, 
        project.characterDescription,
        project.visualStyle,
        project.styleDescription
      );
      setPages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], imageUrl: newImg, isGenerating: false };
        return updated;
      });
    } catch (err) {
      alert("Polish failed.");
      setPages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isGenerating: false };
        return updated;
      });
    } finally {
      setPolishInstruction('');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-28 relative w-full">
      {/* 核心重构：顶部区域 */}
      <div className="px-4 md:px-6 pt-4 space-y-6">
        
        {/* 第一行：标题 vs 角色风格 - Stack on Mobile */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
            <p className="text-sm opacity-50 font-medium leading-relaxed max-w-xs">
              正在为您编织连贯的梦，确保主角在每一页都如初见般亲切。
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
             {/* 角色头像与链接 */}
             <div 
               onClick={() => setShowCharacterDetails(!showCharacterDetails)}
               className="relative cursor-pointer group"
             >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border-[3px] border-[#EA6F23]/20 p-0.5 overflow-hidden bg-[var(--card-bg)] shadow-sm transition-transform hover:rotate-3 active:scale-90">
                   <img src={project.characterSeedImage} className="w-full h-full object-cover rounded-[10px]" alt="Hero" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-[var(--card-bg)] shadow-md">
                   <i className="fas fa-link"></i>
                </div>
                
                {showCharacterDetails && (
                  <div className="absolute top-16 right-0 w-64 bg-[var(--card-bg)] rounded-[24px] shadow-2xl border border-[#EA6F23]/5 p-5 animate-in zoom-in-95 z-[80]">
                     <p className="text-[10px] font-black text-[#EA6F23] mb-2 uppercase tracking-widest">梦境角色锁定</p>
                     <p className="text-[12px] font-medium opacity-70 leading-relaxed italic">"{project.characterDescription}"</p>
                  </div>
                )}
             </div>

             {/* 风格展示 */}
             <div className="flex flex-col">
               <span className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em] leading-none mb-1">ART STYLE</span>
               <div className="flex items-center gap-1.5 text-sm font-black text-[#EA6F23]">
                  <i className="fas fa-sparkles text-xs"></i>
                  <span>{project.visualStyle === VisualStyle.CUSTOM ? '自定义画风' : project.visualStyle}</span>
               </div>
             </div>
          </div>
        </div>

        {/* 第二行：进度条 vs 继续冒险 - Stack on Mobile */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-auto bg-[var(--card-bg)] px-5 py-2.5 rounded-2xl flex items-center justify-between md:justify-start gap-4 shadow-inner border border-[var(--border-color)]">
             <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">PROGRESS</span>
             <div className="flex items-center gap-1">
                <span className="text-lg font-black opacity-80 leading-none">{activeIndex + 1}</span>
                <span className="text-sm font-bold opacity-20">/ {pages.length}</span>
             </div>
          </div>

          <button 
            onClick={addFourPages} 
            disabled={isAddingPages || pages.length >= 48} 
            className="btn-candy w-full md:w-auto md:flex-1 md:max-w-[200px] h-[52px] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all text-sm shadow-xl disabled:opacity-50"
          >
            {isAddingPages ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
            <span>继续冒险 (+4页) ✨</span>
          </button>
        </div>
      </div>

      {/* 主展示区 */}
      <div className="relative px-4 overflow-hidden mt-6">
          <button 
            onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))} 
            disabled={activeIndex === 0} 
            className="absolute left-2 md:left-6 top-1/3 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-[var(--card-bg)]/90 backdrop-blur shadow-xl flex items-center justify-center text-[#EA6F23] z-[50] disabled:opacity-0 hover:scale-105 transition-all active:scale-90 border border-[#EA6F23]/5"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <button 
            onClick={() => setActiveIndex(prev => Math.min(pages.length - 1, prev + 1))} 
            disabled={activeIndex === pages.length - 1} 
            className="absolute right-2 md:right-6 top-1/3 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-[var(--card-bg)]/90 backdrop-blur shadow-xl flex items-center justify-center text-[#EA6F23] z-[50] disabled:opacity-0 hover:scale-105 transition-all active:scale-90 border border-[#EA6F23]/5"
          >
            <i className="fas fa-chevron-right"></i>
          </button>

          <div 
            className="flex transition-transform duration-500 ease-out" 
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {pages.map((page, idx) => (
              <div key={page.id} className="min-w-full flex flex-col items-center gap-6 px-4">
                <div className={`relative w-full max-w-lg aspect-square bg-[var(--card-bg)] rounded-[32px] md:rounded-[40px] shadow-2xl border border-[var(--border-color)] overflow-hidden group transition-all ${page.isGenerating ? 'ring-4 ring-[#EA6F23]/20' : ''}`}>
                    {page.imageUrl ? (
                        <img src={page.imageUrl} className={`w-full h-full object-cover transition-all duration-700 ${page.isGenerating ? 'blur-md opacity-40' : ''}`} alt={`Page ${idx}`} />
                    ) : !page.isGenerating && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--text-main)]/5 gap-4">
                           <div className="w-16 h-16 bg-[var(--card-bg)] rounded-3xl shadow-lg flex items-center justify-center text-[#EA6F23]/20 text-2xl">
                              <i className="fas fa-image"></i>
                           </div>
                           <button onClick={() => handleRedraw(idx)} className="px-5 py-3 bg-[var(--card-bg)] text-[#EA6F23] rounded-2xl shadow-md font-bold hover:scale-105 active:scale-95 transition-transform text-xs border border-[#EA6F23]/10">
                              开始渲染第 {idx + 1} 页
                           </button>
                        </div>
                    )}

                    {page.isGenerating && (
                        <div className="absolute inset-0 bg-[var(--card-bg)]/70 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-40">
                            <div className="w-10 h-10 border-[3px] border-[#EA6F23] border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-center px-4">
                                <span className="text-[10px] font-black text-[#EA6F23] uppercase tracking-[0.3em] block">梦境同步中...</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="absolute top-8 left-8 text-[9px] px-4 py-2 rounded-2xl font-black text-white bg-black/30 backdrop-blur-md z-20 uppercase tracking-[0.2em] shadow-lg border border-white/10">
                        {page.type === 'cover' ? '封面' : page.type === 'back' ? '封底' : `PAGE ${idx}`}
                    </div>

                    {!page.isGenerating && page.imageUrl && (
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-30 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all md:translate-y-2 group-hover:translate-y-0">
                            <button onClick={() => handleRedraw(idx)} className="btn-candy px-5 py-3 text-white rounded-2xl shadow-xl flex items-center gap-2 hover:scale-110 active:scale-95 border border-white/20 font-bold text-[11px]">
                                <i className="fas fa-sync-alt"></i> 重绘
                            </button>
                            <button onClick={() => setPolishingIndex(idx)} className="px-5 py-3 bg-blue-500 text-white rounded-2xl shadow-xl flex items-center gap-2 hover:scale-110 active:scale-95 border border-white/20 font-bold text-[11px]">
                                <i className="fas fa-magic"></i> 微调
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-lg card-dynamic p-4 md:p-7 rounded-[24px] md:rounded-[40px] transition-all focus-within:shadow-xl focus-within:-translate-y-1">
                    <label className="block text-[9px] font-black opacity-20 uppercase tracking-[0.3em] mb-4">STORY TEXT</label>
                    <textarea
                        value={page.text}
                        onChange={(e) => handleTextChange(idx, e.target.value)}
                        className="w-full h-24 md:h-28 text-base leading-relaxed font-semibold bg-transparent border-0 focus:ring-0 p-0 resize-none outline-none text-[var(--text-main)]"
                        placeholder="在此为梦境添加文字描述..."
                    />
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* 缩略图导航廊 */}
      <div className="px-4 md:px-6 mt-2">
          <div ref={thumbnailScrollRef} className="flex gap-4 overflow-x-auto py-6 scroll-smooth no-scrollbar">
            {pages.map((page, idx) => (
                <button 
                  key={page.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-[3px] transition-all ${activeIndex === idx ? 'border-[#EA6F23] scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                    {page.imageUrl ? (
                        <img src={page.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[var(--card-bg)] flex items-center justify-center text-[9px] font-black opacity-20">
                            {idx + 1}
                        </div>
                    )}
                </button>
            ))}
          </div>
      </div>

      {/* 细节修正 Modal */}
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[var(--card-bg)] w-full max-w-sm rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 border border-[var(--border-color)]">
             <div className="text-center space-y-2">
               <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2"><i className="fas fa-magic text-xl"></i></div>
               <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>细节微调</h3>
               <p className="text-xs opacity-50 font-medium leading-relaxed italic">“描述你想对这一页进行的改变”</p>
             </div>
             <textarea 
               autoFocus
               value={polishInstruction}
               onChange={(e) => setPolishInstruction(e.target.value)}
               placeholder="例如：让它看起来更高兴一点..."
               className="w-full h-24 p-5 bg-[var(--text-main)]/5 border-2 border-transparent rounded-[20px] focus:border-blue-500 focus:bg-[var(--card-bg)] outline-none transition-all resize-none text-sm font-medium text-[var(--text-main)]"
             />
             <div className="flex gap-3">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-3.5 bg-[var(--text-main)]/10 text-[var(--text-sub)] rounded-xl font-bold text-sm">取消</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm">
                 确认同步 (5 🌿)
               </button>
             </div>
          </div>
        </div>
      )}

      {/* 底部按钮栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)]/80 backdrop-blur-xl border-t border-[var(--border-color)] p-4 md:p-6 z-[60] flex flex-col md:flex-row gap-4 justify-between items-center max-w-7xl mx-auto lg:rounded-t-[4rem] lg:px-16 shadow-2xl pb-safe">
        <button 
          onClick={onBack} 
          className="w-full md:w-auto px-6 py-3.5 bg-transparent border-2 border-[var(--border-color)] rounded-2xl font-bold text-[var(--text-sub)] hover:text-[#EA6F23] hover:border-[#EA6F23]/20 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <i className="fas fa-arrow-left"></i> 回溯角色
        </button>
        
        <button 
          onClick={() => onNext({ pages, currentStep: 'press' })} 
          className="w-full md:w-auto btn-candy group px-12 py-4 text-white rounded-[2rem] font-header font-bold text-lg shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {lang === 'zh' ? '预览并订购精装绘本' : 'Preview & Order'} 
          <i className="fas fa-book-open group-hover:rotate-12 transition-transform"></i>
        </button>
      </div>
    </div>
  );
};

export default DirectorMode;
