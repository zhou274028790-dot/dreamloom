
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
      alert("生成画面失败: " + (err.message || "由于内容合规或参数错误，模型拒绝了请求。"));
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
      <div className="flex justify-between items-center px-4">
        <h2 className="text-xl md:text-3xl font-header font-bold" style={{ color: 'var(--text-main)' }}>3. 导演模式</h2>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-none">同步风格</p>
              <p className="text-xs font-bold text-[#EA6F23]">{project.visualStyle}</p>
           </div>
           <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#EA6F23] shadow-lg">
             <img src={project.characterSeedImage} className="w-full h-full object-cover" />
           </div>
        </div>
      </div>

      <div className="relative px-4 mt-6 flex items-center justify-center">
          {/* 左翻页按钮 */}
          <button 
            onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="absolute left-4 md:left-10 z-20 w-14 h-14 bg-white/90 rounded-full shadow-2xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-orange-50"
          >
            <i className="fas fa-chevron-left text-lg"></i>
          </button>

          <div className="w-full max-w-2xl overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {pages.map((page, idx) => (
                <div key={page.id} className="min-w-full flex flex-col items-center gap-8 px-4">
                   <div className="relative w-full aspect-square bg-white rounded-[40px] shadow-2xl overflow-hidden group border border-[var(--border-color)]">
                      {page.imageUrl ? (
                          <img src={page.imageUrl} className={`w-full h-full object-cover transition-all ${page.isGenerating ? 'blur-2xl scale-110' : ''}`} />
                      ) : (
                          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
                            {!page.isGenerating && (
                              <button onClick={() => handleRedraw(idx)} className="btn-candy px-10 py-4 text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl">
                                <i className="fas fa-paint-brush"></i> 开始渲染画面
                              </button>
                            )}
                          </div>
                      )}
                      
                      {page.isGenerating && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                           <div className="w-16 h-16 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin"></div>
                           <p className="text-sm font-bold text-[#EA6F23] tracking-[0.2em] animate-pulse">正在精雕细琢每一像素...</p>
                        </div>
                      )}
                      
                      {page.imageUrl && !page.isGenerating && (
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                          <button onClick={() => handleRedraw(idx)} className="bg-white text-[#EA6F23] px-8 py-3 rounded-2xl text-xs font-bold shadow-2xl border border-orange-100 hover:bg-orange-50 transition-colors">全图重绘 (5🌿)</button>
                          <button onClick={() => setPolishingIndex(idx)} className="bg-white text-blue-600 px-8 py-3 rounded-2xl text-xs font-bold shadow-2xl border border-blue-100 hover:bg-blue-50 transition-colors">局部微调 (5🌿)</button>
                        </div>
                      )}
                   </div>
                   <div className="w-full max-w-xl space-y-4">
                     <textarea 
                      value={page.text} 
                      onChange={(e) => { const np = [...pages]; np[idx].text = e.target.value; setPages(np); onNext({pages: np}); }} 
                      className="w-full p-8 bg-white rounded-[2.5rem] shadow-sm border border-[var(--border-color)] font-bold text-center outline-none resize-none focus:ring-4 focus:ring-[#EA6F23]/5 transition-all min-h-[120px]" 
                      placeholder="在这里续写你的冒险故事..."
                     />
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右翻页按钮 */}
          <button 
            onClick={() => setActiveIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={activeIndex === pages.length - 1}
            className="absolute right-4 md:right-10 z-20 w-14 h-14 bg-white/90 rounded-full shadow-2xl text-[#EA6F23] flex items-center justify-center disabled:opacity-0 transition-all hover:scale-110 active:scale-95 border border-orange-50"
          >
            <i className="fas fa-chevron-right text-lg"></i>
          </button>
      </div>
      
      {/* 分页进度指示 */}
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4 py-4">
        <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar w-full py-2">
          {pages.map((_, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} className={`h-2 rounded-full transition-all ${i === activeIndex ? 'bg-[#EA6F23] w-12' : 'bg-gray-200 w-2 opacity-40'}`}></button>
          ))}
        </div>
        <button 
          onClick={handleAddPages} 
          disabled={isExpanding}
          className="mt-4 px-8 py-3 bg-[#EA6F23]/10 text-[#EA6F23] rounded-2xl font-bold text-sm border border-[#EA6F23]/20 hover:bg-[#EA6F23] hover:text-white transition-all flex items-center gap-3 active:scale-95"
        >
          {isExpanding ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
          增加 4 页后续情节 (10🌿)
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl p-6 border-t border-[var(--border-color)] flex justify-between items-center max-w-7xl mx-auto rounded-t-[3.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.12)] z-50">
        <button onClick={onBack} className="px-10 py-4 font-bold opacity-30 hover:opacity-100 transition-opacity">返回调整角色</button>
        <div className="flex items-center gap-3 px-8 py-3 bg-gray-50 rounded-2xl border border-gray-100">
           <i className="fas fa-book-open text-[#EA6F23] text-xs"></i>
           <span className="text-xs font-black uppercase tracking-[0.2em]">{activeIndex + 1} / {pages.length} 页</span>
        </div>
        <button onClick={() => onNext({ currentStep: 'press' })} className="btn-candy px-14 py-4 text-white rounded-[2rem] font-bold shadow-2xl transform hover:-translate-y-1 transition-all active:scale-95">预览并订购 <i className="fas fa-arrow-right ml-2"></i></button>
      </div>
      
      {polishingIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 space-y-10 shadow-2xl animate-in zoom-in-95">
             <div className="space-y-2">
               <h3 className="text-2xl font-bold font-header">魔棒微调</h3>
               <p className="text-xs opacity-50 font-medium">您可以输入想改变的内容，比如：给它戴个帽子，或者把背景换成雪地。</p>
             </div>
             <textarea value={polishInstruction} onChange={(e) => setPolishInstruction(e.target.value)} placeholder="写下您的微调愿望..." className="w-full h-32 p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none font-bold text-lg" />
             <div className="flex gap-4">
               <button onClick={() => setPolishingIndex(null)} className="flex-1 py-4 font-bold opacity-30">放弃</button>
               <button onClick={handlePolishSubmit} className="flex-1 py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all">确认微调 (5🌿)</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorMode;
