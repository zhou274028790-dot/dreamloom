
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
  const [finalizingStep, setFinalizingStep] = useState<'' | 'upload' | 'analyze' | 'sync'>('');
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
      const images = await generateCharacterOptions(desc, style, roleRefImg, styleRefImg);
      setOptions(images);
      setSelectedImage(images[0]);
    } catch (err: any) {
      alert("生成失败: " + (err.message || "服务器繁忙"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceed = async () => {
    if (!selectedImage) return;
    setFinalizingStep('upload');
    try {
      const charUrl = selectedImage.startsWith('data:') ? await uploadImageToCloud(`chars/${project.id}_${Date.now()}.png`, selectedImage) : selectedImage;
      const sRefUrl = (styleRefImg && styleRefImg.startsWith('data:')) ? await uploadImageToCloud(`styles/${project.id}_${Date.now()}.png`, styleRefImg) : styleRefImg;

      setFinalizingStep('analyze');
      const { pages: fullPages, analyzedCharacterDesc, analyzedStyleDesc } = await finalizeVisualScript(
        project.pages, 
        desc, 
        selectedImage, 
        style,
        styleRefImg
      );
      
      setFinalizingStep('sync');
      onNext({ 
        characterDescription: analyzedCharacterDesc, 
        characterReferenceImage: roleRefImg,
        characterSeedImage: charUrl, 
        visualStyle: style, 
        styleReferenceImage: sRefUrl,
        styleDescription: analyzedStyleDesc,
        pages: fullPages,
        currentStep: 'director' 
      });
    } catch (err) {
      alert("全书脚本同步失败，请检查 API 密钥。");
    } finally {
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
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in pb-10 w-full">
      {finalizingStep !== '' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="card-dynamic p-10 rounded-[3rem] text-center space-y-6 animate-in zoom-in-95">
             <div className="w-16 h-16 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin mx-auto"></div>
             <p className="font-header font-bold text-xl">{finalizingStep === 'upload' ? '正在上传素材...' : finalizingStep === 'analyze' ? '正在分析风格...' : '正在同步分镜...'}</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>2. 形象工作室</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="card-dynamic p-6 rounded-[32px] shadow-xl space-y-6 border border-[var(--border-color)]">
            <div>
              <label className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2 block">角色参考 (可选)</label>
              <div onClick={() => roleInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#EA6F23]/20 bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden group">
                {roleRefImg ? <img src={roleRefImg} className="w-full h-full object-cover" /> : <i className="fas fa-user-plus text-2xl text-[#EA6F23]/20 group-hover:scale-110 transition-transform"></i>}
              </div>
              <input type="file" ref={roleInputRef} className="hidden" onChange={(e) => handleFileUpload(e, setRoleRefImg)} />
            </div>

            <textarea className="w-full h-24 p-4 rounded-2xl bg-gray-50 border border-[var(--border-color)] focus:ring-4 outline-none text-sm font-semibold transition-all resize-none" placeholder="描述你的角色（如：戴草帽的小象波波）" value={desc} onChange={(e) => setDesc(e.target.value)} />

            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)} className={`p-3 rounded-xl text-xs font-bold border transition-all ${style === s.id ? 'bg-[#EA6F23] text-white shadow-md border-transparent' : 'bg-gray-50 border-[var(--border-color)] opacity-70'}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {style === VisualStyle.CUSTOM && (
              <div className="animate-in fade-in">
                <label className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2 block">画风参考 (必选)</label>
                <div onClick={() => styleInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#EA6F23]/20 bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden">
                  {styleRefImg ? <img src={styleRefImg} className="w-full h-full object-cover" /> : <i className="fas fa-palette text-2xl text-[#EA6F23]/20"></i>}
                </div>
                <input type="file" ref={styleInputRef} className="hidden" onChange={(e) => handleFileUpload(e, setStyleRefImg)} />
              </div>
            )}

            <button onClick={handleGenerate} disabled={isGenerating || (style === VisualStyle.CUSTOM && !styleRefImg)} className="btn-candy w-full py-4 text-white rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50">
              {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              生成形象方案 (5 🌿)
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 card-dynamic p-4 rounded-[32px] shadow-2xl flex flex-col items-center justify-center min-h-[500px] border border-[var(--border-color)] bg-white relative overflow-hidden">
          {selectedImage ? (
            <div className="w-full h-full flex flex-col items-center animate-in zoom-in-95">
              <div className="w-full flex-1 flex items-center justify-center p-4">
                 <img src={selectedImage} className="max-w-full max-h-[500px] object-contain rounded-2xl shadow-xl" />
              </div>
              {options.length > 1 && (
                <div className="flex gap-4 p-4 bg-gray-50 w-full border-t border-[var(--border-color)] overflow-x-auto no-scrollbar">
                  {options.map((img, i) => (
                    <img key={i} onClick={() => setSelectedImage(img)} src={img} className={`w-24 h-24 rounded-xl cursor-pointer border-4 transition-all flex-shrink-0 ${selectedImage === img ? 'border-[#EA6F23] scale-105' : 'border-transparent opacity-40'}`} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 opacity-10">
               <i className="fas fa-id-badge text-8xl"></i>
               <p className="font-bold tracking-widest uppercase">设计主角形象以继续</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-8">
        <button onClick={onBack} className="px-8 py-3 font-bold opacity-40">返回</button>
        <button onClick={handleProceed} disabled={!selectedImage || finalizingStep !== ''} className="btn-candy px-12 py-4 text-white rounded-[24px] font-bold shadow-xl">
          确认形象并同步全书 <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
};

export default CharacterStudio;
