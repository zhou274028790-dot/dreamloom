
import React, { useState, useEffect } from 'react';
import { BookProject, StoryPage, VisualStyle, Language } from '../types';
import { generateSceneImage, editPageImage } from '../services/geminiService';
import { uploadImageToCloud } from '../services/dataService';

interface Props {
  project: BookProject;
  onNext: (updates: Partial<BookProject>) => void;
  onBack: () => void;
  userCoins: number;
  deductCoins: (amount: number) => boolean;
  lang: Language;
  isDark?: boolean;
}

const DirectorMode: React.FC<Props> = ({ project, onNext, onBack, userCoins, deductCoins, lang, isDark }) => {
  const [pages, setPages] = useState<StoryPage[]>(project.pages);
  const [activeIndex, setActiveIndex] = useState(0);
  const [polishingIndex, setPolishingIndex] = useState<number | null>(null);
  const [polishInstruction, setPolishInstruction] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  
  useEffect(() => {
    if (project.pages.length > 0) setPages(project.pages);
  }, [project.pages]);

  const handleApiError = (err: any) => {
    alert("生成出错: " + (err.message || "请求被拒绝。请检查网络或稍后再试。"));
  };

  /**
   * 核心功能：序列生成
   * 为了解决“图片加载失败”和“429并发限制”，我们采用串行队列。
   */
  const handleGenerateAll = async () => {
    const ungeneratedIndices = pages.map((p, i) => p.imageUrl ? -1 : i).filter(i => i !== -1);
    if (ungeneratedIndices.length === 0) return alert("所有页面都已生成！");
    
    const cost = ungeneratedIndices.length * 5;
    if (!deductCoins(cost)) return;

    setIsBulkGenerating(true);
    setBulkProgress(0);

    const updatedPages = [...pages];
    
    for (let i = 0; i < ungeneratedIndices.length; i++) {
      const targetIndex = ungeneratedIndices[i];
      setBulkProgress(Math.round(((i + 1) / ungeneratedIndices.length) * 100));
      setActiveIndex(targetIndex);

      updatedPages[targetIndex] = { ...updatedPages[targetIndex], isGenerating: true };
      setPages([...updatedPages]);

      try {
        const page = updatedPages[targetIndex];
        const base64Img = await generateSceneImage(
          page.text, 
          page.visualPrompt, 
          project.characterDescription, 
          project.characterSeedImage!, 
          project.visualStyle,
          project.styleDescription
        );
        const cloudUrl = await uploadImageToCloud(`pages/${project.id}_${targetIndex}_${Date.now()}.png`, base64Img);
        updatedPages[targetIndex] = { ...updatedPages[targetIndex], imageUrl: cloudUrl, isGenerating: false };
      } catch (err) {
        console.error(`Page ${targetIndex} failed`, err);
        updatedPages[targetIndex] = { ...updatedPages[targetIndex], isGenerating: false };
      }
      setPages([...updatedPages]);
      // 短暂延迟避免 API 严格限流
      await new Promise(r => setTimeout(r, 800));
    }

    onNext({ pages: updatedPages });
    setIsBulkGenerating(false);
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
      const base64Img = await generateSceneImage(
        page.text, 
        page.visualPrompt, 
        project.characterDescription, 
        project.characterSeedImage!, 
        project.visualStyle,
        project.styleDescription
      );
      const cloudUrl = await uploadImageToCloud(`pages/${project.id}_${index}_${Date.now()}.png`, base64Img);
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], imageUrl: cloudUrl, isGenerating: false };
      setPages(newPages);
      onNext({ pages: newPages });
    } catch (err) {
      handleApiError(err);
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
      const cloudUrl = await uploadImageToCloud(`pages/edit_${project.id}_${index}_${Date.now()}.png`, base64Img);
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], imageUrl: cloudUrl, isGenerating: false };
      setPages(newPages);
      onNext({ pages: newPages });
    } catch (err) {
      handleApiError(err);
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
    <div className="space-y-6 animate-in fade-in pb-32 relative w-full">
      {isBulkGenerating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center">
           <div className="w-full max-w-md space-y-8 animate-in zoom-in-95">
             <div className="w-24 h-24 border-8 border-[#EA6F23]/20 border-t-[#EA6F23] rounded-full animate-spin mx-auto"></div>
             <div className="space-y-4">
                <h3 className="text-3xl font-bold font-header text-white">正在魔法创作中...</h3>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-[#EA6F23] transition-all duration-500" style={{ width: `${bulkProgress}%` }}></div>
                </div>
                <p className="text-white/60 font-bold uppercase tracking-widest text-xs">进度: {bulkProgress}% - 正在创作第 {activeIndex + 1} 页</p>
             </div>
             <p className="text-orange-200 text-sm font-medium italic">“为了保证画质和风格统一，AI 正在逐页精修...”</p>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4">
        <h2 className="text-xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleGenerateAll}
             disabled={isBulkGenerating}
             className="px-6 py-2 bg-[#EA6F23] text-white rounded-full font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
           >
             <i className="fas fa-magic"></i> 一键生成余下分镜
           </button>
           <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#EA6F23] shadow-md hidden sm:block">
             <img src={project.characterSeedImage} className="w-full h-full object-cover" />
           </div>
        </div>
      </div>

      <div className="relative px-4 mt-6 flex items-center justify-center">
          <button 
            onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="absolute left-4 md:left-10 z-20 w-12 h-12 bg-white/90 rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-orange-50"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="w-full max-w-2xl overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {pages.map((page, idx) => (
                <div key={page.id} className="min-w-full flex flex-col items-center gap-6 px-4">
                   <div className="relative w-full aspect-square bg-[var(--card-bg)] rounded-[3rem] shadow-2xl overflow-hidden group border border-[var(--border-color)]">
                      {page.imageUrl ? (
                          <img src={page.imageUrl} className={`w-full h-full object-cover transition-all ${page.isGenerating ? 'blur-2xl scale-110' : ''}`} />
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                            {!page.isGenerating && (
                              <button onClick={() => handleRedraw(idx)} className="btn-candy px-8 py-3 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg">
                                <i className="fas fa-paint-brush"></i> 生成本页画面
                              </button>
                            )}
                          </div>
                      )}
                      
                      {page.isGenerating && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                           <div className="w-12 h-12 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin"></div>
                           <p className="text-xs font-bold text-[#EA6F23] animate-pulse">正在精雕细琢每一像素...</p>
                        </div>
                      )}
                      
                      {page.imageUrl && !page.isGenerating && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                          <button onClick={() => handleRedraw(idx)} className="bg-white text-[#EA6F23] px-6 py-2 rounded-xl text-[10px] font-bold shadow-xl border border-orange-100">重绘 (5🌿)</button>
                          <button onClick={() => setPolishingIndex(idx)} className="bg-white text-blue-600 px-6 py-2 rounded-xl text-[10px] font-bold shadow-xl border border-blue-100">微调 (5🌿)</button>
                        </div>
                      )}
                   </div>
                   <div className="w-full max-w-xl">
                     <textarea 
                      value={page.text} 
                      onChange={(e) => { const np = [...pages]; np[idx].text = e.target.value; setPages(np); onNext({pages: np}); }} 
                      className="w-full p-6 bg-[var(--card-bg)] rounded-[2rem] shadow-sm border border-[var(--border-color)] font-bold text-center outline-none resize-none focus:ring-4 focus:ring-[#EA6F23]/5 transition-all min-h-[100px]" 
                      placeholder="编写情节..."
                     />
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setActiveIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={activeIndex === pages.length - 1}
            className="absolute right-4 md:right-10 z-20 w-12 h-12 bg-white/90 rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-orange-50"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4 py-4">
        <div className="flex justify-center gap-1.5 overflow-x-auto no-scrollbar w-full py-2">
          {pages.map((_, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'bg-[#EA6F23] w-10' : 'bg-gray-300 w-1.5 opacity-30'}`}></button>
          ))}
        </div>
        <button 
          onClick={handleAddPages} 
          disabled={isExpanding}
          className="px-6 py-2 bg-[#EA6F23]/10 text-[#EA6F23] rounded-xl font-bold text-xs border border-[#EA6F23]/20 hover:bg-[#EA6F23] hover:text-white transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus-circle"></i> 增加 4 页后续情节 (10🌿)
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] backdrop-blur-2xl p-6 border-t border-[var(--border-color)] flex justify-between items-center max-w-7xl mx-auto rounded-t-[3rem] shadow-2xl z-50">
        <button onClick={onBack} className="px-6 py-3 font-bold opacity-30 hover:opacity-100 transition-opacity text-sm">返回</button>
        <div className="flex items-center gap-2 px-6 py-2 bg-[var(--text-main)]/5 rounded-full border border-[var(--border-color)]">
           <span className="text-[10px] font-black uppercase tracking-widest">{activeIndex + 1} / {pages.length} 页</span>
        </div>
        <button onClick={() => onNext({ currentStep: 'press' })} className="btn-candy px-10 py-3 text-white rounded-2xl font-bold shadow-xl transition-all active:scale-95 text-sm">预览并订购 <i className="fas fa-arrow-right ml-1"></i></button>
      </div>
      
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--card-bg)] w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in-95 border border-[var(--border-color)]">
             <div className="space-y-2">
               <h3 className="text-xl font-bold font-header">魔棒微调</h3>
               <p className="text-[10px] opacity-50 font-medium">输入想改变的内容，AI 将为您精准修改画面。</p>
             </div>
             <textarea value={polishInstruction} onChange={(e) => setPolishInstruction(e.target.value)} placeholder="比如：增加一朵云，或者换个背景..." className="w-full h-24 p-4 bg-[var(--text-main)]/5 border border-[var(--border-color)] rounded-2xl outline-none font-bold text-sm" />
             <div className="flex gap-4">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-3 font-bold opacity-30 text-sm">放弃</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-sm">确认微调 (5🌿)</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorMode;
