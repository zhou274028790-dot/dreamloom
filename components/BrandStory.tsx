
import React from 'react';
import { Language } from '../types';

const BrandStory: React.FC<{ lang: Language, isDark?: boolean }> = ({ lang, isDark }) => {
  const t = {
    zh: {
      title: '关于 DreamLoom',
      vision: '让每个孩子的梦想都变成现实。',
      storyTitle: '品牌故事',
      storyDesc: 'DreamLoom 诞生于一次关于“魔法”的对话。我们相信，每个孩子都是天生的创作者。利用最先进的生成式 AI 技术，我们正在降低创作门槛，让那些关于彩虹、怪兽和星际旅行的故事，不再只存在于脑海中，而是可以被翻阅、被分享、被珍藏。',
      productTitle: '不仅是数字，更是温度',
      productDesc: '我们提供精美的实体绘本定制服务。精装硬壳、加厚铜版纸、环保油墨印刷，确保每一个笔触、每一种色彩都能完美呈现。',
      cta: '立即开启创作之旅'
    },
    en: {
      title: 'About DreamLoom',
      vision: 'Making every child\'s dream a reality.',
      storyTitle: 'Our Story',
      storyDesc: 'DreamLoom was born from a conversation about "magic". We believe every child is a natural creator. By leveraging advanced generative AI, we are lowering the barrier to creation, allowing stories about rainbows, monsters, and space travel to move from imagination into physical books that can be read, shared, and cherished.',
      productTitle: 'More Than Digital',
      productDesc: 'We offer premium physical book customization. Hardcover binding, thick art paper, and eco-friendly ink ensure every stroke and color is perfectly presented.',
      cta: 'Start Creating Now'
    }
  }[lang];

  return (
    <div className="max-w-4xl mx-auto space-y-12 md:space-y-16 animate-in fade-in duration-700 w-full">
      <div className="text-center space-y-4 md:space-y-6">
        <h2 className="text-3xl md:text-5xl font-header font-bold">{t.title}</h2>
        <p className="text-xl md:text-2xl text-orange-500 font-medium italic">"{t.vision}"</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center w-full">
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><i className="fas fa-feather-pointed"></i></span>
            {t.storyTitle}
          </h3>
          <p className="opacity-70 leading-relaxed text-base md:text-lg">
            {t.storyDesc}
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-orange-200/30 rounded-[3rem] blur-2xl"></div>
          <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80" className="relative rounded-[2.5rem] shadow-2xl border-4 border-[var(--card-bg)] w-full" alt="Writing" />
        </div>
      </div>

      <div className="card-dynamic rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 space-y-8 md:space-y-10 w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 md:space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold">{t.productTitle}</h3>
          <p className="opacity-60 leading-relaxed text-sm md:text-base">{t.productDesc}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MockupImage src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80" label="精装硬壳" />
          <MockupImage src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80" label="优质纸张" />
          <MockupImage src="https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80" label="色彩还原" />
          <MockupImage src="https://images.unsplash.com/photo-1491843351663-8511e0dc2072?auto=format&fit=crop&w=400&q=80" label="顺丰直达" />
        </div>
      </div>
    </div>
  );
};

const MockupImage: React.FC<{ src: string, label: string }> = ({ src, label }) => (
  <div className="space-y-3 group cursor-pointer text-center">
    <div className="aspect-square rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-all group-hover:-translate-y-1 border border-[var(--border-color)]">
      <img src={src} className="w-full h-full object-cover" alt={label} />
    </div>
    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{label}</p>
  </div>
);

export default BrandStory;
