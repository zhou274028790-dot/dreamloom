
import React, { useState, useEffect } from 'react';
import { BookProject, StoryPage, VisualStyle, Language } from '../types';
import { generateSceneImage, editPageImage } from '../services/geminiService';
import { uploadImageToCloud } from '../services/dataService';

interface Props {
  uid: string;
  project: BookProject;
  onNext: (updates: Partial<BookProject>) => void;
  onBack: () => void;
  userCoins: number;
  deductCoins: (amount: number) => boolean;
  lang: Language;
  isDark?: boolean;
}

const DirectorMode: React.FC<Props> = ({ uid, project, onNext, onBack, userCoins, deductCoins, lang, isDark }) => {
  const [pages, setPages] = useState<StoryPage[]>(project.pages);
  const [activeIndex, setActiveIndex] = useState(0);
  const [polishingIndex, setPolishingIndex] = useState<number | null>(null);
  const [polishInstruction, setPolishInstruction] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [currentQueueMsg, setCurrentQueueMsg] = useState('');
  
  const emotionalPhrases = [
    "正在为你收集晨露，调配梦境的色彩...",
    "绘本精灵正在纸尖跳舞，为你勾勒这段冒险...",
    "正在月光下为你装帧这一段珍贵的回忆...",
    "色彩正在书页间缓缓流淌，万物开始有了灵性...",
    "小主角正跳进画里，准备开启下一个奇迹...",
    "正在每一处笔触中注入星光与诗意...",
    "每一个像素都在屏息期待，与你的故事相遇...",
    "正在捕捉那一抹最动人的灵感火花...",
    "让想象力在纸上发芽，开出绚烂的花朵..."
  ];

  useEffect(() => {
    if (project.pages.length > 0) setPages(project.pages);
  }, [project.pages]);

  useEffect(() => {
    const updateMsg = () => {
      setCurrentQueueMsg(emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)]);
    };
    updateMsg();
    const timer = setInterval(updateMsg, 5000);
    return () => clearInterval(timer);
  }, []);

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
      const base64Img = await generateSceneImage(
        page.text, 
        page.visualPrompt, 
        project.characterDescription, 
        project.characterSeedImage!, 
        project.visualStyle,
        project.styleDescription
      );
      const cloudUrl = await uploadImageToCloud(uid, project.id, `page_${index}_${Date.now()}.png`, base64Img);
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], imageUrl: cloudUrl, isGenerating: false };
      setPages(newPages);
      onNext({ pages: newPages });
    } catch (err: any) {
      console.error("Redraw Error:", err);
      alert(lang === 'zh' ? `画面编织失败: ${err.message || '网络连接超时，请重试'}` : `Failed to generate image: ${err.message}`);
      setPages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isGenerating: false };
        return updated;
      });
    }
  };

  const handleAddPages = async () => {
    if (!deductCoins(10)) return;
    setIsExpanding(true);
    const lastNum = pages.length;
    const newPages: StoryPage[] = Array.from({ length: 4 }).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      type: 'story',
      pageNumber: lastNum + i + 1,
      text: '在这里输入新的奇妙情节...',
      visualPrompt: `${project.characterDescription}, ${project.styleDescription || project.visualStyle}`,
      isGenerating: false
    }));
    const updated = [...pages, ...newPages];
    setPages(updated);
    onNext({ pages: updated });
    setIsExpanding(false);
    setActiveIndex(lastNum);
  };

  const handlePolishSubmit = async () => {
    if (polishingIndex === null || !polishInstruction.trim()) return;
    const index = polishingIndex;
    const page = pages[index];
    
    if (!deductCoins(5)) return;

    setPolishingIndex(null);
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isGenerating: true };
      return updated;
    });

    try {
      const base64Img = await editPageImage(
        page.imageUrl!, 
        project.characterSeedImage!, 
        polishInstruction, 
        project.characterDescription,
        project.visualStyle,
        project.styleDescription
      );
      const cloudUrl = await uploadImageToCloud(uid, project.id, `edit_page_${index}_${Date.now()}.png`, base64Img);
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], imageUrl: cloudUrl, isGenerating: false };
      setPages(newPages);
      onNext({ pages: newPages });
    } catch (err: any) {
      console.error("Polish Error:", err);
      alert(lang === 'zh' ? `微调失败: ${err.message}` : `Polish failed: ${err.message}`);
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
    <div className="space-y-6 animate-in fade-in pb-32 relative w-full overflow-hidden">
      <div className="flex justify-between items-center px-6">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Base: 8 Pages (+20¥ per 4 pages added)</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-[var(--text-main)]/5 backdrop-blur rounded-full border border-[var(--border-color)]">
              <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-ping"></span>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">正在编织梦境...</p>
           </div>
           <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#EA6F23] shadow-md hidden sm:block bg-[var(--card-bg)]">
             <img src={project.characterSeedImage} className="w-full h-full object-cover" />
           </div>
        </div>
      </div>

      <div className="relative px-4 mt-6 flex flex-col items-center">
          <div className="w-full max-w-5xl relative flex items-center">
              <button 
                onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
                className="absolute -left-4 md:-left-8 z-30 w-12 h-12 bg-[var(--card-bg)]/80 backdrop-blur rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-[var(--border-color)]"
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              <div className="w-full overflow-hidden rounded-[3rem]">
                <div className="flex transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                  {pages.map((page, idx) => (
                    <div key={page.id} className="min-w-full flex flex-col items-center gap-8 px-2">
                       <div className="relative w-full aspect-[2/1] bg-[var(--text-main)]/5 rounded-[3rem] shadow-2xl overflow-hidden group border border-[var(--border-color)]">
                          {page.imageUrl ? (
                              <img src={page.imageUrl} className={`w-full h-full object-cover transition-all duration-700 ${page.isGenerating ? 'blur-2xl scale-110 grayscale' : ''}`} />
                          ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                {!page.isGenerating && (
                                  <button onClick={() => handleRedraw(idx)} className="btn-candy px-8 py-3 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
                                    <i className="fas fa-wand-sparkles"></i> 魔法生成本页 (5🌿)
                                  </button>
                                )}
                              </div>
                          )}
                          
                          {page.isGenerating && (
                            <div className="absolute inset-0 bg-[var(--card-bg)]/60 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                               <div className="relative w-20 h-20 mb-6">
                                  <div className="absolute inset-0 border-4 border-[#EA6F23]/10 rounded-full"></div>
                                  <div className="absolute inset-0 border-4 border-transparent border-t-[#EA6F23] rounded-full animate-spin"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                     <i className="fas fa-feather-pointed text-2xl text-[#EA6F23] animate-pulse"></i>
                                  </div>
                               </div>
                               <p className="text-sm font-bold text-[#EA6F23] italic max-w-md leading-relaxed px-10">“{currentQueueMsg}”</p>
                            </div>
                          )}
                          
                          {page.imageUrl && !page.isGenerating && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                              <button onClick={() => handleRedraw(idx)} className="bg-[var(--card-bg)] text-[#EA6F23] px-6 py-2 rounded-xl text-[10px] font-bold shadow-xl border border-[var(--border-color)]">重新绘制 (5🌿)</button>
                              <button onClick={() => setPolishingIndex(idx)} className="bg-[var(--card-bg)] text-blue-600 px-6 py-2 rounded-xl text-[10px] font-bold shadow-xl border border-[var(--border-color)]">魔法微调 (5🌿)</button>
                            </div>
                          )}
                       </div>
                       
                       <div className="w-full flex flex-col items-start px-2">
                         <div className="w-full h-[1px] bg-[var(--border-color)] mb-4"></div>
                         <textarea 
                          value={page.text} 
                          onChange={(e) => { const np = [...pages]; np[idx].text = e.target.value; setPages(np); onNext({pages: np}); }} 
                          className="w-full p-4 bg-transparent font-bold text-left outline-none resize-none transition-all min-h-[120px] text-[var(--text-main)] placeholder:text-[var(--text-main)]/20 text-lg md:text-xl leading-relaxed" 
                          placeholder="在这里记录你的奇妙情节..."
                         />
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setActiveIndex(i => Math.min(pages.length - 1, i + 1))}
                disabled={activeIndex === pages.length - 1}
                className="absolute -right-4 md:-right-8 z-30 w-12 h-12 bg-[var(--card-bg)]/80 backdrop-blur rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-[var(--border-color)]"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
          </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-6 py-4">
        <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar w-full py-2">
          {pages.map((_, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-[#EA6F23] w-12' : 'bg-[var(--text-main)]/10 w-2 hover:bg-[var(--text-main)]/20'}`}></button>
          ))}
        </div>
        <button 
          onClick={handleAddPages} 
          disabled={isExpanding}
          className="px-10 py-3 bg-[var(--text-main)]/5 text-[#EA6F23] rounded-2xl font-bold text-xs border border-[#EA6F23]/20 hover:bg-[#EA6F23] hover:text-white transition-all flex items-center gap-3 shadow-sm active:scale-95"
        >
          <i className="fas fa-plus-circle"></i> 延续 4 页奇妙梦境 (10🌿 & +20¥)
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-transparent p-6 flex justify-between items-center max-w-7xl mx-auto z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <button onClick={onBack} className="px-6 py-3 font-bold opacity-30 hover:opacity-100 transition-opacity text-sm bg-[var(--card-bg)]/60 backdrop-blur-xl rounded-2xl border border-[var(--border-color)] shadow-lg" style={{ color: 'var(--text-main)' }}>返回</button>
        </div>
        
        <div className="pointer-events-auto flex gap-4">
          {/* 非中心对称页码指示器 */}
          <div className="flex items-center gap-2 px-6 py-3 bg-[var(--text-main)]/5 backdrop-blur-2xl rounded-2xl border border-[var(--border-color)] shadow-xl">
             <span className="text-xs font-black text-[#EA6F23]">{activeIndex + 1} / {pages.length} 页</span>
          </div>
          <button onClick={() => onNext({ currentStep: 'press' })} className="btn-candy px-10 py-3 text-white rounded-2xl font-bold shadow-xl transition-all active:scale-95 text-sm pointer-events-auto">前往印刷厂预览 <i className="fas fa-arrow-right ml-1"></i></button>
        </div>
      </div>
      
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--card-bg)] w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in-95 border border-[var(--border-color)]">
             <div className="space-y-2 text-center">
               <h3 className="text-xl font-bold font-header" style={{ color: 'var(--text-main)' }}>魔棒微调</h3>
               <p className="text-[10px] opacity-50 font-medium" style={{ color: 'var(--text-main)' }}>告诉 AI 你想如何改变画面构图或细节。</p>
             </div>
             <textarea 
              value={polishInstruction} 
              onChange={(e) => setPolishInstruction(e.target.value)} 
              placeholder="比如：让主角站在画面左侧三分之一处..." 
              className="w-full h-24 p-4 bg-[var(--text-main)]/5 border border-[var(--border-color)] rounded-2xl outline-none font-bold text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/20" 
             />
             <div className="flex gap-4">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-3 font-bold opacity-30 text-sm" style={{ color: 'var(--text-main)' }}>取消</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-sm">确认微调 (5🌿)</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorMode;
