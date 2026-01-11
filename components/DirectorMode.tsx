
import React, { useState, useEffect, useRef } from 'react';
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
  
  useEffect(() => {
    if (project.pages.length > 0 && pages.length === 0) {
      setPages(project.pages);
    }
  }, [project.pages]);

  const handleApiError = (err: any) => {
    console.error("API Error:", err);
    if (err.message === "KEY_EXPIRED") {
      alert("检测到 API 密钥失效或找不到项目，请点击页面顶部的‘选择 API 密钥’重新授权。");
      // 触发强制重新选 key 的 UI 逻辑（如果 App.tsx 监听了状态）
      window.location.reload(); 
    } else {
      alert("生图失败: " + (err.message || "服务器繁忙，请稍后再试。"));
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
      const base64Img = await generateSceneImage(
        page.text, 
        page.visualPrompt, 
        project.characterDescription, 
        project.characterSeedImage!, 
        project.visualStyle,
        project.styleDescription
      );
      
      const cloudUrl = await uploadImageToCloud(`projects/${project.id}/page_${index}_${Date.now()}.png`, base64Img);
      
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
      const base64Img = await editPageImage(
        page.imageUrl!, 
        project.characterSeedImage!, 
        polishInstruction, 
        project.characterDescription,
        project.visualStyle,
        project.styleDescription
      );

      const cloudUrl = await uploadImageToCloud(`projects/${project.id}/page_${index}_edit_${Date.now()}.png`, base64Img);

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
    <div className="space-y-4 animate-in fade-in duration-500 pb-28 relative w-full">
      <div className="px-4 md:px-6 pt-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#EA6F23]/20 shadow-sm">
             <img src={project.characterSeedImage} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="relative px-4 overflow-hidden mt-6">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {pages.map((page, idx) => (
              <div key={page.id} className="min-w-full flex flex-col items-center gap-6 px-4">
                 <div className="relative w-full max-w-lg aspect-square bg-[var(--card-bg)] rounded-[32px] shadow-2xl overflow-hidden group">
                    {page.imageUrl ? (
                        <img src={page.imageUrl} className={`w-full h-full object-cover ${page.isGenerating ? 'blur-md' : ''}`} />
                    ) : !page.isGenerating && (
                        <button onClick={() => handleRedraw(idx)} className="w-full h-full bg-[var(--text-main)]/5 flex flex-col items-center justify-center text-[#EA6F23]">
                          <i className="fas fa-magic text-3xl mb-2"></i>
                          <span className="text-sm font-bold">开始渲染</span>
                        </button>
                    )}
                    {page.isGenerating && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-3xl text-[#EA6F23]"></i></div>}
                    
                    {page.imageUrl && !page.isGenerating && (
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRedraw(idx)} className="btn-candy px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg">重绘</button>
                        <button onClick={() => setPolishingIndex(idx)} className="bg-blue-500 px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg">微调</button>
                      </div>
                    )}
                 </div>
                 <textarea value={page.text} onChange={(e) => { const np = [...pages]; np[idx].text = e.target.value; setPages(np); onNext({pages: np}); }} className="w-full max-w-lg p-6 bg-[var(--card-bg)] rounded-2xl shadow-sm border border-[var(--border-color)] font-bold text-center outline-none" />
              </div>
            ))}
          </div>
      </div>
      
      <div className="max-w-lg mx-auto px-4 mt-8 flex justify-center gap-2 overflow-x-auto no-scrollbar py-2">
        {pages.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)} className={`w-3 h-3 rounded-full transition-all flex-shrink-0 ${i === activeIndex ? 'bg-[#EA6F23] w-8' : 'bg-[var(--text-sub)] opacity-20'}`}></button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur p-4 border-t flex justify-between items-center max-w-7xl mx-auto rounded-t-3xl shadow-2xl z-50">
        <button onClick={onBack} className="px-6 py-3 font-bold opacity-50">返回角色</button>
        <button onClick={() => onNext({ currentStep: 'press' })} className="btn-candy px-10 py-4 text-white rounded-2xl font-bold shadow-xl">预览与订购</button>
      </div>
      
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6">
             <h3 className="text-xl font-bold">微调细节</h3>
             <textarea value={polishInstruction} onChange={(e) => setPolishInstruction(e.target.value)} placeholder="比如：给角色戴一顶帽子..." className="w-full h-24 p-4 bg-gray-50 rounded-xl outline-none" />
             <div className="flex gap-4">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-3 font-bold opacity-50">取消</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">确认微调 (5🌿)</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorMode;
