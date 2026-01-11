
import React, { useState, useRef } from 'react';
import { BookProject, VisualStyle, Language } from '../types';
import { generateCharacterOptions, finalizeVisualScript } from '../services/geminiService';

interface Props {
  project: BookProject;
  onNext: (updates: Partial<BookProject>) => void;
  onBack: () => void;
  userCoins: number;
  deductCoins: (amount: number) => boolean;
  lang: Language;
  isDark?: boolean;
}

const CharacterStudio: React.FC<Props> = ({ project, onNext, onBack, userCoins, deductCoins, lang, isDark }) => {
  const [desc, setDesc] = useState(project.characterDescription);
  const [style, setStyle] = useState<VisualStyle>(project.visualStyle);
  const [roleRefImg, setRoleRefImg] = useState<string | undefined>(project.characterReferenceImage);
  const [styleRefImg, setStyleRefImg] = useState<string | undefined>(project.styleReferenceImage);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalizingStep, setFinalizingStep] = useState<'' | 'style-analysis' | 'role-analysis' | 'sync'>('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(project.characterSeedImage || null);
  
  const roleInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!desc.trim() && !roleRefImg) return;
    if (!deductCoins(5)) return;
    setIsGenerating(true);
    try {
      const images = await generateCharacterOptions(desc, style, roleRefImg);
      setOptions(images);
      setSelectedImage(images[0]);
    } catch (err) {
      alert("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceed = async () => {
    if (!selectedImage) return;
    setFinalizingStep('style-analysis');
    try {
      const { pages: fullPages, analyzedCharacterDesc, analyzedStyleDesc } = await finalizeVisualScript(
        project.pages, 
        desc, 
        selectedImage,
        style,
        styleRefImg
      );
      
      setFinalizingStep('sync');
      setTimeout(() => {
        onNext({ 
          characterDescription: analyzedCharacterDesc, 
          characterReferenceImage: roleRefImg,
          characterSeedImage: selectedImage, 
          visualStyle: style, 
          styleReferenceImage: styleRefImg,
          styleDescription: analyzedStyleDesc,
          pages: fullPages,
          currentStep: 'director' 
        });
        setFinalizingStep('');
      }, 1000);
    } catch (err) {
      alert("Finalizing script failed.");
      setFinalizingStep('');
    }
  };

  const styles = [
    { id: VisualStyle.WATERCOLOR, icon: '🎨', label: '柔和水彩' },
    { id: VisualStyle.OIL_PAINTING, icon: '🖼️', label: '经典油画' },
    { id: VisualStyle.VINTAGE, icon: '🎞️', label: '复古画报' },
    { id: VisualStyle.FLAT_ART, icon: '📐', label: '艺术扁平' },
    { id: VisualStyle.GHIBLI, icon: '🌿', label: '宫崎骏风' },
    { id: VisualStyle.PIXAR_3D, icon: '🏰', label: '迪士尼风' },
    { id: VisualStyle.CRAYON, icon: '🖍️', label: '手绘蜡笔' },
    { id: VisualStyle.PAPER_CUT, icon: '✂️', label: '艺术剪纸' },
    { id: VisualStyle.CUSTOM, icon: '✨', label: '自定义风格' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 w-full">
      {finalizingStep !== '' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="card-dynamic p-6 md:p-10 rounded-[32px] shadow-2xl text-center space-y-6 max-w-sm w-full animate-in zoom-in-95">
             <div className="w-16 h-16 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin mx-auto"></div>
             <div className="space-y-2">
                <p className="font-header font-bold text-[var(--text-main)] text-xl">
                  {finalizingStep === 'style-analysis' ? '🎨 正在分析自定义画风...' : 
                   finalizingStep === 'role-analysis' ? '🔍 正在分析视觉特征...' : '🖋️ 正在同步故事脚本...'}
                </p>
                <p className="text-sm opacity-50 font-medium leading-relaxed">正在确保全书的视觉表现力完美统一。</p>
             </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{lang === 'zh' ? '2. 角色工作室' : '2. Character Studio'}</h2>
        <p className="text-sm md:text-lg opacity-60 font-medium">{lang === 'zh' ? '设计主角形象并锁定画风，我们将为您生成后续分镜' : 'Design your hero and style'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full">
        {/* Input Column - Full width on mobile, 4 columns on desktop */}
        <div className="lg:col-span-4 space-y-6 w-full">
          <div className="card-dynamic p-4 md:p-6 rounded-[24px] shadow-xl space-y-6 md:sticky md:top-24">
            {/* 角色参考图上传 */}
            <div>
              <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-3 flex justify-between items-center">
                角色参考 (可选)
                {roleRefImg && <button onClick={() => setRoleRefImg(undefined)} className="text-red-400 hover:text-red-500"><i className="fas fa-times"></i></button>}
              </label>
              <div 
                onClick={() => roleInputRef.current?.click()}
                className={`w-full aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${roleRefImg ? 'border-transparent' : 'border-[#EA6F23]/20 bg-[var(--text-main)]/5 hover:bg-[#EA6F23]/5 hover:border-[#EA6F23]/40'}`}
              >
                {roleRefImg ? (
                  <img src={roleRefImg} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-image text-2xl text-[#EA6F23]/30 mb-2"></i>
                    <p className="text-[10px] font-bold text-[#EA6F23]/40">上传参考照片</p>
                  </>
                )}
              </div>
              <input type="file" ref={roleInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setRoleRefImg)} />
            </div>

            <div>
              <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-3">形象关键词</label>
              <textarea
                className="w-full h-24 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] focus:ring-4 focus:ring-[#EA6F23]/10 outline-none text-sm font-semibold transition-all resize-none text-[var(--text-main)] placeholder:text-[var(--text-sub)] shadow-inner"
                placeholder="例如：戴蓝围巾的小橘猫..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-3">选择画风</label>
              <div className="grid grid-cols-2 gap-2">
                {styles.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setStyle(s.id)} 
                    className={`p-3 rounded-xl text-xs font-bold transition-all border ${style === s.id ? 'bg-[#EA6F23] text-white shadow-md border-transparent' : 'bg-[var(--text-main)]/5 text-[var(--text-sub)] border-[var(--border-color)] hover:bg-[#EA6F23]/5 hover:text-[#EA6F23]'}`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义画风上传区 */}
            {style === VisualStyle.CUSTOM && (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-3 flex justify-between items-center">
                  画风参考图
                  {styleRefImg && <button onClick={() => setStyleRefImg(undefined)} className="text-red-400 hover:text-red-500"><i className="fas fa-times"></i></button>}
                </label>
                <div 
                  onClick={() => styleInputRef.current?.click()}
                  className={`w-full aspect-[4/1] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center cursor-pointer overflow-hidden ${styleRefImg ? 'border-transparent' : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'}`}
                >
                  {styleRefImg ? (
                    <img src={styleRefImg} className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-[10px] font-bold text-blue-500/60"><i className="fas fa-magic mr-2"></i>上传你喜欢的画风图</p>
                  )}
                </div>
                <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setStyleRefImg)} />
              </div>
            )}

            <button onClick={handleGenerate} disabled={isGenerating} className="btn-candy w-full py-4 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50">
              {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              {lang === 'zh' ? '生成形象方案 (5 🌿)' : 'Generate (5 🌿)'}
            </button>
          </div>
        </div>

        {/* Preview Column - Full width on mobile, 8 columns on desktop */}
        <div className="lg:col-span-8 card-dynamic p-4 md:p-6 rounded-[24px] flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] relative overflow-hidden shadow-xl w-full">
          {selectedImage ? (
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 animate-in zoom-in-95">
              <div className="relative flex-1 w-full max-h-[600px] rounded-[24px] overflow-hidden bg-[var(--text-main)]/5 border border-[var(--border-color)]">
                 <img src={selectedImage} className="w-full h-full object-contain p-4" alt="Selected" />
                 <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-[#EA6F23] text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-xl border-4 border-[var(--card-bg)] animate-in zoom-in-50"><i className="fas fa-check text-xs md:text-base"></i></div>
              </div>
              
              {options.length > 1 && (
                <div className="flex gap-4 p-3 bg-[var(--text-main)]/5 rounded-[32px] border border-[var(--border-color)] overflow-x-auto max-w-full no-scrollbar w-full">
                  {options.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImage(img)} className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 transition-all flex-shrink-0 shadow-sm ${selectedImage === img ? 'border-[#EA6F23] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}>
                      <img src={img} className="w-full h-full object-cover rounded-xl" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-20">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[var(--text-main)]/10 rounded-full flex items-center justify-center mx-auto text-3xl md:text-4xl">
                 <i className="fas fa-user-astronaut"></i>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">{lang === 'zh' ? '设计主角形象以继续' : 'DESIGN CHARACTER TO PROCEED'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-6 md:pt-8 border-t border-[var(--border-color)] w-full">
        <button onClick={onBack} className="w-full md:w-auto px-8 py-3 bg-[var(--text-main)]/5 text-[var(--text-sub)] rounded-xl font-bold hover:bg-[#EA6F23]/5 hover:text-[#EA6F23] transition-colors border border-transparent text-sm">返回修改故事</button>
        <button 
          onClick={handleProceed} 
          disabled={!selectedImage || (style === VisualStyle.CUSTOM && !styleRefImg) || finalizingStep !== ''} 
          className="btn-candy w-full md:w-auto px-12 py-4 text-white rounded-[24px] font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-sm md:text-base"
        >
          {lang === 'zh' ? '锁定并一键出片' : 'Lock & Generate All'} 
          <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
        </button>
      </div>
    </div>
  );
};

export default CharacterStudio;
