
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
  
  useEffect(() => {
    if (project.pages.length > 0) setPages(project.pages);
  }, [project.pages]);

  const handleApiError = (err: any) => {
    if (err.message === "KEY_EXPIRED") {
      alert("检测到 API 密钥权限不足或已过期，请重新授权。");
      window.location.reload(); 
    } else {
      alert("生成画面失败: " + (err.message || "模型拒绝了该请求，请尝试修改描述。"));
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
      text: '在这里输入新情节...',
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
      <div className="flex justify-between items-center px-4">
        <h2 className="text-xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
        <div className="flex items-center gap-3">
           <div className="text-right">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-none">锁定画风</p>
              <p className="text-xs font-bold text-[#EA6F23]">{project.visualStyle}</p>
           </div>
           <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#EA6F23]/20 shadow-sm">
             <img src={project.characterSeedImage} className="w-full h-full object-cover" />
           </div>
        </div>
      </div>

      <div className="relative px-4 mt-6 flex items-center justify-center">
          {/* 左翻页按钮 */}
          <button 
            onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="absolute left-6 z-20 w-12 h-12 bg-white/90 rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="w-full max-w-2xl overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {pages.map((page, idx) => (
                <div key={page.id} className="min-w-full flex flex-col items-center gap-8 px-4">
                   <div className="relative w-full aspect-square bg-white rounded-[40px] shadow-2xl overflow-hidden group border border-[var(--border-color)]">
                      {page.imageUrl ? (
                          <img src={page.imageUrl} className={`w-full h-full object-cover transition-all ${page.isGenerating ? 'blur-xl scale-110' : ''}`} />
                      ) : (
                          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
                            {!page.isGenerating && (
                              <button onClick={() => handleRedraw(idx)} className="btn-candy px-8 py-3 text-white rounded-xl font-bold flex items-center gap-2">
                                <i className="fas fa-paint-brush"></i> 开始渲染
                              </button>
                            )}
                          </div>
                      )}
                      
                      {page.isGenerating && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                           <div className="w-12 h-12 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin"></div>
                           <p className="text-xs font-bold text-[#EA6F23] tracking-widest animate-pulse">正在编织画面...</p>
                        </div>
                      )}
                      
                      {page.imageUrl && !page.isGenerating && (
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleRedraw(idx)} className="bg-white/90 backdrop-blur text-[#EA6F23] px-6 py-2.5 rounded-xl text-xs font-bold shadow-xl border border-orange-100 hover:bg-[#EA6F23] hover:text-white transition-colors">重绘 (5🌿)</button>
                          <button onClick={() => setPolishingIndex(idx)} className="bg-white/90 backdrop-blur text-blue-600 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">微调 (5🌿)</button>
                        </div>
                      )}
                   </div>
                   <textarea 
                    value={page.text} 
                    onChange={(e) => { const np = [...pages]; np[idx].text = e.target.value; setPages(np); onNext({pages: np}); }} 
                    className="w-full max-w-xl p-6 bg-white rounded-[2rem] shadow-sm border border-[var(--border-color)] font-bold text-center outline-none resize-none focus:ring-2 focus:ring-[#EA6F23]/10" 
                    placeholder="输入本页故事..."
                   />
                </div>
              ))}
            </div>
          </div>

          {/* 右翻页按钮 */}
          <button 
            onClick={() => setActiveIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={activeIndex === pages.length - 1}
            className="absolute right-6 z-20 w-12 h-12 bg-white/90 rounded-full shadow-xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
      </div>
      
      {/* 底部导航点 */}
      <div className="max-w-2xl mx-auto px-4 flex justify-center gap-2 overflow-x-auto no-scrollbar py-4">
        {pages.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)} className={`h-2 rounded-full transition-all ${i === activeIndex ? 'bg-[#EA6F23] w-10' : 'bg-gray-300 w-2 opacity-50'}`}></button>
        ))}
      </div>

      <div className="flex justify-center mt-4">
         <button 
           onClick={handleAddPages} 
           disabled={isExpanding}
           className="px-6 py-3 bg-[#EA6F23]/10 text-[#EA6F23] rounded-2xl font-bold text-sm border border-[#EA6F23]/20 hover:bg-[#EA6F23] hover:text-white transition-all flex items-center gap-2"
         >
           {isExpanding ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
           增加 4 页正文 (10🌿)
         </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl p-5 border-t border-[var(--border-color)] flex justify-between items-center max-w-7xl mx-auto rounded-t-[3rem] shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.1)] z-50">
        <button onClick={onBack} className="px-10 py-4 font-bold opacity-40 hover:opacity-100 transition-opacity">上一步</button>
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 rounded-2xl border">
           <i className="fas fa-book-open text-[#EA6F23] text-xs"></i>
           <span className="text-xs font-black uppercase tracking-widest">{activeIndex + 1} / {pages.length} 页</span>
        </div>
        <button onClick={() => onNext({ currentStep: 'press' })} className="btn-candy px-12 py-4 text-white rounded-2xl font-bold shadow-2xl">预览全书 <i className="fas fa-arrow-right ml-2"></i></button>
      </div>
      
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in-95">
             <h3 className="text-2xl font-bold font-header">魔棒微调</h3>
             <textarea value={polishInstruction} onChange={(e) => setPolishInstruction(e.target.value)} placeholder="比如：把角色的背景换成森林，或者让它戴上帽子..." className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium" />
             <div className="flex gap-4">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-4 font-bold opacity-40">取消</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">确认重绘</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorMode;
