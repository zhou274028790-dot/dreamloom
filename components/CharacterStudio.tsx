
import React, { useState, useRef } from 'react';
import { BookProject, VisualStyle, Language } from '../types';
import { generateCharacterOptions, finalizeVisualScript } from '../services/geminiService';
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

const CharacterStudio: React.FC<Props> = ({ project, onNext, onBack, userCoins, deductCoins, lang, isDark }) => {
  const [desc, setDesc] = useState(project.characterDescription);
  const [style, setStyle] = useState<VisualStyle>(project.visualStyle);
  const [roleRefImg, setRoleRefImg] = useState<string | undefined>(project.characterReferenceImage);
  const [styleRefImg, setStyleRefImg] = useState<string | undefined>(project.styleReferenceImage);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalizingStep, setFinalizingStep] = useState<'' | 'style-analysis' | 'role-analysis' | 'sync' | 'uploading'>('');
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
    setFinalizingStep('uploading');
    
    try {
      // 1. First, upload images to cloud to get permanent URLs
      let finalCharacterUrl = selectedImage;
      if (selectedImage.startsWith('data:')) {
        finalCharacterUrl = await uploadImageToCloud(`characters/${project.id}_seed.png`, selectedImage);
      }
      
      let finalStyleUrl = styleRefImg;
      if (styleRefImg && styleRefImg.startsWith('data:')) {
        finalStyleUrl = await uploadImageToCloud(`styles/${project.id}_ref.png`, styleRefImg);
      }

      setFinalizingStep('style-analysis');
      const { pages: fullPages, analyzedCharacterDesc, analyzedStyleDesc } = await finalizeVisualScript(
        project.pages, 
        desc, 
        selectedImage, // Still use base64 for Gemini call if needed, or URL
        style,
        styleRefImg
      );
      
      setFinalizingStep('sync');
      onNext({ 
        characterDescription: analyzedCharacterDesc, 
        characterReferenceImage: roleRefImg,
        characterSeedImage: finalCharacterUrl, 
        visualStyle: style, 
        styleReferenceImage: finalStyleUrl,
        styleDescription: analyzedStyleDesc,
        pages: fullPages,
        currentStep: 'director' 
      });
      setFinalizingStep('');
    } catch (err) {
      console.error(err);
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
                  {finalizingStep === 'uploading' ? '☁️ 正在上传视觉素材...' :
                   finalizingStep === 'style-analysis' ? '🎨 正在分析自定义画风...' : 
                   finalizingStep === 'role-analysis' ? '🔍 正在分析视觉特征...' : '🖋️ 正在同步故事脚本...'}
                </p>
                <p className="text-sm opacity-50 font-medium leading-relaxed">正在确保全书的视觉表现力完美统一。</p>
             </div>
          </div>
        </div>
      )}

      {/* Existing UI for inputs and previews... (Omitted for brevity, matches your existing layout) */}
      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>2. 角色工作室</h2>
        <p className="text-sm md:text-lg opacity-60 font-medium">{lang === 'zh' ? '设计主角形象并锁定画风，我们将为您生成后续分镜' : 'Design your hero and style'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full">
        {/* Left Column Controls */}
        <div className="lg:col-span-4 space-y-6 w-full">
          <div className="card-dynamic p-4 md:p-6 rounded-[24px] shadow-xl space-y-6">
             {/* Upload fields and style selection (identical to before) */}
             <div>
              <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-3 flex justify-between items-center">
                角色参考 (可选)
              </label>
              <div onClick={() => roleInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#EA6F23]/20 bg-[var(--text-main)]/5 flex items-center justify-center cursor-pointer overflow-hidden">
                {roleRefImg ? <img src={roleRefImg} className="w-full h-full object-cover" /> : <i className="fas fa-image text-2xl text-[#EA6F23]/30"></i>}
              </div>
              <input type="file" ref={roleInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setRoleRefImg)} />
            </div>

            <textarea className="w-full h-24 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] focus:ring-4 outline-none text-sm font-semibold transition-all resize-none shadow-inner" placeholder="戴蓝围巾的小橘猫..." value={desc} onChange={(e) => setDesc(e.target.value)} />

            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)} className={`p-3 rounded-xl text-xs font-bold transition-all border ${style === s.id ? 'bg-[#EA6F23] text-white shadow-md' : 'bg-[var(--text-main)]/5 text-[var(--text-sub)] border-[var(--border-color)]'}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={isGenerating} className="btn-candy w-full py-4 text-white rounded-2xl font-bold flex items-center justify-center gap-3">
              {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              生成形象方案 (5 🌿)
            </button>
          </div>
        </div>

        {/* Right Column Preview */}
        <div className="lg:col-span-8 card-dynamic p-4 md:p-6 rounded-[24px] flex flex-col items-center justify-center min-h-[400px] shadow-xl w-full">
          {selectedImage ? (
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 animate-in zoom-in-95">
              <img src={selectedImage} className="max-w-full max-h-[400px] object-contain rounded-[24px]" />
              {options.length > 1 && (
                <div className="flex gap-4 p-3 bg-[var(--text-main)]/5 rounded-[32px] overflow-x-auto w-full no-scrollbar">
                  {options.map((img, i) => (
                    <img key={i} onClick={() => setSelectedImage(img)} src={img} className={`w-20 h-20 rounded-2xl border-4 transition-all flex-shrink-0 ${selectedImage === img ? 'border-[#EA6F23] scale-105' : 'border-transparent opacity-60'}`} />
                  ))}
                </div>
              )}
            </div>
          ) : <p className="opacity-20 uppercase tracking-widest text-xs">设计主角形象以继续</p>}
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-[var(--border-color)]">
        <button onClick={onBack} className="px-8 py-3 bg-[var(--text-main)]/5 text-[var(--text-sub)] rounded-xl font-bold">返回修改</button>
        <button onClick={handleProceed} disabled={!selectedImage || (style === VisualStyle.CUSTOM && !styleRefImg) || finalizingStep !== ''} className="btn-candy px-12 py-4 text-white rounded-[24px] font-bold shadow-xl">
          锁定并一键出片 <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
};

export default CharacterStudio;
