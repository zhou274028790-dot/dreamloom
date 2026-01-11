
import React, { useState, useRef } from 'react';
import { BookProject, StoryTemplate } from '../types';
import { generateStoryOutline } from '../services/geminiService';

interface Props {
  project: BookProject;
  onNext: (updates: Partial<BookProject>) => void;
  lang?: string;
  isDark?: boolean;
}

const IdeaSpark: React.FC<Props> = ({ project, onNext, lang = 'zh', isDark = false }) => {
  const [idea, setIdea] = useState(project.originalIdea);
  const [template, setTemplate] = useState<StoryTemplate>(project.template);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const templates = [
    { 
      id: StoryTemplate.HERO_JOURNEY, 
      icon: 'fa-shield-halved', 
      desc: lang === 'zh' ? '勇敢的小英雄的伟大冒险。' : 'A grand adventure for a brave hero.', 
      examples: [
        '一只勇敢的小仓鼠决定穿过客厅，去寻找传说中的巨大芝士山。',
        '小象波波第一次独自去森林深处寻找甜甜泉。',
        '机器猫布鲁想要飞向蓝天，他用废旧零件做了一对翅膀。',
        '一只害羞的萤火虫在漆黑的暴雨夜指引迷路的小鹿回家。',
        '勇敢的小骑士奥利弗出发去说服火龙不要再打喷嚏烧毁森林。'
      ] 
    },
    { 
      id: StoryTemplate.SEARCH_AND_FIND, 
      icon: 'fa-magnifying-glass', 
      desc: lang === 'zh' ? '为小侦探准备的互动乐趣。' : 'Interactive fun for little detectives.', 
      examples: [
        '在热闹的动物森林里，狮子国王丢了他的皇冠，你能帮他在树丛里找到它吗？',
        '调皮的彩色袜子在洗衣机里捉迷藏，快去阁楼和地毯下找找。'
      ] 
    },
    { 
      id: StoryTemplate.BEDTIME_HEALING, 
      icon: 'fa-moon', 
      desc: lang === 'zh' ? '帮助孩子们进入梦乡的宁静童话。' : 'Calming tales to help kids drift away.', 
      examples: [
        '小星星累了，它慢慢划过夜空，亲吻每一朵云，对生灵说晚安。',
        '森林里的风铃草在月光下轻轻摇晃，演奏着最温柔的摇篮曲。'
      ] 
    },
    { 
      id: StoryTemplate.WACKY_ADVENTURE, 
      icon: 'fa-hat-wizard', 
      desc: lang === 'zh' ? '充满搞怪情节和欢笑的故事。' : 'Silly situations and big laughs.', 
      examples: [
        '如果天空下的不是雨，而是五颜六色的冰淇淋球，世界会怎样？',
        '一只学会了跳芭蕾舞的河马，决定去参加巴黎歌剧院的试镜。'
      ] 
    },
  ];

  const [exampleIndices, setExampleIndices] = useState<Record<string, number>>({
    [StoryTemplate.HERO_JOURNEY]: 0,
    [StoryTemplate.SEARCH_AND_FIND]: 0,
    [StoryTemplate.BEDTIME_HEALING]: 0,
    [StoryTemplate.WACKY_ADVENTURE]: 0
  });

  const handleTemplateClick = (tId: StoryTemplate) => {
    const templateObj = templates.find(t => t.id === tId);
    if (!templateObj) return;
    const nextIdx = (exampleIndices[tId] + 1) % templateObj.examples.length;
    setExampleIndices({ ...exampleIndices, [tId]: nextIdx });
    setIdea(templateObj.examples[nextIdx]);
    setTemplate(tId);
  };

  const handleGenerate = async () => {
    if (!idea.trim() && !uploadedImage) return;
    setIsGenerating(true);
    setError(null);
    try {
      const script = await generateStoryOutline(idea || "基于图片的创意", template, uploadedImage || undefined);
      if (!script || !script.pages || script.pages.length === 0) {
        throw new Error("AI returned empty outline.");
      }
      onNext({
        originalIdea: idea || "基于图片的创意",
        template,
        title: script.title,
        pages: script.pages as any,
        currentStep: 'character'
      });
    } catch (err: any) {
      console.error("Generate Error Detail:", err);
      setError(lang === 'zh' ? `故事构思失败: ${err.message || '网络繁忙'}` : `Failed to spark the story: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert(lang === 'zh' ? "浏览器暂不支持语音功能" : "Speech not supported");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (e: any) => setIdea(prev => prev + e.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 w-full">
      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{lang === 'zh' ? '1. 灵感火花' : '1. The Idea Spark'}</h2>
        <p className="text-sm md:text-lg opacity-60 max-w-2xl mx-auto font-medium">{lang === 'zh' ? '告诉我们你的想法，我们先锁定故事的大纲。' : 'Tell us your idea first.'}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in shake">
          <i className="fas fa-exclamation-circle"></i>
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start w-full">
        <div className="card-dynamic p-4 md:p-6 rounded-[24px] relative w-full">
          <label className="block text-sm font-bold opacity-80 mb-4 flex items-center justify-between">
            {lang === 'zh' ? '你的故事种子' : 'Your Story Seed'}
            <div className="flex gap-2">
               <button onClick={handleVoiceInput} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--text-main)]/10 text-[var(--text-main)] hover:text-[#EA6F23]'}`}>
                  <i className="fas fa-microphone"></i>
               </button>
               <button onClick={() => imgInputRef.current?.click()} className="w-8 h-8 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] flex items-center justify-center hover:text-[#EA6F23]">
                  <i className="fas fa-image"></i>
               </button>
            </div>
          </label>
          
          <div className="relative">
            <textarea
              className="w-full h-40 md:h-48 p-4 md:p-5 rounded-2xl bg-[var(--card-bg)] text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:ring-4 focus:ring-[#EA6F23]/10 outline-none resize-none transition-all font-medium text-base md:text-lg leading-relaxed shadow-inner border border-[var(--border-color)]"
              placeholder={lang === 'zh' ? "写下一句话，或者上传一张图开启故事..." : "A sentence to start..."}
              value={idea}
              onChange={(e) => {
                setIdea(e.target.value);
                if (error) setError(null);
              }}
            />
            {uploadedImage && (
              <div className="absolute bottom-4 right-4 w-16 h-16 rounded-xl border-2 border-[var(--card-bg)] shadow-lg overflow-hidden group">
                <img src={uploadedImage} className="w-full h-full object-cover" />
                <button onClick={() => setUploadedImage(null)} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
          <input type="file" ref={imgInputRef} className="hidden" accept="image/*" onChange={(e) => {
             const file = e.target.files?.[0];
             if(file) {
               const reader = new FileReader();
               reader.onloadend = () => setUploadedImage(reader.result as string);
               reader.readAsDataURL(file);
             }
          }} />
        </div>

        <div className="grid grid-cols-1 gap-4 w-full">
          <p className="text-[10px] font-black opacity-30 uppercase tracking-widest ml-2 mb-1 flex items-center gap-2">
            <i className="fas fa-shuffle text-xs"></i>
            {lang === 'zh' ? '点击切换不同灵感' : 'CLICK TO SHUFFLE'}
          </p>
          {templates.map((t) => (
            <button key={t.id} onClick={() => handleTemplateClick(t.id)} className={`card-dynamic p-4 md:p-5 rounded-[24px] text-left transition-all relative overflow-hidden group w-full ${template === t.id ? 'ring-2 ring-[#EA6F23] bg-[#EA6F23]/5' : 'hover:border-[#EA6F23]/30'}`}>
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${template === t.id ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[#EA6F23]/10 text-[#EA6F23]'}`}>
                  <i className={`fas ${t.icon} text-base md:text-lg`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base" style={{ color: 'var(--text-main)' }}>{t.id}</h4>
                  <p className="text-xs opacity-50 font-medium line-clamp-2">{t.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center w-full">
        <button 
          onClick={handleGenerate} 
          disabled={!idea.trim() || isGenerating} 
          className="btn-candy w-full md:w-auto px-16 py-4 md:py-5 text-white rounded-[24px] font-header font-bold text-lg md:text-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? <><i className="fas fa-spinner fa-spin mr-3"></i> {lang === 'zh' ? '正在编织大纲...' : 'Dreaming...'}</> : <>{lang === 'zh' ? '生成故事大纲' : 'Next'} <i className="fas fa-magic ml-3"></i></>}
        </button>
      </div>
    </div>
  );
};

export default IdeaSpark;
