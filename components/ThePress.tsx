
import React, { useState } from 'react';
import { BookProject, Language } from '../types';

interface Props {
  project: BookProject;
  onBack: () => void;
  lang: Language;
  isDark?: boolean;
}

const ThePress: React.FC<Props> = ({ project, onBack, lang, isDark }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  
  const pages = Array.isArray(project.pages) ? project.pages : [];
  // 如果项目中没有提取码（旧项目），显示默认占位
  const extractionCode = project.extractionCode || "DREAM-01"; 

  const handleOrderClick = (planName: string) => {
    setSelectedPlan(planName);
    setShowOrderModal(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(extractionCode);
    alert(lang === 'zh' ? '提取码已复制到剪贴板！' : 'Code copied to clipboard!');
  };

  const t = {
    zh: {
      digital: '标准数字版', digitalPrice: '39.9', digitalRights: '数字版权、云端永久储存（标准画质）',
      basic: '精装实物版', basicPrice: '128', basicRights: '高清原图、蝴蝶装帧、实物顺丰到家',
      gift: '至尊礼盒版', giftPrice: '198', giftRights: '高清原图、奢华礼盒、艺术纸张精印',
      buy: '立即订购',
      viewHint: '点击两侧翻页',
      noContent: '还没有创作内容哦，快去开始吧！',
      startCreating: '开始创作',
      page: '页',
      back: '返回修改',
      previewMode: '标准预览模式 (非高清)',
      archived: '已归档',
      modalTitle: '作品已归档！',
      modalCodeLabel: '专属 【作品提取码】：',
      modalInstruction: '然后前往【DreamLoom 小红书店】下单，备注此码即可。',
      copySuccess: '点击复制',
      goShop: '前往小红书店',
      close: '稍后再说'
    },
    en: {
      digital: 'Standard Digital', digitalPrice: '39.9', digitalRights: 'Standard Quality, Cloud Storage',
      basic: 'Hardcover Print', basicPrice: '128', basicRights: 'HD Original, Butterfly binding, Shipping',
      gift: 'Deluxe Gift Box', giftPrice: '198', giftRights: 'HD Original, Premium Paper, Gift Box',
      buy: 'Order Now',
      viewHint: 'Tap sides to flip',
      noContent: 'No content yet. Let\'s start!',
      startCreating: 'Start',
      page: 'Page',
      back: 'Edit',
      previewMode: 'Standard Preview (Low-res)',
      archived: 'Archived',
      modalTitle: 'Work Archived!',
      modalCodeLabel: 'Exclusive [Extraction Code]:',
      modalInstruction: 'Go to [DreamLoom Red Store] and leave this code in the notes.',
      copySuccess: 'Click to Copy',
      goShop: 'Visit Store',
      close: 'Later'
    }
  }[lang];

  if (pages.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 md:py-32 text-center space-y-8 animate-in px-4">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-[#EA6F23]/10 rounded-full flex items-center justify-center mx-auto text-[#EA6F23]/30 text-4xl md:text-5xl">
          <i className="fas fa-book-open"></i>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{t.noContent}</h2>
          <p className="opacity-50 font-medium text-sm md:text-base">生成完页面后，点击“预览精美绘本”即可在此查看。</p>
        </div>
        <button onClick={onBack} className="btn-candy px-10 py-4 text-white rounded-2xl font-bold shadow-xl">
          {t.startCreating}
        </button>
      </div>
    );
  }

  const currentPage = pages[currentIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 py-4 animate-in pb-24 w-full relative">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-4xl font-header font-bold tracking-tight leading-tight px-4" style={{ color: 'var(--text-main)' }}>
          {project.title || "奇妙故事集"}
        </h2>
        <div className="flex flex-col items-center gap-2">
           <div className="flex items-center justify-center gap-3">
            <span className="h-[2px] w-6 bg-[#EA6F23]/20 rounded-full"></span>
            <p className="opacity-30 font-black uppercase tracking-[0.4em] text-[10px]" style={{ color: 'var(--text-main)' }}>{t.viewHint}</p>
            <span className="h-[2px] w-6 bg-[#EA6F23]/20 rounded-full"></span>
          </div>
          <span className="text-[10px] bg-[#EA6F23]/10 text-[#EA6F23] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
            {t.previewMode}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center w-full">
        <div className="w-full max-w-2xl card-dynamic shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col relative">
          
          <div className="relative aspect-square w-full bg-[var(--text-main)]/5 flex items-center justify-center overflow-hidden">
            {currentPage?.imageUrl ? (
              <img 
                key={`img-${currentIndex}`}
                src={currentPage.imageUrl} 
                className="w-full h-full object-cover transition-opacity duration-500" 
                alt={`Page ${currentIndex + 1}`} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#EA6F23]/20 gap-5">
                <i className="fas fa-palette text-4xl opacity-20"></i>
                <span className="text-xs font-bold opacity-40 italic">图片尚未渲染</span>
              </div>
            )}
            
            <div className="absolute left-0 inset-y-0 w-1/4 cursor-w-resize z-20" onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}></div>
            <div className="absolute right-0 inset-y-0 w-1/4 cursor-e-resize z-20" onClick={() => setCurrentIndex(c => Math.min(pages.length - 1, c + 1))}></div>
            
            {currentIndex > 0 && (
              <button onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[var(--card-bg)]/90 backdrop-blur rounded-full flex items-center justify-center text-[#EA6F23] shadow-xl z-30 border border-[#EA6F23]/10">
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            {currentIndex < pages.length - 1 && (
              <button onClick={() => setCurrentIndex(c => Math.min(pages.length - 1, c + 1))} className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[var(--card-bg)]/90 backdrop-blur rounded-full flex items-center justify-center text-[#EA6F23] shadow-xl z-30 border border-[#EA6F23]/10">
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
          
          <div className="px-6 py-8 md:px-10 md:py-12 min-h-[150px] md:min-h-[200px] flex items-center justify-center text-center bg-transparent border-t border-[var(--border-color)]">
            <p key={`text-${currentIndex}`} className="text-lg md:text-2xl leading-relaxed font-semibold italic animate-in" style={{ color: 'var(--text-main)' }}>
              {currentPage?.text || "..."}
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="px-8 py-2.5 bg-[#EA6F23] text-white rounded-full font-bold text-sm shadow-lg tracking-widest">
            {currentIndex + 1} / {pages.length}
          </div>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em] italic" style={{ color: 'var(--text-main)' }}>
            {currentPage?.type === 'cover' ? 'Title Page' : currentPage?.type === 'back' ? 'Closing' : 'Scene'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 w-full">
        <PriceCard title={t.digital} price={t.digitalPrice} rights={t.digitalRights} btn={t.buy} primary={false} onClick={() => handleOrderClick(t.digital)} />
        <PriceCard title={t.basic} price={t.basicPrice} rights={t.basicRights} btn={t.buy} primary={true} onClick={() => handleOrderClick(t.basic)} />
        <PriceCard title={t.gift} price={t.giftPrice} rights={t.giftRights} btn={t.buy} primary={false} onClick={() => handleOrderClick(t.gift)} />
      </div>

      <div className="text-center pt-6 md:pt-10">
        <button onClick={onBack} className="opacity-40 font-bold hover:text-[#EA6F23] hover:opacity-100 transition-all flex items-center gap-2 mx-auto px-6 py-2" style={{ color: 'var(--text-main)' }}>
          <i className="fas fa-long-arrow-alt-left"></i> {t.back}
        </button>
      </div>

      {/* Order Dialog */}
      {showOrderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowOrderModal(false)}></div>
          <div className="relative bg-[var(--card-bg)] p-8 md:p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 max-w-lg w-full zoom-in-95 border border-[var(--border-color)]">
             <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] flex items-center justify-center text-white text-5xl mx-auto shadow-xl animate-bounce">
                <i className="fas fa-check-circle"></i>
             </div>
             <div className="space-y-4">
                <h3 className="text-3xl font-bold font-header" style={{ color: 'var(--text-main)' }}>您的作品《{project.title || "奇妙故事集"}》已归档！</h3>
                <div className="p-6 bg-[#EA6F23]/5 rounded-3xl border border-[#EA6F23]/20 space-y-3 group cursor-pointer active:scale-95 transition-all" onClick={handleCopyCode}>
                   <p className="text-xs font-black opacity-40 uppercase tracking-widest">{t.modalCodeLabel}</p>
                   <div className="text-4xl font-black text-[#EA6F23] tracking-tighter">{extractionCode}</div>
                   <p className="text-[10px] font-bold text-[#EA6F23] animate-pulse">( {t.copySuccess} )</p>
                </div>
                <p className="opacity-60 font-medium leading-relaxed px-4">{t.modalInstruction}</p>
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => window.open('https://www.xiaohongshu.com', '_blank')} className="btn-candy w-full py-5 text-white rounded-[2rem] font-bold shadow-2xl text-lg">
                 {t.goShop} <i className="fas fa-external-link-alt ml-2"></i>
               </button>
               <button onClick={() => setShowOrderModal(false)} className="w-full py-3 text-[var(--text-sub)] font-bold text-sm hover:text-[var(--text-main)]">
                 {t.close}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PriceCard: React.FC<{ title: string, price: string, rights: string, btn: string, primary: boolean, onClick: () => void }> = ({ title, price, rights, btn, primary, onClick }) => (
  <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center gap-4 md:gap-6 border transition-all hover:-translate-y-2 ${primary ? 'bg-[#EA6F23] text-white shadow-2xl border-orange-400 scale-105' : 'card-dynamic border-[var(--border-color)] shadow-xl'}`}>
     <h4 className={`text-lg font-bold font-header ${primary ? 'text-white' : 'text-[#EA6F23]'}`}>{title}</h4>
     <div className="text-center">
        <div className="text-3xl font-bold font-header" style={{ color: primary ? 'white' : 'var(--text-main)' }}>¥ {price}</div>
     </div>
     <div className="w-full h-[1px] bg-current opacity-10"></div>
     <p className={`text-xs text-center leading-relaxed h-auto md:h-10 flex items-center font-medium ${primary ? 'text-white/80' : 'opacity-50'}`} style={{ color: primary ? undefined : 'var(--text-main)' }}>{rights}</p>
     <button onClick={onClick} className={`w-full py-3.5 rounded-2xl font-black shadow-md transition-all active:scale-95 ${primary ? 'bg-white text-[#EA6F23] hover:bg-orange-50' : 'bg-[#EA6F23] text-white hover:bg-[#EA6F23]/90'}`}>
       {btn}
     </button>
  </div>
);

export default ThePress;
