
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
  const [shakeKey, setShakeKey] = useState(0); 
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
        '勇敢的小骑士奥利弗出发去说服火龙不要再打喷嚏烧毁森林。',
        '好奇的小松鼠决定寻找彩虹的尽头，看看那里是不是真的有宝藏。',
        '一只折叠的小纸船渴望见到大海，它开始了从花园水池到大洋的航行。',
        '一只勤劳的小蜘蛛想要编织出一张能捕捉落星的神奇蛛网。',
        '年幼的企鹅由于怕冷，独自踏上了寻找传说中“温暖之穴”的南极之旅。',
        '一头住在地下的小鼹鼠，为了让家人看到月亮，开启了漫长的向上挖掘。'
      ] 
    },
    { 
      id: StoryTemplate.SEARCH_AND_FIND, 
      icon: 'fa-magnifying-glass', 
      desc: lang === 'zh' ? '为小侦探准备的互动乐趣。' : 'Interactive fun for little detectives.', 
      examples: [
        '在热闹的动物森林里，狮子国王丢了他的皇冠，你能帮他在树丛里找到它吗？',
        '调皮的彩色袜子在洗衣机里捉迷藏，快去阁楼和地毯下找找。',
        '月亮弄丢了开启梦境之门的银色钥匙，它可能掉在了玩具王国的某个角落。',
        '巨人国的厨师弄丢了 7 颗魔法扣子，快帮他在巨大的蔬菜林里找找看。',
        '小鸟皮皮的彩色羽毛被大风吹散到了游乐园，让我们一起去收集回来。',
        '魔法师的猫咪学会了隐身，它正藏在漂浮图书馆的那些旧书堆里。',
        '丰收节快到了，大家要在神奇的秋季森林里寻找那些藏起来的金橡果。',
        '海龟爷爷在珊瑚礁派对上弄丢了他的老花镜，你能帮他在海草丛里找找吗？',
        '园丁叔叔需要你的帮助，去温室花园里找出那 10 朵会唱歌的音乐花朵。',
        '小侦探通过地上的隐形足迹，正在寻找通往秘密隐形城堡的唯一入口。'
      ] 
    },
    { 
      id: StoryTemplate.BEDTIME_HEALING, 
      icon: 'fa-moon', 
      desc: lang === 'zh' ? '帮助孩子们进入梦乡的宁静童话。' : 'Calming tales to help kids drift away.', 
      examples: [
        '小星星累了，它慢慢划过夜空，亲吻每一朵云，对生灵说晚安。',
        '森林里的风铃草在月光下轻轻摇晃，演奏着最温柔的摇篮曲。',
        '一朵柔软的棉花糖云，在夜里变成了一个巨大的枕头，守护着整座城市的梦。',
        '深海里的一头小鲸鱼，在安静的海底进行着一场缓慢且平稳的梦境巡航。',
        '温柔的小雨滴轻轻落在花瓣上，向口渴的小花们诉说着远方的云朵故事。',
        '一块神奇的小毛毯，每天晚上都会给那些孤独的玩具们一个温暖之拥。',
        '月亮妈妈用银色的丝线织出了一座桥，让所有美好的梦都能顺利走过。',
        '小猫头鹰学会了在森林的低语中闭上眼睛，它听到了微风说“嘘——”。',
        '远方的灯塔有节奏地闪烁，像一颗平和的心跳，安抚着海面上归航的小船。',
        '一只古老的小茶壶，正在为夜晚忙碌的星星们煮一壶充满“香甜梦境”的热茶。'
      ] 
    },
    { 
      id: StoryTemplate.WACKY_ADVENTURE, 
      icon: 'fa-hat-wizard', 
      desc: lang === 'zh' ? '充满搞怪情节和欢笑的故事。' : 'Silly situations and big laughs.', 
      examples: [
        '如果天空下的不是雨，而是五颜六色的冰淇淋球，世界会怎样？',
        '一只学会了跳芭蕾舞的河马，决定去参加巴黎歌剧院的试镜。',
        '如果有一天，你的影子决定背上小包，独自去环球旅行，你该怎么办？',
        '冰箱里的蔬菜们在半夜成立了一支摇滚乐队，土豆主唱的声音特别响。',
        '一个会飞的神奇浴缸，只有当你大声唱美声歌剧时它才会启动飞行。',
        '在这个奇怪的小镇上，只要有人打喷嚏，所有人就会在接下来的 10 秒内失去重力。',
        '长颈鹿波波不满足于吃叶子，他想成为一名世界级的领结设计师。',
        '校车今天走了一条奇妙的捷径，它直接穿过了一个巨大的草莓生日蛋糕。',
        '小狗发现了一个神秘的遥控器，按一下“暂停”，整个世界就会静止不动。',
        '当月亮决定和地上的一个巨大煎饼调换位置时，动物们都乱了套。'
      ] 
    },
  ];

  const triggerShuffle = (tId: StoryTemplate) => {
    const templateObj = templates.find(t => t.id === tId);
    if (!templateObj) return;
    
    let randomIdx;
    do {
      randomIdx = Math.floor(Math.random() * templateObj.examples.length);
    } while (templateObj.examples[randomIdx] === idea && templateObj.examples.length > 1);
    
    setIdea(templateObj.examples[randomIdx]);
    setTemplate(tId);
    setShakeKey(k => k + 1); 
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
    recognition.onresult = (e: any) => {
        setIdea(prev => prev + e.results[0][0].transcript);
        setShakeKey(k => k + 1);
    };
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
        <div className="card-dynamic p-4 md:p-6 rounded-[24px] relative w-full h-full flex flex-col">
          <label className="block text-sm font-bold opacity-80 mb-4 flex items-center justify-between">
            {lang === 'zh' ? '你的故事种子' : 'Your Story Seed'}
            <div className="flex gap-2">
               <button onClick={handleVoiceInput} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--text-main)]/10 text-[var(--text-main)] hover:text-[#EA6F23]'}`}>
                  <i className="fas fa-microphone text-xs"></i>
               </button>
               <button onClick={() => imgInputRef.current?.click()} className="w-8 h-8 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] flex items-center justify-center hover:text-[#EA6F23]">
                  <i className="fas fa-image text-xs"></i>
               </button>
            </div>
          </label>
          
          <div className="relative flex-1 flex flex-col overflow-hidden rounded-2xl">
            <textarea
              key={shakeKey} 
              className="w-full h-40 md:h-full min-h-[160px] p-4 md:p-5 rounded-2xl bg-[var(--text-main)]/5 text-[var(--text-main)] placeholder:text-[var(--text-main)]/20 focus:ring-4 focus:ring-[#EA6F23]/10 outline-none resize-none transition-all font-medium text-base md:text-lg leading-relaxed shadow-inner border border-[var(--text-main)]/10 animate-in fade-in duration-300"
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
            <i className="fas fa-dice text-xs"></i>
            {lang === 'zh' ? '点击下方卡片或骰子随机切换 (10条)' : 'CLICK CARD OR DICE TO SHUFFLE (10 IDEAS)'}
          </p>
          {templates.map((t) => (
            <div 
                key={t.id} 
                onClick={() => triggerShuffle(t.id)} 
                className={`card-dynamic p-4 md:p-5 rounded-[24px] text-left transition-all relative overflow-hidden group cursor-pointer w-full border-2 active:scale-95 ${template === t.id ? 'border-[#EA6F23] bg-[#EA6F23]/5' : 'border-[var(--text-main)]/10 hover:border-[#EA6F23]/30'}`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${template === t.id ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[#EA6F23]/10 text-[#EA6F23]'}`}>
                  <i className={`fas ${t.icon} text-base md:text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <h4 className="font-bold text-sm md:text-base line-clamp-1" style={{ color: 'var(--text-main)' }}>{t.id}</h4>
                  <p className="text-xs opacity-50 font-medium line-clamp-1">{t.desc}</p>
                </div>
                
                <div 
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${template === t.id ? 'bg-[#EA6F23] text-white' : 'bg-[var(--text-main)]/5 text-[var(--text-main)]/40 group-hover:text-[#EA6F23] group-hover:bg-[#EA6F23]/10'} group-hover:rotate-12`}
                >
                  <i className="fas fa-dice text-lg"></i>
                </div>
              </div>
            </div>
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
