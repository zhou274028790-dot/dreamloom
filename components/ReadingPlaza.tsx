
import React, { useState } from 'react';
import { VisualStyle, Language } from '../types';

interface Props {
  lang: Language;
  onUseStyle: (style: VisualStyle) => void;
  onUseIdea: (idea: string) => void;
}

interface PlazaBook {
  id: string;
  title: string;
  author: string;
  likes: number;
  image: string;
  style: VisualStyle;
  idea: string;
  pages: { text: string; image: string }[];
}

const ReadingPlaza: React.FC<Props> = ({ lang, onUseStyle, onUseIdea }) => {
  const [filter, setFilter] = useState<string>('hot');
  const [selectedBook, setSelectedBook] = useState<PlazaBook | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const mockBooks: PlazaBook[] = [
    {
      id: 'p1',
      title: '穿靴子的猫',
      author: '小梦',
      likes: 1240,
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      style: VisualStyle.WATERCOLOR,
      idea: '一只聪明的猫帮助主人获得幸福的故事。',
      pages: [
        { text: '从前有一只神奇的猫，它总是穿着一双漂亮的皮靴。', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80' },
        { text: '它带着主人来到国王的城堡，准备献上一份大礼。', image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80' },
        { text: '最终，猫凭借智慧让主人成为了勇敢的公爵。', image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'p2',
      title: '太空企鹅历险记',
      author: '科幻迷',
      likes: 890,
      image: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&w=800&q=80',
      style: VisualStyle.PIXAR_3D,
      idea: '一只穿宇航服的企鹅去火星寻找冰淇淋。',
      pages: [
        { text: '波波是一只不寻常的企鹅，它的梦想是星辰大海。', image: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&w=800&q=80' },
        { text: '它穿上银色的宇航服，跳上了飞往火星的火箭。', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80' },
        { text: '在红色的星球上，它竟然真的找到了一座冰淇淋火山！', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'p3',
      title: '月亮的味道',
      author: '晚安故事',
      likes: 2100,
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
      style: VisualStyle.GHIBLI,
      idea: '小动物们叠罗汉，想尝尝月亮是什么味道。',
      pages: [
        { text: '静谧的夜晚，小海龟仰望着天空，它想：月亮是什么味道的？', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80' },
        { text: '它叫来了大象、长颈鹿和狮子，大家一个叠一个。', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' },
        { text: '最后一只小老鼠够到了月亮，原来月亮是脆脆的，甜甜的。', image: 'https://images.unsplash.com/photo-1516339901600-2e1a62986307?auto=format&fit=crop&w=800&q=80' }
      ]
    }
  ];

  const t = {
    zh: { title: '阅读广场', subtitle: '在这里寻找灵感，发现全球创作者的奇思妙想。', useStyle: '使用同款画风', useIdea: '写同款故事', hot: '最热', latest: '最新', preview: '开始阅读', close: '退出阅读' },
    en: { title: 'Reading Plaza', subtitle: 'Find inspiration and discover magical ideas from worldwide creators.', useStyle: 'Use Style', useIdea: 'Write Same Story', hot: 'Hot', latest: 'Latest', preview: 'Read Now', close: 'Close' }
  }[lang];

  const handleOpenBook = (book: PlazaBook) => {
    setSelectedBook(book);
    setPreviewIndex(0);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 w-full relative">
      <div className="text-center space-y-2 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{t.title}</h2>
        <p className="opacity-60 max-w-2xl mx-auto font-medium text-sm md:text-base">{t.subtitle}</p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => setFilter('hot')} className={`px-6 py-2 rounded-full font-bold transition-all text-sm md:text-base ${filter === 'hot' ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[var(--card-bg)] text-[var(--text-sub)] border border-[var(--border-color)]'}`}>
          <i className="fas fa-fire mr-2"></i>{t.hot}
        </button>
        <button onClick={() => setFilter('latest')} className={`px-6 py-2 rounded-full font-bold transition-all text-sm md:text-base ${filter === 'latest' ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[var(--card-bg)] text-[var(--text-sub)] border border-[var(--border-color)]'}`}>
          <i className="fas fa-clock mr-2"></i>{t.latest}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
        {mockBooks.map(book => (
          <div key={book.id} className="card-dynamic rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 flex flex-col shadow-lg border border-[var(--border-color)]">
            <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => handleOpenBook(book)}>
              <img src={book.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={book.title} />
              
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#EA6F23] flex items-center gap-1 shadow-md z-10">
                <i className="fas fa-heart text-[10px]"></i> {book.likes}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-6 gap-3 z-20">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onUseStyle(book.style); }} 
                  className="btn-candy w-full py-2.5 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 text-xs"
                 >
                   <i className="fas fa-palette"></i> {t.useStyle}
                 </button>
                 <button 
                  onClick={(e) => { e.stopPropagation(); onUseIdea(book.idea); }} 
                  className="w-full py-2.5 bg-white text-[#EA6F23] rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 text-xs"
                 >
                   <i className="fas fa-pen-nib"></i> {t.useIdea}
                 </button>
              </div>
            </div>
            <div className="p-6 flex justify-between items-center bg-[var(--card-bg)]">
              <div>
                <h3 className="text-lg font-bold font-header" style={{ color: 'var(--text-main)' }}>{book.title}</h3>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">@ {book.author}</p>
              </div>
              <button 
                onClick={() => handleOpenBook(book)}
                className="w-10 h-10 rounded-full bg-[#EA6F23]/10 text-[#EA6F23] flex items-center justify-center hover:bg-[#EA6F23] hover:text-white transition-all shadow-sm"
              >
                <i className="fas fa-book-open text-xs"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Immersive Book Preview Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-[var(--text-main)]/90 backdrop-blur-xl animate-in fade-in" onClick={() => setSelectedBook(null)}></div>
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--card-bg)] rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col md:flex-row">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center z-[110] hover:bg-white/40 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Book Display Stage */}
            <div className="flex-1 bg-black/5 flex flex-col relative overflow-hidden group">
              <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                 <img 
                    key={previewIndex}
                    src={selectedBook.pages[previewIndex].image} 
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in fade-in"
                    alt="Page" 
                 />
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-[#EA6F23] shadow-xl disabled:opacity-0 transition-all hover:scale-110 active:scale-90"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button 
                onClick={() => setPreviewIndex(p => Math.min(selectedBook.pages.length - 1, p + 1))}
                disabled={previewIndex === selectedBook.pages.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-[#EA6F23] shadow-xl disabled:opacity-0 transition-all hover:scale-110 active:scale-90"
              >
                <i className="fas fa-chevron-right"></i>
              </button>

              {/* Progress Dot Bar */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                {selectedBook.pages.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === previewIndex ? 'w-6 bg-[#EA6F23]' : 'w-1.5 bg-[var(--text-sub)] opacity-30'}`}></div>
                ))}
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="w-full md:w-80 p-8 flex flex-col justify-between border-l border-[var(--border-color)] bg-[var(--card-bg)]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{selectedBook.title}</h3>
                  <p className="text-xs font-bold opacity-40 uppercase tracking-[0.2em] mt-1">BY @{selectedBook.author}</p>
                </div>
                
                <div className="p-4 bg-[var(--text-main)]/5 rounded-2xl">
                  <p className="text-sm leading-relaxed font-medium italic opacity-80" style={{ color: 'var(--text-main)' }}>
                    "{selectedBook.pages[previewIndex].text}"
                  </p>
                </div>

                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-[#EA6F23]/10 text-[#EA6F23] rounded-xl flex items-center justify-center"><i className="fas fa-magic"></i></div>
                   <div>
                     <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-none mb-1">VISUAL STYLE</p>
                     <p className="text-xs font-bold text-[#EA6F23]">{selectedBook.style}</p>
                   </div>
                </div>
              </div>

              <div className="space-y-3 pt-8 md:pt-0">
                <button 
                  onClick={() => onUseStyle(selectedBook.style)} 
                  className="w-full py-4 btn-candy text-white rounded-2xl font-bold shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-palette"></i> {t.useStyle}
                </button>
                <button 
                  onClick={() => onUseIdea(selectedBook.idea)} 
                  className="w-full py-4 bg-[var(--text-main)]/5 text-[var(--text-main)] rounded-2xl font-bold border border-[var(--border-color)] hover:bg-[#EA6F23]/5 hover:text-[#EA6F23] transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-pen-nib"></i> {t.useIdea}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingPlaza;
